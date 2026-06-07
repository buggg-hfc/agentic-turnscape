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
      pressureLocationName: "旧仓库雨棚",
      crisisName: "雨声怨念",
      crisisInitialProgress: 2,
      crisisMax: 6,
      crisisConsequence: "雨棚下的怨念满格时，拆迁队会拿到封街理由。",
      guideName: "林姐",
      pressureNpcName: "周队",
      allyFactionName: "街坊互助会",
      pressureFactionName: "拆迁承包队",
      primaryActionLabel: "安抚街坊",
      secondaryActionLabel: "追查雨声",
      tertiaryActionLabel: "争取证人",
      successEndingTitle: "雨声停歇",
      pressureEndingTitle: "旧城封门",
      successEndingSummary: "居民愿意公开作证，旧城获得继续修复的机会。",
      pressureEndingSummary: "承包队封锁街口，雨声成了拆迁命令的借口。",
    });

    expect(draft).toMatchObject({
      id: "rain-alley-test",
      title: "雨巷试作",
    });
    expect(WorldStateSchema.parse(draft.world).player.name).toBe(
      "临时调查员",
    );
    expect(Object.values(draft.world.characters).map((npc) => npc.name)).toEqual(
      expect.arrayContaining(["林姐", "周队"]),
    );
    expect(Object.values(draft.world.locations).map((location) => location.name)).toEqual(
      expect.arrayContaining(["长明巷口", "旧仓库雨棚"]),
    );
    const pressureClock = Object.values(draft.world.clocks).find(
      (clock) => clock.name === "雨声怨念",
    );
    expect(pressureClock).toMatchObject({
      progress: 2,
      max: 6,
      consequence: "雨棚下的怨念满格时，拆迁队会拿到封街理由。",
    });
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
    expect(draft.endings.map((ending) => ending.title)).toEqual([
      "雨声停歇",
      "旧城封门",
    ]);
    expect(draft.endings.map((ending) => ending.summary)).toEqual([
      "居民愿意公开作证，旧城获得继续修复的机会。",
      "承包队封锁街口，雨声成了拆迁命令的借口。",
    ]);
  });
});
