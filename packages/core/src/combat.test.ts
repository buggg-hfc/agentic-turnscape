import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { applyStatePatch } from "./patch.js";
import { resolveCombatRound } from "./combat.js";

describe("3 AP combat resolution", () => {
  it("spends a full 3 AP plan and applies success effects through a referee patch", () => {
    const state = createBorderSevenDaysWorld();
    const result = resolveCombatRound({
      state,
      targetId: "npc_hagen",
      plan: [{ type: "strike" }, { type: "guard" }],
      seed: "combat-success",
      difficulty: 7
    });

    expect(result.apBudget).toBe(3);
    expect(result.apSpent).toBe(3);
    expect(result.remainingAp).toBe(0);
    expect(result.outcome).toBe("player_advantage");

    const next = applyStatePatch(state, result.patch);
    expect(next.characters.npc_hagen?.conditions).toContain("wounded");
    expect(next.player.momentum).toBe(state.player.momentum + 1);
    expect(next.player.resources.health).toBe(state.player.resources.health);
  });

  it("rejects combat plans that exceed the 3 AP budget", () => {
    const state = createBorderSevenDaysWorld();

    expect(() =>
      resolveCombatRound({
        state,
        targetId: "npc_hagen",
        plan: [{ type: "strike" }, { type: "strike" }],
        seed: "combat-too-much",
        difficulty: 7
      })
    ).toThrow(/exceeds 3 AP/);
  });

  it("keeps failed combat non-terminal by applying pressure and wound effects", () => {
    const state = createBorderSevenDaysWorld();
    const result = resolveCombatRound({
      state,
      targetId: "npc_hagen",
      plan: [{ type: "strike" }],
      seed: "combat-failure",
      difficulty: 13
    });

    expect(result.outcome).toBe("player_setback");
    const next = applyStatePatch(state, result.patch);
    expect(next.player.resources.health).toBe(state.player.resources.health - 1);
    expect(next.player.resources.pressure).toBe(state.player.resources.pressure + 1);
    expect(next.player.conditions).toContain("wounded");
    expect(next.player.conditions).not.toContain("dead");
  });
});
