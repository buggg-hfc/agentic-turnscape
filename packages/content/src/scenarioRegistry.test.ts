import { describe, expect, it } from "vitest";
import { createScenarioRegistry, getScenarioPackage, listScenarioPackages, requireScenarioPackage } from "./scenarioRegistry.js";

describe("scenario package registry", () => {
  it("exposes Border Seven Days through a stable scenario package contract", () => {
    const scenario = requireScenarioPackage("border-seven-days");
    const world = scenario.createWorld();

    expect(scenario.id).toBe("border-seven-days");
    expect(scenario.title).toBe("边境七日");
    expect(scenario.counts).toEqual({ combat: 5, social: 8, endings: 6 });
    expect(scenario.getDayPlan(world.time.day)?.day).toBe(1);
    expect(scenario.getActions(world).length).toBeGreaterThan(0);
    expect(scenario.evaluateEnding(world)).toBeUndefined();
  });

  it("lists and resolves installed scenario packages without exposing mutable registry state", () => {
    expect(listScenarioPackages()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "border-seven-days",
        title: "边境七日",
        counts: { combat: 5, social: 8, endings: 6 }
      }),
      expect.objectContaining({
        id: "frost-lantern-trial",
        title: "Frost Lantern Trial",
        counts: { combat: 1, social: 1, endings: 2 }
      })
    ]));
    expect(getScenarioPackage("missing-scenario")).toBeUndefined();
    expect(() => requireScenarioPackage("missing-scenario")).toThrow("Unknown scenario package");
  });

  it("exposes the first expansion scenario without changing the registry contract", () => {
    const scenario = requireScenarioPackage("frost-lantern-trial");
    const world = scenario.createWorld();

    expect(world.currentLocationId).toBe("lantern_courtyard");
    expect(Object.keys(world.factions)).toHaveLength(2);
    expect(scenario.getDayPlan(1)?.mainEvent).toContain("lantern");
    expect(scenario.getActions(world).map((action) => action.actionType)).toEqual(["travel", "fight"]);
    expect(scenario.evaluateEnding(world)).toBeUndefined();

    world.time = { day: 3, phase: "night" };
    world.player.momentum = 3;
    expect(scenario.evaluateEnding(world)?.id).toBe("inner_gate_opened");
  });

  it("rejects duplicate scenario ids in custom registries", () => {
    const scenario = requireScenarioPackage("border-seven-days");
    expect(() => createScenarioRegistry([scenario, scenario])).toThrow("Duplicate scenario package");
  });
});
