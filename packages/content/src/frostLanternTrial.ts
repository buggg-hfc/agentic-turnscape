import type { Attributes, CharacterState, FactionState, LocationState, PlayerAction, QuestState, RelationshipState, WorldState } from "@agentic-turnscape/shared";
import type { ScenarioCampaignArc, ScenarioDayPlan, ScenarioPackage } from "./scenarioRegistry.js";

const attributes: Attributes = {
  physique: 2,
  agility: 2,
  knowledge: 2,
  insight: 2,
  charm: 2,
  will: 3
};

const relationship = (overrides: Partial<RelationshipState> = {}): RelationshipState => ({
  trust: 0,
  affinity: 0,
  respect: 0,
  fear: 0,
  interest: 0,
  debt: 0,
  suspicion: 0,
  ...overrides
});

const character = (input: Pick<CharacterState, "id" | "name" | "role" | "factionId" | "publicImage" | "desire" | "fear" | "shortTermGoal" | "longTermGoal" | "secret">): CharacterState => ({
  ...input,
  truePersonality: "谨慎、自尊，并受旧宗门礼法约束。",
  bottomLine: "不会明知弟子尚未准备好，却仍打开霜封。",
  weakness: "过分相信正式誓约，常把它看得比真实品格更可靠。",
  attributes,
  skills: { insight: 2, defense: 2, melee: 2, social: 1, survival: 2 },
  resources: { qi: 2, talismans: 1 },
  conditions: [],
  knownFacts: ["公开事实：霜灯只会为能在压力下守住誓约的弟子燃烧。"],
  memorySummary: "试炼刚刚开始。"
});

export const frostLanternTrialDays: ScenarioDayPlan[] = [
  {
    day: 1,
    mainEvent: "霜灯在外门庭院点燃。",
    defaultLocationId: "lantern_courtyard",
    sceneIds: ["lantern_oath"],
    clockPressure: ["shadow_debt"]
  },
  {
    day: 2,
    mainEvent: "破晓前，雾灵围绕下层山门游走。",
    defaultLocationId: "mist_gate",
    sceneIds: ["mist_gate_duel"],
    clockPressure: ["inner_fire"]
  },
  {
    day: 3,
    mainEvent: "内门判断弟子的誓约是否真正稳固。",
    defaultLocationId: "inner_gate",
    sceneIds: ["inner_gate_choice"],
    clockPressure: ["inner_fire", "shadow_debt"]
  }
];

const frostLanternCampaignArc: ScenarioCampaignArc = {
  chapters: [
    {
      id: "frost-lantern-trial_outer_trial",
      title: "外门试炼",
      focus: "撑过三日誓约考验，决定内门是否能无债开启。",
      unlocks: ["lantern_oath", "lantern_courtyard", "mist_gate"]
    },
    {
      id: "frost-lantern-trial_sect_seat",
      title: "宗门席位",
      focus: "把试炼结果转化为修行根基、霜灯修复方案，或灰债隐患。",
      unlocks: ["training_hall", "archive", "infirmary"]
    },
    {
      id: "frost-lantern-trial_ash_front",
      title: "灰烬战线",
      focus: "把誓约、结社压力和长老政治带入更广阔的宗门战役。",
      unlocks: ["frost_lantern_sect", "gray_ash_cabal"]
    }
  ],
  baseFacilities: ["training_hall", "archive", "infirmary"],
  factionFronts: ["frost_lantern_sect", "gray_ash_cabal"]
};

const locations: Record<string, LocationState> = {
  lantern_courtyard: {
    id: "lantern_courtyard",
    name: "灯庭",
    description: "石砌庭院中央悬着一盏蓝白霜灯，无油无芯却仍在燃烧。",
    publicInfo: ["弟子说谎时，灯焰会明显黯淡。", "外门弟子进入雾门前都会在这里集合。"],
    hiddenInfo: ["霜灯靠旧日誓约的破碎残响维持。"],
    tags: ["sect", "trial"],
    dangerLevel: 1
  },
  mist_gate: {
    id: "mist_gate",
    name: "雾门",
    description: "冷杉雾气里开出一道狭门，由试炼灵和高阶弟子共同看守。",
    publicInfo: ["穿过雾门会消耗体力。", "这里允许交手，但并非必须用战斗通过。"],
    hiddenInfo: ["雾会反复映出入门者心中最强的恐惧。"],
    tags: ["gate", "combat"],
    dangerLevel: 3
  },
  inner_gate: {
    id: "inner_gate",
    name: "内门",
    description: "寂静大殿里，霜灯倒影会裁定谁有资格继续修行。",
    publicInfo: ["只有稳定誓约才能打开内门。"],
    hiddenInfo: ["内门可以被强行冲开，但债会跟随弟子。"],
    tags: ["sect", "ending"],
    dangerLevel: 2
  }
};

