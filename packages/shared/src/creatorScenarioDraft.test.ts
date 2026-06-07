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
      mainQuestGoal: "在雨夜结束前公开怨念来源并保护旧城住户。",
      mainQuestRealBackground:
        "失踪者留下的水渍指向旧仓库，拆迁队提前封存了最后一段监控。",
      mainQuestHiddenGoal: "确认谁替拆迁队改写了雨夜巡逻记录。",
      mainQuestFailureConsequence:
        "拆迁队会把雨声解释成封街理由，旧城住户失去公开辩护机会。",
      mainQuestLongTermImpact:
        "雨声真相会成为旧城后续修复和居民自治的证据。",
      primaryActionLabel: "安抚街坊",
      primaryActionDescription: "组织街坊在巷口建立公开证词桌。",
      secondaryActionLabel: "追查雨声",
      secondaryActionDescription: "沿雨棚水痕追查旧仓库的隐藏监控。",
      tertiaryActionLabel: "争取证人",
      tertiaryActionDescription: "保护愿意开口的住户并安排安全转移。",
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
    expect(Object.values(draft.world.quests).map((quest) => quest.surfaceGoal)).toEqual([
      "在雨夜结束前公开怨念来源并保护旧城住户。",
    ]);
    expect(
      Object.values(draft.world.quests).map((quest) => quest.realBackground),
    ).toEqual([
      "失踪者留下的水渍指向旧仓库，拆迁队提前封存了最后一段监控。",
    ]);
    expect(Object.values(draft.world.quests).map((quest) => quest.hiddenGoal)).toEqual([
      "确认谁替拆迁队改写了雨夜巡逻记录。",
    ]);
    expect(
      Object.values(draft.world.quests).map(
        (quest) => quest.failureConsequence,
      ),
    ).toEqual([
      "拆迁队会把雨声解释成封街理由，旧城住户失去公开辩护机会。",
    ]);
    expect(Object.values(draft.world.quests).map((quest) => quest.longTermImpact)).toEqual([
      "雨声真相会成为旧城后续修复和居民自治的证据。",
    ]);
    expect(draft.actions).toHaveLength(3);
    expect(draft.actions.map((action) => action.description)).toEqual([
      "组织街坊在巷口建立公开证词桌。",
      "沿雨棚水痕追查旧仓库的隐藏监控。",
      "保护愿意开口的住户并安排安全转移。",
    ]);
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
