import type { AgentActionProposal, PlayerAction, StatePatch, WorldState } from "@agentic-turnscape/shared";
import { resolveCombatRound, type CombatMove, type CombatMoveType } from "./combat.js";
import { roll2d6, classifySuccess, successLabel, type SuccessLevel } from "./dice.js";
import { resolveConditionUpkeep } from "./effects.js";
import { resolveFactionPlans } from "./factions.js";
import {
  resolveSocialLeverage,
  type SocialChipResource,
  type SocialLeverageResolution,
} from "./social.js";

export type RefereeInput = {
  state: WorldState;
  playerAction: PlayerAction;
  proposals: AgentActionProposal[];
  turnId: string;
  seed?: string;
};

export type RefereeResolution = {
  roll: {
    dice: [number, number];
    attribute: string;
    skill: string;
    modifier: number;
    difficulty: number;
    total: number;
    level: SuccessLevel;
    label: string;
  };
  patch: StatePatch;
  publicSummary: string;
  hiddenSummary: string;
};

const now = () => new Date().toISOString();

const nextPhase = (state: WorldState): { day: number; phase: WorldState["time"]["phase"] } => {
  switch (state.time.phase) {
    case "morning":
      return { day: state.time.day, phase: "afternoon" };
    case "afternoon":
      return { day: state.time.day, phase: "evening" };
    case "evening":
      return { day: state.time.day, phase: "night" };
    case "night":
      return { day: Math.min(7, state.time.day + 1), phase: "morning" };
  }
};

const relationshipPath = (characterId: string, dimension: string): string => `relationships.player:${characterId}.${dimension}`;
const hasRelationship = (state: WorldState, characterId: string): boolean =>
  Boolean(state.relationships[`player:${characterId}`]);
const hasClock = (state: WorldState, clockId: string): boolean => Boolean(state.clocks[clockId]);
const systemLeveragePrefixes = ["scenario:", "clock:", "pressureClock:", "route:", "step:"];
const isSystemLeverageToken = (token: string): boolean =>
  token === "freeform" ||
  token.startsWith("freeform:") ||
  systemLeveragePrefixes.some((prefix) => token.startsWith(prefix));
const mechanicalLeverageOf = (leverage: string[]): string[] =>
  leverage.filter((token) => !isSystemLeverageToken(token));
const freeformSocialChipResources = new Set<SocialChipResource>([
  "favor",
  "intel",
  "money",
]);
const freeformSocialLeverageOf = (leverage: string[]): string[] =>
  leverage.map((token) =>
    freeformSocialChipResources.has(token as SocialChipResource)
      ? `chip:${token}:1`
      : token,
  );
const addClockInc = (
  changes: StatePatch["changes"],
  state: WorldState,
  clockId: string,
  delta: number,
  reason: string
) => {
  if (hasClock(state, clockId)) {
    changes.push({ op: "inc", path: `clocks.${clockId}.progress`, delta, reason });
  }
};
const tokenValue = (playerAction: PlayerAction, prefix: string): string | undefined =>
  playerAction.leverage.find((item) => item.startsWith(prefix))?.slice(prefix.length);

type FreeformRuleChannel = Exclude<PlayerAction["actionType"], "custom">;
const freeformRuleChannels = new Set<FreeformRuleChannel>([
  "investigate",
  "negotiate",
  "fight",
  "protect",
  "trade",
  "rest",
  "travel",
  "ignore"
]);
const freeformIntentLabels: Record<FreeformRuleChannel, string> = {
  investigate: "调查",
  negotiate: "谈判",
  fight: "战斗",
  protect: "保护",
  trade: "交易",
  rest: "休整",
  travel: "移动",
  ignore: "观望"
};

const freeformIntentOf = (playerAction: PlayerAction): FreeformRuleChannel | undefined => {
  const intent = tokenValue(playerAction, "freeform:intent:");
  return freeformRuleChannels.has(intent as FreeformRuleChannel) ? (intent as FreeformRuleChannel) : undefined;
};

const customFreeformTargetTextOf = (playerAction: PlayerAction): string | undefined => {
  if (!playerAction.targetId?.startsWith("custom_target_")) return undefined;
  return tokenValue(playerAction, "freeform:targetText:");
};