const factions: Record<string, FactionState> = {
  frost_lantern_sect: {
    id: "frost_lantern_sect",
    name: "霜灯宗",
    publicGoal: "找出能在压力下守住誓约的弟子。",
    hiddenGoal: "在敌对宗门注意到不稳定天才前，先把他们绑定在宗门内。",
    leader: "npc_adele",
    resources: { elders: 2, talismans: 4 },
    baseId: "inner_gate",
    allies: [],
    enemies: ["gray_ash_cabal"],
    internalConflict: "部分长老偏爱顺从弟子，另一些长老更看重韧性。",
    style: "以礼法约束和静默试炼推进局势。",
    bottomLine: "宗门不会接纳会危及霜灯的弟子。",
    currentPlan: "执行三日外门试炼。",
    clockIds: ["inner_fire"]
  },
  gray_ash_cabal: {
    id: "gray_ash_cabal",
    name: "灰烬结社",
    publicGoal: "向失败弟子提供捷径。",
    hiddenGoal: "把霜灯债转化为招募链条。",
    leader: "npc_manlo",
    resources: { spies: 2, ash_charms: 3 },
    baseId: "mist_gate",
    allies: [],
    enemies: ["frost_lantern_sect"],
    internalConflict: "结社内部争论该腐化试炼，还是只收割失败者。",
    style: "在失败边缘低声交易。",
    bottomLine: "绝不让有潜力的弟子无债离开。",
    currentPlan: "在雾门对决中暗示捷径。",
    clockIds: ["shadow_debt"]
  }
};

const characters: Record<string, CharacterState> = {
  npc_zhou_jin: character({
    id: "npc_zhou_jin",
    name: "周师兄",
    role: "外门引路人",
    factionId: "frost_lantern_sect",
    publicImage: "耐心讲解试炼礼法的引路人。",
    desire: "让新弟子活到真正学会东西。",
    fear: "再次看见试炼变成公开处刑。",
    shortTermGoal: "引导玩家建立稳定誓约。",
    longTermGoal: "把外门试炼改成更公平的考验。",
    secret: "周师兄当年曾在雾门失败，只因长老开恩才被收入门墙。"
  }),
  npc_adele: character({
    id: "npc_adele",
    name: "阿黛尔长老",
    role: "霜灯殿长老",
    factionId: "frost_lantern_sect",
    publicImage: "行事精确、把礼法视作慈悲的长老。",
    desire: "保护霜灯不被不稳定的野心污染。",
    fear: "有人强开内门，让宗门蒙羞一代人。",
    shortTermGoal: "衡量玩家能否承受誓约。",
    longTermGoal: "选出能继承霜灯法门的弟子。",
    secret: "她隐瞒了霜灯已经变得多么虚弱。"
  }),
  npc_manlo: character({
    id: "npc_manlo",
    name: "灰烬执事曼洛",
    role: "结社掮客",
    factionId: "gray_ash_cabal",
    publicImage: "总是微笑、愿意提供实用帮助的执事。",
    desire: "给最有前途的弟子种下债符。",
    fear: "玩家干净通过试炼并暴露结社。",
    shortTermGoal: "在雾门关闭前递出捷径。",
    longTermGoal: "把外门试炼变成结社的招募漏斗。",
    secret: "他在庭院石缝下埋了灰烬符。"
  })
};

const quests: Record<string, QuestState> = {
  lantern_oath: {
    id: "lantern_oath",
    name: "守住霜誓",
    trigger: "玩家踏入外门试炼。",
    patron: "npc_zhou_jin",
    realBackground: "誓约会筛掉只追求力量却缺乏自律的弟子。",
    surfaceGoal: "抵达内门。",
    hiddenGoal: "查明霜灯是否正在衰败。",
    locationIds: ["lantern_courtyard", "mist_gate", "inner_gate"],
    npcIds: ["npc_zhou_jin", "npc_adele", "npc_manlo"],
    factionIds: ["frost_lantern_sect", "gray_ash_cabal"],
    solutionTypes: ["travel", "fight", "negotiate"],
    failureConsequence: "玩家保住力量，却背上灰债。",
    longTermImpact: "这场试炼会决定未来修仙篇章如何评判誓约。",
    status: "active"
  }
};

