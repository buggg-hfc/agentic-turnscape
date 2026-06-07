import type { PlayerAction, RiskLevel, WorldState } from "./schemas.js";

export type CreatorActionType = Exclude<PlayerAction["actionType"], "custom">;

export type CreatorScenarioDraftInput = {
  id: string;
  title: string;
  premise: string;
  playerName: string;
  startLocationName: string;
  pressureLocationName: string;
  crisisName: string;
  crisisInitialProgress: number;
  crisisMax: number;
  crisisConsequence: string;
  guideName: string;
  pressureNpcName: string;
  allyFactionName: string;
  pressureFactionName: string;
  mainQuestGoal: string;
  mainQuestRealBackground: string;
  mainQuestHiddenGoal: string;
  mainQuestFailureConsequence: string;
  mainQuestLongTermImpact: string;
  primaryActionType: CreatorActionType;
  primaryActionLabel: string;
  primaryActionDescription: string;
  primaryActionRiskLevel: RiskLevel;
  secondaryActionType: CreatorActionType;
  secondaryActionLabel: string;
  secondaryActionDescription: string;
  secondaryActionRiskLevel: RiskLevel;
  tertiaryActionType: CreatorActionType;
  tertiaryActionLabel: string;
  tertiaryActionDescription: string;
  tertiaryActionRiskLevel: RiskLevel;
  successEndingTitle: string;
  successEndingSummary: string;
  pressureEndingTitle: string;
  pressureEndingSummary: string;
};

export type CreatorScenarioDraft = Record<string, unknown> & {
  id: string;
  title: string;
  world: WorldState;
  days: Array<{
    day: number;
    mainEvent: string;
    defaultLocationId: string;
    sceneIds: string[];
    clockPressure: string[];
  }>;
  scenes: Array<{
    id: string;
    name: string;
    kind: "combat" | "social" | "exploration";
    day: number;
    locationId: string;
    npcIds: string[];
    crisisClockIds: string[];
    nonCombatSolutions: string[];
  }>;
  actions: PlayerAction[];
  endings: Array<{
    id: string;
    title: string;
    summary: string;
    when: {
      clockAtMax?: string;
      momentumAtLeast?: number;
    };
  }>;
};

export const defaultCreatorScenarioDraftInput: CreatorScenarioDraftInput = {
  id: "my-scenario",
  title: "我的剧本",
  premise: "一个小镇在三天内必须处理突然爆发的危机。",
  playerName: "调查者",
  startLocationName: "临时指挥所",
  pressureLocationName: "危机现场",
  crisisName: "局势失控",
  crisisInitialProgress: 0,
  crisisMax: 4,
  crisisConsequence: "局势失控满格时，施压阵营会夺取局势解释权。",
  guideName: "向导",
  pressureNpcName: "施压代表",
  allyFactionName: "本地互助会",
  pressureFactionName: "施压者联盟",
  mainQuestGoal: "在三天内稳住危机并给出公开解释。",
  mainQuestRealBackground: "施压阵营正在遮掩一条能改变公众判断的关键证据。",
  mainQuestHiddenGoal: "找出谁在推动危机失控。",
  mainQuestFailureConsequence: "施压阵营将获得危机后的解释权。",
  mainQuestLongTermImpact: "剧本可以扩展成长线章节、基地项目和阵营战线。",
  primaryActionType: "negotiate",
  primaryActionLabel: "安抚现场",
  primaryActionDescription: "稳住现场并推动剧本稳定度。",
  primaryActionRiskLevel: "medium",
  secondaryActionType: "investigate",
  secondaryActionLabel: "追查源头",
  secondaryActionDescription: "追查关键证据并阻止施压阵营独占解释权。",
  secondaryActionRiskLevel: "high",
  tertiaryActionType: "protect",
  tertiaryActionLabel: "争取证人",
  tertiaryActionDescription: "保护愿意开口的证人并转化为公开证词。",
  tertiaryActionRiskLevel: "medium",
  successEndingTitle: "局势稳定",
  successEndingSummary: "居民看见了可执行的未来，危机被转化为长期优势。",
  pressureEndingTitle: "危机失控",
  pressureEndingSummary: "施压阵营夺取解释权，玩家必须在新局势里继续周旋。",
};

export const normalizeCreatorScenarioId = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return normalized || "creator-scenario";
};

