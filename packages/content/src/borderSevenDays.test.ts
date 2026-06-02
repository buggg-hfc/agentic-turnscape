import { describe, expect, it } from "vitest";
import {
  borderSevenDaysScenario,
  createBorderSevenDaysWorld,
  evaluateBorderSevenDaysEnding,
  getBorderSevenDaysDayPlan
} from "./borderSevenDays.js";

describe("Border Seven Days MVP acceptance content", () => {
  it("locks the GDD-required campaign scale into tested content", () => {
    const world = createBorderSevenDaysWorld();

    expect(borderSevenDaysScenario.days).toHaveLength(7);
    expect(Object.keys(world.factions)).toHaveLength(3);
    expect(Object.keys(world.characters)).toHaveLength(10);
    expect(Object.keys(world.locations)).toHaveLength(6);
    expect(Object.values(world.clocks).filter((clock) => clock.visible)).toHaveLength(3);
    expect(borderSevenDaysScenario.scenes.filter((scene) => scene.kind === "combat")).toHaveLength(5);
    expect(borderSevenDaysScenario.scenes.filter((scene) => scene.kind === "social")).toHaveLength(8);
    expect(borderSevenDaysScenario.endings).toHaveLength(6);
  });

  it("provides a concrete day plan for every campaign day", () => {
    for (let day = 1; day <= 7; day += 1) {
      const plan = getBorderSevenDaysDayPlan(day);
      expect(plan?.day).toBe(day);
      expect(plan?.mainEvent.length).toBeGreaterThan(0);
      expect(plan?.defaultLocationId).toBeTruthy();
    }

    expect(getBorderSevenDaysDayPlan(0)).toBeUndefined();
    expect(getBorderSevenDaysDayPlan(8)).toBeUndefined();
  });

  it("keeps scene references valid against seeded world content", () => {
    const world = createBorderSevenDaysWorld();

    for (const scene of borderSevenDaysScenario.scenes) {
      expect(world.locations[scene.locationId], `${scene.id} location`).toBeTruthy();
      for (const npcId of scene.npcIds) {
        expect(world.characters[npcId], `${scene.id} npc ${npcId}`).toBeTruthy();
      }
    }
  });

  it("does not produce an ending before the seventh night", () => {
    const world = createBorderSevenDaysWorld();
    world.time = { day: 6, phase: "night" };

    expect(evaluateBorderSevenDaysEnding(world)).toBeUndefined();
  });

  it("evaluates deterministic endings from crisis and relationship state", () => {
    const ritualWorld = createBorderSevenDaysWorld();
    ritualWorld.time = { day: 7, phase: "night" };
    ritualWorld.clocks.cult_ritual!.progress = ritualWorld.clocks.cult_ritual!.max;
    expect(evaluateBorderSevenDaysEnding(ritualWorld)?.id).toBe("rift_opened");

    const quarantineWorld = createBorderSevenDaysWorld();
    quarantineWorld.time = { day: 7, phase: "night" };
    quarantineWorld.clocks.plague_spread!.progress = quarantineWorld.clocks.plague_spread!.max;
    expect(evaluateBorderSevenDaysEnding(quarantineWorld)?.id).toBe("town_quarantined");

    const cureWorld = createBorderSevenDaysWorld();
    cureWorld.time = { day: 7, phase: "night" };
    cureWorld.player.resources.intel = 7;
    cureWorld.relationships["player:npc_adele"]!.trust = 4;
    cureWorld.relationships["player:npc_eve"]!.trust = 3;
    expect(evaluateBorderSevenDaysEnding(cureWorld)?.id).toBe("cure_with_exiles");
  });
});
