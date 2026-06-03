import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { toPlayerVisibleState } from "./visibility.js";

describe("player-visible world state", () => {
  it("redacts hidden world facts while preserving public scenario context", () => {
    const state = createBorderSevenDaysWorld();
    const hiddenEvent = {
      ...state.hiddenEvents[0]!,
      id: "revealed-hidden-event",
      revealed: true
    };
    state.hiddenEvents.push(hiddenEvent);

    const visible = toPlayerVisibleState(state);

    expect(Object.keys(visible.locations)).toHaveLength(6);
    expect(Object.values(state.locations).every((location) => location.hiddenInfo.length > 0)).toBe(true);
    expect(Object.values(visible.locations).every((location) => location.publicInfo.length > 0)).toBe(true);
    expect(Object.values(visible.locations).every((location) => location.hiddenInfo.length === 0)).toBe(true);
    expect(Object.values(state.locations).every((location) => location.hiddenInfo.length > 0)).toBe(true);

    expect(Object.values(visible.characters).every((character) => character.secret === "")).toBe(true);
    expect(Object.values(visible.factions).every((faction) => faction.hiddenGoal === "未知")).toBe(true);
    expect(Object.values(visible.quests).every((quest) => quest.realBackground === "未知")).toBe(true);
    expect(Object.values(visible.quests).every((quest) => quest.hiddenGoal === "未知")).toBe(true);

    expect(visible.hiddenEvents).toHaveLength(1);
    expect(visible.hiddenEvents[0]?.id).toBe("revealed-hidden-event");
  });
});
