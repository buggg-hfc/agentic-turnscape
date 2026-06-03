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

const defaultAttributes: Attributes = {
  physique: 2,
  agility: 2,
  knowledge: 2,
  insight: 2,
  charm: 2,
  will: 2
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

export type BorderSevenDaysSceneKind = "combat" | "social" | "exploration";

export type BorderSevenDaysScene = {
  id: string;
  name: string;
  kind: BorderSevenDaysSceneKind;
  day: number;
  locationId: string;
  npcIds: string[];
  crisisClockIds: string[];
  nonCombatSolutions: string[];
};

export type BorderSevenDaysDayPlan = {
  day: number;
  mainEvent: string;
  defaultLocationId: string;
  sceneIds: string[];
  clockPressure: string[];
};

export type BorderSevenDaysEnding = {
  id: string;
  title: string;
  summary: string;
};

export type BorderSevenDaysScenario = {
  id: "border-seven-days";
  title: string;
  days: BorderSevenDaysDayPlan[];
  scenes: BorderSevenDaysScene[];
  endings: BorderSevenDaysEnding[];
};

export const borderSevenDaysScenario: BorderSevenDaysScenario = {
  id: "border-seven-days",
  title: "边境七日",
  days: [
    {
      day: 1,
      mainEvent: "商队失踪，玩家接到调查委托。",
      defaultLocationId: "town_square",
      sceneIds: ["caravan_rumor_square", "black_market_first_trade"],
      clockPressure: ["mine_takeover"]
    },
    {
      day: 2,
      mainEvent: "诊所出现异常病人。",
      defaultLocationId: "clinic",
      sceneIds: ["clinic_first_diagnosis", "well_sample_argument"],
      clockPressure: ["plague_spread"]
    },
    {
      day: 3,
      mainEvent: "城防军开始封锁街区。",
      defaultLocationId: "clinic",
      sceneIds: ["clinic_door_standoff", "street_lockdown_break"],
      clockPressure: ["plague_spread", "martial_lockdown"]
    },
    {
      day: 4,
      mainEvent: "商会收购矿区，教团暗中行动。",
      defaultLocationId: "mine",
      sceneIds: ["mine_contract_hearing", "chapel_shelter_offer"],
      clockPressure: ["mine_takeover", "cult_ritual"]
    },
    {
      day: 5,
      mainEvent: "旧哨站爆发冲突。",
      defaultLocationId: "old_outpost",
      sceneIds: ["old_outpost_ambush", "signal_tower_chase", "warehouse_evidence_talk"],
      clockPressure: ["mine_takeover", "cult_ritual"]
    },
    {
      day: 6,
      mainEvent: "关键 NPC 可能背叛、牺牲或求助。",
      defaultLocationId: "black_market",
      sceneIds: ["mercenary_bargain", "eve_confession", "hagen_showdown"],
      clockPressure: ["plague_spread", "cult_ritual", "mine_takeover"]
    },
    {
      day: 7,
      mainEvent: "仪式、瘟疫、商会计划三线交汇，进入结局。",
      defaultLocationId: "chapel",
      sceneIds: ["ritual_gate_battle", "public_trial_square", "rift_final_choice"],
      clockPressure: ["plague_spread", "cult_ritual", "mine_takeover"]
    }
  ],
  scenes: [
    {
      id: "caravan_rumor_square",
      name: "广场商队谣言",
      kind: "social",
      day: 1,
      locationId: "town_square",
      npcIds: ["npc_zhou_jin", "npc_rowan"],
      crisisClockIds: ["mine_takeover"],
      nonCombatSolutions: ["询问", "安抚", "交换情报"]
    },
    {
      id: "black_market_first_trade",
      name: "乌鸦巷第一笔交易",
      kind: "social",
      day: 1,
      locationId: "black_market",
      npcIds: ["npc_crow_nine"],
      crisisClockIds: ["mine_takeover"],
      nonCombatSolutions: ["交易", "许诺", "威吓"]
    },
    {
      id: "clinic_first_diagnosis",
      name: "诊所初诊",
      kind: "social",
      day: 2,
      locationId: "clinic",
      npcIds: ["npc_adele", "npc_mina"],
      crisisClockIds: ["plague_spread"],
      nonCombatSolutions: ["医疗", "共情", "采样"]
    },
    {
      id: "well_sample_argument",
      name: "旧井水样争执",
      kind: "exploration",
      day: 2,
      locationId: "town_square",
      npcIds: ["npc_adele", "npc_manlo"],
      crisisClockIds: ["plague_spread", "mine_takeover"],
      nonCombatSolutions: ["调查", "辩论", "公开证据"]
    },
    {
      id: "clinic_door_standoff",
      name: "诊所门口对峙",
      kind: "social",
      day: 3,
      locationId: "clinic",
      npcIds: ["npc_adele", "npc_rowan", "npc_mina", "npc_zhou_jin"],
      crisisClockIds: ["plague_spread", "martial_lockdown"],
      nonCombatSolutions: ["谈判", "找出煽动者", "护送"]
    },
    {
      id: "street_lockdown_break",
      name: "封锁街口突围",
      kind: "combat",
      day: 3,
      locationId: "town_square",
      npcIds: ["npc_rowan", "npc_zhou_jin"],
      crisisClockIds: ["martial_lockdown"],
      nonCombatSolutions: ["绕路", "交保证据", "安抚人群"]
    },
    {
      id: "mine_contract_hearing",
      name: "矿区合同听证",
      kind: "social",
      day: 4,
      locationId: "mine",
      npcIds: ["npc_manlo", "npc_rowan", "npc_crow_nine"],
      crisisClockIds: ["mine_takeover"],
      nonCombatSolutions: ["辩论", "揭露合同漏洞", "交易"]
    },
    {
      id: "chapel_shelter_offer",
      name: "礼拜堂收留请求",
      kind: "social",
      day: 4,
      locationId: "chapel",
      npcIds: ["npc_eve", "npc_mina"],
      crisisClockIds: ["cult_ritual", "plague_spread"],
      nonCombatSolutions: ["共情", "调查名单", "保护病人"]
    },
    {
      id: "old_outpost_ambush",
      name: "旧哨站伏击",
      kind: "combat",
      day: 5,
      locationId: "old_outpost",
      npcIds: ["npc_zhou_jin", "npc_hagen", "npc_kyle"],
      crisisClockIds: ["mine_takeover"],
      nonCombatSolutions: ["潜行", "谈判雇佣兵", "救幸存者撤退"]
    },
    {
      id: "signal_tower_chase",
      name: "信号塔追逐",
      kind: "combat",
      day: 5,
      locationId: "old_outpost",
      npcIds: ["npc_hagen", "npc_kyle"],
      crisisClockIds: ["mine_takeover", "cult_ritual"],
      nonCombatSolutions: ["诱导城防介入", "破坏路线", "交涉停火"]
    },
    {
      id: "warehouse_evidence_talk",
      name: "地下仓库证据谈判",
      kind: "exploration",
      day: 5,
      locationId: "old_outpost",
      npcIds: ["npc_kyle", "npc_zhou_jin"],
      crisisClockIds: ["mine_takeover"],
      nonCombatSolutions: ["安抚", "承诺保护", "公开证据"]
    },
    {
      id: "mercenary_bargain",
      name: "雇佣兵价码",
      kind: "exploration",
      day: 6,
      locationId: "black_market",
      npcIds: ["npc_hagen", "npc_crow_nine", "npc_manlo"],
      crisisClockIds: ["mine_takeover"],
      nonCombatSolutions: ["交易", "威吓", "策反"]
    },
    {
      id: "eve_confession",
      name: "伊芙的告解",
      kind: "social",
      day: 6,
      locationId: "chapel",
      npcIds: ["npc_eve", "npc_white_crow"],
      crisisClockIds: ["cult_ritual"],
      nonCombatSolutions: ["共情", "许诺", "揭露仪式代价"]
    },
    {
      id: "hagen_showdown",
      name: "哈根摊牌",
      kind: "combat",
      day: 6,
      locationId: "mine",
      npcIds: ["npc_hagen", "npc_manlo"],
      crisisClockIds: ["mine_takeover"],
      nonCombatSolutions: ["策反", "公开雇佣合同", "撤退"]
    },
    {
      id: "ritual_gate_battle",
      name: "仪式门前战",
      kind: "combat",
      day: 7,
      locationId: "chapel",
      npcIds: ["npc_eve", "npc_hagen", "npc_mina", "npc_white_crow"],
      crisisClockIds: ["cult_ritual", "plague_spread"],
      nonCombatSolutions: ["封印", "劝退温和派", "交换人质"]
    },
    {
      id: "public_trial_square",
      name: "广场公开审判",
      kind: "social",
      day: 7,
      locationId: "town_square",
      npcIds: ["npc_rowan", "npc_manlo", "npc_adele", "npc_kyle"],
      crisisClockIds: ["mine_takeover", "martial_lockdown"],
      nonCombatSolutions: ["公开证据", "辩论", "争取城防"]
    },
    {
      id: "rift_final_choice",
      name: "裂隙终局选择",
      kind: "exploration",
      day: 7,
      locationId: "chapel",
      npcIds: ["npc_white_crow", "npc_eve", "npc_mina"],
      crisisClockIds: ["cult_ritual", "plague_spread", "mine_takeover"],
      nonCombatSolutions: ["封印", "打开裂隙", "带幸存者流亡"]
    }
  ],
  endings: [
    {
      id: "ritual_stopped",
      title: "阻止仪式",
      summary: "玩家阻止仪式，救下大部分居民，但商会主谋趁乱撤离。"
    },
    {
      id: "guild_reform",
      title: "公会接管",
      summary: "玩家揭露商会，边境公会重组秩序，但教团带走裂隙核心。"
    },
    {
      id: "cure_with_exiles",
      title: "治愈与流亡",
      summary: "玩家与教团温和派合作治愈瘟疫，却因违抗封锁被官方通缉。"
    },
    {
      id: "town_quarantined",
      title: "封锁小镇",
      summary: "玩家未能压住瘟疫，小镇被封锁，幸存者转入流亡线。"
    },
    {
      id: "consortium_rule",
      title: "商会统治",
      summary: "玩家投靠或未能阻止商会，获得财富机会，但失去部分同伴信任。"
    },
    {
      id: "rift_opened",
      title: "裂隙开启",
      summary: "玩家打开或未能阻止裂隙，边境七日结束，世界线扩大。"
    }
  ]
};

const locations: Record<string, LocationState> = {
  town_square: {
    id: "town_square",
    name: "边境广场",
    description: "裂隙边境小镇的公开集会地，城防军、商贩和求助者都会在这里留下痕迹。",
    publicInfo: ["商队失踪的消息正在发酵", "城防军加强了巡逻"],
    hiddenInfo: ["商会雇员正在观察谁会接近失踪商队的家属"],
    tags: ["public", "social", "rumor"],
    dangerLevel: 1
  },
  clinic: {
    id: "clinic",
    name: "阿黛尔诊所",
    description: "小镇唯一稳定运行的诊所，药柜空了一半，门口常有人排队。",
    publicInfo: ["诊所收治了几个症状奇怪的病人", "阿黛尔拒绝把感染者交给城防军"],
    hiddenInfo: ["米娜的症状与旧井水样高度相关"],
    tags: ["medical", "social", "crisis"],
    dangerLevel: 2
  },
  old_outpost: {
    id: "old_outpost",
    name: "废弃哨站",
    description: "失联多年的边境哨站，近日重新出现火光和裂隙矿粉。",
    publicInfo: ["失踪商队最后一次被看见是在哨站方向"],
    hiddenInfo: ["凯尔在哨站地下仓库藏了矿区证据"],
    tags: ["combat", "investigation", "rift"],
    dangerLevel: 4
  },
  mine: {
    id: "mine",
    name: "黑石矿区",
    description: "裂隙矿石的主要来源，矿道深处有低声回响。",
    publicInfo: ["黑石商会正在推动矿区收购"],
    hiddenInfo: ["矿区污染正在加速瘟疫扩散"],
    tags: ["economy", "rift", "danger"],
    dangerLevel: 4
  },
  chapel: {
    id: "chapel",
    name: "裂隙礼拜堂",
    description: "裂隙教团救助受影响者的地方，温和祈祷与狂热低语同时存在。",
    publicInfo: ["教团收留了一批被城防军拒绝的人"],
    hiddenInfo: ["狂信派正在准备第七夜仪式"],
    tags: ["faith", "social", "hidden"],
    dangerLevel: 3
  },
  black_market: {
    id: "black_market",
    name: "乌鸦巷黑市",
    description: "药品、情报、赃物和沉默都能在这里买到。",
    publicInfo: ["药品涨价，补给变得紧俏"],
    hiddenInfo: ["鸦九知道商会走私派的联系人"],
    tags: ["trade", "information", "risk"],
    dangerLevel: 3
  }
};

const characters: Record<string, CharacterState> = {
  npc_zhou_jin: {
    id: "npc_zhou_jin",
    name: "周烬",
    role: "老猎人",
    factionId: "frontier_guild",
    publicImage: "沉默可靠的边境向导",
    truePersonality: "谨慎、护短、对旧事有负罪感",
    desire: "保护玩家并阻止旧哨站的秘密重演",
    fear: "当年的错误再次害死无辜者",
    shortTermGoal: "找出商队失踪的真相",
    longTermGoal: "偿还自己欠边境的债",
    secret: "他曾参与封锁旧哨站，知道那里藏过裂隙矿样",
    bottomLine: "不会主动伤害平民",
    weakness: "遇到旧哨站幸存者时会动摇",
    attributes: { ...defaultAttributes, insight: 4, agility: 3, will: 3 },
    skills: { survival: 4, ranged: 3, insight: 3, stealth: 2 },
    resources: { arrows: 6, contacts: 1 },
    conditions: [],
    knownFacts: ["商队失踪路线异常", "旧哨站不该有人点火", "玩家愿意介入边境危机"],
    memorySummary: "周烬刚成为玩家的向导，尚未透露旧哨站往事。"
  },
  npc_adele: {
    id: "npc_adele",
    name: "阿黛尔",
    role: "医生",
    publicImage: "救人优先、疲惫但坚定的边境医生",
    truePersonality: "仁慈、倔强、厌恶把人当资源",
    desire: "保护诊所病人并查明瘟疫来源",
    fear: "城防军用隔离名义处置病人",
    shortTermGoal: "争取半天诊断时间",
    longTermGoal: "建立不依赖商会的药品渠道",
    secret: "她怀疑旧井水样被裂隙矿污染",
    bottomLine: "不会交出没有诊断结论的病人",
    weakness: "药品不足，容易被现实压力逼到绝境",
    attributes: { ...defaultAttributes, knowledge: 4, charm: 3, will: 4 },
    skills: { medical: 5, social: 3, insight: 2 },
    resources: { medicine: 4, reputation: 3, assistants: 1 },
    conditions: ["exhausted"],
    knownFacts: ["城防军正在搜查感染者", "米娜病情异常", "旧井附近出现异味"],
    memorySummary: "阿黛尔愿意相信玩家，但需要玩家证明自己会承担后果。"
  },
  npc_manlo: {
    id: "npc_manlo",
    name: "曼洛",
    role: "商会代表",
    factionId: "blackstone_consortium",
    publicImage: "礼貌、精明、重视契约的商会代理人",
    truePersonality: "利益最大化，避免公开违法",
    desire: "控制黑石矿区并压低危机声量",
    fear: "商会走私派失控，把自己拖进丑闻",
    shortTermGoal: "推动矿区收购",
    longTermGoal: "成为商会在边境的正式执事",
    secret: "他知道走私派雇佣了密探煽动诊所冲突",
    bottomLine: "不会在公开证据面前替走私派硬扛",
    weakness: "害怕被总会抛弃",
    attributes: { ...defaultAttributes, charm: 4, insight: 3 },
    skills: { social: 4, trade: 5, deception: 3 },
    resources: { money: 8, influence: 4, guards: 2 },
    conditions: [],
    knownFacts: ["矿区收购只差最后一批签字", "诊所危机能转移公众注意力"],
    memorySummary: "曼洛把玩家视为可收买或可绕开的变量。"
  },
  npc_rowan: {
    id: "npc_rowan",
    name: "罗文",
    role: "城防队长",
    factionId: "frontier_guild",
    publicImage: "秩序优先、压力很大的城防队长",
    truePersonality: "务实、害怕失控，不想流血",
    desire: "防止瘟疫扩散并维持街区秩序",
    fear: "封锁失败导致小镇暴乱",
    shortTermGoal: "带走感染者或取得足够医学保证",
    longTermGoal: "让城防军保住边境治理权",
    secret: "他接到过来自商会的非正式压力",
    bottomLine: "不会容忍公开暴乱",
    weakness: "缺乏医学判断，只能依赖命令",
    attributes: { ...defaultAttributes, physique: 3, will: 4 },
    skills: { command: 4, melee: 3, intimidation: 3 },
    resources: { guards: 5, authority: 4 },
    conditions: ["strained"],
    knownFacts: ["诊所收治感染者", "居民开始恐慌", "玩家刚接下商队调查"],
    memorySummary: "罗文愿意听证据，但时间不多。"
  },
  npc_eve: {
    id: "npc_eve",
    name: "伊芙",
    role: "教团少女",
    factionId: "rift_cult",
    publicImage: "温和、虔诚、照顾裂隙病人的少女",
    truePersonality: "信仰动摇，仍想拯救所有人",
    desire: "证明裂隙不是纯粹灾厄",
    fear: "教团狂信派真的在献祭病人",
    shortTermGoal: "把被拒绝的病人带到礼拜堂",
    longTermGoal: "说服教团停止第七夜仪式",
    secret: "她听见过仪式名单里有米娜的名字",
    bottomLine: "不会亲手献祭孩子",
    weakness: "容易被宗教语言操控",
    attributes: { ...defaultAttributes, charm: 3, will: 3 },
    skills: { social: 3, mystic: 2, medical: 1 },
    resources: { faith: 4, shelter: 2 },
    conditions: [],
    knownFacts: ["礼拜堂可以收留病人", "教团内部有人急于举行仪式"],
    memorySummary: "伊芙还没有决定要不要背叛教团。"
  },
  npc_crow_nine: {
    id: "npc_crow_nine",
    name: "鸦九",
    role: "黑市商人",
    publicImage: "逐利但守交易规矩的情报贩子",
    truePersonality: "不相信道德，但相信长期信用",
    desire: "在危机中扩大黑市影响",
    fear: "商会完全垄断药品和情报",
    shortTermGoal: "出售药品和密探线索",
    longTermGoal: "让所有阵营都欠自己人情",
    secret: "他知道商会密探的撤离路线",
    bottomLine: "不会出卖已经付清价码的客户",
    weakness: "贪心，喜欢复杂交易",
    attributes: { ...defaultAttributes, insight: 4, charm: 3 },
    skills: { trade: 5, deception: 3, stealth: 3 },
    resources: { medicine: 2, intel: 5, money: 5 },
    conditions: [],
    knownFacts: ["药品短缺正在抬价", "玩家可能需要非官方渠道"],
    memorySummary: "鸦九在等待玩家提出第一笔真正有价值的交易。"
  },
  npc_kyle: {
    id: "npc_kyle",
    name: "凯尔",
    role: "失踪士兵",
    factionId: "frontier_guild",
    publicImage: "被认为临阵脱逃的年轻士兵",
    truePersonality: "恐惧但仍想揭露真相",
    desire: "把矿区证据交给可信的人",
    fear: "被商会或城防军灭口",
    shortTermGoal: "从旧哨站活着离开",
    longTermGoal: "洗清逃兵名声",
    secret: "他拿到了商会走私派与教团交易的账本",
    bottomLine: "不会把证据交给曼洛",
    weakness: "重伤、缺水、精神紧绷",
    attributes: { ...defaultAttributes, agility: 3, will: 3 },
    skills: { survival: 2, ranged: 2, stealth: 3 },
    resources: { evidence: 1, ammunition: 2 },
    conditions: ["wounded", "hunted"],
    knownFacts: ["旧哨站地下仓库可藏身", "商会雇佣兵正在找他"],
    memorySummary: "凯尔尚未和玩家见面。"
  },
  npc_mina: {
    id: "npc_mina",
    name: "米娜",
    role: "孤儿",
    publicImage: "经常在诊所帮忙的安静孩子",
    truePersonality: "敏感、聪明、害怕被带走",
    desire: "活下来并保护其他孩子",
    fear: "自己变成裂隙怪物",
    shortTermGoal: "躲过城防军搜查",
    longTermGoal: "找到失踪的哥哥",
    secret: "她梦见过裂隙仪式的地点",
    bottomLine: "不会主动害阿黛尔",
    weakness: "病情正在恶化",
    attributes: { ...defaultAttributes, physique: 1, insight: 3 },
    skills: { stealth: 2, insight: 2 },
    resources: { clue: 1 },
    conditions: ["infected"],
    knownFacts: ["旧井水味道不对", "灰衣男人在诊所门口重复谣言"],
    memorySummary: "米娜把玩家视为可能救她的人。"
  },
  npc_hagen: {
    id: "npc_hagen",
    name: "哈根",
    role: "雇佣兵头目",
    factionId: "blackstone_consortium",
    publicImage: "粗鲁但讲价码的武装头目",
    truePersonality: "可敌可友，尊重强者和明确契约",
    desire: "拿钱办事并保住手下",
    fear: "被商会当成弃子",
    shortTermGoal: "抓住凯尔或夺回账本",
    longTermGoal: "脱离商会控制，自立门户",
    secret: "他不认同献祭孩子，但暂时不愿翻脸",
    bottomLine: "不接受必死任务",
    weakness: "手下士气依赖他个人威望",
    attributes: { ...defaultAttributes, physique: 4, will: 3 },
    skills: { melee: 4, command: 3, intimidation: 4 },
    resources: { mercenaries: 4, weapons: 5 },
    conditions: [],
    knownFacts: ["凯尔可能藏在旧哨站", "商会走私派比曼洛更激进"],
    memorySummary: "哈根尚未判断玩家是猎物、客户还是麻烦。"
  },
  npc_white_crow: {
    id: "npc_white_crow",
    name: "白鸦",
    role: "神秘观测者",
    publicImage: "偶尔出现、像在观察裂隙走向的陌生人",
    truePersonality: "冷静、疏离、只在关键因果处介入",
    desire: "推动玩家发现裂隙背后的更大世界",
    fear: "小镇在第七夜前失去选择权",
    shortTermGoal: "让玩家注意到三条危机之间的联系",
    longTermGoal: "确认玩家是否能成为裂隙纪元的变量",
    secret: "他知道裂隙不是自然灾害，而是某种回应",
    bottomLine: "不会直接替玩家做选择",
    weakness: "受某种观测规则限制，不能暴露完整真相",
    attributes: { ...defaultAttributes, knowledge: 5, insight: 5, will: 4 },
    skills: { mystic: 5, insight: 5, social: 2 },
    resources: { omens: 3 },
    conditions: [],
    knownFacts: ["瘟疫、矿区和仪式共享同一个裂隙源", "玩家正在被多个阵营评估"],
    memorySummary: "白鸦还没有正式现身。"
  }
};

const factions: Record<string, FactionState> = {
  frontier_guild: {
    id: "frontier_guild",
    name: "边境公会",
    publicGoal: "维持裂隙边境秩序",
    hiddenGoal: "寻找可控裂隙技术",
    leader: "罗文",
    resources: { guards: 6, legitimacy: 5, medicine: 1 },
    baseId: "town_square",
    allies: [],
    enemies: ["rift_cult"],
    internalConflict: "老派重纪律，新派追利益",
    style: "公开执法、封锁风险、谨慎谈判",
    bottomLine: "不能让小镇公开失控",
    currentPlan: "控制感染者并调查失踪商队",
    clockIds: ["plague_spread", "martial_lockdown"]
  },
  blackstone_consortium: {
    id: "blackstone_consortium",
    name: "黑石商会",
    publicGoal: "控制边境贸易",
    hiddenGoal: "垄断裂隙矿石",
    leader: "曼洛",
    resources: { money: 9, mercenaries: 4, contracts: 5 },
    baseId: "mine",
    allies: [],
    enemies: [],
    internalConflict: "合法派与走私派互相拖拽",
    style: "契约、舆论、雇佣兵、价格操控",
    bottomLine: "公开证据不能指向商会总部",
    currentPlan: "完成矿区收购并转移瘟疫责任",
    clockIds: ["mine_takeover"]
  },
  rift_cult: {
    id: "rift_cult",
    name: "裂隙教团",
    publicGoal: "救赎被裂隙影响的人",
    hiddenGoal: "召唤裂隙中的高等存在",
    leader: "无面司祭",
    resources: { believers: 5, relics: 3, shelter: 3 },
    baseId: "chapel",
    allies: [],
    enemies: ["frontier_guild"],
    internalConflict: "温和派想救人，狂信派想完成仪式",
    style: "收留、祈祷、秘密仪式、情感动员",
    bottomLine: "狂信派不会主动放弃第七夜",
    currentPlan: "收集感染者并准备仪式",
    clockIds: ["cult_ritual"]
  }
};

const clocks: Record<string, ClockState> = {
  plague_spread: {
    id: "plague_spread",
    name: "瘟疫扩散",
    progress: 0,
    max: 8,
    consequence: "城市封锁，大量居民死亡或逃离。",
    visible: true
  },
  cult_ritual: {
    id: "cult_ritual",
    name: "教团仪式",
    progress: 0,
    max: 6,
    consequence: "裂隙仪式启动，进入高危终局。",
    visible: true
  },
  mine_takeover: {
    id: "mine_takeover",
    name: "商会控制矿区",
    progress: 0,
    max: 5,
    consequence: "矿区被商会掌控，玩家调查难度上升。",
    visible: true
  },
  martial_lockdown: {
    id: "martial_lockdown",
    name: "城防军戒严",
    progress: 1,
    max: 6,
    consequence: "宵禁、搜查和冲突升级。",
    visible: false
  }
};

const quests: Record<string, QuestState> = {
  missing_caravan: {
    id: "missing_caravan",
    name: "失踪商队",
    trigger: "第 1 天，商队在旧哨站方向失踪。",
    patron: "边境公会",
    realBackground: "商队发现裂隙矿石走私线索，被商会和教团同时盯上。",
    surfaceGoal: "调查商队为何失踪。",
    hiddenGoal: "找到账本并确认瘟疫与矿区污染的关系。",
    locationIds: ["town_square", "old_outpost", "mine"],
    npcIds: ["npc_zhou_jin", "npc_kyle", "npc_hagen"],
    factionIds: ["frontier_guild", "blackstone_consortium", "rift_cult"],
    solutionTypes: ["investigation", "combat", "negotiation", "stealth"],
    failureConsequence: "商会控制矿区，教团获得祭品，公会声望下降。",
    longTermImpact: "矿石价格变化；幸存者成为同伴或仇人；裂隙污染扩散。",
    status: "active"
  },
  clinic_crisis: {
    id: "clinic_crisis",
    name: "诊所门口",
    trigger: "诊所出现异常病人，城防军准备带走感染者。",
    patron: "阿黛尔",
    realBackground: "瘟疫源头不是普通传染病，而是旧井与矿区污染。",
    surfaceGoal: "阻止诊所冲突升级。",
    hiddenGoal: "发现商会密探并保住半天诊断时间。",
    locationIds: ["clinic"],
    npcIds: ["npc_adele", "npc_rowan", "npc_mina", "npc_zhou_jin"],
    factionIds: ["frontier_guild", "blackstone_consortium"],
    solutionTypes: ["social", "investigation", "protection"],
    failureConsequence: "感染者被带走，瘟疫时钟推进，阿黛尔信任下降。",
    longTermImpact: "决定玩家是否能获得医学线索和居民支持。",
    status: "available"
  }
};

export const createBorderSevenDaysWorld = (): WorldState => ({
  time: { day: 1, phase: "morning" },
  currentLocationId: "town_square",
  player: {
    id: "player",
    name: "旅人",
    attributes: { physique: 2, agility: 2, knowledge: 2, insight: 3, charm: 3, will: 3 },
    skills: {
      melee: 1,
      ranged: 1,
      defense: 1,
      stealth: 1,
      medical: 1,
      engineering: 0,
      academic: 1,
      social: 3,
      intimidation: 1,
      command: 1,
      survival: 2,
      mystic: 1,
      investigation: 3
    },
    resources: { money: 5, supplies: 4, intel: 1, favor: 0, focus: 3, stamina: 4, health: 5, pressure: 1 },
    conditions: [],
    reputationTags: ["外来者", "愿意听完别人说话的人"],
    momentum: 1
  },
  locations: structuredClone(locations),
  characters: structuredClone(characters),
  factions: structuredClone(factions),
  relationships: {
    "player:npc_zhou_jin": relationship({ trust: 1, respect: 1 }),
    "player:npc_adele": relationship({ trust: 1, affinity: 1 }),
    "player:npc_rowan": relationship({ respect: 0, suspicion: 1 }),
    "player:npc_manlo": relationship({ interest: 1, suspicion: 1 }),
    "player:npc_eve": relationship({ affinity: 0, suspicion: 0 }),
    "player:npc_crow_nine": relationship({ interest: 1 }),
    "player:npc_kyle": relationship(),
    "player:npc_mina": relationship({ trust: 1, affinity: 1 }),
    "player:npc_hagen": relationship({ fear: 1 }),
    "player:npc_white_crow": relationship({ suspicion: 2 })
  },
  quests: structuredClone(quests),
  clocks: structuredClone(clocks),
  publicEvents: [
    {
      id: "evt_start",
      turnId: "setup",
      day: 1,
      phase: "morning",
      title: "商队失踪",
      body: "一支前往黑石矿区的商队没有按时抵达。边境广场上，关于旧哨站火光和矿石走私的谣言开始扩散。",
      tags: ["intro", "quest"],
      createdAt: new Date(0).toISOString()
    }
  ],
  hiddenEvents: [
    {
      id: "hidden_source",
      turnId: "setup",
      day: 1,
      phase: "morning",
      title: "共同源头",
      body: "瘟疫、矿区污染与教团仪式都指向同一处裂隙异常源。",
      tags: ["rift", "truth"],
      createdAt: new Date(0).toISOString(),
      revealed: false,
      relatedIds: ["plague_spread", "cult_ritual", "mine_takeover"]
    }
  ]
});

export const getBorderSevenDaysDayPlan = (day: number): BorderSevenDaysDayPlan | undefined =>
  borderSevenDaysScenario.days.find((plan) => plan.day === day);

const borderSevenDaysSceneActions: Record<string, PlayerAction> = {
  caravan_rumor_square: {
    id: "scene:caravan_rumor_square",
    actionType: "negotiate",
    label: "Question the caravan rumor crowd",
    description: "Use public testimony and Rowan's authority to stabilize the square before the rumor spreads.",
    targetId: "npc_rowan",
    leverage: ["scene:caravan_rumor_square", "public_rumor", "resident_trust"],
    riskLevel: "medium"
  },
  black_market_first_trade: {
    id: "scene:black_market_first_trade",
    actionType: "trade",
    label: "Buy the first black-market lead",
    description: "Trade coin and fresh rumor for Crow Nine's first useful lead.",
    targetId: "npc_crow_nine",
    leverage: ["scene:black_market_first_trade", "money", "fresh_rumor"],
    riskLevel: "medium"
  },
  clinic_first_diagnosis: {
    id: "scene:clinic_first_diagnosis",
    actionType: "protect",
    label: "Protect the clinic diagnosis",
    description: "Hold space for Adele and Mina long enough for the first diagnosis to matter.",
    targetId: "npc_mina",
    leverage: ["scene:clinic_first_diagnosis", "clinic_protocol", "adele_trust"],
    riskLevel: "medium"
  },
  clinic_door_standoff: {
    id: "scene:clinic_door_standoff",
    actionType: "negotiate",
    label: "Defuse the clinic door standoff",
    description: "Negotiate with Rowan while Adele keeps the patients stable.",
    targetId: "npc_rowan",
    leverage: ["scene:clinic_door_standoff", "medical_plan", "resident_trust"],
    riskLevel: "medium"
  },
  street_lockdown_break: {
    id: "scene:street_lockdown_break",
    actionType: "fight",
    label: "Break the street lockdown",
    description: "Use a controlled three-action combat exchange to open an escape route.",
    targetId: "npc_rowan",
    leverage: ["scene:street_lockdown_break", "ap:strike", "ap:guard"],
    riskLevel: "high"
  },
  mine_contract_hearing: {
    id: "scene:mine_contract_hearing",
    actionType: "investigate",
    label: "Challenge the mine contract",
    description: "Expose contract gaps before Manlo can turn the hearing into a done deal.",
    targetId: "npc_manlo",
    leverage: ["scene:mine_contract_hearing", "contract_gap", "public_record"],
    riskLevel: "medium"
  },
  chapel_shelter_offer: {
    id: "scene:chapel_shelter_offer",
    actionType: "protect",
    label: "Vet the chapel shelter offer",
    description: "Protect Mina while testing whether Eve's shelter offer is safe.",
    targetId: "npc_mina",
    leverage: ["scene:chapel_shelter_offer", "eve_shelter", "patient_list"],
    riskLevel: "medium"
  },
  old_outpost_ambush: {
    id: "scene:old_outpost_ambush",
    actionType: "fight",
    label: "Survive the old outpost ambush",
    description: "Hold off Hagen's mercenaries while Kyle gets a chance to move.",
    targetId: "npc_hagen",
    leverage: ["scene:old_outpost_ambush", "ap:strike", "ap:guard"],
    riskLevel: "high"
  },
  signal_tower_chase: {
    id: "scene:signal_tower_chase",
    actionType: "fight",
    label: "Win the signal tower chase",
    description: "Spend three combat actions to pin Hagen's route and keep the ledger moving.",
    targetId: "npc_hagen",
    leverage: ["scene:signal_tower_chase", "ap:maneuver", "ap:press", "ap:guard"],
    riskLevel: "high"
  },
  mercenary_bargain: {
    id: "scene:mercenary_bargain",
    actionType: "trade",
    label: "Bargain with the mercenaries",
    description: "Trade value and leverage through Crow Nine before Hagen chooses a side.",
    targetId: "npc_crow_nine",
    leverage: ["scene:mercenary_bargain", "money", "mercenary_terms"],
    riskLevel: "medium"
  },
  eve_confession: {
    id: "scene:eve_confession",
    actionType: "investigate",
    label: "Listen to Eve's confession",
    description: "Follow Eve's confession carefully enough to separate warning from cult doctrine.",
    targetId: "npc_eve",
    leverage: ["scene:eve_confession", "eve_confession", "patient_list"],
    riskLevel: "medium"
  },
  hagen_showdown: {
    id: "scene:hagen_showdown",
    actionType: "fight",
    label: "Force Hagen's showdown",
    description: "Resolve the mine showdown through a full three-action combat exchange.",
    targetId: "npc_hagen",
    leverage: ["scene:hagen_showdown", "ap:strike", "ap:guard"],
    riskLevel: "high"
  },
  ritual_gate_battle: {
    id: "scene:ritual_gate_battle",
    actionType: "fight",
    label: "Fight at the ritual gate",
    description: "Hold the ritual gate while Mina and White Crow's clues reshape the choice.",
    targetId: "npc_hagen",
    leverage: ["scene:ritual_gate_battle", "ap:maneuver", "ap:press", "ap:guard"],
    riskLevel: "high"
  },
  public_trial_square: {
    id: "scene:public_trial_square",
    actionType: "negotiate",
    label: "Argue the public trial",
    description: "Use Rowan's public authority and the mine evidence to force a visible ruling.",
    targetId: "npc_rowan",
    leverage: ["scene:public_trial_square", "public_record", "rowan_authority"],
    riskLevel: "medium"
  }
};

export const getBorderSevenDaysSceneAction = (sceneId: string): PlayerAction | undefined => {
  const action = borderSevenDaysSceneActions[sceneId];
  return action ? { ...action, leverage: [...action.leverage] } : undefined;
};

const requiredClock = (state: WorldState, clockId: string) => {
  const clock = state.clocks[clockId];
  if (!clock) throw new Error(`Missing required Border Seven Days clock: ${clockId}`);
  return clock;
};

export const evaluateBorderSevenDaysEnding = (state: WorldState): BorderSevenDaysEnding | undefined => {
  if (state.time.day < 7 || state.time.phase !== "night") return undefined;

  const ending = (id: string): BorderSevenDaysEnding => {
    const found = borderSevenDaysScenario.endings.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`Missing Border Seven Days ending: ${id}`);
    return found;
  };

  const cultRitual = requiredClock(state, "cult_ritual");
  const plagueSpread = requiredClock(state, "plague_spread");
  const mineTakeover = requiredClock(state, "mine_takeover");

  if (cultRitual.progress >= cultRitual.max) {
    return ending("rift_opened");
  }
  if (plagueSpread.progress >= plagueSpread.max) {
    return ending("town_quarantined");
  }
  if (mineTakeover.progress >= mineTakeover.max) {
    return ending("consortium_rule");
  }

  const adeleTrust = state.relationships["player:npc_adele"]?.trust ?? 0;
  const eveTrust = state.relationships["player:npc_eve"]?.trust ?? 0;
  const rowanRespect = state.relationships["player:npc_rowan"]?.respect ?? 0;
  const intel = state.player.resources.intel ?? 0;

  if (intel >= 6 && adeleTrust >= 3 && eveTrust >= 2) {
    return ending("cure_with_exiles");
  }
  if (intel >= 5 && rowanRespect >= 2) {
    return ending("guild_reform");
  }
  return ending("ritual_stopped");
};