const textOr = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const riskOr = (
  value: RiskLevel | undefined,
  fallback: RiskLevel,
): RiskLevel => value ?? fallback;

const actionTypeOr = (
  value: CreatorActionType | undefined,
  fallback: CreatorActionType,
): CreatorActionType => value ?? fallback;

const boundedInt = (
  value: number,
  fallback: number,
  min: number,
  max?: number,
) => {
  const integer = Number.isFinite(value) ? Math.trunc(value) : fallback;
  const lowerBounded = Math.max(min, integer);
  return max === undefined ? lowerBounded : Math.min(max, lowerBounded);
};

export const buildCreatorScenarioDraft = (
  input: CreatorScenarioDraftInput,
): CreatorScenarioDraft => {
  const id = normalizeCreatorScenarioId(input.id);
  const prefix = id.replace(/-/g, "_");
  const title = textOr(input.title, defaultCreatorScenarioDraftInput.title);
  const premise = textOr(input.premise, defaultCreatorScenarioDraftInput.premise);
  const playerName = textOr(
    input.playerName,
    defaultCreatorScenarioDraftInput.playerName,
  );
  const startLocationName = textOr(
    input.startLocationName,
    defaultCreatorScenarioDraftInput.startLocationName,
  );
  const pressureLocationName = textOr(
    input.pressureLocationName,
    defaultCreatorScenarioDraftInput.pressureLocationName,
  );
  const crisisName = textOr(
    input.crisisName,
    defaultCreatorScenarioDraftInput.crisisName,
  );
  const crisisMax = boundedInt(
    input.crisisMax,
    defaultCreatorScenarioDraftInput.crisisMax,
    1,
  );
  const crisisInitialProgress = boundedInt(
    input.crisisInitialProgress,
    defaultCreatorScenarioDraftInput.crisisInitialProgress,
    0,
    crisisMax,
  );
  const crisisConsequence = textOr(
    input.crisisConsequence,
    defaultCreatorScenarioDraftInput.crisisConsequence,
  );
  const guideName = textOr(
    input.guideName,
    defaultCreatorScenarioDraftInput.guideName,
  );
  const pressureNpcName = textOr(
    input.pressureNpcName,
    defaultCreatorScenarioDraftInput.pressureNpcName,
  );
  const allyFactionName = textOr(
    input.allyFactionName,
    defaultCreatorScenarioDraftInput.allyFactionName,
  );
  const pressureFactionName = textOr(
    input.pressureFactionName,
    defaultCreatorScenarioDraftInput.pressureFactionName,
  );
  const mainQuestGoal = textOr(
    input.mainQuestGoal,
    defaultCreatorScenarioDraftInput.mainQuestGoal,
  );
  const mainQuestRealBackground = textOr(
    input.mainQuestRealBackground,
    defaultCreatorScenarioDraftInput.mainQuestRealBackground,
  );
  const mainQuestHiddenGoal = textOr(
    input.mainQuestHiddenGoal,
    defaultCreatorScenarioDraftInput.mainQuestHiddenGoal,
  );
  const mainQuestFailureConsequence = textOr(
    input.mainQuestFailureConsequence,
    defaultCreatorScenarioDraftInput.mainQuestFailureConsequence,
  );
  const mainQuestLongTermImpact = textOr(
    input.mainQuestLongTermImpact,
    defaultCreatorScenarioDraftInput.mainQuestLongTermImpact,
  );
  const primaryActionType = actionTypeOr(
    input.primaryActionType,
    defaultCreatorScenarioDraftInput.primaryActionType,
  );
  const primaryActionLabel = textOr(
    input.primaryActionLabel,
    defaultCreatorScenarioDraftInput.primaryActionLabel,
  );
  const primaryActionDescription = textOr(
    input.primaryActionDescription,
    defaultCreatorScenarioDraftInput.primaryActionDescription,
  );
  const primaryActionRiskLevel = riskOr(
    input.primaryActionRiskLevel,
    defaultCreatorScenarioDraftInput.primaryActionRiskLevel,
  );
  const secondaryActionType = actionTypeOr(
    input.secondaryActionType,
    defaultCreatorScenarioDraftInput.secondaryActionType,
  );
  const secondaryActionLabel = textOr(
    input.secondaryActionLabel,
    defaultCreatorScenarioDraftInput.secondaryActionLabel,
  );
  const secondaryActionDescription = textOr(
    input.secondaryActionDescription,
    defaultCreatorScenarioDraftInput.secondaryActionDescription,
  );
  const secondaryActionRiskLevel = riskOr(
    input.secondaryActionRiskLevel,
    defaultCreatorScenarioDraftInput.secondaryActionRiskLevel,
  );
  const tertiaryActionType = actionTypeOr(
    input.tertiaryActionType,
    defaultCreatorScenarioDraftInput.tertiaryActionType,
  );
  const tertiaryActionLabel = textOr(
    input.tertiaryActionLabel,
    defaultCreatorScenarioDraftInput.tertiaryActionLabel,
  );
  const tertiaryActionDescription = textOr(
    input.tertiaryActionDescription,
    defaultCreatorScenarioDraftInput.tertiaryActionDescription,
  );
  const tertiaryActionRiskLevel = riskOr(
    input.tertiaryActionRiskLevel,
    defaultCreatorScenarioDraftInput.tertiaryActionRiskLevel,
  );
  const successEndingTitle = textOr(
    input.successEndingTitle,
    defaultCreatorScenarioDraftInput.successEndingTitle,
  );
  const successEndingSummary = textOr(
    input.successEndingSummary,
    defaultCreatorScenarioDraftInput.successEndingSummary,
  );
  const pressureEndingTitle = textOr(
    input.pressureEndingTitle,
    defaultCreatorScenarioDraftInput.pressureEndingTitle,
  );
  const pressureEndingSummary = textOr(
    input.pressureEndingSummary,
    defaultCreatorScenarioDraftInput.pressureEndingSummary,
  );

  const startLocationId = `${prefix}_start`;
  const pressureLocationId = `${prefix}_pressure_site`;
  const guideId = `${prefix}_guide`;
  const pressureNpcId = `${prefix}_pressure_lead`;
  const allyFactionId = `${prefix}_allies`;
  const pressureFactionId = `${prefix}_pressure`;
  const questId = `${prefix}_main_quest`;
  const stabilityClockId = `${prefix}_stability`;
  const pressureClockId = `${prefix}_pressure_clock`;
  const socialSceneId = `${prefix}_opening_social`;
  const combatSceneId = `${prefix}_pressure_combat`;
  const finalSceneId = `${prefix}_final_choice`;

  const world: WorldState = {
    time: { day: 1, phase: "morning" },
    currentLocationId: startLocationId,
    player: {
      id: "player",
      name: playerName,
      attributes: {
        physique: 2,
        agility: 2,
        knowledge: 2,
        insight: 2,
        charm: 2,
        will: 2,
      },
      skills: {
        social: 2,
        investigation: 2,
        defense: 1,
        survival: 1,
        melee: 1,
        insight: 1,
      },
      resources: {
        health: 5,
        stamina: 3,
        pressure: 0,
        money: 1,
        intel: 1,
      },
      conditions: [],
      reputationTags: ["creator_draft"],
      momentum: 0,
    },
    locations: {
      [startLocationId]: {
        id: startLocationId,
        name: startLocationName,
        description: `${startLocationName}里挤满了等待消息的人，${crisisName}正在逼近公开爆发。`,
        publicInfo: [
          premise,
          `${guideName}愿意协助玩家先稳住局面。`,
        ],
        hiddenInfo: [`${pressureFactionName}有人希望危机继续扩大。`],
        tags: ["creator", "start"],
        dangerLevel: 1,
      },
      [pressureLocationId]: {
        id: pressureLocationId,
        name: pressureLocationName,
        description: `${pressureLocationName}聚集着${crisisName}的迹象，任何迟疑都会让${pressureFactionName}取得主动。`,
        publicInfo: [
          `${allyFactionName}需要玩家带回可公开说明的证据。`,
          `${pressureFactionName}正在催促人群做出仓促选择。`,
        ],
        hiddenInfo: [`真正的转折点藏在${pressureLocationName}的证据链里。`],
        tags: ["creator", "pressure"],
        dangerLevel: 3,
      },
    },
    characters: {
      [guideId]: {
        id: guideId,
        name: guideName,
        role: "本地向导",
        factionId: allyFactionId,
        publicImage: `熟悉${startLocationName}的人，愿意给玩家第一份可信情报。`,
        truePersonality: "务实、谨慎，但愿意押注在能承担后果的人身上。",
        desire: `阻止${crisisName}伤害更多普通人。`,
        fear: `${pressureFactionName}把局势推向不可挽回。`,
        shortTermGoal: "协助玩家建立第一条公开线索。",
        longTermGoal: `让${allyFactionName}在危机后还能被信任。`,
        secret: "曾经和施压阵营做过一次失败交易。",
        bottomLine: "不会牺牲无辜者来换取短期胜利。",
        weakness: "太容易把责任背到自己身上。",
        attributes: {
          physique: 1,
          agility: 2,
          knowledge: 2,
          insight: 3,
          charm: 2,
          will: 2,
        },
        skills: { social: 2, investigation: 2, defense: 1 },
        resources: { favors: 2, intel: 1 },
        conditions: [],
        knownFacts: [premise],
        memorySummary: "玩家刚进入创作者草稿剧本的第一场危机。",
      },
      [pressureNpcId]: {
        id: pressureNpcId,
        name: pressureNpcName,
        role: "施压代表",
        factionId: pressureFactionId,
        publicImage: `不断要求立刻处理${crisisName}的人。`,
        truePersonality: "精明、急躁，善于利用群体恐惧。",
        desire: `借${crisisName}扩大自身影响力。`,
        fear: "玩家找到可以公开验证的证据。",
        shortTermGoal: "把现场选择推向对自己有利的一边。",
        longTermGoal: `让${pressureFactionName}控制危机后的规则。`,
        secret: "隐藏了一条会改变公众判断的证据。",
        bottomLine: "不会主动承认自己制造了恐慌。",
        weakness: "害怕被迫在公开场合解释细节。",
        attributes: {
          physique: 2,
          agility: 2,
          knowledge: 2,
          insight: 2,
          charm: 3,
          will: 2,
        },
        skills: { social: 2, investigation: 1, defense: 2 },
        resources: { influence: 2, money: 1 },
        conditions: [],
        knownFacts: [`${crisisName}已经被用来动员人群。`],
        memorySummary: "仍在观察玩家是否能真正改变局势。",
      },
    },
    factions: {
      [allyFactionId]: {
        id: allyFactionId,
        name: allyFactionName,
        publicGoal: `公开处理${crisisName}，让居民看到可执行的办法。`,
        hiddenGoal: "保护组织里曾经犯错的人不被立即清算。",
        leader: guideId,
        resources: { volunteers: 2, supplies: 2 },
        baseId: startLocationId,
        allies: [],
        enemies: [pressureFactionId],
        internalConflict: "有人想公开全部真相，有人担心真相会引发二次混乱。",
        style: "稳住现场、收集证据、争取居民信任。",
        bottomLine: "不能让无辜者替危机背锅。",
        currentPlan: `先把${startLocationName}变成可信的协商点。`,
        clockIds: [stabilityClockId],
      },
      [pressureFactionId]: {
        id: pressureFactionId,
        name: pressureFactionName,
        publicGoal: `要求立刻用强硬方式终止${crisisName}。`,
        hiddenGoal: "借危机后续规则获得长期控制权。",
        leader: pressureNpcId,
        resources: { enforcers: 2, leverage: 2 },
        baseId: pressureLocationId,
        allies: [],
        enemies: [allyFactionId],
        internalConflict: "强硬派想马上行动，算计派想等玩家犯错。",
        style: "制造时间压力，把复杂问题简化成二选一。",
        bottomLine: "不会放弃通过恐惧扩大影响力的机会。",
        currentPlan: `把${crisisName}塑造成只能由自己解决的问题。`,
        clockIds: [pressureClockId],
      },
    },
    relationships: {
      [`player:${guideId}`]: {
        trust: 1,
        affinity: 0,
        respect: 0,
        fear: 0,
        interest: 1,
        debt: 0,
        suspicion: 0,
      },
      [`player:${pressureNpcId}`]: {
        trust: 0,
        affinity: 0,
        respect: 0,
        fear: 0,
        interest: 1,
        debt: 0,
        suspicion: 1,
      },
    },
    quests: {
      [questId]: {
        id: questId,
        name: `${title}主线`,
        trigger: premise,
        patron: guideId,
        realBackground: mainQuestRealBackground,
        surfaceGoal: mainQuestGoal,
        hiddenGoal: mainQuestHiddenGoal,
        locationIds: [startLocationId, pressureLocationId],
        npcIds: [guideId, pressureNpcId],
        factionIds: [allyFactionId, pressureFactionId],
        solutionTypes: ["negotiate", "investigate", "fight"],
        failureConsequence: mainQuestFailureConsequence,
        longTermImpact: mainQuestLongTermImpact,
        status: "active",
      },
    },
    clocks: {
      [stabilityClockId]: {
        id: stabilityClockId,
        name: `${title}稳定度`,
        progress: 0,
        max: 4,
        consequence: "稳定度满格时，玩家能把危机转化为长期优势。",
        visible: true,
      },
      [pressureClockId]: {
        id: pressureClockId,
        name: crisisName,
        progress: crisisInitialProgress,
        max: crisisMax,
        consequence: crisisConsequence,
        visible: true,
      },
    },
    publicEvents: [
      {
        id: `evt_${prefix}_start`,
        turnId: "setup",
        day: 1,
        phase: "morning",
        title: `${title}开始`,
        body: premise,
        tags: ["creator", id],
        createdAt: "2026-06-07T00:00:00.000Z",
      },
    ],
    hiddenEvents: [],
  };

  return {
    id,
    title,
    world,
    days: [
      {
        day: 1,
        mainEvent: `${title}：${premise}`,
        defaultLocationId: startLocationId,
        sceneIds: [socialSceneId],
        clockPressure: [pressureClockId],
      },
      {
        day: 2,
        mainEvent: `${pressureFactionName}公开施压，${crisisName}进入危险阶段。`,
        defaultLocationId: pressureLocationId,
        sceneIds: [combatSceneId],
        clockPressure: [pressureClockId, stabilityClockId],
      },
      {
        day: 3,
        mainEvent: `玩家必须决定${title}之后由谁来解释真相。`,
        defaultLocationId: startLocationId,
        sceneIds: [finalSceneId],
        clockPressure: [stabilityClockId],
      },
    ],
    scenes: [
      {
        id: socialSceneId,
        name: `${startLocationName}协商`,
        kind: "social",
        day: 1,
        locationId: startLocationId,
        npcIds: [guideId, pressureNpcId],
        crisisClockIds: [pressureClockId],
        nonCombatSolutions: ["negotiate", "protect", "investigate"],
      },
      {
        id: combatSceneId,
        name: `${pressureLocationName}冲突`,
        kind: "combat",
        day: 2,
        locationId: pressureLocationId,
        npcIds: [pressureNpcId],
        crisisClockIds: [pressureClockId, stabilityClockId],
        nonCombatSolutions: ["negotiate", "withdraw", "investigate"],
      },
      {
        id: finalSceneId,
        name: `${title}最终选择`,
        kind: "exploration",
        day: 3,
        locationId: startLocationId,
        npcIds: [guideId, pressureNpcId],
        crisisClockIds: [stabilityClockId],
        nonCombatSolutions: ["negotiate", "investigate"],
      },
    ],
    actions: [
      {
        id: `${prefix}_primary_action`,
        actionType: primaryActionType,
        label: primaryActionLabel,
        description: primaryActionDescription,
        targetId: guideId,
        leverage: [
          `scenario:${id}`,
          `clock:${stabilityClockId}`,
          "creator_draft",
        ],
        riskLevel: primaryActionRiskLevel,
      },
      {
        id: `${prefix}_secondary_action`,
        actionType: secondaryActionType,
        label: secondaryActionLabel,
        description: secondaryActionDescription,
        targetId: pressureLocationId,
        leverage: [
          `scenario:${id}`,
          `clock:${stabilityClockId}`,
          `pressureClock:${pressureClockId}`,
          "creator_draft",
        ],
        riskLevel: secondaryActionRiskLevel,
      },
      {
        id: `${prefix}_tertiary_action`,
        actionType: tertiaryActionType,
        label: tertiaryActionLabel,
        description: tertiaryActionDescription,
        targetId: guideId,
        leverage: [
          `scenario:${id}`,
          `clock:${stabilityClockId}`,
          "creator_draft",
        ],
        riskLevel: tertiaryActionRiskLevel,
      },
    ],
    endings: [
      {
        id: `${prefix}_stabilized`,
        title: successEndingTitle,
        summary: successEndingSummary,
        when: { momentumAtLeast: 3 },
      },
      {
        id: `${prefix}_pressure_wins`,
        title: pressureEndingTitle,
        summary: pressureEndingSummary,
        when: { clockAtMax: pressureClockId },
      },
    ],
  };
};
