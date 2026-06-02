import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "./borderSevenDays.js";
import { importCreatorScenarioPackage } from "./creatorScenario.js";
import { createScenarioRegistry } from "./scenarioRegistry.js";

const validCreatorDefinition = () => {
  const world = createBorderSevenDaysWorld();
  return {
    id: "creator-border-lite",
    title: "Creator Border Lite",
    world,
    days: [
      {
        day: 1,
        mainEvent: "A designer-authored clinic crisis starts.",
        defaultLocationId: "clinic",
        sceneIds: ["creator_clinic_scene"],
        clockPressure: ["plague_spread"]
      }
    ],
    scenes: [
      {
        id: "creator_clinic_scene",
        name: "Creator Clinic Scene",
        kind: "social",
        day: 1,
        locationId: "clinic",
        npcIds: ["npc_adele", "npc_rowan"],
        crisisClockIds: ["plague_spread"],
        nonCombatSolutions: ["negotiate", "protect"]
      },
      {
        id: "creator_street_fight",
        name: "Creator Street Fight",
        kind: "combat",
        day: 1,
        locationId: "town_square",
        npcIds: ["npc_hagen"],
        crisisClockIds: ["martial_lockdown"],
        nonCombatSolutions: ["withdraw"]
      }
    ],
    actions: [
      {
        actionType: "negotiate",
        label: "Open creator negotiation",
        description: "Use a custom authored action.",
        targetId: "npc_rowan",
        leverage: ["creator_note"],
        riskLevel: "medium"
      }
    ],
    endings: [
      {
        id: "creator_plague_break",
        title: "Creator Plague Break",
        summary: "The creator-authored plague ending fires.",
        when: { dayAtLeast: 1, phase: "morning", clockAtMax: "plague_spread" }
      }
    ]
  } as const;
};

describe("creator scenario import", () => {
  it("imports a validated creator-authored scenario into the package contract", () => {
    const scenario = importCreatorScenarioPackage(validCreatorDefinition());
    const world = scenario.createWorld();
    const secondWorld = scenario.createWorld();

    world.player.resources.intel = 9;
    expect(secondWorld.player.resources.intel).toBe(1);
    expect(scenario.counts).toEqual({ combat: 1, social: 1, endings: 1 });
    expect(scenario.getDayPlan(1)?.defaultLocationId).toBe("clinic");
    expect(scenario.getActions(world)).toEqual([
      expect.objectContaining({
        actionType: "negotiate",
        targetId: "npc_rowan"
      })
    ]);

    world.clocks.plague_spread!.progress = world.clocks.plague_spread!.max;
    expect(scenario.evaluateEnding(world)).toMatchObject({
      id: "creator_plague_break",
      title: "Creator Plague Break"
    });
  });

  it("rejects creator scenarios with broken world and scene references", () => {
    const invalid = validCreatorDefinition();
    invalid.scenes[0] = { ...invalid.scenes[0], locationId: "missing_location" };

    expect(() => importCreatorScenarioPackage(invalid)).toThrow(/missing_location/);
  });

  it("rejects creator endings that point at unknown clocks", () => {
    const invalid = validCreatorDefinition();
    invalid.endings[0] = {
      ...invalid.endings[0],
      when: { ...invalid.endings[0].when, clockAtMax: "missing_clock" }
    };

    expect(() => importCreatorScenarioPackage(invalid)).toThrow(/missing_clock/);
  });

  it("can register imported creator packages through the existing registry", () => {
    const scenario = importCreatorScenarioPackage(validCreatorDefinition());
    const registry = createScenarioRegistry([scenario]);

    expect(registry.list()).toEqual([
      {
        id: "creator-border-lite",
        title: "Creator Border Lite",
        counts: { combat: 1, social: 1, endings: 1 }
      }
    ]);
    expect(registry.require("creator-border-lite").createWorld().currentLocationId).toBe("town_square");
  });
});