const freeformApproachTextOf = (playerAction: PlayerAction): string | undefined =>
  tokenValue(playerAction, "freeform:approachText:");
const freeformConstraintTextOf = (playerAction: PlayerAction): string | undefined =>
  tokenValue(playerAction, "freeform:constraintText:");
const constraintSummaryOf = (constraintText: string): string =>
  constraintText.startsWith("避免") || constraintText.startsWith("避开")
    ? constraintText
    : `避免${constraintText}`;

const socialLeverageOf = (
  state: WorldState,
  playerAction: PlayerAction,
  freeformIntent: FreeformRuleChannel | undefined,
  mechanicalLeverage: string[],
): SocialLeverageResolution | undefined => {
  const isDirectSocialAction =
    playerAction.actionType === "negotiate" ||
    playerAction.actionType === "trade";
  const isFreeformSocialAction =
    playerAction.actionType === "custom" &&
    (freeformIntent === "negotiate" || freeformIntent === "trade");
  if (!isDirectSocialAction && !isFreeformSocialAction) return undefined;

  return resolveSocialLeverage(
    state,
    isFreeformSocialAction
      ? freeformSocialLeverageOf(mechanicalLeverage)
      : mechanicalLeverage,
  );
};

const check = (
  state: WorldState,
  playerAction: PlayerAction,
  seed: string
): {
  dice: [number, number];
  attribute: keyof WorldState["player"]["attributes"];
  skill: string;
  modifier: number;
  difficulty: number;
  total: number;
  level: SuccessLevel;
  socialLeverage?: SocialLeverageResolution;
} => {
  const actionMap = {
    investigate: { attribute: "insight", skill: "investigation", difficulty: 10 },
    negotiate: { attribute: "charm", skill: "social", difficulty: 13 },
    fight: { attribute: "physique", skill: "melee", difficulty: 13 },
    protect: { attribute: "will", skill: "defense", difficulty: 13 },
    trade: { attribute: "charm", skill: "trade", difficulty: 10 },
    rest: { attribute: "will", skill: "survival", difficulty: 7 },
    travel: { attribute: "agility", skill: "survival", difficulty: 10 },
    ignore: { attribute: "insight", skill: "insight", difficulty: 10 },
    custom: { attribute: "insight", skill: "survival", difficulty: 11 }
  } satisfies Record<PlayerAction["actionType"], { attribute: keyof WorldState["player"]["attributes"]; skill: string; difficulty: number }>;

  const freeformIntent = playerAction.actionType === "custom" ? freeformIntentOf(playerAction) : undefined;
  const config = freeformIntent ? actionMap[freeformIntent] : actionMap[playerAction.actionType];
  const roll = roll2d6(seed);
  const attributeScore = state.player.attributes[config.attribute] ?? 0;
  const skillScore = state.player.skills[config.skill] ?? 0;
  const mechanicalLeverage = mechanicalLeverageOf(playerAction.leverage);
  const socialLeverage = socialLeverageOf(
    state,
    playerAction,
    freeformIntent,
    mechanicalLeverage,
  );
  const leverageBonus = socialLeverage?.totalBonus ?? Math.min(2, mechanicalLeverage.length);
  const pressurePenalty = Math.max(0, Math.floor((state.player.resources.pressure ?? 0) / 4));
  const modifier = attributeScore + skillScore + leverageBonus - pressurePenalty;
  const total = roll.total + modifier;
  const level = classifySuccess(total, config.difficulty);
  return {
    dice: roll.dice,
    attribute: config.attribute,
    skill: config.skill,
    modifier,
    difficulty: config.difficulty,
    total,
    level,
    ...(socialLeverage ? { socialLeverage } : {})
  };
};

const event = (state: WorldState, turnId: string, title: string, body: string, tags: string[]) => ({
  id: `evt_${turnId}_${tags[0] ?? "turn"}`,
  turnId,
  day: state.time.day,
  phase: state.time.phase,
  title,
  body,
  tags,
  createdAt: now()
});

const hidden = (state: WorldState, turnId: string, title: string, body: string, tags: string[], relatedIds: string[]) => ({
  ...event(state, turnId, title, body, tags),
  revealed: false,
  relatedIds
});

