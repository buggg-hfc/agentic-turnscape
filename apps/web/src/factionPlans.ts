import type { ClockState, FactionState, WorldState } from "@agentic-turnscape/shared";

export type FactionPlanSummary = {
  id: string;
  name: string;
  leaderName: string;
  plan: string;
  clockLabel: string;
  clockRatio: number;
  resourceBadges: string[];
};

const visibleFactionClocks = (
  state: WorldState,
  faction: FactionState,
): ClockState[] =>
  faction.clockIds
    .map((clockId) => state.clocks[clockId])
    .filter((clock): clock is ClockState => Boolean(clock?.visible))
    .sort(
      (left, right) =>
        right.progress / right.max - left.progress / left.max ||
        right.progress - left.progress ||
        left.id.localeCompare(right.id),
    );

const strongestResources = (faction: FactionState): string[] =>
  Object.entries(faction.resources)
    .sort(
      ([leftId, leftValue], [rightId, rightValue]) =>
        rightValue - leftValue || leftId.localeCompare(rightId),
    )
    .slice(0, 2)
    .map(([id, value]) => `${id} ${value}`);

export const buildFactionPlanSummaries = (
  state: WorldState,
): FactionPlanSummary[] =>
  Object.values(state.factions)
    .map((faction) => {
      const [clock] = visibleFactionClocks(state, faction);
      const clockRatio = clock ? clock.progress / clock.max : 0;
      return {
        id: faction.id,
        name: faction.name,
        leaderName: faction.leader,
        plan: faction.currentPlan,
        clockLabel: clock
          ? `${clock.name} ${clock.progress}/${clock.max}`
          : "暂无公开时钟",
        clockRatio,
        resourceBadges: strongestResources(faction),
      };
    })
    .sort(
      (left, right) =>
        right.clockRatio - left.clockRatio || left.name.localeCompare(right.name),
    );
