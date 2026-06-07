import type {
  Attributes,
  CharacterState,
  ClockState,
  FactionState,
  LocationState,
  PlayerAction,
  QuestState,
  RelationshipState,
  WorldState
} from "@agentic-turnscape/shared";
import type { ScenarioCampaignArc, ScenarioDayPlan, ScenarioPackage } from "./scenarioRegistry.js";

const attributes: Attributes = {
  physique: 2,
  agility: 2,
  knowledge: 3,
  insight: 3,
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

type ExpansionScenarioDefinition = {
  id: string;
  title: string;
  themeTag: string;
  playerName: string;
  startLocation: LocationState;
  secondLocation: LocationState;
  finalLocation: LocationState;
  allyFaction: Omit<FactionState, "baseId" | "clockIds">;
  pressureFaction: Omit<FactionState, "baseId" | "clockIds">;
  guide: Pick<CharacterState, "name" | "role" | "publicImage" | "desire" | "fear" | "shortTermGoal" | "longTermGoal" | "secret">;
  authority: Pick<CharacterState, "name" | "role" | "publicImage" | "desire" | "fear" | "shortTermGoal" | "longTermGoal" | "secret">;
  broker: Pick<CharacterState, "name" | "role" | "publicImage" | "desire" | "fear" | "shortTermGoal" | "longTermGoal" | "secret">;
  quest: Pick<QuestState, "id" | "name" | "trigger" | "realBackground" | "surfaceGoal" | "hiddenGoal" | "failureConsequence" | "longTermImpact">;
  stabilityClock: Omit<ClockState, "id" | "visible">;
  pressureClock: Omit<ClockState, "id" | "visible">;
  firstAction: Pick<PlayerAction, "actionType" | "label" | "description" | "targetId" | "leverage" | "riskLevel">;
  secondAction: Pick<PlayerAction, "actionType" | "label" | "description" | "targetId" | "leverage" | "riskLevel">;
  successEnding: {
    id: string;
    title: string;
    summary: string;
  };
  failureEnding: {
    id: string;
    title: string;
    summary: string;
  };
};

const clone = <T>(value: T): T => structuredClone(value);

const campaignArcFacilities: Record<string, string[]> = {
  science_fiction: ["medbay", "engineering_bay", "evidence_archive"],
  historical: ["ledger_room", "harbor_office", "training_yard"],
  urban_supernatural: ["tenant_office", "ritual_room", "case_archive"],
  realistic_profession: ["triage_station", "maintenance_bay", "review_room"]
};

const createCampaignArc = (
  definition: ExpansionScenarioDefinition,
  allyFactionId: string,
  pressureFactionId: string
): ScenarioCampaignArc => {
  const baseFacilities = campaignArcFacilities[definition.themeTag] ?? ["field_office", "archive", "workshop"];
  return {
    chapters: [
      {
        id: `${definition.id}_opening_arc`,
        title: `${definition.title}：开局危机`,
        focus: definition.quest.surfaceGoal,
        unlocks: [definition.quest.id, definition.startLocation.id]
      },
      {
        id: `${definition.id}_base_arc`,
        title: `${definition.title}：行动基地`,
        focus: definition.quest.longTermImpact,
        unlocks: baseFacilities
      },
      {
        id: `${definition.id}_front_arc`,
        title: `${definition.title}：阵营战线`,
        focus: definition.quest.failureConsequence,
        unlocks: [allyFactionId, pressureFactionId]
      }
    ],
    baseFacilities,
    factionFronts: [allyFactionId, pressureFactionId]
  };
};

const character = (
  id: "npc_zhou_jin" | "npc_adele" | "npc_manlo",
  factionId: string,
  input: ExpansionScenarioDefinition["guide"]
): CharacterState => ({
  id,
  factionId,
  name: input.name,
  role: input.role,
  publicImage: input.publicImage,
  truePersonality: "能力可靠、压力沉重，只要玩家证明有更好的路，就愿意调整方向。",
  desire: input.desire,
  fear: input.fear,
  shortTermGoal: input.shortTermGoal,
  longTermGoal: input.longTermGoal,
  secret: input.secret,
  bottomLine: "不会接受把平民从代价账本里抹掉的方案。",
  weakness: "每个选项都有可见伤害时，行动会变得过慢。",
  attributes,
  skills: { investigation: 3, social: 3, survival: 2, defense: 2, command: 2, medical: 1, engineering: 1 },
  resources: { authority: 2, intel: 2, supplies: 2 },
  conditions: [],
  knownFacts: ["开局危机已经公开，但真正压力来源仍有争议。"],
  memorySummary: "剧本刚刚开始，暂时还没有和玩家形成私下交易。"
});

const createExpansionScenarioPackage = (definition: ExpansionScenarioDefinition): ScenarioPackage => {
  const allyFactionId = `${definition.id}_allies`;
  const pressureFactionId = `${definition.id}_pressure`;
  const locationIds = [definition.startLocation.id, definition.secondLocation.id, definition.finalLocation.id];
  const days: ScenarioDayPlan[] = [
    {
      day: 1,
      mainEvent: `${definition.title}：玩家第一次接触公开危机。`,
      defaultLocationId: definition.startLocation.id,
      sceneIds: [`${definition.id}_opening_social`],
      clockPressure: [`${definition.id}_pressure`]
    },
    {
      day: 2,
      mainEvent: `${definition.title}：施压阵营逼出公开选择。`,
      defaultLocationId: definition.secondLocation.id,
      sceneIds: [`${definition.id}_pressure_combat`],
      clockPressure: [`${definition.id}_stability`, `${definition.id}_pressure`]
    },
    {
      day: 3,
      mainEvent: `${definition.title}：玩家锁定未来分支。`,
      defaultLocationId: definition.finalLocation.id,
      sceneIds: [`${definition.id}_final_choice`],
      clockPressure: [`${definition.id}_stability`]
    }
  ];

  const createWorld = (): WorldState => {
    const locations: Record<string, LocationState> = {
      [definition.startLocation.id]: clone(definition.startLocation),
      [definition.secondLocation.id]: clone(definition.secondLocation),
      [definition.finalLocation.id]: clone(definition.finalLocation)
    };
    const factions: Record<string, FactionState> = {
      [allyFactionId]: {
        ...clone(definition.allyFaction),
        id: allyFactionId,
        baseId: definition.startLocation.id,
        clockIds: [`${definition.id}_stability`]
      },
      [pressureFactionId]: {
        ...clone(definition.pressureFaction),
        id: pressureFactionId,
        baseId: definition.secondLocation.id,
        clockIds: [`${definition.id}_pressure`]
      }
    };
    const characters: Record<string, CharacterState> = {
      npc_zhou_jin: character("npc_zhou_jin", allyFactionId, definition.guide),
      npc_adele: character("npc_adele", allyFactionId, definition.authority),
      npc_manlo: character("npc_manlo", pressureFactionId, definition.broker)
    };
    const quests: Record<string, QuestState> = {
      [definition.quest.id]: {
        ...definition.quest,
        patron: "npc_zhou_jin",
        locationIds,
        npcIds: ["npc_zhou_jin", "npc_adele", "npc_manlo"],
        factionIds: [allyFactionId, pressureFactionId],
        solutionTypes: ["investigation", "negotiation", "combat", "protection"],
        status: "active"
      }
    };

    return {
      time: { day: 1, phase: "morning" },
      currentLocationId: definition.startLocation.id,
      player: {
        id: "player",
        name: definition.playerName,
        attributes,
        skills: { investigation: 2, social: 2, defense: 1, medical: 1, engineering: 1, command: 1, survival: 2 },
        resources: { health: 5, stamina: 4, pressure: 1, money: 2, intel: 1, supplies: 3 },
        conditions: [],
        reputationTags: [definition.themeTag],
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
        [`${definition.id}_stability`]: {
          id: `${definition.id}_stability`,
          ...clone(definition.stabilityClock),
          visible: true
        },
        [`${definition.id}_pressure`]: {
          id: `${definition.id}_pressure`,
          ...clone(definition.pressureClock),
          visible: true
        }
      },
      publicEvents: [
        {
          id: `evt_${definition.id}_start`,
          turnId: "setup",
          day: 1,
          phase: "morning",
          title: `${definition.title}开始`,
          body: definition.quest.trigger,
          tags: [definition.themeTag, "expansion"],
          createdAt: "2026-06-02T00:00:00.000Z"
        }
      ],
      hiddenEvents: []
    };
  };

  return {
    id: definition.id,
    title: definition.title,
    counts: { combat: 1, social: 1, endings: 2 },
    campaignArc: createCampaignArc(definition, allyFactionId, pressureFactionId),
    createWorld,
    getActions: (state) => [
      {
        id: `${definition.id}_primary_${state.time.day}_${state.time.phase}`,
        ...definition.firstAction,
        leverage: [
          `scenario:${definition.id}`,
          `clock:${definition.id}_stability`,
          `pressureClock:${definition.id}_pressure`,
          ...definition.firstAction.leverage
        ]
      },
      {
        id: `${definition.id}_secondary_${state.time.day}_${state.time.phase}`,
        ...definition.secondAction,
        leverage: [
          `scenario:${definition.id}`,
          `clock:${definition.id}_stability`,
          `pressureClock:${definition.id}_pressure`,
          ...definition.secondAction.leverage
        ]
      }
    ],
    getDayPlan: (day) => days.find((plan) => plan.day === day),
    evaluateEnding: (state) => {
      if (!(state.time.day >= 3 && state.time.phase === "night")) return undefined;
      const stability = state.clocks[`${definition.id}_stability`]?.progress ?? 0;
      if (state.player.momentum >= 3 || stability >= 3) return clone(definition.successEnding);
      return clone(definition.failureEnding);
    }
  };
};

export const orbitalQuarantinePackage = createExpansionScenarioPackage({
  id: "orbital-quarantine",
  title: "轨道隔离",
  themeTag: "science_fiction",
  playerName: "空间站特使",
  startLocation: {
    id: "orbital_medbay",
    name: "轨道医疗舱",
    description: "旋转空间站里的医疗区，封闭病房在隔离灯下忽明忽暗。",
    publicInfo: ["感染会沿维护冷却剂传播。", "船员家属被困在隔离舱门之后。"],
    hiddenInfo: ["病原体其实是被伪装成工业清洁剂的地貌改造微生物。"],
    tags: ["science_fiction", "medical"],
    dangerLevel: 2
  },
  secondLocation: {
    id: "docking_ring",
    name: "停靠环",
    description: "货舱闸门、安保无人机和撤离艇都在争夺有限电力。",
    publicInfo: ["停靠权限可以切断空间站外联。", "走私者知道备用通风道。"],
    hiddenInfo: ["第一例发热后，有一份撤离艇名单被人改动。"],
    tags: ["science_fiction", "combat"],
    dangerLevel: 4
  },
  finalLocation: {
    id: "reactor_spine",
    name: "反应堆脊柱",
    description: "空间站供能主轴在隔离防火墙旁低声震动。",
    publicInfo: ["受控清洗可能救下空间站。", "仓促清洗会把仍有人居住的甲板排空。"],
    hiddenInfo: ["反应堆智能已经选择了一条牺牲路径。"],
    tags: ["science_fiction", "ending"],
    dangerLevel: 5
  },
  allyFaction: {
    id: "",
    name: "公民隔离委员会",
    publicGoal: "在不大规模排空舱段的前提下保住空间站。",
    hiddenGoal: "掩盖第一道封控命令来得太晚的事实。",
    leader: "npc_adele",
    resources: { medics: 3, codes: 2 },
    allies: [],
    enemies: [],
    internalConflict: "医生想先分诊救人，行政人员想得到干净报告。",
    style: "依靠规程、公开简报和急救医学推进。",
    bottomLine: "绝不主动排空平民舱段。",
    currentPlan: "稳定医疗舱并追踪冷却剂路径。"
  },
  pressureFaction: {
    id: "",
    name: "螺旋打捞署",
    publicGoal: "在轨道衰减前控制空间站高价值资产。",
    hiddenGoal: "回收地貌改造微生物样本。",
    leader: "npc_manlo",
    resources: { drones: 4, contracts: 4 },
    allies: [],
    enemies: [],
    internalConflict: "部分船组只想拿救援报酬，另一些人只盯着样本。",
    style: "用法律主张、无人机和氧气配给施压。",
    bottomLine: "绝不承认样本导致疫情。",
    currentPlan: "锁住停靠环并夺取被改动的名单。"
  },
  guide: {
    name: "周飞行员",
    role: "撤离艇驾驶员",
    publicImage: "冷静的驾驶员，熟悉每条维护捷径。",
    desire: "把被困家属送上正确撤离艇。",
    fear: "恐慌发射撕裂整个停靠环。",
    shortTermGoal: "穿过医疗舱封锁线打开一条安全路线。",
    longTermGoal: "公开被改动的撤离名单。",
    secret: "他在隔离命令前先转移过一个家庭。"
  },
  authority: {
    name: "阿黛尔医生",
    role: "隔离医师",
    publicImage: "疲惫却坚持不把清洗当作纯数学题的医生。",
    desire: "在不牺牲封闭病房的情况下追踪病原。",
    fear: "委员会为了形象放弃治疗。",
    shortTermGoal: "维持医疗舱供能。",
    longTermGoal: "为未来空间站建立治疗规程。",
    secret: "她知道冷却剂清洁剂从未通过认证。"
  },
  broker: {
    name: "掮客曼洛",
    role: "打捞谈判员",
    publicImage: "体面的承包人，用救援交换通行权限。",
    desire: "回收样本并掌握空间站债务。",
    fear: "样本被追溯到螺旋合同。",
    shortTermGoal: "控制停靠环。",
    longTermGoal: "把隔离救援变成永久筹码。",
    secret: "他已经为微生物找好了秘密买家。"
  },
  quest: {
    id: "station_quarantine",
    name: "守住隔离线",
    trigger: "全站发热把家属、打捞队和医生困在同一条失控轨道上。",
    realBackground: "工业地貌改造微生物从维护冷却剂中泄漏。",
    surfaceGoal: "阻止空间站因恐慌排空。",
    hiddenGoal: "证明是谁把样本偷运上站。",
    failureConsequence: "空间站在打捞占领下幸存。",
    longTermImpact: "后续科幻篇章会继承样本线索。"
  },
  stabilityClock: {
    name: "空间站稳定",
    progress: 0,
    max: 4,
    consequence: "空间站在打捞法规接管前恢复稳定。"
  },
  pressureClock: {
    name: "打捞封锁",
    progress: 0,
    max: 4,
    consequence: "螺旋署控制撤离路线和样本线索。"
  },
  firstAction: {
    actionType: "investigate",
    label: "追查冷却剂热病",
    description: "从医疗舱样本一路追进维护冷却回路。",
    targetId: "npc_adele",
    leverage: ["coolant_sample", "crew_manifest"],
    riskLevel: "medium"
  },
  secondAction: {
    actionType: "protect",
    label: "守住撤离艇走廊",
    description: "维持家属转移，不让打捞无人机夺下环区。",
    targetId: "npc_zhou_jin",
    leverage: ["evacuation_route", "bulkhead_codes"],
    riskLevel: "high"
  },
  successEnding: {
    id: "station_stabilized",
    title: "空间站稳定",
    summary: "空间站撑过隔离，样本线索被保留下来，足以进入更大的战役。"
  },
  failureEnding: {
    id: "salvage_lockdown",
    title: "打捞封锁",
    summary: "空间站仍然活着，但官方记录由螺旋署书写。"
  }
});

export const saltHarborAccordPackage = createExpansionScenarioPackage({
  id: "salt-harbor-accord",
  title: "盐港协定",
  themeTag: "historical",
  playerName: "港口调停人",
  startLocation: {
    id: "harbor_customs",
    name: "港口海关署",
    description: "账本、盐税许可和焦躁的行会使节挤满海关大厅。",
    publicInfo: ["失踪盐税账本正在威胁停战。", "码头工人已经停止卸粮。"],
    hiddenInfo: ["账本同时牵连总督和商人联盟。"],
    tags: ["historical", "social"],
    dangerLevel: 2
  },
  secondLocation: {
    id: "tide_fort",
    name: "潮汐堡",
    description: "旧炮俯瞰着签署协定前无法离港的船只。",
    publicInfo: ["民兵队长要求补发欠薪。", "堡垒控制着港口锁链。"],
    hiddenInfo: ["一份伪造命令可能引发夜间炮击。"],
    tags: ["historical", "combat"],
    dangerLevel: 4
  },
  finalLocation: {
    id: "salt_court",
    name: "盐税公庭",
    description: "贸易宪章会在港口人群面前被公开朗读。",
    publicInfo: ["只有公开协定才能重开贸易。", "每个阵营都带来了证人。"],
    hiddenInfo: ["有一名证人准备为了赦免而作伪证。"],
    tags: ["historical", "ending"],
    dangerLevel: 3
  },
  allyFaction: {
    id: "",
    name: "港口行会理事会",
    publicGoal: "在合法条款下重开粮食与盐业贸易。",
    hiddenGoal: "限制总督权力，同时避免引发叛乱。",
    leader: "npc_adele",
    resources: { ledgers: 3, ships: 2 },
    allies: [],
    enemies: [],
    internalConflict: "船主想要利润，码头工人想要欠薪。",
    style: "依靠请愿、证人和公开羞辱施压。",
    bottomLine: "港口锁链不能落到士兵手里。",
    currentPlan: "找回盐税账本并逼出有限协定。"
  },
  pressureFaction: {
    id: "",
    name: "总督潮卫",
    publicGoal: "在港口断粮前恢复秩序。",
    hiddenGoal: "销毁账本并保住紧急权力。",
    leader: "npc_manlo",
    resources: { soldiers: 4, cannons: 2 },
    allies: [],
    enemies: [],
    internalConflict: "低阶军官害怕被推成替罪羊。",
    style: "用宵禁、拘票和受控证词推进。",
    bottomLine: "不能出现伪造盐税的公开证据。",
    currentPlan: "守住潮汐堡并压迫公庭。"
  },
  guide: {
    name: "码头周",
    role: "码头证人",
    publicImage: "饱经风浪的码头向导，记得每箱货是谁卸下的。",
    desire: "在家家户户断粮前让港口重新运转。",
    fear: "暴乱给士兵向工人开火的借口。",
    shortTermGoal: "找到失踪账本书记。",
    longTermGoal: "争取一份保护码头工资的宪章。",
    secret: "他把账本书记藏在帆布阁楼里。"
  },
  authority: {
    name: "阿黛尔法官",
    role: "宪章法官",
    publicImage: "努力让法律继续活在公众面前的端正法官。",
    desire: "签下一份经得起审查的协定。",
    fear: "被迫承认伪造盐税有效。",
    shortTermGoal: "保护可信证人。",
    longTermGoal: "在不爆发内战的情况下终结紧急统治。",
    secret: "她已经怀疑总督，却缺少可采信证据。"
  },
  broker: {
    name: "管事曼洛",
    role: "总督代理人",
    publicImage: "礼貌的官员，却把拖延都称作叛逆。",
    desire: "保住完整紧急权力。",
    fear: "真账本被当众朗读。",
    shortTermGoal: "把证词转入闭门程序。",
    longTermGoal: "通过债务控制港口锁链。",
    secret: "他下令伪造了盐税许可。"
  },
  quest: {
    id: "salt_ledger",
    name: "找回盐税账本",
    trigger: "失踪税务账本正把港口劳资纠纷推向公开叛乱。",
    realBackground: "紧急盐税被伪造，用来填补私人卫队债务。",
    surfaceGoal: "重开港口。",
    hiddenGoal: "逼出一份点名伪造事实却不引发战争的协定。",
    failureConsequence: "港口在军事税控下重新开放。",
    longTermImpact: "后续历史篇章会继承法治港口或军事化港口。"
  },
  stabilityClock: {
    name: "公开协定",
    progress: 0,
    max: 4,
    consequence: "宪章站稳脚跟，贸易恢复。"
  },
  pressureClock: {
    name: "潮卫镇压",
    progress: 0,
    max: 4,
    consequence: "士兵控制粮食、盐税与证词。"
  },
  firstAction: {
    actionType: "investigate",
    label: "找回盐税账本",
    description: "在公庭召开前追查码头许可和证人路线。",
    targetId: "npc_zhou_jin",
    leverage: ["dock_witness", "grain_manifest"],
    riskLevel: "medium"
  },
  secondAction: {
    actionType: "negotiate",
    label: "起草公开协定",
    description: "用证人与法律重开港口，同时避免把港口交给士兵。",
    targetId: "npc_adele",
    leverage: ["salt_ledger", "public_court"],
    riskLevel: "high"
  },
  successEnding: {
    id: "harbor_accord",
    title: "港口协定",
    summary: "港口在公开宪章下重开，未来历史篇章还能继续争夺它。"
  },
  failureEnding: {
    id: "guard_charter",
    title: "卫队宪章",
    summary: "贸易恢复了，但港口的合法记忆由士兵书写。"
  }
});

export const rainAlleyHauntingPackage = createExpansionScenarioPackage({
  id: "rain-alley-haunting",
  title: "雨巷异闻",
  themeTag: "urban_supernatural",
  playerName: "夜班个案员",
  startLocation: {
    id: "rain_alley",
    name: "雨巷",
    description: "霓虹雨水逆着坡流，楼上住户都听见同一个孩子在数数。",
    publicInfo: ["三户住户报告了同一种闹鬼现象。", "房东希望检查员到来前一切保持安静。"],
    hiddenInfo: ["数数的灵体正在重复驱逐名单。"],
    tags: ["urban_supernatural", "social"],
    dangerLevel: 2
  },
  secondLocation: {
    id: "subway_shrine",
    name: "地铁神龛",
    description: "末班车站台下的瓷砖凹室摆着无人承认点燃的蜡烛。",
    publicInfo: ["通勤者会避开最后一节车厢。", "午夜后会出现旧供品。"],
    hiddenInfo: ["神龛锚定着住户与遗忘守护灵之间的债。"],
    tags: ["urban_supernatural", "combat"],
    dangerLevel: 4
  },
  finalLocation: {
    id: "roof_water_tank",
    name: "屋顶水箱",
    description: "楼顶水箱倒映着一条并不存在的走廊。",
    publicInfo: ["雨打水箱时，闹鬼会达到顶峰。", "楼里每个人都能听见最后的倒数。"],
    hiddenInfo: ["打破水箱能释放灵体，却会淹掉证据档案。"],
    tags: ["urban_supernatural", "ending"],
    dangerLevel: 4
  },
  allyFaction: {
    id: "",
    name: "住户夜巡队",
    publicGoal: "在不失去住所的前提下终止闹鬼。",
    hiddenGoal: "公开非法驱逐名单。",
    leader: "npc_adele",
    resources: { witnesses: 4, keys: 2 },
    allies: [],
    enemies: [],
    internalConflict: "有人想做仪式，有人只想找律师。",
    style: "靠敲门、分享食物和低声证词建立联盟。",
    bottomLine: "任何让住户消失的方案都不可接受。",
    currentPlan: "在午夜雨落前收集证词。"
  },
  pressureFaction: {
    id: "",
    name: "玻璃塔控股",
    publicGoal: "清空大楼以便翻修。",
    hiddenGoal: "利用闹鬼逼走住户。",
    leader: "npc_manlo",
    resources: { lawyers: 3, guards: 2 },
    allies: [],
    enemies: [],
    internalConflict: "现场团队害怕他们唤醒的东西。",
    style: "用通知、监控和收买的辟谣者推进。",
    bottomLine: "绝不让驱逐名单公开。",
    currentPlan: "等闹鬼顶峰后宣布大楼不安全。"
  },
  guide: {
    name: "四层周",
    role: "住户组织者",
    publicImage: "疲惫的组织者，手里总有备用钥匙和泡面。",
    desire: "让楼里的家庭不要被拆散。",
    fear: "仪式保住了墙，却失去了人。",
    shortTermGoal: "记录每户听到的倒数版本。",
    longTermGoal: "把闹鬼变成非法驱逐证据。",
    secret: "他从房东办公室偷出了一份残缺驱逐名单。"
  },
  authority: {
    name: "阿黛尔个案员",
    role: "市政个案员",
    publicImage: "相信文书仍能保护人的市政工作人员。",
    desire: "找到合法理由暂停清楼。",
    fear: "住户还没安全，案件就先变成猎奇奇观。",
    shortTermGoal: "核实住户陈述。",
    longTermGoal: "建立可复用的异闻住房处置规程。",
    secret: "第一份投诉出现前，她已经见过走廊倒影。"
  },
  broker: {
    name: "曼洛经理",
    role: "地产摆平人",
    publicImage: "体面摆平人，带着许可、摄像头和排练过的同情。",
    desire: "不支付安置费就清空大楼。",
    fear: "灵体在镜头前念出驱逐名单。",
    shortTermGoal: "把闹鬼包装成住户诈骗。",
    longTermGoal: "把街区改造成豪华塔楼。",
    secret: "他命令工人拆掉了旧神龛。"
  },
  quest: {
    id: "counting_spirit",
    name: "说出数数灵的名字",
    trigger: "雨夜公寓楼里，所有人都听见同一个看不见的孩子在数驱逐名额。",
    realBackground: "闹鬼通过重复非法清楼名单来保护住户。",
    surfaceGoal: "在大楼被判危楼前终止闹鬼。",
    hiddenGoal: "公开驱逐名单，同时不切断守护灵。",
    failureConsequence: "住户散去后，闹鬼也随之结束。",
    longTermImpact: "后续都市篇章会继承受保护街区或玻璃塔死区。"
  },
  stabilityClock: {
    name: "邻里信任",
    progress: 0,
    max: 4,
    consequence: "住户和灵体达成可共处边界。"
  },
  pressureClock: {
    name: "危楼通知",
    progress: 0,
    max: 4,
    consequence: "大楼被紧急权力清空。"
  },
  firstAction: {
    actionType: "investigate",
    label: "整理倒数名单",
    description: "把住户证词与残缺驱逐名单逐项对照。",
    targetId: "npc_zhou_jin",
    leverage: ["tenant_keys", "rain_recordings"],
    riskLevel: "medium"
  },
  secondAction: {
    actionType: "negotiate",
    label: "与守护灵谈判",
    description: "献上一份公共记忆，换取不牺牲住户的边界。",
    targetId: "npc_adele",
    leverage: ["eviction_list", "subway_offering"],
    riskLevel: "high"
  },
  successEnding: {
    id: "neighborhood_saved",
    title: "街区得救",
    summary: "闹鬼变成证词，街区保留下来，成为可继续游玩的都市据点。"
  },
  failureEnding: {
    id: "condemned_block",
    title: "危楼清空",
    summary: "大楼空了，但倒数声跟着流离失所的住户离开。"
  }
});

export const emergencyWardNightPackage = createExpansionScenarioPackage({
  id: "emergency-ward-night",
  title: "急诊夜班",
  themeTag: "realistic_profession",
  playerName: "夜班组长",
  startLocation: {
    id: "triage_desk",
    name: "分诊台",
    description: "拥挤的急诊入口里，每块夹板上的记录都已经晚了。",
    publicInfo: ["救护车在门外排队。", "电力故障正在一波波冲击监护仪。"],
    hiddenInfo: ["备用发电机承包商跳过了一轮维护。"],
    tags: ["realistic_profession", "medical"],
    dangerLevel: 2
  },
  secondLocation: {
    id: "trauma_bay",
    name: "创伤处置区",
    description: "帘子、警报和疲惫医护在不可能的优先级之间挤出一条窄路。",
    publicInfo: ["两名危重病人需要同一位专科医生。", "安保人手严重不足。"],
    hiddenInfo: ["一名病人的病历牵涉到媒体敏感的捐赠者案件。"],
    tags: ["realistic_profession", "combat"],
    dangerLevel: 4
  },
  finalLocation: {
    id: "backup_generator",
    name: "备用发电机房",
    description: "闷热的设备间里，夜班团队要决定照护能否继续运转。",
    publicInfo: ["发电机可以手动稳定。", "这么做会从分诊台抽走人手。"],
    hiddenInfo: ["承包商缺失的检查贴纸仍留在面板上。"],
    tags: ["realistic_profession", "ending"],
    dangerLevel: 3
  },
  allyFaction: {
    id: "",
    name: "夜班团队",
    publicGoal: "让病人在激增压力下活过今晚。",
    hiddenGoal: "记录系统性失败，同时不把责任推给筋疲力尽的员工。",
    leader: "npc_adele",
    resources: { nurses: 4, beds: 2 },
    allies: [],
    enemies: [],
    internalConflict: "员工对是否分流救护车意见不一。",
    style: "依靠分诊、清单和艰难优先级推进。",
    bottomLine: "任何病人都不能从队列中被抹掉。",
    currentPlan: "稳定分诊，同时寻找发电机支援。"
  },
  pressureFaction: {
    id: "",
    name: "医院行政部",
    publicGoal: "避免夜间激增演变成公开失败。",
    hiddenGoal: "把承包商疏忽排除在事故报告外。",
    leader: "npc_manlo",
    resources: { lawyers: 2, budget: 3 },
    allies: [],
    enemies: [],
    internalConflict: "部分行政人员想透明处理，另一些人只想压住事态。",
    style: "用政策、媒体话术和人手上限控制局面。",
    bottomLine: "不能出现点名延迟维护的报告。",
    currentPlan: "强调病患激增叙事，并拖延承包商问题。"
  },
  guide: {
    name: "周护士长",
    role: "夜班护士长",
    publicImage: "稳得住场面的护士，知道病区哪些角落还靠得住。",
    desire: "保护员工和病人，不让他们被不可能的沉默吞掉。",
    fear: "可避免死亡变成互相甩锅。",
    shortTermGoal: "让分诊继续运转。",
    longTermGoal: "逼出人手和维护审查。",
    secret: "他上周拍下了发电机缺失贴纸。"
  },
  authority: {
    name: "阿黛尔医生",
    role: "急诊医师",
    publicImage: "专注的医生，拒绝跳过困难病例。",
    desire: "在压力下做出经得起追问的分诊决定。",
    fear: "插管时突然断电。",
    shortTermGoal: "稳定创伤处置区。",
    longTermGoal: "让团队在事故复盘后仍能留住彼此。",
    secret: "她知道官方激增预案已经过时。"
  },
  broker: {
    name: "行政主管曼洛",
    role: "医院行政主管",
    publicImage: "镇定的行政人员，手机里存满媒体声明草稿。",
    desire: "让医院避开丑闻。",
    fear: "发电机维护缺口被公开。",
    shortTermGoal: "控制事故叙事。",
    longTermGoal: "保护导致短缺的预算交易。",
    secret: "他批准了延期维护合同。"
  },
  quest: {
    id: "night_surge",
    name: "撑住夜间激增",
    trigger: "同一小时内，电力故障和救护车激增同时砸向急诊病区。",
    realBackground: "延期发电机维护把艰难夜班推成系统性失败。",
    surfaceGoal: "让病人继续通过分诊流动。",
    hiddenGoal: "保留真实事故复盘所需的证据。",
    failureConsequence: "病区靠把可避免伤害埋进文书里撑了下来。",
    longTermImpact: "后续真实职业篇章会继承更安全的病区或受损的员工队伍。"
  },
  stabilityClock: {
    name: "照护连续性",
    progress: 0,
    max: 4,
    consequence: "病区维持照护流动，并保住事故线索。"
  },
  pressureClock: {
    name: "系统过载",
    progress: 0,
    max: 4,
    consequence: "激增压垮分诊，报告变成政治问题。"
  },
  firstAction: {
    actionType: "protect",
    label: "稳定分诊流程",
    description: "调配人手、床位和氧气，避免候诊区崩溃。",
    targetId: "npc_adele",
    leverage: ["triage_board", "charge_nurse"],
    riskLevel: "medium"
  },
  secondAction: {
    actionType: "investigate",
    label: "记录发电机故障",
    description: "固定维护证据，同时保证创伤处置区有人照看。",
    targetId: "npc_zhou_jin",
    leverage: ["generator_photo", "shift_log"],
    riskLevel: "high"
  },
  successEnding: {
    id: "ward_saved",
    title: "病区得救",
    summary: "夜班团队维持照护流动，也为更安全的医院篇章保住证据。"
  },
  failureEnding: {
    id: "paperwork_burial",
    title: "文书掩埋",
    summary: "病区撑了下来，但员工背负着未来班次必须面对的沉默。"
  }
});

export const firstWaveExpansionPackages: ScenarioPackage[] = [
  orbitalQuarantinePackage,
  saltHarborAccordPackage,
  rainAlleyHauntingPackage,
  emergencyWardNightPackage
];
