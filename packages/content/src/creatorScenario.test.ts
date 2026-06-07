import { describe, expect, it } from "vitest";
import { buildCreatorScenarioDraft } from "@agentic-turnscape/shared";
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

  it("accepts the GUI quick-create draft through the same import contract", () => {
    const scenario = importCreatorScenarioPackage(
      buildCreatorScenarioDraft({
        id: "clinic-gui-draft",
        title: "诊所草稿",
        premise: "封锁线外的伤员突然涌入，镇民要求一个公开答案。",
        playerName: "临时镇医",
        startLocationName: "临时诊所",
        pressureLocationName: "封锁哨卡",
        crisisName: "伤员潮",
        guideName: "米娜",
        pressureNpcName: "赫然队长",
        allyFactionName: "志愿护理队",
        pressureFactionName: "封锁巡逻队",
        primaryActionLabel: "稳定分诊",
        secondaryActionLabel: "谈判放行",
        tertiaryActionLabel: "转移伤员",
        successEndingTitle: "伤员安置",
        pressureEndingTitle: "哨卡接管",
      }),
    );
    const world = scenario.createWorld();
    const successWorld = scenario.createWorld();
    const pressureWorld = scenario.createWorld();

    expect(scenario.id).toBe("clinic-gui-draft");
    expect(scenario.counts).toEqual({ combat: 1, social: 1, endings: 2 });
    expect(world.player.name).toBe("临时镇医");
    expect(Object.values(world.locations).map((location) => location.name)).toContain("封锁哨卡");
    expect(Object.values(world.characters).map((npc) => npc.name)).toContain("赫然队长");
    expect(scenario.getDayPlan(1)?.mainEvent).toContain("封锁线外");
    expect(scenario.getActions(world).map((action) => action.label)).toEqual([
      "稳定分诊",
      "谈判放行",
      "转移伤员",
    ]);
    successWorld.player.momentum = 3;
    expect(scenario.evaluateEnding(successWorld)?.title).toBe("伤员安置");
    const pressureClock = Object.values(pressureWorld.clocks).find(
      (clock) => clock.name === "伤员潮",
    );
    expect(pressureClock).toBeDefined();
    pressureClock!.progress = pressureClock!.max;
    expect(scenario.evaluateEnding(pressureWorld)?.title).toBe("哨卡接管");
  });
});
