import type { PlayerAction, StatePatch, WorldState } from "@agentic-turnscape/shared";

const hasCondition = (state: WorldState, condition: string): boolean => state.player.conditions.includes(condition);

export const resolveConditionUpkeep = (state: WorldState, actionType: PlayerAction["actionType"]): StatePatch => {
  const changes: StatePatch["changes"] = [];
  const downed = hasCondition(state, "downed");

  if (hasCondition(state, "wounded")) {
    if (actionType === "rest") {
      changes.push(
        { op: "inc", path: "player.resources.stamina", delta: 1, reason: "休整让体力回升" },
        { op: "remove", path: "player.conditions", value: "wounded", reason: "休整移除受伤状态" }
      );
      if (!downed) {
        changes.push({ op: "inc", path: "player.resources.health", delta: 1, reason: "休整处理伤势，恢复生命" });
      }
    } else {
      changes.push({ op: "inc", path: "player.resources.pressure", delta: 1, reason: "带伤行动让压力持续累积" });
    }
  }

  if (downed && actionType === "rest") {
    changes.push(
      { op: "inc", path: "player.resources.health", delta: 1, reason: "同伴和休整让濒死角色恢复行动能力" },
      { op: "remove", path: "player.conditions", value: "downed", reason: "休整后脱离濒死状态" }
    );
  }

  if (hasCondition(state, "infected") && state.clocks.plague_spread) {
    changes.push({ op: "inc", path: "clocks.plague_spread.progress", delta: 1, reason: "感染状态在回合推进时加重瘟疫压力" });
  }

  return {
    type: "state_patch",
    source: "referee",
    changes
  };
};
