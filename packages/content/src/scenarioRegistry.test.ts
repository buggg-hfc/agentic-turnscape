import { describe, expect, it } from "vitest";
import { WorldStateSchema } from "@agentic-turnscape/shared";
import { createScenarioRegistry, getScenarioPackage, listScenarioPackages, requireScenarioPackage } from "./scenarioRegistry.js";

const hasChinese = /[\u3400-\u9fff]/;
const oldBorderArcEnglish = /Border Crisis|Border Aftermath|Rift War Front|Resolve the seven-day|playable base|regional campaign/;

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
        title: "霜灯试炼",
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
    expect(scenario.getDayPlan(1)?.mainEvent).toContain("霜灯");
    expect(scenario.getActions(world).map((action) => action.actionType)).toEqual(["travel", "fight"]);
    expect(scenario.evaluateEnding(world)).toBeUndefined();

    world.time = { day: 3, phase: "night" };
    world.player.momentum = 3;
    expect(scenario.evaluateEnding(world)?.id).toBe("inner_gate_opened");
  });

  it("exposes the full first wave of genre expansion packs through the same tested contract", () => {
    const expectedPacks = [
      { id: "frost-lantern-trial", title: "霜灯试炼" },
      { id: "orbital-quarantine", title: "轨道隔离" },
      { id: "salt-harbor-accord", title: "盐港协定" },
      { id: "rain-alley-haunting", title: "雨巷异闻" },
      { id: "emergency-ward-night", title: "急诊夜班" }
    ];

    expect(listScenarioPackages()).toEqual(
      expect.arrayContaining(expectedPacks.map((pack) => expect.objectContaining(pack)))
    );

    for (const pack of expectedPacks) {
      const scenario = requireScenarioPackage(pack.id);
      const world = scenario.createWorld();
      WorldStateSchema.parse(world);

      expect(scenario.title).toBe(pack.title);
      expect(scenario.counts.endings).toBeGreaterThanOrEqual(2);
      expect(scenario.getDayPlan(world.time.day)?.defaultLocationId).toBe(world.currentLocationId);
      expect(scenario.getActions(world).length).toBeGreaterThanOrEqual(2);
      expect(scenario.evaluateEnding(world)).toBeUndefined();

      world.time = { day: 3, phase: "night" };
      world.player.momentum = 3;
      expect(scenario.evaluateEnding(world)?.id).toMatch(/victory|opened|stabilized|accord|saved/);
    }
  });

  it("exposes long campaign arc metadata for built-in MVP and expansion scenarios", () => {
    const builtInScenarioIds = [
      "border-seven-days",
      "frost-lantern-trial",
      "orbital-quarantine",
      "salt-harbor-accord",
      "rain-alley-haunting",
      "emergency-ward-night"
    ];

    for (const scenarioId of builtInScenarioIds) {
      const scenario = requireScenarioPackage(scenarioId);
      expect(scenario.campaignArc?.chapters.length, scenarioId).toBeGreaterThanOrEqual(3);
      expect(scenario.campaignArc?.baseFacilities.length, scenarioId).toBeGreaterThanOrEqual(2);
      expect(scenario.campaignArc?.factionFronts.length, scenarioId).toBeGreaterThanOrEqual(2);
      expect(scenario.campaignArc?.chapters[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          focus: expect.any(String),
          unlocks: expect.any(Array)
        })
      );
    }
  });

  it("keeps Border Seven Days campaign arc text Chinese for the GUI and API", () => {
    const scenario = requireScenarioPackage("border-seven-days");
    const chapters = scenario.campaignArc?.chapters ?? [];

    expect(chapters).toHaveLength(3);
    for (const chapter of chapters) {
      expect(chapter.title, `${chapter.id} title`).toMatch(hasChinese);
      expect(chapter.focus, `${chapter.id} focus`).toMatch(hasChinese);
      expect(`${chapter.title} ${chapter.focus}`, chapter.id).not.toMatch(oldBorderArcEnglish);
    }
  });

  it("rejects duplicate scenario ids in custom registries", () => {
    const scenario = requireScenarioPackage("border-seven-days");
    expect(() => createScenarioRegistry([scenario, scenario])).toThrow("Duplicate scenario package");
  });
});
