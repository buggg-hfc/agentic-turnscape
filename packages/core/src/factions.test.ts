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

  it("covers advance, blocked, and redirected outcomes for every MVP faction", () => {
    const cases = [
      {
        factionId: "frontier_guild",
        outcome: "advance",
        input: { actionType: "negotiate", targetId: "npc_rowan", success: true },
        planText: "联合隔离",
        resource: "legitimacy",
        expectedResource: 6
      },
      {
        factionId: "frontier_guild",
        outcome: "blocked",
        input: { actionType: "investigate", targetId: "npc_kyle", success: true },
        planText: "旧哨站证据",
        resource: "legitimacy",
        expectedResource: 4
      },
      {
        factionId: "frontier_guild",
        outcome: "redirected",
        input: { actionType: "negotiate", targetId: "npc_rowan", success: false },
        planText: "强硬封锁"
      },
      {
        factionId: "blackstone_consortium",
        outcome: "advance",
        input: { actionType: "ignore", success: false },
        planText: "加速矿区合同",
        resource: "contracts",
        expectedResource: 6
      },
      {
        factionId: "blackstone_consortium",
        outcome: "blocked",
        input: { actionType: "negotiate", targetId: "npc_rowan", success: true },
        planText: "舆论受阻",
        resource: "contracts",
        expectedResource: 4
      },
      {
        factionId: "blackstone_consortium",
        outcome: "redirected",
        input: { actionType: "trade", targetId: "npc_crow_nine", success: true },
        planText: "黑市账线"
      },
      {
        factionId: "rift_cult",
        outcome: "advance",
        input: { actionType: "ignore", success: false },
        planText: "收拢被拒病人",
        resource: "believers",
        expectedResource: 6
      },
      {
        factionId: "rift_cult",
        outcome: "blocked",
        input: { actionType: "fight", targetId: "npc_eve", success: true },
        planText: "仪式入口被迫转移",
        resource: "relics",
        expectedResource: 2
      },
      {
        factionId: "rift_cult",
        outcome: "redirected",
        input: { actionType: "protect", targetId: "npc_mina", success: true },
        planText: "争取米娜",
        resource: "shelter",
        expectedResource: 4
      }
    ] as const;

    for (const testCase of cases) {
      const state = createBorderSevenDaysWorld();
      const patch = resolveFactionPlans(state, { ...testCase.input });
      const next = applyStatePatch(state, patch);
      const faction = next.factions[testCase.factionId];

      expect(faction?.currentPlan, `${testCase.factionId} should support ${testCase.outcome}`).toContain(testCase.planText);
      if ("resource" in testCase) {
        expect(faction?.resources[testCase.resource], `${testCase.factionId} ${testCase.outcome} resource delta`).toBe(
          testCase.expectedResource
        );
      }
    }

    expect(cases.map((testCase) => `${testCase.factionId}:${testCase.outcome}`)).toEqual([
      "frontier_guild:advance",
      "frontier_guild:blocked",
      "frontier_guild:redirected",
      "blackstone_consortium:advance",
      "blackstone_consortium:blocked",
      "blackstone_consortium:redirected",
      "rift_cult:advance",
      "rift_cult:blocked",
      "rift_cult:redirected"
    ]);
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
