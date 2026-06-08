import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { applyStatePatch } from "./patch.js";
import { adjudicateTurn } from "./referee.js";

describe("social chip leverage", () => {
  it("spends committed freeform negotiation resources through the social chip rules", () => {
    const state = createBorderSevenDaysWorld();
    state.player.attributes.charm = 0;
    state.player.skills.social = 0;
    state.player.resources.favor = 1;
    state.player.resources.intel = 1;
    state.player.resources.pressure = 0;

    const resolution = adjudicateTurn({
      state,
      proposals: [],
      turnId: "turn-freeform-social-chips",
      seed: "freeform-social-chip-check",
      playerAction: {
        actionType: "custom",
        label: "自由行动：用情报和人情稳住罗文",
        description:
          "意图：谈判；目标：罗文；资源：情报，人情。提出一份可执行的诊所隔离方案。",
        targetId: "npc_rowan",
        leverage: [
          "freeform",
          "freeform:intent:negotiate",
          "freeform:target:npc_rowan",
          "clinic_protocol",
          "favor",
          "intel",
        ],
        riskLevel: "medium",
      },
    });

    const next = applyStatePatch(state, resolution.patch);
    expect(resolution.roll.attribute).toBe("charm");
    expect(resolution.roll.skill).toBe("social");
    expect(resolution.roll.modifier).toBe(3);
    expect(next.player.resources.favor).toBe(0);
    expect(next.player.resources.intel).toBe(0);
  });

  it("rejects unavailable freeform social resources instead of treating them as ordinary leverage", () => {
    const state = createBorderSevenDaysWorld();
    state.player.attributes.charm = 0;
    state.player.skills.social = 0;
    state.player.resources.favor = 0;
    state.player.resources.pressure = 0;

    const resolution = adjudicateTurn({
      state,
      proposals: [],
      turnId: "turn-freeform-social-chip-rejected",
      seed: "freeform-social-chip-rejected",
      playerAction: {
        actionType: "custom",
        label: "自由行动：声称有人情",
        description: "意图：谈判；资源：人情。试图许诺自己没有的人情。",
        targetId: "npc_rowan",
        leverage: ["freeform", "freeform:intent:negotiate", "favor"],
        riskLevel: "medium",
      },
    });

    const next = applyStatePatch(state, resolution.patch);
    expect(resolution.roll.modifier).toBe(0);
    expect(next.player.resources.favor).toBe(0);
  });

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
