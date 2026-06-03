import type { AgentActionProposal, CharacterState, FactionState, PlayerAction, WorldState } from "@agentic-turnscape/shared";

type VisibleFactionContext = Pick<
  FactionState,
  "id" | "name" | "publicGoal" | "leader" | "resources" | "baseId" | "allies" | "enemies" | "style" | "currentPlan" | "clockIds"
>;

export type LimitedObservation = {
  actor: Pick<
    CharacterState,
    | "id"
    | "name"
    | "role"
    | "publicImage"
    | "truePersonality"
    | "desire"
    | "fear"
    | "shortTermGoal"
    | "longTermGoal"
    | "bottomLine"
    | "weakness"
    | "resources"
    | "conditions"
    | "knownFacts"
    | "memorySummary"
  >;
  time: WorldState["time"];
  location: {
    id: string;
    name: string;
    description: string;
    publicInfo: string[];
    tags: string[];
    dangerLevel: number;
  };
  visibleClocks: Array<{ id: string; name: string; progress: number; max: number; consequence: string }>;
  actorFaction?: VisibleFactionContext;
  recentPublicEvents: Array<{ title: string; body: string; tags: string[] }>;
  relationshipToPlayer?: unknown;
  playerAction: PlayerAction;
};

const visibleFactionContext = (actor: CharacterState, state: WorldState): VisibleFactionContext | undefined => {
  if (!actor.factionId) return undefined;
  const faction = state.factions[actor.factionId];
  if (!faction) return undefined;

  return {
    id: faction.id,
    name: faction.name,
    publicGoal: faction.publicGoal,
    leader: faction.leader,
    resources: faction.resources,
    baseId: faction.baseId,
    allies: faction.allies,
    enemies: faction.enemies,
    style: faction.style,
    currentPlan: faction.currentPlan,
    clockIds: faction.clockIds
  };
};

export const buildLimitedObservation = (
  actorId: string,
  state: WorldState,
  playerAction: PlayerAction
): LimitedObservation | undefined => {
  const actor = state.characters[actorId];
  const location = state.locations[state.currentLocationId];
  if (!actor || !location) return undefined;

  const relationshipToPlayer = state.relationships[`player:${actorId}`];
  const actorFaction = visibleFactionContext(actor, state);
  return {
    actor: {
      id: actor.id,
      name: actor.name,
      role: actor.role,
      publicImage: actor.publicImage,
      truePersonality: actor.truePersonality,
      desire: actor.desire,
      fear: actor.fear,
      shortTermGoal: actor.shortTermGoal,
      longTermGoal: actor.longTermGoal,
      bottomLine: actor.bottomLine,
      weakness: actor.weakness,
      resources: actor.resources,
      conditions: actor.conditions,
      knownFacts: actor.knownFacts,
      memorySummary: actor.memorySummary
    },
    time: state.time,
    location: {
      id: location.id,
      name: location.name,
      description: location.description,
      publicInfo: location.publicInfo,
      tags: location.tags,
      dangerLevel: location.dangerLevel
    },
    visibleClocks: Object.values(state.clocks)
      .filter((clock) => clock.visible)
      .map((clock) => ({ id: clock.id, name: clock.name, progress: clock.progress, max: clock.max, consequence: clock.consequence })),
    ...(actorFaction ? { actorFaction } : {}),
    recentPublicEvents: state.publicEvents.slice(-5).map((event) => ({ title: event.title, body: event.body, tags: event.tags })),
    relationshipToPlayer,
    playerAction
  };
};

export const npcSystemPrompt = `你正在扮演一个独立 NPC。你不是旁白，也不是规则裁判。

任务：
1. 根据你知道的信息做出符合角色目标、性格和资源的行动。
2. 不能使用自己不知道的信息。
3. 不能创造新能力、新资源或新身份。
4. 必须考虑风险、自保、关系和长期后果。
5. 行动必须可以被规则系统裁定。

只输出 JSON，字段为 actorId、intent、actionType、target、usedResources、proposedAction、riskLevel、fallback、publicReason、hiddenReason。`;

