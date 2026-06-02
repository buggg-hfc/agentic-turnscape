import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { applyStatePatch } from "./patch.js";
import { adjudicateTurn } from "./referee.js";

describe("social chip leverage", () => {
  it("spends available social chips for negotiation bonus through referee patches", () => {
    const state = createBorderSevenDaysWorld();
    state.player.resources.favor = 2;
    state.player.resources.intel = 3;
    state.player.resources.pressure = 0;

    const resolution = adjudicateTurn({
      state,
      proposals: [],
      turnId: "turn-social-chips",
      seed: "social-chip-check",
      playerAction: {
        actionType: "negotiate",
        label: "用情报和人情稳住罗文",
        description: "拿出已掌握的证据，并请旧识替诊所担保。",
        targetId: "npc_rowan",
        leverage: ["medical_plan", "chip:favor:1", "chip:intel:1"],
        riskLevel: "medium"
      }
    });

    const next = applyStatePatch(state, resolution.patch);
    expect(resolution.roll.modifier).toBe(9);
    expect(next.player.resources.favor).toBe(1);
    expect(next.player.resources.intel).toBe(2);
  });

  it("does not grant social chip bonus when the player lacks the resource", () => {
    const state = createBorderSevenDaysWorld();
    state.player.resources.favor = 0;
    state.player.resources.pressure = 0;

    const resolution = adjudicateTurn({
      state,
      proposals: [],
      turnId: "turn-social-chip-rejected",
      seed: "social-chip-rejected",
      playerAction: {
        actionType: "negotiate",
        label: "声称有人情可用",
        description: "试图许诺自己并没有的人情。",
        targetId: "npc_rowan",
        leverage: ["medical_plan", "chip:favor:2"],
        riskLevel: "medium"
      }
    });

    const next = applyStatePatch(state, resolution.patch);
    expect(resolution.roll.modifier).toBe(7);
    expect(next.player.resources.favor).toBe(0);
  });
});