const isBeforeEndingCheck = (state: WorldState): boolean => state.time.day < 7 || state.time.phase !== "night";

const getRecoveryBranchActions = (state: WorldState): PlayerAction[] => {
  if (!isBeforeEndingCheck(state)) return [];

  const actions: PlayerAction[] = [];
  const plague = state.clocks.plague_spread;
  const mine = state.clocks.mine_takeover;
  const cult = state.clocks.cult_ritual;

  if (plague && plague.progress >= plague.max - 2) {
    actions.push({
      id: "branch_quarantine_camp",
      actionType: "protect",
      label: "组织临时隔离营",
      description: "把诊所、礼拜堂和广场空屋串成临时隔离线，争取把瘟疫从崩盘边缘拉回来。",
      targetId: "npc_adele",
      leverage: ["recovery:plague", "clinic_protocol", "eve_shelter"],
      riskLevel: "high"
    });
  }

  if (mine && mine.progress >= mine.max - 1) {
    actions.push({
      id: "branch_public_ledger",
      actionType: "investigate",
      label: "公开矿区账本",
      description: "把凯尔的账本、商会走私线和矿区污染证据推到公开场合，迫使收购降速。",
      targetId: "npc_kyle",
      leverage: ["recovery:mine", "ledger_witness", "rowan_authority"],
      riskLevel: "high"
    });
  }

  if (cult && cult.progress >= cult.max - 1) {
    actions.push({
      id: "branch_ritual_interruption",
      actionType: "fight",
      label: "切断礼拜堂仪式",
      description: "在仪式完成前破坏关键阵列，给温和派和病人争取撤离窗口。",
      targetId: "npc_eve",
      leverage: ["recovery:cult", "ap:maneuver", "ap:press", "eve_confession"],
      riskLevel: "high"
    });
  }

  return actions;
};