const isSuccess = (level: SuccessLevel): boolean => level === "costly_success" || level === "success" || level === "critical_success";
const isFailure = (level: SuccessLevel): boolean => level === "critical_failure" || level === "failure";
const combatMoveTypes = new Set<CombatMoveType>(["strike", "guard", "maneuver", "press"]);

const combatPlanOf = (playerAction: PlayerAction): CombatMove[] => {
  const moves = playerAction.leverage
    .filter((item) => item.startsWith("ap:"))
    .map((item) => item.slice("ap:".length))
    .filter((item): item is CombatMoveType => combatMoveTypes.has(item as CombatMoveType))
    .map((type) => ({ type }));
  return moves.length > 0 ? moves : [{ type: "strike" }, { type: "guard" }];
};

const strategyOf = (playerAction: PlayerAction): string | undefined => {
  const token = playerAction.leverage.find((item) => item.startsWith("strategy:"));
  return token?.slice("strategy:".length);
};

const strategyStepOf = (playerAction: PlayerAction): number => {
  const token = playerAction.leverage.find((item) => item.startsWith("step:"));
  const parsed = Number(token?.slice("step:".length));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

type RecoveryBranch = "plague" | "mine" | "cult";

const recoveryClockIds: Record<RecoveryBranch, string> = {
  plague: "plague_spread",
  mine: "mine_takeover",
  cult: "cult_ritual"
};

const recoveryOf = (playerAction: PlayerAction): RecoveryBranch | undefined => {
  const token = playerAction.leverage.find((item) => item.startsWith("recovery:"));
  const branch = token?.slice("recovery:".length);
  return branch === "plague" || branch === "mine" || branch === "cult" ? branch : undefined;
};

const addStrategicConsequences = (
  changes: StatePatch["changes"],
  state: WorldState,
  playerAction: PlayerAction,
  advance: { day: number; phase: WorldState["time"]["phase"] }
) => {
  const strategy = strategyOf(playerAction);
  if (!strategy) return;

  const step = strategyStepOf(playerAction);
  const dayProgress = Math.max(1, advance.day);
  const set = (path: string, value: unknown, reason: string) => changes.push({ op: "set", path, value, reason });

  switch (strategy) {
    case "guild_case":
      set("player.resources.intel", Math.min(5, Math.ceil(step / 5)), "Public evidence work builds a case against the consortium.");
      set("relationships.player:npc_rowan.respect", Math.min(3, Math.floor(dayProgress / 2)), "Orderly evidence-gathering wins Rowan's respect.");
      break;
    case "cure_alliance":
      set("player.resources.intel", Math.min(7, Math.ceil(step / 4)), "Medical investigation traces the plague source.");
      set("clocks.plague_spread.progress", Math.min(5, Math.ceil(step / 7)), "Clinic cure work contains the plague before it becomes a townwide collapse.");
      set("relationships.player:npc_adele.trust", Math.min(4, 1 + Math.floor(dayProgress / 2)), "Consistent medical support deepens Adele's trust.");
      set("relationships.player:npc_eve.trust", Math.min(3, Math.max(0, dayProgress - 3)), "Protecting patients gives Eve reason to defect from the hardliners.");
      break;
    case "neglect_plague":
      set("clocks.plague_spread.progress", Math.min(state.clocks.plague_spread?.max ?? 8, Math.ceil(step / 3)), "Ignoring patients lets the plague clock advance.");
      set("clocks.mine_takeover.progress", Math.min(3, Math.ceil(step / 9)), "Inaction gives the consortium room to work.");
      break;
    case "consortium_deal":
      set("clocks.mine_takeover.progress", Math.min(state.clocks.mine_takeover?.max ?? 5, Math.ceil(step / 5)), "Helping the consortium accelerates mine control.");
      set("clocks.plague_spread.progress", Math.min(3, Math.ceil(step / 10)), "The consortium manages plague optics without solving the cause.");
      set("relationships.player:npc_manlo.interest", Math.min(5, 1 + Math.floor(dayProgress / 2)), "Manlo increasingly values the player's cooperation.");
      break;
    case "open_rift":
      set("clocks.cult_ritual.progress", Math.min(state.clocks.cult_ritual?.max ?? 6, Math.ceil(step / 4)), "Following rift omens feeds the ritual clock.");
      set("relationships.player:npc_white_crow.suspicion", Math.min(5, 2 + Math.floor(dayProgress / 2)), "White Crow notices the player leaning into the anomaly.");
      break;
    case "balanced_hero":
      set("player.resources.intel", Math.min(4, Math.ceil(step / 8)), "Balanced intervention collects enough clues to act.");
      set("clocks.plague_spread.progress", Math.min(4, Math.ceil(step / 8)), "Balanced intervention slows the plague below collapse.");
      set("clocks.mine_takeover.progress", Math.min(3, Math.ceil(step / 9)), "Balanced intervention slows mine control.");
      set("clocks.cult_ritual.progress", Math.min(5, Math.ceil(step / 6)), "Balanced intervention keeps the ritual below completion.");
      break;
  }
};

const recoveryTitle: Record<RecoveryBranch, string> = {
  plague: "临时隔离线建立",
  mine: "矿区账本公开",
  cult: "礼拜堂仪式被打断"
};

const recoveryBody: Record<RecoveryBranch, string> = {
  plague: "玩家把诊所、礼拜堂和空屋串成临时隔离线，瘟疫扩散被压回可处理范围。",
  mine: "玩家把矿区账本和证人推到公开场合，商会收购计划被迫降速。",
  cult: "玩家切断礼拜堂仪式的关键环节，教团狂信派失去一次推进裂隙的机会。"
};

const addRecoveryConsequences = (
  changes: StatePatch["changes"],
  state: WorldState,
  playerAction: PlayerAction,
  success: boolean,
  turnId: string
) => {
  const recovery = recoveryOf(playerAction);
  if (!recovery) return;

  const clockId = recoveryClockIds[recovery];
  const clock = state.clocks[clockId];
  if (!clock) return;

  if (success) {
    changes.push(
      {
        op: "set",
        path: `clocks.${clockId}.progress`,
        value: Math.max(0, clock.progress - 2),
        reason: "恢复分支成功压低危机时钟"
      },
      {
        op: "tag",
        path: "player.reputationTags",
        value: "危机补救者",
        reason: "玩家在失败后的新局势中挽回局面"
      },
      {
        op: "append",
        path: "publicEvents",
        value: event(state, turnId, recoveryTitle[recovery], recoveryBody[recovery], ["recovery", recovery]),
        reason: "记录恢复分支结果"
      }
    );
  } else {
    changes.push(
      {
        op: "inc",
        path: `clocks.${clockId}.progress`,
        delta: 1,
        reason: "恢复分支失败使危机继续推进"
      },
      {
        op: "inc",
        path: "player.resources.pressure",
        delta: 1,
        reason: "恢复分支失败增加玩家压力"
      },
      {
        op: "append",
        path: "publicEvents",
        value: event(state, turnId, "补救失败但局势继续", "玩家没有终局出局，而是带着更高压力进入新的危机局势。", [
          "recovery",
          "failure"
        ]),
        reason: "记录恢复分支失败"
      }
    );
  }
};

const addScenarioClockConsequences = (
  changes: StatePatch["changes"],
  state: WorldState,
  playerAction: PlayerAction,
  success: boolean,
  turnId: string
) => {
  const scenarioId = tokenValue(playerAction, "scenario:");
  const stabilityClockId = tokenValue(playerAction, "clock:");
  const pressureClockId = tokenValue(playerAction, "pressureClock:");
  if (!scenarioId || !stabilityClockId || !state.clocks[stabilityClockId]) return;

  if (success) {
    changes.push(
      {
        op: "inc",
        path: `clocks.${stabilityClockId}.progress`,
        delta: 1,
        reason: "剧本推进行动成功，稳定时钟前进"
      },
      {
        op: "inc",
        path: "player.momentum",
        delta: 1,
        reason: "剧本推进行动成功提升玩家势能"
      },
      {
        op: "append",
        path: "publicEvents",
        value: event(state, turnId, "剧本线索推进", "玩家把当前剧本的核心危机向可控方向推进了一步。", [
          "scenario_progress",
          scenarioId
        ]),
        reason: "记录剧本推进"
      }
    );
    return;
  }

  const pressurePath = pressureClockId && state.clocks[pressureClockId] ? `clocks.${pressureClockId}.progress` : "player.resources.pressure";
  changes.push(
    {
      op: "inc",
      path: pressurePath,
      delta: 1,
      reason: "剧本推进行动失败，压力线前进"
    },
    {
      op: "append",
      path: "publicEvents",
      value: event(state, turnId, "剧本压力上升", "玩家没有出局，但当前剧本的反制力量获得了更多空间。", [
        "scenario_pressure",
        scenarioId
      ]),
      reason: "记录剧本压力"
    }
  );
};

export const adjudicateTurn = ({ state, playerAction, proposals, turnId, seed = turnId }: RefereeInput): RefereeResolution => {
  const roll = check(state, playerAction, seed);
  let visibleRoll = {
    dice: roll.dice,
    attribute: roll.attribute,
    skill: roll.skill,
    modifier: roll.modifier,
    difficulty: roll.difficulty,
    total: roll.total,
    level: roll.level,
    label: successLabel(roll.level)
  };
  const advance = nextPhase(state);
  const changes: StatePatch["changes"] = [
    { op: "set", path: "time.day", value: advance.day, reason: "回合时间推进" },
    { op: "set", path: "time.phase", value: advance.phase, reason: "回合时间推进" },
    ...(roll.socialLeverage?.spendChanges ?? [])
  ];

  const proposalTitles = proposals.map((proposal) => `${proposal.actorId}:${proposal.intent}`).join("；");
  let publicSummary = `${playerAction.label}：${successLabel(roll.level)}。`;
  let hiddenSummary = proposalTitles || "没有隐藏行动。";

  if (playerAction.actionType === "negotiate" && playerAction.targetId === "npc_rowan") {
    changes.push({ op: "set", path: "currentLocationId", value: "clinic", reason: "诊所冲突成为当前场景" });
    if (isSuccess(roll.level)) {
      changes.push(
        { op: "inc", path: relationshipPath("npc_adele", "trust"), delta: 1, reason: "玩家替阿黛尔争取诊断时间" },
        { op: "inc", path: relationshipPath("npc_rowan", "respect"), delta: 1, reason: "玩家用可执行方案降低冲突" },
        { op: "inc", path: "player.momentum", delta: 1, reason: "公开谈判稳定了局势" },
        { op: "append", path: "publicEvents", value: event(state, turnId, "诊所冲突降温", "罗文暂时停止强行带走感染者，阿黛尔获得半天诊断时间。", ["clinic", "social"]), reason: "记录公共结果" },
        { op: "append", path: "hiddenEvents", value: hidden(state, turnId, "商会密探暴露风险", "灰衣密探的煽动没有奏效，商会开始把玩家列为变量。", ["blackstone", "hidden"], ["npc_manlo"]), reason: "记录隐藏后果" }
      );
      publicSummary = "玩家协助阿黛尔提出隔离诊断方案，城防军暂缓强制带人，诊所获得半天时间。";
      hiddenSummary = "商会密探没能引爆人群恐慌，曼洛对玩家警惕提高。";
    } else {
      changes.push(
        { op: "inc", path: relationshipPath("npc_adele", "trust"), delta: -1, reason: "谈判失败让阿黛尔失去空间" },
        { op: "inc", path: relationshipPath("npc_rowan", "suspicion"), delta: 1, reason: "城防军认为玩家拖延防疫" },
        { op: "append", path: "publicEvents", value: event(state, turnId, "诊所被强制接管", "谈判破裂，城防军带走部分感染者，阿黛尔被迫交出病历。", ["clinic", "failure"]), reason: "记录公共结果" }
      );
      addClockInc(changes, state, "plague_spread", 1, "混乱导致防疫失控");
      addClockInc(changes, state, "martial_lockdown", 1, "冲突升级使城防军更强硬");
      publicSummary = "谈判没有压住恐慌，城防军强行接管诊所，瘟疫与戒严压力上升。";
      hiddenSummary = "商会密探成功推动人群不信任诊所。";
    }
  } else if (playerAction.actionType === "investigate") {
    const target = playerAction.targetId ?? "old_outpost";
    if (target === "old_outpost") {
      changes.push({ op: "set", path: "currentLocationId", value: "old_outpost", reason: "玩家追踪商队线索" });
    }
    if (isSuccess(roll.level)) {
      changes.push(
        { op: "inc", path: "player.resources.intel", delta: 1, reason: "调查获得可用情报" },
        { op: "inc", path: relationshipPath("npc_zhou_jin", "trust"), delta: 1, reason: "玩家重视周烬的边境经验" },
        { op: "append", path: "publicEvents", value: event(state, turnId, "线索被串起", "玩家确认失踪商队、旧哨站火光和矿区收购之间存在联系。", ["investigation", "quest"]), reason: "记录公共结果" }
      );
      publicSummary = "调查获得突破，旧哨站和黑石矿区的线索开始连在一起。";
      hiddenSummary = "凯尔仍在旧哨站附近躲藏，哈根的雇佣兵正在接近。";
    } else {
      changes.push(
        { op: "append", path: "publicEvents", value: event(state, turnId, "调查受阻", "线索被人提前清理，黑石商会趁机加快矿区合同。", ["investigation", "setback"]), reason: "记录公共结果" }
      );
      addClockInc(changes, state, "mine_takeover", 1, "玩家调查受阻，商会推进收购");
      publicSummary = "调查被干扰，商会趁时间差推进矿区控制。";
      hiddenSummary = "曼洛不确定玩家掌握了多少证据，因此选择加快合同。";
    }
  } else if (playerAction.actionType === "protect") {
    if (state.locations.clinic) {
      changes.push({ op: "set", path: "currentLocationId", value: "clinic", reason: "玩家围绕病人安全行动" });
    }
    if (isSuccess(roll.level)) {
      changes.push(
        { op: "tag", path: "player.reputationTags", value: "平民保护者", reason: "玩家公开保护弱者" },
        { op: "append", path: "publicEvents", value: event(state, turnId, "病人被转移", "玩家护送重症病人离开诊所，避免了立即冲突，但城防军开始封锁街口。", ["clinic", "protect"]), reason: "记录公共结果" }
      );
      if (hasRelationship(state, "npc_mina")) {
        changes.push({ op: "inc", path: relationshipPath("npc_mina", "trust"), delta: 2, reason: "玩家优先保护米娜" });
      }
      if (hasClock(state, "martial_lockdown")) {
        changes.push({ op: "inc", path: "clocks.martial_lockdown.progress", delta: 1, reason: "城防军因撤离行动变得紧张" });
      }
      publicSummary = "玩家保住了病人，也让城防军戒严压力上升。";
      hiddenSummary = "米娜更愿意透露自己的梦境线索。";
    } else {
      changes.push(
        { op: "inc", path: "player.resources.pressure", delta: 1, reason: "护送失败造成压力" },
        { op: "append", path: "publicEvents", value: event(state, turnId, "撤离失败", "病人撤离时被城防军拦下，街口的恐慌进一步蔓延。", ["clinic", "failure"]), reason: "记录公共结果" }
      );
      if (hasClock(state, "plague_spread")) {
        changes.push({ op: "inc", path: "clocks.plague_spread.progress", delta: 1, reason: "混乱中感染风险增加" });
      }
      publicSummary = "护送失败，玩家承受压力，瘟疫风险上升。";
      hiddenSummary = "商会密探把撤离失败包装成诊所隐瞒疫情。";
    }
  } else if (playerAction.actionType === "trade") {
    if ((state.player.resources.money ?? 0) > 0) {
      changes.push({ op: "inc", path: "player.resources.money", delta: -1, reason: "支付黑市情报价码" });
    }
    changes.push(
      { op: "set", path: "currentLocationId", value: "black_market", reason: "玩家进入乌鸦巷" },
      { op: "inc", path: "player.resources.intel", delta: isSuccess(roll.level) ? 2 : 1, reason: "黑市交易带来情报" },
      { op: "inc", path: relationshipPath("npc_crow_nine", "interest"), delta: 1, reason: "鸦九确认玩家有交易价值" },
      { op: "append", path: "publicEvents", value: event(state, turnId, "黑市交易", "鸦九收下价码，交给玩家一条关于灰衣密探和药品涨价的线索。", ["black_market", "intel"]), reason: "记录公共结果" }
    );
    publicSummary = "玩家用资源换到黑市情报，鸦九开始认真评估这位外来者。";
    hiddenSummary = "鸦九保留了商会走私派联系人的名字，等待更高价码。";
  } else if (playerAction.actionType === "custom") {
    const freeformText = playerAction.description.trim() || playerAction.label;
    const inferredIntent = freeformIntentOf(playerAction) ?? "ignore";
    const inferredIntentLabel = freeformIntentLabels[inferredIntent];
    const customTargetText = customFreeformTargetTextOf(playerAction);
    const customTargetNote = customTargetText
      ? `新目标“${customTargetText}”需要后续裁判确认。`
      : "";
    const customTargetSummary = customTargetText
      ? `；新目标“${customTargetText}”需要后续裁判确认`
      : "";
    const approachText = freeformApproachTextOf(playerAction);
    const constraintText = freeformConstraintTextOf(playerAction);
    const freeformBoundarySegments = [
      ...(approachText ? [`方式：${approachText}`] : []),
      ...(constraintText ? [`底线：${constraintSummaryOf(constraintText)}`] : []),
    ];
    const freeformBoundaryNote =
      freeformBoundarySegments.length > 0
        ? `裁判记录${freeformBoundarySegments.join("；")}。`
        : "";
    const freeformBoundarySummary =
      freeformBoundarySegments.length > 0
        ? `；${freeformBoundarySegments.join("；")}`
        : "";
    const freeformTags = [
      "freeform",
      inferredIntent,
      ...(customTargetText ? ["custom_target"] : []),
      ...(approachText ? ["approach"] : []),
      ...(constraintText ? ["constraint"] : []),
    ];
    if (isSuccess(roll.level)) {
      changes.push(
        { op: "inc", path: "player.momentum", delta: 1, reason: "自由行动成功并制造可见进展" },
        {
          op: "append",
          path: "publicEvents",
          value: event(
            state,
            turnId,
            "自由行动推进",
            `玩家意图：${freeformText}。裁判将意图判定为“${inferredIntentLabel}”，并把它转换为合法的状态变化。${customTargetNote}${freeformBoundaryNote}`,
            freeformTags
          ),
          reason: "记录自由行动裁判结果"
        }
      );
      switch (inferredIntent) {
        case "protect":
          addClockInc(changes, state, "plague_spread", -1, "自由保护行动延缓可见瘟疫时钟");
          break;
        case "investigate":
          changes.push({ op: "inc", path: "player.resources.intel", delta: 1, reason: "自由调查产出可用情报" });
          break;
        case "negotiate":
          if (playerAction.targetId?.startsWith("npc_") && hasRelationship(state, playerAction.targetId)) {
            changes.push({ op: "inc", path: relationshipPath(playerAction.targetId, "respect"), delta: 1, reason: "自由谈判提升目标尊重" });
          }
          break;
        case "trade":
          if (
            !roll.socialLeverage?.acceptedChips.some(
              (chip) => chip.resource === "money",
            ) &&
            (state.player.resources.money ?? 0) > 0
          ) {
            changes.push({ op: "inc", path: "player.resources.money", delta: -1, reason: "自由交易消耗金钱" });
          }
          changes.push({ op: "inc", path: "player.resources.favor", delta: 1, reason: "自由交易换来可用人情" });
          break;
        case "travel":
          if (playerAction.targetId && state.locations[playerAction.targetId]) {
            changes.push({ op: "set", path: "currentLocationId", value: playerAction.targetId, reason: "自由移动改变当前场景" });
          }
          break;
        case "rest":
          changes.push({ op: "inc", path: "player.resources.stamina", delta: 1, reason: "自由休整恢复体力" });
          break;
        case "fight":
          changes.push({ op: "tag", path: "player.reputationTags", value: "自由行动斗士", reason: "自由暴力行动改变公开名声" });
          addClockInc(changes, state, "martial_lockdown", 1, "自由暴力行动提高戒严压力");
          break;
        case "ignore":
          break;
      }
      publicSummary = `自由行动按“${inferredIntentLabel}”推进：${freeformText}${customTargetSummary}${freeformBoundarySummary}`;
      hiddenSummary = "自由行动文本只代表玩家意图；数值和世界状态后果仍由裁判规则决定。";
    } else {
      changes.push(
        { op: "inc", path: "player.resources.pressure", delta: 1, reason: "自由行动受阻提高压力" },
        {
          op: "append",
          path: "publicEvents",
          value: event(
            state,
            turnId,
            "自由行动受阻",
            `玩家意图：${freeformText}。裁判将意图判定为“${inferredIntentLabel}”，但局势没有按预想展开。${customTargetNote}${freeformBoundaryNote}`,
            [...freeformTags, "setback"]
          ),
          reason: "记录自由行动受阻"
        }
      );
      if (inferredIntent === "fight") {
        addClockInc(changes, state, "martial_lockdown", 1, "失败的自由暴力行动仍提高戒严压力");
      }
      publicSummary = `自由行动按“${inferredIntentLabel}”受阻：${freeformText}${customTargetSummary}${freeformBoundarySummary}`;
      hiddenSummary = "裁判没有把玩家叙述直接当作事实，只记录了合法的受阻后果。";
    }
  } else if (playerAction.actionType === "rest" || playerAction.actionType === "ignore") {
    changes.push(
      { op: "inc", path: "player.resources.stamina", delta: 1, reason: "玩家降低直接消耗" },
      { op: "append", path: "publicEvents", value: event(state, turnId, "局势自行推进", "玩家暂时没有强力介入，瘟疫和矿区合同都向前走了一步。", ["downtime", "clock"]), reason: "记录公共结果" }
    );
    addClockInc(changes, state, "plague_spread", 1, "玩家不介入时危机自行推进");
    addClockInc(changes, state, "mine_takeover", 1, "商会利用空档推进计划");
    publicSummary = "玩家保留体力，但危机没有等待。";
    hiddenSummary = "教团和商会都把沉默视为可利用的空隙。";
  } else if (playerAction.actionType === "fight") {
    const nonApLeverageBonus = Math.min(2, mechanicalLeverageOf(playerAction.leverage).filter((item) => !item.startsWith("ap:")).length);
    const combat = resolveCombatRound({
      state,
      plan: combatPlanOf(playerAction),
      seed,
      difficulty: roll.difficulty,
      leverageBonus: nonApLeverageBonus,
      ...(playerAction.targetId ? { targetId: playerAction.targetId } : {})
    });
    visibleRoll = {
      dice: combat.roll.dice,
      attribute: "physique",
      skill: "melee",
      modifier: combat.roll.modifier,
      difficulty: combat.roll.difficulty,
      total: combat.roll.total,
      level: combat.roll.level,
      label: combat.roll.label
    };
    changes.push(...combat.patch.changes);
    if (combat.outcome === "player_setback") {
      addClockInc(changes, state, "martial_lockdown", 1, "公开冲突推动戒严");
    } else {
      changes.push(
        { op: "tag", path: "player.reputationTags", value: "敢于动手的人", reason: "公开武力改变声望" }
      );
    }
    changes.push({ op: "append", path: "publicEvents", value: event(state, turnId, "冲突爆发", "刀剑出鞘后，所有阵营都重新评估玩家的危险程度。", ["combat"]), reason: "记录公共结果" });
    publicSummary =
      combat.outcome === "player_setback"
        ? `3 AP 战斗失利，玩家承受伤害或压力，戒严压力上升。${combat.publicSummary}`
        : `3 AP 战斗得手，玩家获得声势，但声望也变得更危险。${combat.publicSummary}`;
    hiddenSummary = "哈根会开始关注玩家是否适合被雇佣或清除。";
  }

  if (roll.level === "critical_success") {
    changes.push({ op: "inc", path: "player.momentum", delta: 1, reason: "大成功额外获得声势" });
  }
  if (roll.level === "critical_failure") {
    changes.push({ op: "inc", path: "player.resources.pressure", delta: 1, reason: "大失败带来压力" });
  }

  addStrategicConsequences(changes, state, playerAction, advance);
  const playerSucceeded = isSuccess(visibleRoll.level);
  changes.push(
    ...resolveFactionPlans(state, {
      actionType: playerAction.actionType,
      success: playerSucceeded,
      ...(playerAction.targetId ? { targetId: playerAction.targetId } : {})
    }).changes
  );
  changes.push(...resolveConditionUpkeep(state, playerAction.actionType).changes);
  addRecoveryConsequences(changes, state, playerAction, playerSucceeded, turnId);
  addScenarioClockConsequences(changes, state, playerAction, playerSucceeded, turnId);

  return {
    roll: visibleRoll,
    patch: { type: "state_patch", source: "referee", changes },
    publicSummary,
    hiddenSummary
  };
};
