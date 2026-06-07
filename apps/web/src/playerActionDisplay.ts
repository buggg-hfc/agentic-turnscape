import type { PlayerAction } from "@agentic-turnscape/shared";

type DisplayText = {
  label: string;
  description: string;
};

const builtInActionTextById: Record<string, DisplayText> = {
  "scene:caravan_rumor_square": {
    label: "询问商队谣言人群",
    description: "利用公开证词和罗文的权威，在谣言扩散前稳住广场。",
  },
  "scene:black_market_first_trade": {
    label: "购买第一条黑市线索",
    description: "用金钱和新鲜谣言换取乌鸦九第一条有用线索。",
  },
  "scene:clinic_first_diagnosis": {
    label: "保护诊所初诊",
    description: "为阿黛尔和米娜争取初诊时间，让诊断结果真正发挥作用。",
  },
  "scene:clinic_door_standoff": {
    label: "化解诊所门口对峙",
    description: "与罗文谈判，同时让阿黛尔稳定病人状态。",
  },
  "scene:street_lockdown_break": {
    label: "突破街区封锁",
    description: "用受控的三行动战斗交换打开撤离路线。",
  },
  "scene:mine_contract_hearing": {
    label: "质疑矿区合同",
    description: "在曼洛把听证变成定局前，公开合同漏洞。",
  },
  "scene:chapel_shelter_offer": {
    label: "核查礼拜堂庇护提议",
    description: "保护米娜，同时确认伊芙的庇护是否安全。",
  },
  "scene:old_outpost_ambush": {
    label: "撑过旧哨站伏击",
    description: "挡住哈根的雇佣兵，给凯尔争取行动机会。",
  },
  "scene:signal_tower_chase": {
    label: "赢下信号塔追逐",
    description: "投入三项战斗行动锁定哈根路线，并保护账本继续流转。",
  },
  "scene:mercenary_bargain": {
    label: "与雇佣兵议价",
    description: "通过乌鸦九交换价值和筹码，在哈根站队前改变局势。",
  },
  "scene:eve_confession": {
    label: "倾听伊芙的告解",
    description: "仔细追问伊芙的告解，区分真实警告和教团教义。",
  },
  "scene:hagen_showdown": {
    label: "逼出哈根决战",
    description: "用完整三行动战斗交换解决矿区摊牌。",
  },
  "scene:ritual_gate_battle": {
    label: "守住仪式门",
    description: "守住仪式入口，让米娜和白鸦的线索重塑选择。",
  },
  "scene:public_trial_square": {
    label: "公开审判中辩论",
    description: "用罗文的公开权威和矿区证据迫使裁决暴露在众人面前。",
  },
};

const builtInActionTextBySourceLabel: Record<string, DisplayText> = {
  "Build the public case": {
    label: "建立公开案情",
    description: "谨慎整理证据，让罗文能够公开行动。",
  },
  "Support the clinic cure": {
    label: "支援诊所治疗",
    description: "保护病人并协调阿黛尔的治疗工作。",
  },
  "Wait out the crisis": {
    label: "暂避危机",
    description: "避免立刻承诺，让小镇时钟继续推进。",
  },
  "Back the consortium deal": {
    label: "支持商会交易",
    description: "用影响力和时间换取黑石商会的承诺。",
  },
  "Follow the rift omens": {
    label: "追随裂隙预兆",
    description: "沿着白鸦的征兆追向礼拜堂异常。",
  },
  "Balance the factions": {
    label: "平衡各方阵营",
    description: "拖慢每条危机线，避免任何阵营完全控制局势。",
  },
  "Cross the mist gate": {
    label: "穿过雾门",
    description: "消耗体力深入试炼，不强行挑起决斗。",
  },
  "Face the trial spirit": {
    label: "直面试炼灵",
    description: "用力量和自律证明自己的心火能够稳定燃烧。",
  },
  "Trace the coolant fever": {
    label: "追查冷却剂热病",
    description: "从医疗舱样本一路追到维护冷却回路。",
  },
  "Hold the shuttle corridor": {
    label: "守住穿梭艇走廊",
    description: "维持家属撤离，不让打捞无人机夺下环区。",
  },
  "Recover the salt ledger": {
    label: "找回盐税账本",
    description: "在法庭开庭前追查码头许可和证人路线。",
  },
  "Draft a public accord": {
    label: "起草公开协定",
    description: "用证人与法律重开港口，同时避免把港口交给士兵。",
  },
  "Map the counting names": {
    label: "整理数名名单",
    description: "把住户证词和残缺驱逐名单逐项对照。",
  },
  "Bargain with the guardian": {
    label: "与守护灵谈判",
    description: "献上一份公共记忆，换取不牺牲租户的边界。",
  },
  "Stabilize triage flow": {
    label: "稳定分诊流程",
    description: "调配人手、床位和氧气，避免候诊区崩溃。",
  },
  "Document the generator fault": {
    label: "记录发电机故障",
    description: "固定维护证据，同时保证创伤处置区有人照看。",
  },
};

export const displayPlayerAction = (action: PlayerAction): PlayerAction => {
  const displayText =
    (action.id ? builtInActionTextById[action.id] : undefined) ??
    builtInActionTextBySourceLabel[action.label];

  return displayText ? { ...action, ...displayText } : action;
};