export const createFrostLanternTrialWorld = (): WorldState => ({
  time: { day: 1, phase: "morning" },
  currentLocationId: "lantern_courtyard",
  player: {
    id: "player",
    name: "外门弟子",
    attributes: { ...attributes, will: 3 },
    skills: { survival: 2, melee: 1, defense: 1, social: 1, investigation: 1, insight: 1 },
    resources: { health: 5, stamina: 3, pressure: 0, money: 0, intel: 0 },
    conditions: [],
    reputationTags: ["unproven_disciple"],
    momentum: 0
  },
  locations,
  characters,
  factions,
  relationships: {
    "player:npc_zhou_jin": relationship({ trust: 1 }),
    "player:npc_adele": relationship({ respect: 1 }),
    "player:npc_manlo": relationship({ suspicion: 1 })
  },
  quests,
  clocks: {
    inner_fire: {
      id: "inner_fire",
      name: "心火稳定",
      progress: 0,
      max: 4,
      consequence: "稳定心火能让内门无债开启。",
      visible: true
    },
    shadow_debt: {
      id: "shadow_debt",
      name: "灰影债",
      progress: 0,
      max: 4,
      consequence: "债符会把弟子绑向灰烬结社。",
      visible: true
    },
    martial_lockdown: {
      id: "martial_lockdown",
      name: "试炼戒律",
      progress: 0,
      max: 5,
      consequence: "公开暴力过多会提前终止试炼。",
      visible: false
    }
  },
  publicEvents: [
    {
      id: "evt_frost_lantern_start",
      turnId: "setup",
      day: 1,
      phase: "morning",
      title: "霜灯点燃",
      body: "外门弟子聚集时，灯焰转为蓝白。",
      tags: ["trial", "sect"],
      createdAt: "2026-06-02T00:00:00.000Z"
    }
  ],
  hiddenEvents: []
});

export const getFrostLanternTrialDayPlan = (day: number): ScenarioDayPlan | undefined => frostLanternTrialDays.find((plan) => plan.day === day);

export const getFrostLanternTrialActions = (state: WorldState): PlayerAction[] => [
  {
    id: `frost_travel_${state.time.day}_${state.time.phase}`,
    actionType: "travel",
    label: "穿过雾门",
    description: "消耗体力深入试炼，不强行挑起决斗。",
    targetId: "mist_gate",
    leverage: ["scenario:frost-lantern-trial", "clock:inner_fire", "pressureClock:shadow_debt", "sect_trial"],
    riskLevel: "medium"
  },
  {
    id: `frost_duel_${state.time.day}_${state.time.phase}`,
    actionType: "fight",
    label: "直面试炼灵",
    description: "用力量和自律证明自己的心火能够稳定燃烧。",
    targetId: "mist_gate",
    leverage: ["scenario:frost-lantern-trial", "clock:inner_fire", "pressureClock:shadow_debt", "inner_fire"],
    riskLevel: "high"
  }
];

export const evaluateFrostLanternTrialEnding = (state: WorldState) => {
  if (!(state.time.day >= 3 && state.time.phase === "night")) return undefined;
  if (state.player.momentum >= 3 || (state.clocks.inner_fire?.progress ?? 0) >= 3) {
    return {
      id: "inner_gate_opened",
      title: "内门开启",
      summary: "弟子干净入门，带走的是稳定誓约，而不是暗藏债务。"
    };
  }
  return {
    id: "ash_debt_bound",
    title: "灰债缠身",
    summary: "弟子撑过试炼，但灰烬债会跟随之后每一次突破。"
  };
};

export const frostLanternTrialPackage: ScenarioPackage = {
  id: "frost-lantern-trial",
  title: "霜灯试炼",
  counts: { combat: 1, social: 1, endings: 2 },
  campaignArc: frostLanternCampaignArc,
  createWorld: createFrostLanternTrialWorld,
  getActions: getFrostLanternTrialActions,
  getDayPlan: getFrostLanternTrialDayPlan,
  evaluateEnding: evaluateFrostLanternTrialEnding
};
