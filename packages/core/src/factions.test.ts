import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { applyStatePatch } from "./patch.js";
import { resolveFactionPlans } from "./factions.js";
import { adjudicateTurn } from "./referee.js";

describe("faction plan resolution", () => {
  it("redirects the frontier guild and blocks the consortium after a successful clinic negotiation", () => {
    const state = createBorderSevenDaysWorld();
    const patch = resolveFactionPlans(state, {
      actionType: "negotiate",
      targetId: "npc_rowan",
      success: true
    });
    const next = applyStatePatch(state, patch);

    expect(next.factions.frontier_guild?.currentPlan).toContain("联合隔离");
    expect(next.factions.frontier_guild?.resources.legitimacy).toBe(6);
    expect(next.factions.blackstone_consortium?.currentPlan).toContain("舆论受阻");
    expect(next.factions.blackstone_consortium?.resources.contracts).toBe(4);
  });

  it("advances consortium and cult plans when the player leaves the situation alone", () => {
    const state = createBorderSevenDaysWorld();
    const patch = resolveFactionPlans(state, {
      actionType: "ignore",
      success: false
    });
    const next = applyStatePatch(state, patch);

    expect(next.factions.blackstone_consortium?.currentPlan).toContain("加速矿区合同");
    expect(next.factions.blackstone_consortium?.resources.contracts).toBe(6);
    expect(next.factions.rift_cult?.currentPlan).toContain("收拢被拒病人");
    expect(next.factions.rift_cult?.resources.believers).toBe(6);
  });

  it("redirects the rift cult after the player protects infected civilians", () => {
    const state = createBorderSevenDaysWorld();
    const patch = resolveFactionPlans(state, {
      actionType: "protect",
      targetId: "npc_mina",
      success: true
    });
    const next = applyStatePatch(state, patch);

    expect(next.factions.rift_cult?.currentPlan).toContain("争取米娜");
    expect(next.factions.rift_cult?.resources.shelter).toBe(4);
  });

  it("applies faction plan changes during referee turn resolution", () => {
    const state = createBorderSevenDaysWorld();
    const resolution = adjudicateTurn({
      state,
      proposals: [],
      turnId: "turn-faction-plan",
      seed: "social-chip-check",
      playerAction: {
        actionType: "negotiate",
        label: "稳住罗文",
        description: "拿出诊断方案，促成诊所和城防合作。",
        targetId: "npc_rowan",
        leverage: ["medical_plan", "resident_trust"],
        riskLevel: "medium"
      }
    });
    const next = applyStatePatch(state, resolution.patch);

    expect(next.factions.frontier_guild?.currentPlan).toContain("联合隔离");
    expect(next.factions.blackstone_consortium?.currentPlan).toContain("舆论受阻");
  });
});
