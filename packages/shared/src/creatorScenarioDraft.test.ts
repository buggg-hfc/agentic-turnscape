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
      dayOneEvent: "第 1 天：雨巷居民提交第一份证词。",
      dayTwoEvent: "第 2 天：拆迁队围住旧仓库雨棚。",
      dayThreeEvent: "第 3 天：玩家必须公开解释雨声真相。",
      openingSceneName: "雨巷证词会",
      pressureSceneName: "旧仓库雨棚对峙",
      finalSceneName: "真相公布夜",
      openingSceneKind: "exploration",
      pressureSceneKind: "social",
      finalSceneKind: "combat",
      playerName: "临时调查员",
      playerHealth: 4,
      playerStamina: 5,
      playerMoney: 3,
      playerIntel: 2,
      playerSocialSkill: 4,
      playerInvestigationSkill: 3,
      playerPhysique: 3,
      playerAgility: 4,
      playerKnowledge: 5,
      playerInsight: 3,
      playerCharm: 2,
      playerWill: 4,
      startLocationName: "长明巷口",
      startLocationDescription: "长明巷口贴满寻人启事，雨水从屋檐滴进临时取证箱。",
      startLocationPublicInfo: "居民愿意交换巡逻时间;巷口监控只剩半小时备份",
      startLocationHiddenInfo: "互助会藏着一份未公开失踪名单;林姐知道仓库钥匙来源",
      startLocationDangerLevel: 2,
      pressureLocationName: "旧仓库雨棚",
      pressureLocationDescription: "旧仓库雨棚下有被水泡开的封条，拆迁队把入口围住。",
      pressureLocationPublicInfo: "雨棚下发现新脚印;承包队要求立刻清场",
      pressureLocationHiddenInfo: "最后一段监控藏在雨棚配电箱;周队曾调走看守",
      pressureLocationDangerLevel: 5,
      crisisName: "雨声怨念",
      crisisInitialProgress: 2,
      crisisMax: 6,
      crisisConsequence: "雨棚下的怨念满格时，拆迁队会拿到封街理由。",
      guideName: "林姐",
      guideRole: "旧城联络人",
      guidePublicImage: "林姐熟悉每条巷子的门牌和住户关系。",
      guideShortTermGoal: "帮玩家把第一批证词公开登记。",
      guideSecret: "林姐曾替承包队保管过一晚仓库钥匙。",
      guideSocialSkill: 4,
      guideInvestigationSkill: 3,
      guideDefenseSkill: 2,
      guideResources: "线人:3,旧钥匙:1",
      guideRelationshipTrust: 3,
      guideRelationshipInterest: 2,
      guideRelationshipSuspicion: 0,
      pressureNpcName: "周队",
      pressureNpcRole: "拆迁现场指挥",
      pressureNpcPublicImage: "周队总是带着封街文件和施工队一起出现。",
      pressureNpcShortTermGoal: "逼居民承认雨声只是安全隐患。",
      pressureNpcSecret: "周队调走了雨夜最后一名仓库看守。",
      pressureNpcSocialSkill: 5,
      pressureNpcInvestigationSkill: 1,
      pressureNpcDefenseSkill: 4,
      pressureNpcResources: "围挡:4,文件:2",
      pressureNpcRelationshipTrust: 0,
      pressureNpcRelationshipInterest: 2,
      pressureNpcRelationshipSuspicion: 4,
      allyFactionName: "街坊互助会",
      pressureFactionName: "拆迁承包队",
      allyFactionPublicGoal: "公开保护旧城住户并建立夜巡表。",
      allyFactionCurrentPlan: "先把雨棚下的商户组织成互保队。",
      allyFactionResources: "街坊:3,旧地图:2",
      pressureFactionPublicGoal: "声称封街可以保护居民安全。",
      pressureFactionCurrentPlan: "用施工围挡切断雨巷入口。",
      pressureFactionResources: "围挡:4,账本:1",
      mainQuestGoal: "在雨夜结束前公开怨念来源并保护旧城住户。",
      mainQuestRealBackground:
        "失踪者留下的水渍指向旧仓库，拆迁队提前封存了最后一段监控。",
      mainQuestHiddenGoal: "确认谁替拆迁队改写了雨夜巡逻记录。",
      mainQuestFailureConsequence:
        "拆迁队会把雨声解释成封街理由，旧城住户失去公开辩护机会。",
      mainQuestLongTermImpact:
        "雨声真相会成为旧城后续修复和居民自治的证据。",
      primaryActionType: "trade",
      primaryActionTarget: "startLocation",
      primaryActionLabel: "安抚街坊",
      primaryActionDescription: "组织街坊在巷口建立公开证词桌。",
      primaryActionRiskLevel: "low",
      secondaryActionType: "fight",
      secondaryActionTarget: "pressureNpc",
      secondaryActionLabel: "追查雨声",
      secondaryActionDescription: "沿雨棚水痕追查旧仓库的隐藏监控。",
      secondaryActionRiskLevel: "high",
      tertiaryActionType: "travel",
      tertiaryActionTarget: "pressureLocation",
      tertiaryActionLabel: "争取证人",
      tertiaryActionDescription: "保护愿意开口的住户并安排安全转移。",
      tertiaryActionRiskLevel: "medium",
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
    expect(draft.world.player.resources).toMatchObject({
      health: 4,
      stamina: 5,
      money: 3,
      intel: 2,
    });
    expect(draft.world.player.skills).toMatchObject({
      social: 4,
      investigation: 3,
    });
    expect(draft.world.player.attributes).toEqual({
      physique: 3,
      agility: 4,
      knowledge: 5,
      insight: 3,
      charm: 2,
      will: 4,
    });
    expect(Object.values(draft.world.characters).map((npc) => npc.name)).toEqual(
      expect.arrayContaining(["林姐", "周队"]),
    );
    expect(Object.values(draft.world.characters).map((npc) => npc.role)).toEqual([
      "旧城联络人",
      "拆迁现场指挥",
    ]);
    expect(Object.values(draft.world.characters).map((npc) => npc.publicImage)).toEqual([
      "林姐熟悉每条巷子的门牌和住户关系。",
      "周队总是带着封街文件和施工队一起出现。",
    ]);
    expect(Object.values(draft.world.characters).map((npc) => npc.shortTermGoal)).toEqual([
      "帮玩家把第一批证词公开登记。",
      "逼居民承认雨声只是安全隐患。",
    ]);
    expect(Object.values(draft.world.characters).map((npc) => npc.secret)).toEqual([
      "林姐曾替承包队保管过一晚仓库钥匙。",
      "周队调走了雨夜最后一名仓库看守。",
    ]);
    expect(Object.values(draft.world.characters).map((npc) => npc.skills)).toEqual([
      { social: 4, investigation: 3, defense: 2 },
      { social: 5, investigation: 1, defense: 4 },
    ]);
    expect(Object.values(draft.world.characters).map((npc) => npc.resources)).toEqual([
      { 线人: 3, 旧钥匙: 1 },
      { 围挡: 4, 文件: 2 },
    ]);
    expect(draft.world.relationships["player:rain_alley_test_guide"]).toMatchObject({
      trust: 3,
      interest: 2,
      suspicion: 0,
    });
    expect(
      draft.world.relationships["player:rain_alley_test_pressure_lead"],
    ).toMatchObject({
      trust: 0,
      interest: 2,
      suspicion: 4,
    });
    expect(Object.values(draft.world.locations).map((location) => location.name)).toEqual(
      expect.arrayContaining(["长明巷口", "旧仓库雨棚"]),
    );
    expect(Object.values(draft.world.locations).map((location) => location.description)).toEqual([
      "长明巷口贴满寻人启事，雨水从屋檐滴进临时取证箱。",
      "旧仓库雨棚下有被水泡开的封条，拆迁队把入口围住。",
    ]);
    expect(Object.values(draft.world.locations).map((location) => location.publicInfo)).toEqual([
      ["居民愿意交换巡逻时间", "巷口监控只剩半小时备份"],
      ["雨棚下发现新脚印", "承包队要求立刻清场"],
    ]);
    expect(Object.values(draft.world.locations).map((location) => location.hiddenInfo)).toEqual([
      ["互助会藏着一份未公开失踪名单", "林姐知道仓库钥匙来源"],
      ["最后一段监控藏在雨棚配电箱", "周队曾调走看守"],
    ]);
    expect(Object.values(draft.world.locations).map((location) => location.dangerLevel)).toEqual([
      2,
      5,
    ]);
    expect(Object.values(draft.world.factions).map((faction) => faction.publicGoal)).toEqual([
      "公开保护旧城住户并建立夜巡表。",
      "声称封街可以保护居民安全。",
    ]);
    expect(Object.values(draft.world.factions).map((faction) => faction.currentPlan)).toEqual([
      "先把雨棚下的商户组织成互保队。",
      "用施工围挡切断雨巷入口。",
    ]);
    expect(Object.values(draft.world.factions).map((faction) => faction.resources)).toEqual([
      { 街坊: 3, 旧地图: 2 },
      { 围挡: 4, 账本: 1 },
    ]);
    const pressureClock = Object.values(draft.world.clocks).find(
      (clock) => clock.name === "雨声怨念",
    );
    expect(pressureClock).toMatchObject({
      progress: 2,
      max: 6,
      consequence: "雨棚下的怨念满格时，拆迁队会拿到封街理由。",
    });
    expect(draft.days.map((day) => day.mainEvent)).toEqual([
      "第 1 天：雨巷居民提交第一份证词。",
      "第 2 天：拆迁队围住旧仓库雨棚。",
      "第 3 天：玩家必须公开解释雨声真相。",
    ]);
    expect(draft.scenes.map((scene) => scene.name)).toEqual([
      "雨巷证词会",
      "旧仓库雨棚对峙",
      "真相公布夜",
    ]);
    expect(draft.scenes.map((scene) => scene.kind)).toEqual([
      "exploration",
      "social",
      "combat",
    ]);
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
    expect(draft.actions.map((action) => action.actionType)).toEqual([
      "trade",
      "fight",
      "travel",
    ]);
    expect(draft.actions.map((action) => action.targetId)).toEqual([
      "rain_alley_test_start",
      "rain_alley_test_pressure_lead",
      "rain_alley_test_pressure_site",
    ]);
    expect(draft.actions.map((action) => action.description)).toEqual([
      "组织街坊在巷口建立公开证词桌。",
      "沿雨棚水痕追查旧仓库的隐藏监控。",
      "保护愿意开口的住户并安排安全转移。",
    ]);
    expect(draft.actions.map((action) => action.riskLevel)).toEqual([
      "low",
      "high",
      "medium",
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
