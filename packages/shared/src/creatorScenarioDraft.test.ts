import { describe, expect, it } from "vitest";
import {
  buildCreatorScenarioDraft,
  defaultCreatorScenarioDraftInput,
  normalizeCreatorScenarioId,
} from "./creatorScenarioDraft.js";
import { PlayerActionSchema, WorldStateSchema } from "./schemas.js";

describe("creator scenario draft builder", () => {
  it("normalizes designer ids for creator scenario imports", () => {
    expect(normalizeCreatorScenarioId("  Rain Alley 42!! ")).toBe(
      "rain-alley-42",
    );
    expect(normalizeCreatorScenarioId("雨巷异闻")).toBe("creator-scenario");
  });

  it("builds a schema-valid Chinese starter scenario from GUI fields", () => {
    const draft = buildCreatorScenarioDraft({
      ...defaultCreatorScenarioDraftInput,
      id: "rain-alley-test",
      title: "雨巷试作",
      premise: "旧城区的雨声里混入了失踪者的敲门声。",
      playerName: "临时调查员",
      startLocationName: "长明巷口",
      crisisName: "雨声怨念",
      guideName: "林姐",
      allyFactionName: "街坊互助会",
      pressureFactionName: "拆迁承包队",
      primaryActionLabel: "安抚街坊",
      secondaryActionLabel: "追查雨声",
      tertiaryActionLabel: "争取证人",
    });

    expect(draft).toMatchObject({
      id: "rain-alley-test",
      title: "雨巷试作",
    });
    expect(WorldStateSchema.parse(draft.world).player.name).toBe(
      "临时调查员",
    );
    expect(draft.days).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          day: 1,
          mainEvent: "雨巷试作：旧城区的雨声里混入了失踪者的敲门声。",
        }),
      ]),
    );
    expect(draft.actions).toHaveLength(3);
    for (const action of draft.actions) {
      expect(PlayerActionSchema.parse(action).label).toMatch(
        /安抚街坊|追查雨声|争取证人/,
      );
    }
  });
});
