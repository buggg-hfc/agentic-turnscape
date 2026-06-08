import type { PlayerAction, RiskLevel, WorldState } from "./schemas.js";

export type CreatorActionType = Exclude<PlayerAction["actionType"], "custom">;
export type CreatorActionTarget =
  | "guide"
  | "pressureNpc"
  | "startLocation"
  | "pressureLocation";

export type CreatorScenarioDraftInput = {
  id: string;
  title: string;
  premise: string;
  playerName: string;
  playerHealth?: number;
  playerStamina?: number;
  playerMoney?: number;
  playerIntel?: number;
  playerSocialSkill?: number;
  playerInvestigationSkill?: number;
  playerPhysique?: number;
  playerAgility?: number;
  playerKnowledge?: number;
  playerInsight?: number;
  playerCharm?: number;
  playerWill?: number;
  startLocationName: string;
  startLocationDescription: string;
  startLocationPublicInfo: string;
  startLocationHiddenInfo: string;
  startLocationDangerLevel: number;
  pressureLocationName: string;
  pressureLocationDescription: string;
  pressureLocationPublicInfo: string;
  pressureLocationHiddenInfo: string;
  pressureLocationDangerLevel: number;
  crisisName: string;
  crisisInitialProgress: number;
  crisisMax: number;
  crisisConsequence: string;
  guideName: string;
  guideRole: string;
  guidePublicImage: string;
  guideShortTermGoal: string;
  guideSecret: string;
  pressureNpcName: string;
  pressureNpcRole: string;
  pressureNpcPublicImage: string;
  pressureNpcShortTermGoal: string;
  pressureNpcSecret: string;
  allyFactionName: string;
  pressureFactionName: string;
  allyFactionPublicGoal: string;
  allyFactionCurrentPlan: string;
  allyFactionResources: string;
  pressureFactionPublicGoal: string;
  pressureFactionCurrentPlan: string;
  pressureFactionResources: string;
  mainQuestGoal: string;
  mainQuestRealBackground: string;
  mainQuestHiddenGoal: string;
  mainQuestFailureConsequence: string;
  mainQuestLongTermImpact: string;
  primaryActionType: CreatorActionType;
  primaryActionTarget: CreatorActionTarget;
  primaryActionLabel: string;
  primaryActionDescription: string;
  primaryActionRiskLevel: RiskLevel;
  secondaryActionType: CreatorActionType;
  secondaryActionTarget: CreatorActionTarget;
  secondaryActionLabel: string;
  secondaryActionDescription: string;
  secondaryActionRiskLevel: RiskLevel;
  tertiaryActionType: CreatorActionType;
  tertiaryActionTarget: CreatorActionTarget;
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
  playerHealth: 5,
  playerStamina: 3,
  playerMoney: 1,
  playerIntel: 1,
  playerSocialSkill: 2,
  playerInvestigationSkill: 2,
  playerPhysique: 2,
  playerAgility: 2,
  playerKnowledge: 2,
  playerInsight: 2,
  playerCharm: 2,
  playerWill: 2,
  startLocationName: "临时指挥所",
  startLocationDescription: "临时指挥所里挤满了等待消息的人，危机正在逼近公开爆发。",
  startLocationPublicInfo: "居民正在等待可信消息;向导愿意协助玩家先稳住局面",
  startLocationHiddenInfo: "施压阵营有人希望危机继续扩大",
  startLocationDangerLevel: 1,
  pressureLocationName: "危机现场",
  pressureLocationDescription: "危机现场聚集着事件迹象，任何迟疑都会让施压阵营取得主动。",
  pressureLocationPublicInfo: "支援阵营需要可公开说明的证据;施压阵营正在催促人群做出仓促选择",
  pressureLocationHiddenInfo: "真正的转折点藏在危机现场的证据链里",
  pressureLocationDangerLevel: 3,
  crisisName: "局势失控",
  crisisInitialProgress: 0,
  crisisMax: 4,
  crisisConsequence: "局势失控满格时，施压阵营会夺取局势解释权。",
  guideName: "向导",
  guideRole: "本地向导",
  guidePublicImage: "熟悉起始地点的人，愿意给玩家第一份可信情报。",
  guideShortTermGoal: "协助玩家建立第一条公开线索。",
  guideSecret: "曾经和施压阵营做过一次失败交易。",
  pressureNpcName: "施压代表",
  pressureNpcRole: "施压代表",
  pressureNpcPublicImage: "不断要求立刻处理危机的人。",
  pressureNpcShortTermGoal: "把现场选择推向对自己有利的一边。",
  pressureNpcSecret: "隐藏了一条会改变公众判断的证据。",
  allyFactionName: "本地互助会",
  pressureFactionName: "施压者联盟",
  allyFactionPublicGoal: "公开处理危机，让居民看到可执行的办法。",
  allyFactionCurrentPlan: "先把起始地点变成可信的协商点。",
  allyFactionResources: "志愿者:2,补给:2",
  pressureFactionPublicGoal: "要求立刻用强硬方式终止危机。",
  pressureFactionCurrentPlan: "把危机塑造成只能由自己解决的问题。",
  pressureFactionResources: "执行者:2,筹码:2",
  mainQuestGoal: "在三天内稳住危机并给出公开解释。",
  mainQuestRealBackground: "施压阵营正在遮掩一条能改变公众判断的关键证据。",
  mainQuestHiddenGoal: "找出谁在推动危机失控。",
  mainQuestFailureConsequence: "施压阵营将获得危机后的解释权。",
  mainQuestLongTermImpact: "剧本可以扩展成长线章节、基地项目和阵营战线。",
  primaryActionType: "negotiate",
  primaryActionTarget: "guide",
  primaryActionLabel: "安抚现场",
  primaryActionDescription: "稳住现场并推动剧本稳定度。",
  primaryActionRiskLevel: "medium",
  secondaryActionType: "investigate",
  secondaryActionTarget: "pressureLocation",
  secondaryActionLabel: "追查源头",
  secondaryActionDescription: "追查关键证据并阻止施压阵营独占解释权。",
  secondaryActionRiskLevel: "high",
  tertiaryActionType: "protect",
  tertiaryActionTarget: "guide",
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

const actionTargetOr = (
  value: CreatorActionTarget | undefined,
  fallback: CreatorActionTarget,
): CreatorActionTarget => value ?? fallback;

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

const parseResourceText = (value: string): Record<string, number> => {
  const entries = value
    .split(/[,\n;，；]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const resources: Record<string, number> = {};
  for (const entry of entries) {
    const [rawKey, rawAmount] = entry.split(/[:：=]/, 2);
    const key = rawKey?.trim();
    const amount = Number.parseInt(rawAmount?.trim() ?? "", 10);
    if (!key || !Number.isFinite(amount)) continue;
    resources[key] = Math.max(0, amount);
  }
  return resources;
};

const resourcesOr = (value: string, fallback: string): Record<string, number> => {
  const resources = parseResourceText(value);
  return Object.keys(resources).length > 0 ? resources : parseResourceText(fallback);
};

const parseListText = (value: string): string[] =>
  value
    .split(/[\n;；]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const listOr = (value: string, fallback: string): string[] => {
  const values = parseListText(value);
  return values.length > 0 ? values : parseListText(fallback);
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
  const playerHealth = boundedInt(
    input.playerHealth ?? defaultCreatorScenarioDraftInput.playerHealth ?? 5,
    defaultCreatorScenarioDraftInput.playerHealth ?? 5,
    1,
    9,
  );
  const playerStamina = boundedInt(
    input.playerStamina ?? defaultCreatorScenarioDraftInput.playerStamina ?? 3,
    defaultCreatorScenarioDraftInput.playerStamina ?? 3,
    1,
    9,
  );
  const playerMoney = boundedInt(
    input.playerMoney ?? defaultCreatorScenarioDraftInput.playerMoney ?? 1,
    defaultCreatorScenarioDraftInput.playerMoney ?? 1,
    0,
    9,
  );
  const playerIntel = boundedInt(
    input.playerIntel ?? defaultCreatorScenarioDraftInput.playerIntel ?? 1,
    defaultCreatorScenarioDraftInput.playerIntel ?? 1,
    0,
    9,
  );
  const playerSocialSkill = boundedInt(
    input.playerSocialSkill ??
      defaultCreatorScenarioDraftInput.playerSocialSkill ??
      2,
    defaultCreatorScenarioDraftInput.playerSocialSkill ?? 2,
    0,
    5,
  );
  const playerInvestigationSkill = boundedInt(
    input.playerInvestigationSkill ??
      defaultCreatorScenarioDraftInput.playerInvestigationSkill ??
      2,
    defaultCreatorScenarioDraftInput.playerInvestigationSkill ?? 2,
    0,
    5,
  );
  const playerPhysique = boundedInt(
    input.playerPhysique ?? defaultCreatorScenarioDraftInput.playerPhysique ?? 2,
    defaultCreatorScenarioDraftInput.playerPhysique ?? 2,
    1,
    5,
  );
  const playerAgility = boundedInt(
    input.playerAgility ?? defaultCreatorScenarioDraftInput.playerAgility ?? 2,
    defaultCreatorScenarioDraftInput.playerAgility ?? 2,
    1,
    5,
  );
  const playerKnowledge = boundedInt(
    input.playerKnowledge ??
      defaultCreatorScenarioDraftInput.playerKnowledge ??
      2,
    defaultCreatorScenarioDraftInput.playerKnowledge ?? 2,
    1,
    5,
  );
  const playerInsight = boundedInt(
    input.playerInsight ?? defaultCreatorScenarioDraftInput.playerInsight ?? 2,
    defaultCreatorScenarioDraftInput.playerInsight ?? 2,
    1,
    5,
  );
  const playerCharm = boundedInt(
    input.playerCharm ?? defaultCreatorScenarioDraftInput.playerCharm ?? 2,
    defaultCreatorScenarioDraftInput.playerCharm ?? 2,
    1,
    5,
  );
  const playerWill = boundedInt(
    input.playerWill ?? defaultCreatorScenarioDraftInput.playerWill ?? 2,
    defaultCreatorScenarioDraftInput.playerWill ?? 2,
    1,
    5,
  );
  const startLocationName = textOr(
    input.startLocationName,
    defaultCreatorScenarioDraftInput.startLocationName,
  );
  const startLocationDescription = textOr(
    input.startLocationDescription ?? "",
    defaultCreatorScenarioDraftInput.startLocationDescription,
  );
  const startLocationPublicInfo = listOr(
    input.startLocationPublicInfo ?? "",
    defaultCreatorScenarioDraftInput.startLocationPublicInfo,
  );
  const startLocationHiddenInfo = listOr(
    input.startLocationHiddenInfo ?? "",
    defaultCreatorScenarioDraftInput.startLocationHiddenInfo,
  );
  const startLocationDangerLevel = boundedInt(
    input.startLocationDangerLevel ?? defaultCreatorScenarioDraftInput.startLocationDangerLevel,
    defaultCreatorScenarioDraftInput.startLocationDangerLevel,
    0,
    5,
  );
  const pressureLocationName = textOr(
    input.pressureLocationName,
    defaultCreatorScenarioDraftInput.pressureLocationName,
  );
  const pressureLocationDescription = textOr(
    input.pressureLocationDescription ?? "",
    defaultCreatorScenarioDraftInput.pressureLocationDescription,
  );
  const pressureLocationPublicInfo = listOr(
    input.pressureLocationPublicInfo ?? "",
    defaultCreatorScenarioDraftInput.pressureLocationPublicInfo,
  );
  const pressureLocationHiddenInfo = listOr(
    input.pressureLocationHiddenInfo ?? "",
    defaultCreatorScenarioDraftInput.pressureLocationHiddenInfo,
  );
  const pressureLocationDangerLevel = boundedInt(
    input.pressureLocationDangerLevel ?? defaultCreatorScenarioDraftInput.pressureLocationDangerLevel,
    defaultCreatorScenarioDraftInput.pressureLocationDangerLevel,
    0,
    5,
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
  const guideRole = textOr(
    input.guideRole ?? "",
    defaultCreatorScenarioDraftInput.guideRole,
  );
  const guidePublicImage = textOr(
    input.guidePublicImage ?? "",
    defaultCreatorScenarioDraftInput.guidePublicImage,
  );
  const guideShortTermGoal = textOr(
    input.guideShortTermGoal ?? "",
    defaultCreatorScenarioDraftInput.guideShortTermGoal,
  );
  const guideSecret = textOr(
    input.guideSecret ?? "",
    defaultCreatorScenarioDraftInput.guideSecret,
  );
  const pressureNpcName = textOr(
    input.pressureNpcName,
    defaultCreatorScenarioDraftInput.pressureNpcName,
  );
  const pressureNpcRole = textOr(
    input.pressureNpcRole ?? "",
    defaultCreatorScenarioDraftInput.pressureNpcRole,
  );
  const pressureNpcPublicImage = textOr(
    input.pressureNpcPublicImage ?? "",
    defaultCreatorScenarioDraftInput.pressureNpcPublicImage,
  );
  const pressureNpcShortTermGoal = textOr(
    input.pressureNpcShortTermGoal ?? "",
    defaultCreatorScenarioDraftInput.pressureNpcShortTermGoal,
  );
  const pressureNpcSecret = textOr(
    input.pressureNpcSecret ?? "",
    defaultCreatorScenarioDraftInput.pressureNpcSecret,
  );
  const allyFactionName = textOr(
    input.allyFactionName,
    defaultCreatorScenarioDraftInput.allyFactionName,
  );
  const pressureFactionName = textOr(
    input.pressureFactionName,
    defaultCreatorScenarioDraftInput.pressureFactionName,
  );
  const allyFactionPublicGoal = textOr(
    input.allyFactionPublicGoal ?? "",
    defaultCreatorScenarioDraftInput.allyFactionPublicGoal,
  );
  const allyFactionCurrentPlan = textOr(
    input.allyFactionCurrentPlan ?? "",
    defaultCreatorScenarioDraftInput.allyFactionCurrentPlan,
  );
  const allyFactionResources = resourcesOr(
    input.allyFactionResources ?? "",
    defaultCreatorScenarioDraftInput.allyFactionResources,
  );
  const pressureFactionPublicGoal = textOr(
    input.pressureFactionPublicGoal ?? "",
    defaultCreatorScenarioDraftInput.pressureFactionPublicGoal,
  );
  const pressureFactionCurrentPlan = textOr(
    input.pressureFactionCurrentPlan ?? "",
    defaultCreatorScenarioDraftInput.pressureFactionCurrentPlan,
  );
  const pressureFactionResources = resourcesOr(
    input.pressureFactionResources ?? "",
    defaultCreatorScenarioDraftInput.pressureFactionResources,
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
  const primaryActionTarget = actionTargetOr(
    input.primaryActionTarget,
    defaultCreatorScenarioDraftInput.primaryActionTarget,
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
  const secondaryActionTarget = actionTargetOr(
    input.secondaryActionTarget,
    defaultCreatorScenarioDraftInput.secondaryActionTarget,
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
  const tertiaryActionTarget = actionTargetOr(
    input.tertiaryActionTarget,
    defaultCreatorScenarioDraftInput.tertiaryActionTarget,
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
  const actionTargetIds: Record<CreatorActionTarget, string> = {
    guide: guideId,
    pressureNpc: pressureNpcId,
    startLocation: startLocationId,
    pressureLocation: pressureLocationId,
  };

  const world: WorldState = {
    time: { day: 1, phase: "morning" },
    currentLocationId: startLocationId,
    player: {
      id: "player",
      name: playerName,
      attributes: {
        physique: playerPhysique,
        agility: playerAgility,
        knowledge: playerKnowledge,
        insight: playerInsight,
        charm: playerCharm,
        will: playerWill,
      },
      skills: {
        social: playerSocialSkill,
        investigation: playerInvestigationSkill,
        defense: 1,
        survival: 1,
        melee: 1,
        insight: 1,
      },
      resources: {
        health: playerHealth,
        stamina: playerStamina,
        pressure: 0,
        money: playerMoney,
        intel: playerIntel,
      },
      conditions: [],
      reputationTags: ["creator_draft"],
      momentum: 0,
    },
    locations: {
      [startLocationId]: {
        id: startLocationId,
        name: startLocationName,
        description: startLocationDescription,
        publicInfo: startLocationPublicInfo,
        hiddenInfo: startLocationHiddenInfo,
        tags: ["creator", "start"],
        dangerLevel: startLocationDangerLevel,
      },
      [pressureLocationId]: {
        id: pressureLocationId,
        name: pressureLocationName,
        description: pressureLocationDescription,
        publicInfo: pressureLocationPublicInfo,
        hiddenInfo: pressureLocationHiddenInfo,
        tags: ["creator", "pressure"],
        dangerLevel: pressureLocationDangerLevel,
      },
    },
    characters: {
      [guideId]: {
        id: guideId,
        name: guideName,
        role: guideRole,
        factionId: allyFactionId,
        publicImage: guidePublicImage,
        truePersonality: "务实、谨慎，但愿意押注在能承担后果的人身上。",
        desire: `阻止${crisisName}伤害更多普通人。`,
        fear: `${pressureFactionName}把局势推向不可挽回。`,
        shortTermGoal: guideShortTermGoal,
        longTermGoal: `让${allyFactionName}在危机后还能被信任。`,
        secret: guideSecret,
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
        role: pressureNpcRole,
        factionId: pressureFactionId,
        publicImage: pressureNpcPublicImage,
        truePersonality: "精明、急躁，善于利用群体恐惧。",
        desire: `借${crisisName}扩大自身影响力。`,
        fear: "玩家找到可以公开验证的证据。",
        shortTermGoal: pressureNpcShortTermGoal,
        longTermGoal: `让${pressureFactionName}控制危机后的规则。`,
        secret: pressureNpcSecret,
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
        publicGoal: allyFactionPublicGoal,
        hiddenGoal: "保护组织里曾经犯错的人不被立即清算。",
        leader: guideId,
        resources: allyFactionResources,
        baseId: startLocationId,
        allies: [],
        enemies: [pressureFactionId],
        internalConflict: "有人想公开全部真相，有人担心真相会引发二次混乱。",
        style: "稳住现场、收集证据、争取居民信任。",
        bottomLine: "不能让无辜者替危机背锅。",
        currentPlan: allyFactionCurrentPlan,
        clockIds: [stabilityClockId],
      },
      [pressureFactionId]: {
        id: pressureFactionId,
        name: pressureFactionName,
        publicGoal: pressureFactionPublicGoal,
        hiddenGoal: "借危机后续规则获得长期控制权。",
        leader: pressureNpcId,
        resources: pressureFactionResources,
        baseId: pressureLocationId,
        allies: [],
        enemies: [allyFactionId],
        internalConflict: "强硬派想马上行动，算计派想等玩家犯错。",
        style: "制造时间压力，把复杂问题简化成二选一。",
        bottomLine: "不会放弃通过恐惧扩大影响力的机会。",
        currentPlan: pressureFactionCurrentPlan,
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
        targetId: actionTargetIds[primaryActionTarget],
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
        targetId: actionTargetIds[secondaryActionTarget],
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
        targetId: actionTargetIds[tertiaryActionTarget],
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
