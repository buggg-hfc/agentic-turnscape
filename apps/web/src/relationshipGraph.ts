import type { WorldState } from "@agentic-turnscape/shared";

export type RelationshipTone =
  | "trusted"
  | "warm"
  | "neutral"
  | "wary"
  | "hostile";

export type RelationshipGraphNode = {
  id: string;
  name: string;
  role: string;
  factionName: string;
  score: number;
  label: string;
  tone: RelationshipTone;
  x: number;
  y: number;
  linkStrength: number;
  details: string[];
};

export type RelationshipGraphEdge = {
  from: "player";
  to: string;
  strength: number;
  tone: RelationshipTone;
};

export type RelationshipGraphView = {
  center: {
    id: "player";
    name: string;
    x: number;
    y: number;
  };
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
};

export type RelationshipActionDraftKind = "talk" | "support";

const graphSlots = [
  [50, 14],
  [84, 35],
  [70, 82],
  [30, 82],
  [16, 35],
] as const;

const relationshipScore = (relationship: WorldState["relationships"][string]) =>
  relationship.trust +
  relationship.affinity +
  relationship.respect +
  relationship.interest +
  relationship.debt -
  relationship.suspicion -
  relationship.fear;

const relationshipActivity = (
  relationship: WorldState["relationships"][string],
) =>
  Math.abs(relationship.trust) +
  Math.abs(relationship.affinity) +
  Math.abs(relationship.respect) +
  Math.abs(relationship.interest) +
  Math.abs(relationship.debt) +
  Math.abs(relationship.suspicion) +
  Math.abs(relationship.fear);

const relationshipTone = (score: number): RelationshipTone => {
  if (score >= 5) return "trusted";
  if (score >= 2) return "warm";
  if (score <= -4) return "hostile";
  if (score <= -1) return "wary";
  return "neutral";
};

const relationshipLabel = (score: number): string => {
  if (score >= 5) return "稳固";
  if (score >= 2) return "信任";
  if (score <= -4) return "危险";
  if (score <= -1) return "戒备";
  return "观望";
};

const detailSummary = (relationship: WorldState["relationships"][string]) =>
  [
    `信任 ${relationship.trust}`,
    `尊重 ${relationship.respect}`,
    `兴趣 ${relationship.interest}`,
    `怀疑 ${relationship.suspicion}`,
    `恐惧 ${relationship.fear}`,
  ].filter((item) => !item.endsWith(" 0"));

export const buildRelationshipGraph = (
  state: WorldState,
  limit = 5,
): RelationshipGraphView => {
  const nodes = Object.entries(state.relationships)
    .flatMap(([id, relationship]) => {
      const npcId = id.split(":")[1];
      if (!npcId) return [];
      const character = state.characters[npcId];
      if (!character) return [];
      const score = relationshipScore(relationship);
      const tone = relationshipTone(score);
      const factionName = character.factionId
        ? state.factions[character.factionId]?.name
        : undefined;
      return [
        {
          id: npcId,
          name: character.name,
          role: character.role,
          factionName: factionName ?? "无阵营",
          score,
          activity: relationshipActivity(relationship),
          label: relationshipLabel(score),
          tone,
          details: detailSummary(relationship),
        },
      ];
    })
    .sort((left, right) => {
      const scoreDelta = Math.abs(right.score) - Math.abs(left.score);
      if (scoreDelta !== 0) return scoreDelta;
      const activityDelta = right.activity - left.activity;
      if (activityDelta !== 0) return activityDelta;
      return left.name.localeCompare(right.name, "zh-Hans-CN");
    })
    .slice(0, limit)
    .map((node, index) => {
      const slot = graphSlots[index % graphSlots.length] ?? graphSlots[0];
      return {
        ...node,
        x: slot[0],
        y: slot[1],
        linkStrength: Math.min(100, Math.abs(node.score) * 10),
      };
    });

  return {
    center: {
      id: "player",
      name: state.player.name,
      x: 50,
      y: 50,
    },
    nodes,
    edges: nodes.map((node) => ({
      from: "player",
      to: node.id,
      strength: node.linkStrength,
      tone: node.tone,
    })),
  };
};

export const getSelectedRelationshipNode = (
  graph: RelationshipGraphView,
  selectedNodeId?: string,
): RelationshipGraphNode | undefined =>
  graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0];

export const buildRelationshipActionDraft = (
  node: RelationshipGraphNode,
  kind: RelationshipActionDraftKind,
): string => {
  if (kind === "support") {
    return `意图：协助；目标：${node.name}；方式：提供资源或行动承诺来改善关系；避免：让对方承担额外风险。`;
  }
  return `意图：交谈；目标：${node.name}；方式：围绕${node.role}的目标建立信任并交换线索；避免：触碰对方底线。`;
};
