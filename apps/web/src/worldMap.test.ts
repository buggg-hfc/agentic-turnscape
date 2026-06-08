import { describe, expect, it } from "vitest";
import type { WorldState } from "@agentic-turnscape/shared";
import {
  buildWorldMap,
  buildWorldMapActionDraft,
  getSelectedWorldMapNode,
} from "./worldMap.js";

const baseCharacter = {
  role: "见证人",
  publicImage: "公开露面",
  truePersonality: "谨慎",
  desire: "稳住局面",
  fear: "局势失控",
  shortTermGoal: "提供线索",
  longTermGoal: "活到战役结束",
  secret: "隐藏事实",
  bottomLine: "不伤害平民",
  weakness: "容易紧张",
  attributes: {
    physique: 2,
    agility: 2,
    knowledge: 2,
    insight: 2,
    charm: 2,
    will: 2,
  },
  skills: { social: 2 },
  resources: {},
  conditions: [],
  knownFacts: [],
  memorySummary: "刚刚入场",
};

const state: WorldState = {
  time: { day: 2, phase: "evening" },
  currentLocationId: "clinic",
  player: {
    id: "player",
    name: "巡界人",
    attributes: {
      physique: 2,
      agility: 2,
      knowledge: 2,
      insight: 2,
      charm: 2,
      will: 2,
    },
    skills: {},
    resources: { health: 5, pressure: 1, stamina: 3 },
    conditions: [],
    reputationTags: [],
    momentum: 1,
  },
  locations: {
    square: {
      id: "square",
      name: "镇广场",
      description: "民兵和商贩争论公告。",
      publicInfo: ["钟楼能看见全镇"],
      hiddenInfo: [],
      tags: ["town"],
      dangerLevel: 2,
    },
    clinic: {
      id: "clinic",
      name: "诊所",
      description: "伤员挤满走廊。",
      publicInfo: ["药品即将耗尽", "护士愿意协助"],
      hiddenInfo: [],
      tags: ["medical"],
      dangerLevel: 4,
    },
    mine: {
      id: "mine",
      name: "矿区",
      description: "矿井口有黑烟。",
      publicInfo: [],
      hiddenInfo: [],
      tags: ["rift"],
      dangerLevel: 5,
    },
  },
  characters: {
    adele: {
      ...baseCharacter,
      id: "adele",
      name: "阿黛尔",
      factionId: "guild",
    },
    hagen: {
      ...baseCharacter,
      id: "hagen",
      name: "哈根",
      factionId: "blackstone",
    },
  },
  factions: {
    guild: {
      id: "guild",
      name: "边境公会",
      publicGoal: "维持秩序",
      hiddenGoal: "控制诊所",
      leader: "adele",
      resources: {},
      baseId: "clinic",
      allies: [],
      enemies: ["blackstone"],
      internalConflict: "医护和城防分歧",
      style: "公开执法",
      bottomLine: "不能放弃伤员",
      currentPlan: "保护诊所",
      clockIds: ["plague"],
    },
    blackstone: {
      id: "blackstone",
      name: "黑石商会",
      publicGoal: "恢复矿区",
      hiddenGoal: "垄断裂隙矿",
      leader: "hagen",
      resources: {},
      baseId: "mine",
      allies: [],
      enemies: [],
      internalConflict: "合法派和雇佣兵分歧",
      style: "契约和雇佣兵",
      bottomLine: "不能牵连总部",
      currentPlan: "接管矿井",
      clockIds: ["mine_clock"],
    },
  },
  relationships: {},
  quests: {},
  clocks: {
    plague: {
      id: "plague",
      name: "瘟疫扩散",
      progress: 5,
      max: 8,
      consequence: "诊所崩溃",
      visible: true,
    },
    mine_clock: {
      id: "mine_clock",
      name: "矿区接管",
      progress: 1,
      max: 5,
      consequence: "商会控制矿区",
      visible: true,
    },
  },
  publicEvents: [],
  hiddenEvents: [],
};

describe("world map view model", () => {
  it("turns visible world state into RPG map nodes", () => {
    const map = buildWorldMap(state);

    expect(map.currentLocationName).toBe("诊所");
    expect(map.nodes).toHaveLength(3);
    expect(map.nodes.map((node) => node.name)).toEqual([
      "镇广场",
      "诊所",
      "矿区",
    ]);
    expect(map.nodes.map((node) => [node.x, node.y])).toEqual([
      [50, 55],
      [24, 34],
      [76, 36],
    ]);

    const clinic = map.nodes.find((node) => node.id === "clinic");
    expect(clinic).toMatchObject({
      isCurrent: true,
      dangerLabel: "高危",
      dangerTone: "danger",
      npcNames: ["阿黛尔"],
      clockNames: ["瘟疫扩散"],
      pressurePercent: 63,
      summary: "危险 4 / NPC 1 / 时钟 1",
      publicFacts: ["药品即将耗尽", "护士愿意协助"],
    });

    const mine = map.nodes.find((node) => node.id === "mine");
    expect(mine).toMatchObject({
      isCurrent: false,
      dangerLabel: "致命",
      dangerTone: "critical",
      npcNames: ["哈根"],
      clockNames: ["矿区接管"],
      pressurePercent: 20,
    });

    expect(map.connections).toEqual([
      { from: "clinic", to: "square", fromX: 24, fromY: 34, toX: 50, toY: 55 },
      { from: "clinic", to: "mine", fromX: 24, fromY: 34, toX: 76, toY: 36 },
    ]);
    expect(map.legend).toEqual(["当前位置", "危险等级", "阵营压力"]);
  });

  it("selects a stable map detail node", () => {
    const map = buildWorldMap(state);

    expect(getSelectedWorldMapNode(map)?.id).toBe("clinic");
    expect(getSelectedWorldMapNode(map, "mine")?.name).toBe("矿区");
    expect(getSelectedWorldMapNode(map, "unknown")?.id).toBe("clinic");
  });

  it("builds freeform action drafts from map nodes", () => {
    const map = buildWorldMap(state);
    const mine = getSelectedWorldMapNode(map, "mine");
    const clinic = getSelectedWorldMapNode(map, "clinic");

    expect(mine).toBeDefined();
    expect(clinic).toBeDefined();
    expect(buildWorldMapActionDraft(mine!, "travel")).toBe(
      "意图：前往；目标：矿区；方式：沿已知路线移动并观察沿途异常；避免：暴露队伍弱点。",
    );
    expect(buildWorldMapActionDraft(clinic!, "investigate")).toBe(
      "意图：调查；目标：诊所；方式：查看现场线索并询问相关人物；避免：贸然升级冲突。",
    );
  });
});
