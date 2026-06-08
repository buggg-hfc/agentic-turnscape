import type { WorldState } from "@agentic-turnscape/shared";

export type WorldMapNodeTone = "safe" | "warning" | "danger" | "critical";

export type WorldMapNode = {
  id: string;
  name: string;
  description: string;
  publicFacts: string[];
  x: number;
  y: number;
  isCurrent: boolean;
  dangerLevel: number;
  dangerLabel: string;
  dangerTone: WorldMapNodeTone;
  npcNames: string[];
  clockNames: string[];
  pressurePercent: number;
  summary: string;
  tags: string[];
};

export type WorldMapConnection = {
  from: string;
  to: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type WorldMapView = {
  currentLocationName: string;
  nodes: WorldMapNode[];
  connections: WorldMapConnection[];
  legend: string[];
};

export type WorldMapActionDraftKind = "travel" | "investigate";

const mapSlots = [
  [50, 55],
  [24, 34],
  [76, 36],
  [29, 76],
  [71, 76],
  [50, 19],
  [17, 56],
  [83, 58],
] as const;

const dangerLabel = (level: number) => {
  if (level >= 5) return "致命";
  if (level >= 4) return "高危";
  if (level >= 2) return "紧张";
  return "安全";
};

const dangerTone = (level: number): WorldMapNodeTone => {
  if (level >= 5) return "critical";
  if (level >= 4) return "danger";
  if (level >= 2) return "warning";
  return "safe";
};

const slotFor = (index: number) => {
  const slot = mapSlots[index % mapSlots.length] ?? mapSlots[0];
  const orbit = Math.floor(index / mapSlots.length);
  return {
    x: Math.max(8, Math.min(92, slot[0] + orbit * 4)),
    y: Math.max(10, Math.min(90, slot[1] + orbit * 4)),
  };
};

export const buildWorldMap = (state: WorldState): WorldMapView => {
  const locationEntries = Object.entries(state.locations);
  const locationPositions = new Map<string, { x: number; y: number }>();
  const currentLocationName =
    state.locations[state.currentLocationId]?.name ?? state.currentLocationId;

  locationEntries.forEach(([id], index) => {
    locationPositions.set(id, slotFor(index));
  });

  const nodes: WorldMapNode[] = locationEntries.map(([id, location], index) => {
    const position = locationPositions.get(id) ?? slotFor(index);
    const npcNames = Object.values(state.characters)
      .filter((character) => {
        if (!character.factionId) return false;
        return state.factions[character.factionId]?.baseId === id;
      })
      .map((character) => character.name);
    const clockNames = Object.values(state.factions)
      .filter((faction) => faction.baseId === id)
      .flatMap((faction) => faction.clockIds)
      .flatMap((clockId) => {
        const clock = state.clocks[clockId];
        return clock?.visible ? [clock.name] : [];
      });
    const pressurePercent = Math.max(
      0,
      ...Object.values(state.factions)
        .filter((faction) => faction.baseId === id)
        .flatMap((faction) => faction.clockIds)
        .flatMap((clockId) => {
          const clock = state.clocks[clockId];
          return clock?.visible ? [clock] : [];
        })
        .map((clock) => Math.round((clock.progress / clock.max) * 100)),
    );

    return {
      id,
      name: location.name,
      description: location.description,
      publicFacts: location.publicInfo,
      x: position.x,
      y: position.y,
      isCurrent: id === state.currentLocationId,
      dangerLevel: location.dangerLevel,
      dangerLabel: dangerLabel(location.dangerLevel),
      dangerTone: dangerTone(location.dangerLevel),
      npcNames,
      clockNames,
      pressurePercent,
      summary: `危险 ${location.dangerLevel} / NPC ${npcNames.length} / 时钟 ${clockNames.length}`,
      tags: location.tags,
    };
  });

  const currentPosition = locationPositions.get(state.currentLocationId);
  const connections = currentPosition
    ? nodes
        .filter((node) => node.id !== state.currentLocationId)
        .map((node) => ({
          from: state.currentLocationId,
          to: node.id,
          fromX: currentPosition.x,
          fromY: currentPosition.y,
          toX: node.x,
          toY: node.y,
        }))
    : [];

  return {
    currentLocationName,
    nodes,
    connections,
    legend: ["当前位置", "危险等级", "阵营压力"],
  };
};

export const getSelectedWorldMapNode = (
  map: WorldMapView,
  selectedNodeId?: string,
): WorldMapNode | undefined =>
  map.nodes.find((node) => node.id === selectedNodeId) ??
  map.nodes.find((node) => node.isCurrent) ??
  map.nodes[0];

export const buildWorldMapActionDraft = (
  node: WorldMapNode,
  kind: WorldMapActionDraftKind,
): string => {
  if (kind === "travel") {
    return `意图：前往；目标：${node.name}；方式：沿已知路线移动并观察沿途异常；避免：暴露队伍弱点。`;
  }
  return `意图：调查；目标：${node.name}；方式：查看现场线索并询问相关人物；避免：贸然升级冲突。`;
};
