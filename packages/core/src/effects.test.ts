import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { applyStatePatch } from "./patch.js";
import { resolveConditionUpkeep } from "./effects.js";
import { adjudicateTurn } from "./referee.js";

describe("condition upkeep and recovery", () => {
  it("keeps wounds persistent by adding pressure after non-rest actions", () => {
    const state = createBorderSevenDaysWorld();
    state.player.conditions.push("wounded");
    state.player.resources.pressure = 1;

    const patch = resolveConditionUpkeep(state, "investigate");
    const next = applyStatePatch(state, patch);

    expect(next.player.conditions).toContain("wounded");
    expect(next.player.resources.pressure).toBe(2);
  });

  it("lets rest recover wounds and bring a downed player back into play", () => {
    const state = createBorderSevenDaysWorld();
    state.player.conditions.push("wounded", "downed");
    state.player.resources.health = 0;
    state.player.resources.stamina = 2;

    const patch = resolveConditionUpkeep(state, "rest");
    const next = applyStatePatch(state, patch);

    expect(next.player.resources.health).toBe(1);
    expect(next.player.resources.stamina).toBe(3);
    expect(next.player.conditions).not.toContain("wounded");
    expect(next.player.conditions).not.toContain("downed");
    expect(next.player.conditions).not.toContain("dead");
  });

  it("advances the plague clock while infected until the condition is addressed", () => {
    const state = createBorderSevenDaysWorld();
    state.player.conditions.push("infected");

    const patch = resolveConditionUpkeep(state, "travel");
    const next = applyStatePatch(state, patch);

    expect(next.clocks.plague_spread?.progress).toBe(1);
    expect(next.player.conditions).toContain("infected");
  });

  it("applies condition upkeep during referee turn resolution", () => {
    const state = createBorderSevenDaysWorld();
    state.player.conditions.push("wounded");
    state.player.resources.pressure = 0;

    const resolution = adjudicateTurn({
      state,
      proposals: [],
      turnId: "turn-condition-upkeep",
      seed: "turn-condition-upkeep",
      playerAction: {
        actionType: "investigate",
        label: "带伤追查",
        description: "不休整，继续追查旧哨站线索。",
        targetId: "old_outpost",
        leverage: [],
        riskLevel: "medium"
      }
    });
    const next = applyStatePatch(state, resolution.patch);

    expect(next.player.resources.pressure).toBeGreaterThan(state.player.resources.pressure);
    expect(next.player.conditions).toContain("wounded");
  });
});