export const narratorSystemPrompt = `你是叙事者，只负责把已经发生的裁判结果写成沉浸式文本。

硬规则：
1. 不能改变裁判结果。
2. 不能新增未经裁判确认的事实。
3. 不能替玩家决定内心感受。
4. 必须让玩家清楚知道发生了什么、为什么大致会这样、后果是什么、下一步有哪些明显选择。

输出一段 120 到 220 字的中文叙事。`;

export const scriptedProposal = (actorId: string, state: WorldState, playerAction: PlayerAction): AgentActionProposal => {
  const actor = state.characters[actorId];
  if (!actor) {
    return {
      actorId,
      intent: "维持当前计划",
      actionType: "wait",
      usedResources: [],
      proposedAction: "暂不采取明显行动",
      riskLevel: "low",
      publicReason: "局势尚未触及自己的核心目标"
    };
  }

  if (actorId === "npc_adele") {
    return {
      actorId,
      intent: "保护诊所中的感染者，同时避免直接开战",
      actionType: "negotiation",
      target: "npc_rowan",
      usedResources: ["medicine", "reputation"],
      proposedAction: "请求城防军给自己半天时间进行隔离诊断",
      riskLevel: "medium",
      fallback: "如果谈判失败，请求玩家护送重症病人离开",
      publicReason: "我需要时间确认他们是否真的有传染性",
      hiddenReason: "我怀疑这不是普通瘟疫，而是矿区污染"
    };
  }

  if (actorId === "npc_rowan") {
    return {
      actorId,
      intent: "防止瘟疫扩散，同时避免街头流血",
      actionType: "containment",
      target: "clinic",
      usedResources: ["guards", "authority"],
      proposedAction: "要求交出感染者，但允许医生提交明确隔离方案",
      riskLevel: "medium",
      fallback: "现场失控则封锁街道",
      publicReason: "我不能让整条街暴露在感染风险下",
      hiddenReason: "我没有足够医学判断，只能压住局势"
    };
  }

  if (actorId === "npc_zhou_jin") {
    return {
      actorId,
      intent: "保护玩家和医生，不让冲突先升级",
      actionType: "observe",
      target: "crowd",
      usedResources: ["contacts"],
      proposedAction: "观察人群中重复煽动谣言的人，并准备掩护撤退",
      riskLevel: "low",
      fallback: "城防军拔刀时带玩家从侧巷撤离",
      publicReason: "人群里的火不是自己烧起来的",
      hiddenReason: "旧哨站那件事可能又有人在灭口"
    };
  }

  if (actorId === "npc_manlo") {
    return {
      actorId,
      intent: "降低商会暴露风险，同时推动矿区收购",
      actionType: "manipulation",
      target: "crowd",
      usedResources: ["money", "influence"],
      proposedAction: "让灰衣密探散布诊所隐瞒瘟疫的谣言",
      riskLevel: "high",
      fallback: "如果密探暴露，则切断与走私派的公开联系",
      publicReason: "商会只是关心小镇安全",
      hiddenReason: "诊所失去公信力后，矿区收购阻力会下降"
    };
  }

  if (actorId === "npc_eve") {
    return {
      actorId,
      intent: "把被拒绝的病人带去礼拜堂，同时避免狂信派接触米娜",
      actionType: "offer_help",
      target: "npc_mina",
      usedResources: ["shelter", "faith"],
      proposedAction: "提出教团可以临时收留无法留在诊所的病人",
      riskLevel: "medium",
      fallback: "私下提醒玩家不要让米娜落到狂信派手中",
      publicReason: "裂隙影响者也应该被照顾",
      hiddenReason: "我听见过仪式名单里有孩子的名字"
    };
  }

  return {
    actorId,
    intent: actor.shortTermGoal,
    actionType: "advance_goal",
    target: playerAction.targetId,
    usedResources: Object.keys(actor.resources).slice(0, 2),
    proposedAction: `${actor.name}围绕“${actor.shortTermGoal}”采取谨慎行动。`,
    riskLevel: "medium",
    publicReason: actor.publicImage,
    hiddenReason: actor.secret
  };
};
