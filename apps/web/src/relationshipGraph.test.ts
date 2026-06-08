import { describe, expect, it } from "vitest";
import type { CharacterState, WorldState } from "@agentic-turnscape/shared";
import {
  buildRelationshipActionDraft,
  buildRelationshipGraph,
  getSelectedRelationshipNode,
} from "./relationshipGraph.js";

const baseCharacter: Omit<
  CharacterState,
  "id" | "name" | "role" | "factionId"
> = {
  publicImage: "公开形象",
  truePersonality: "谨慎",
  desire: "稳住局势",
  fear: "局势失控",
  shortTermGoal: "协助玩家",
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
  skills: {},
  resources: {},
  conditions: [],
  knownFacts: [],
  memorySummary: "刚刚入场",
};

const character = (
  id: string,
  name: string,
  role: string,
  factionId: string,
): CharacterState => ({
  ...baseCharacter,
  id,
  name,
  role,
  factionId,
});

const state: WorldState = {
  time: { day: 1, phase: "morning" },
  currentLocationId: "square",
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
    resources: {},
    conditions: [],
    reputationTags: [],
    momentum: 1,
  },
  locations: {
    square: {
      id: "square",
      name: "边境广场",
      description: "所有人都在观望玩家。",
      publicInfo: [],
      hiddenInfo: [],
      tags: [],
      dangerLevel: 1,
    },
  },
  characters: {
    adele: character("adele", "阿黛尔", "医生", "guild"),
    rowan: character("rowan", "罗文", "城防队长", "guard"),
    hagen: character("hagen", "哈根", "商会代表", "blackstone"),
    mina: character("mina", "米娜", "孤儿", "guild"),
    crow: character("crow", "白鸦", "神秘观察者", "cult"),
    kyle: character("kyle", "凯尔", "学徒", "guild"),
  },
  factions: {
    guild: {
      id: "guild",
      name: "边境公会",
      publicGoal: "维持秩序",
      hiddenGoal: "隐藏",
      leader: "adele",
      resources: {},
      baseId: "square",
      allies: [],
      enemies: [],
      internalConflict: "分歧",
      style: "稳健",
      bottomLine: "不弃民",
      currentPlan: "保护居民",
      clockIds: [],
    },
    guard: {
      id: "guard",
      name: "城防军",
      publicGoal: "隔离风险",
      hiddenGoal: "隐藏",
      leader: "rowan",
      resources: {},
      baseId: "square",
      allies: [],
      enemies: [],
      internalConflict: "分歧",
      style: "强硬",
      bottomLine: "不失控",
      currentPlan: "封锁街区",
      clockIds: [],
    },
    blackstone: {
      id: "blackstone",
      name: "黑石商会",
      publicGoal: "恢复贸易",
      hiddenGoal: "隐藏",
      leader: "hagen",
      resources: {},
      baseId: "square",
      allies: [],
      enemies: [],
      internalConflict: "分歧",
      style: "契约",
      bottomLine: "不赔本",
      currentPlan: "控制矿区",
      clockIds: [],
    },
    cult: {
      id: "cult",
      name: "裂隙教团",
      publicGoal: "安抚群众",
      hiddenGoal: "隐藏",
      leader: "crow",
      resources: {},
      baseId: "square",
      allies: [],
      enemies: [],
      internalConflict: "分歧",
      style: "隐秘",
      bottomLine: "不暴露",
      currentPlan: "观察玩家",
      clockIds: [],
    },
  },
  relationships: {
    "player:adele": {
      trust: 3,
      affinity: 1,
      respect: 1,
      fear: 0,
      interest: 1,
      debt: 0,
      suspicion: 0,
    },
    "player:rowan": {
      trust: 0,
      affinity: 0,
      respect: 2,
      fear: 0,
      interest: 0,
      debt: 0,
      suspicion: 2,
    },
    "player:hagen": {
      trust: -1,
      affinity: 0,
      respect: 0,
      fear: 2,
      interest: 0,
      debt: 0,
      suspicion: 2,
    },
    "player:mina": {
      trust: 1,
      affinity: 2,
      respect: 0,
      fear: 0,
      interest: 1,
      debt: 0,
      suspicion: 0,
    },
    "player:crow": {
      trust: 0,
      affinity: 0,
      respect: 0,
      fear: 1,
      interest: 2,
      debt: 0,
      suspicion: 3,
    },
    "player:kyle": {
      trust: 0,
      affinity: 0,
      respect: 0,
      fear: 0,
      interest: 0,
      debt: 0,
      suspicion: 0,
    },
  },
  quests: {},
  clocks: {},
  publicEvents: [],
  hiddenEvents: [],
};

describe("relationship graph view model", () => {
  it("turns relationship state into a visible RPG relationship network", () => {
    const graph = buildRelationshipGraph(state);

    expect(graph.center).toEqual({
      id: "player",
      name: "巡界人",
      x: 50,
      y: 50,
    });
    expect(graph.nodes).toHaveLength(5);
    expect(graph.nodes.map((node) => node.id)).toEqual([
      "adele",
      "hagen",
      "mina",
      "crow",
      "rowan",
    ]);

    expect(graph.nodes[0]).toMatchObject({
      name: "阿黛尔",
      role: "医生",
      factionName: "边境公会",
      score: 6,
      tone: "trusted",
      label: "稳固",
      x: 50,
      y: 14,
    });
    expect(graph.nodes[1]).toMatchObject({
      name: "哈根",
      score: -5,
      tone: "hostile",
      label: "危险",
      linkStrength: 50,
    });
    expect(graph.edges).toHaveLength(5);
    expect(graph.edges[0]).toMatchObject({
      from: "player",
      to: "adele",
      strength: 60,
      tone: "trusted",
    });
  });

  it("selects a stable relationship detail node", () => {
    const graph = buildRelationshipGraph(state);

    expect(getSelectedRelationshipNode(graph)?.id).toBe("adele");
    expect(getSelectedRelationshipNode(graph, "hagen")?.name).toBe("哈根");
    expect(getSelectedRelationshipNode(graph, "unknown")?.id).toBe("adele");
  });

  it("builds freeform action drafts from relationship nodes", () => {
    const graph = buildRelationshipGraph(state);
    const adele = getSelectedRelationshipNode(graph, "adele");
    const hagen = getSelectedRelationshipNode(graph, "hagen");

    expect(adele).toBeDefined();
    expect(hagen).toBeDefined();
    expect(buildRelationshipActionDraft(adele!, "talk")).toBe(
      "意图：交谈；目标：阿黛尔；方式：围绕医生的目标建立信任并交换线索；避免：触碰对方底线。",
    );
    expect(buildRelationshipActionDraft(hagen!, "support")).toBe(
      "意图：协助；目标：哈根；方式：提供资源或行动承诺来改善关系；避免：让对方承担额外风险。",
    );
  });
});