const withRecoveryBranchActions = (state: WorldState, actions: PlayerAction[]): PlayerAction[] => [
  ...actions,
  ...getRecoveryBranchActions(state)
];

export const getBorderSevenDaysActions = (state: WorldState): PlayerAction[] => {
  if (state.currentLocationId === "clinic" || state.time.day >= 2) {
    return withRecoveryBranchActions(state, [
      {
        actionType: "negotiate",
        label: "协助阿黛尔谈判",
        description: "用诊断方案、居民信任和冷静解释拖住城防军。",
        targetId: "npc_rowan",
        leverage: ["medical_plan", "resident_trust"],
        riskLevel: "medium"
      },
      {
        actionType: "investigate",
        label: "找出煽动者",
        description: "让周烬观察人群，自己寻找重复谣言的人。",
        targetId: "npc_manlo",
        leverage: ["crowd_pattern", "zhou_jin_help"],
        riskLevel: "medium"
      },
      {
        actionType: "protect",
        label: "护送病人撤离",
        description: "趁冲突升级前把重症病人转移到安全地点。",
        targetId: "npc_mina",
        leverage: ["clinic_backdoor", "zhou_jin_help"],
        riskLevel: "high"
      },
      {
        actionType: "ignore",
        label: "退到街角观察",
        description: "不立刻介入，让各方先暴露真实意图。",
        leverage: [],
        riskLevel: "low"
      }
    ]);
  }

  return withRecoveryBranchActions(state, [
    {
      actionType: "investigate",
      label: "调查失踪商队",
      description: "询问目击者，整理前往旧哨站的路线。",
      targetId: "old_outpost",
      leverage: ["public_rumor", "zhou_jin_help"],
      riskLevel: "medium"
    },
    {
      actionType: "negotiate",
      label: "拜访阿黛尔诊所",
      description: "了解异常病人和药品短缺的情况。",
      targetId: "npc_adele",
      leverage: ["polite_introduction"],
      riskLevel: "low"
    },
    {
      actionType: "trade",
      label: "接触乌鸦巷黑市",
      description: "用钱和消息换取商队、药品或密探线索。",
      targetId: "npc_crow_nine",
      leverage: ["money", "fresh_rumor"],
      riskLevel: "medium"
    },
    {
      actionType: "rest",
      label: "整理补给",
      description: "恢复体力并让局势自行推进。",
      leverage: [],
      riskLevel: "low"
    }
  ]);
};
