import { describe, expect, it } from "vitest";
import {
  borderSevenDaysScenario,
  createBorderSevenDaysWorld,
  evaluateBorderSevenDaysEnding,
  getBorderSevenDaysSceneAction,
  requireScenarioPackage
} from "@agentic-turnscape/content";
import { applyStatePatch } from "@agentic-turnscape/core";
import type { LLMClient } from "./llm.js";
import { runTurn } from "./orchestrator.js";
import { runBorderSevenDaysPlaythrough, runExpansionScenarioPlaythrough, type BorderSevenDaysRouteId } from "./playthrough.js";

const fallbackLlm: LLMClient = {
  completeJson: async ({ fallback }) => fallback(),
  completeText: async ({ fallback }) => fallback()
};

describe("Border Seven Days deterministic playthroughs", () => {
  it("runs a full seven-day campaign to a terminal ending", async () => {
    const result = await runBorderSevenDaysPlaythrough({
      routeId: "balanced_hero",
      llm: fallbackLlm,
      seed: "balanced-hero"
    });

    expect(result.turns).toBeGreaterThanOrEqual(24);
    expect(result.state.time).toEqual({ day: 7, phase: "night" });
    expect(result.ending?.id).toBe("ritual_stopped");
    expect(result.resolutions.at(-1)?.ending?.id).toBe("ritual_stopped");
    expect(result.resolutions.some((resolution) => resolution.publicSummary.includes("Follow "))).toBe(false);
    expect(result.resolutions.at(-1)?.availableActions.length).toBeGreaterThan(0);
  });

  it("can reach every MVP ending through a deterministic route", async () => {
    const cases: Array<{ routeId: BorderSevenDaysRouteId; endingId: string }> = [
      { routeId: "balanced_hero", endingId: "ritual_stopped" },
      { routeId: "guild_case", endingId: "guild_reform" },
      { routeId: "cure_alliance", endingId: "cure_with_exiles" },
      { routeId: "neglect_plague", endingId: "town_quarantined" },
      { routeId: "consortium_deal", endingId: "consortium_rule" },
      { routeId: "open_rift", endingId: "rift_opened" }
    ];

    for (const { routeId, endingId } of cases) {
      const result = await runBorderSevenDaysPlaythrough({ routeId, llm: fallbackLlm, seed: routeId });
      expect(evaluateBorderSevenDaysEnding(result.state)?.id, routeId).toBe(endingId);

      const replayed = result.resolutions.reduce(
        (state, resolution) => applyStatePatch(state, resolution.statePatch),
        createBorderSevenDaysWorld()
      );
      expect(evaluateBorderSevenDaysEnding(replayed)?.id, `${routeId} replay`).toBe(endingId);
    }
  });

  it("resolves every MVP combat and social scene through the referee pipeline", async () => {
    const scenario = requireScenarioPackage("border-seven-days");
    const sceneCases = borderSevenDaysScenario.scenes.filter((scene) => scene.kind === "combat" || scene.kind === "social");

    expect(sceneCases.filter((scene) => scene.kind === "combat")).toHaveLength(5);
    expect(sceneCases.filter((scene) => scene.kind === "social")).toHaveLength(8);

    for (const scene of sceneCases) {
      const action = getBorderSevenDaysSceneAction(scene.id);
      expect(action, `${scene.id} action`).toBeDefined();

      const state = scenario.createWorld();
      state.time = { day: scene.day, phase: "morning" };
      state.currentLocationId = scene.locationId;
      const beforeEvents = state.publicEvents.length;
      const result = await runTurn({
        state,
        playerAction: action!,
        llm: fallbackLlm,
        turnId: `scene-${scene.id}`,
        seed: `scene-${scene.id}`,
        getAvailableActions: scenario.getActions,
        evaluateEnding: scenario.evaluateEnding
      });

      expect(result.resolution.statePatch.source, scene.id).toBe("referee");
      expect(result.resolution.proposals.length, scene.id).toBeGreaterThan(0);
      expect(result.nextState.publicEvents.length, scene.id).toBeGreaterThan(beforeEvents);
      if (scene.kind === "combat") {
        expect(action!.actionType, scene.id).toBe("fight");
        expect(result.resolution.publicSummary, scene.id).toContain("3 AP");
      } else {
        expect(action!.actionType, scene.id).not.toBe("fight");
      }
    }
  });
});

describe("first-wave expansion deterministic playthroughs", () => {
  it("runs every first-wave expansion pack to a success ending and replays the same result from patches", async () => {
    const cases = [
      { scenarioId: "frost-lantern-trial", endingId: "inner_gate_opened" },
      { scenarioId: "orbital-quarantine", endingId: "station_stabilized" },
      { scenarioId: "salt-harbor-accord", endingId: "harbor_accord" },
      { scenarioId: "rain-alley-haunting", endingId: "neighborhood_saved" },
      { scenarioId: "emergency-ward-night", endingId: "ward_saved" }
    ];

    for (const { scenarioId, endingId } of cases) {
      const scenario = requireScenarioPackage(scenarioId);
      const result = await runExpansionScenarioPlaythrough({
        scenarioId,
        route: "success",
        llm: fallbackLlm,
        seed: `${scenarioId}-success`
      });

      expect(result.turns, scenarioId).toBeGreaterThanOrEqual(8);
      expect(result.state.time, scenarioId).toEqual({ day: 3, phase: "night" });
      expect(result.ending?.id, scenarioId).toBe(endingId);
      expect(result.resolutions.at(-1)?.ending?.id, scenarioId).toBe(endingId);

      const replayed = result.resolutions.reduce(
        (state, resolution) => applyStatePatch(state, resolution.statePatch),
        scenario.createWorld()
      );
      expect(scenario.evaluateEnding(replayed)?.id, `${scenarioId} replay`).toBe(endingId);
    }
  });

  it("runs every first-wave expansion pack to a pressure ending and replays the same result from patches", async () => {
    const cases = [
      { scenarioId: "frost-lantern-trial", endingId: "ash_debt_bound" },
      { scenarioId: "orbital-quarantine", endingId: "salvage_lockdown" },
      { scenarioId: "salt-harbor-accord", endingId: "guard_charter" },
      { scenarioId: "rain-alley-haunting", endingId: "condemned_block" },
      { scenarioId: "emergency-ward-night", endingId: "paperwork_burial" }
    ];

    for (const { scenarioId, endingId } of cases) {
      const scenario = requireScenarioPackage(scenarioId);
      const result = await runExpansionScenarioPlaythrough({
        scenarioId,
        route: "pressure",
        llm: fallbackLlm,
        seed: `${scenarioId}-pressure`
      });

      expect(result.turns, scenarioId).toBeGreaterThanOrEqual(8);
      expect(result.state.time, scenarioId).toEqual({ day: 3, phase: "night" });
      expect(result.ending?.id, scenarioId).toBe(endingId);
      expect(result.resolutions.at(-1)?.ending?.id, scenarioId).toBe(endingId);

      const replayed = result.resolutions.reduce(
        (state, resolution) => applyStatePatch(state, resolution.statePatch),
        scenario.createWorld()
      );
      expect(scenario.evaluateEnding(replayed)?.id, `${scenarioId} pressure replay`).toBe(endingId);
    }
  });
});
