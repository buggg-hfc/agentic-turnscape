import { describe, expect, it } from "vitest";
import { buildCreatorDraftPreview } from "./creatorScenarioPreview.js";

describe("creator scenario draft preview", () => {
  it("summarizes generated creator drafts into Chinese GUI outline sections", () => {
    const preview = buildCreatorDraftPreview({
      id: "harbor-maker",
      title: "港口试作",
      premise: "风暴夜后，港务厅和走私者都想控制唯一的灯塔。",
      playerName: "临时调停人",
      startLocationName: "潮汐议事厅",
      startLocationDescription: "墙上挂着潮汐钟和维修账页。",
      startLocationPublicInfo: "船工愿意公开作证;潮汐记录还没被黑帆拿走",
      startLocationHiddenInfo: "议事厅地板下有备用灯芯发票",
      startLocationDangerLevel: 1,
      pressureLocationName: "旧灯塔机房",
      pressureLocationDescription: "旧灯塔机房里满是盐雾和被拆开的灯座。",
      pressureLocationPublicInfo: "机房门锁被撬开;黑帆守着外侧楼梯",
      pressureLocationHiddenInfo: "备用灯芯被换成劣质芯;墙后夹层有黑帆账页",
      pressureLocationDangerLevel: 4,
      crisisName: "灯塔停摆",
      crisisInitialProgress: 2,
      crisisMax: 6,
      crisisConsequence: "灯塔停摆满格时，黑帆将控制外海航标。",
      guideName: "林澈",
      pressureNpcName: "黑帆船长",
      allyFactionName: "码头互助会",
      pressureFactionName: "黑帆承包队",
      allyFactionPublicGoal: "公开修复灯塔并保护船工证词。",
      allyFactionCurrentPlan: "先组织船工看守潮汐议事厅。",
      allyFactionResources: "船工:4,油料:2",
      pressureFactionPublicGoal: "声称只有封航才能避免事故扩大。",
      pressureFactionCurrentPlan: "用巡逻船封住外海航标。",
      pressureFactionResources: "巡逻船:3,账本:1",
      mainQuestGoal: "在下一次潮汐前修复灯塔并公开黑帆的封航证据。",
      mainQuestRealBackground:
        "停摆前夜有人把备用灯芯调包，只有潮汐记录能证明黑帆提前进场。",
      mainQuestHiddenGoal: "找出谁把备用灯芯交给黑帆船长。",
      mainQuestFailureConsequence:
        "黑帆会把灯塔停摆解释成封航理由，码头失去谈判窗口。",
      mainQuestLongTermImpact:
        "灯塔复明会开启码头自治线和下一章航路谈判。",
      primaryActionType: "trade",
      primaryActionTarget: "startLocation",
      primaryActionLabel: "安抚码头",
      primaryActionDescription: "让船工和家属先承认同一份灯塔维修时间表。",
      primaryActionRiskLevel: "low",
      secondaryActionType: "fight",
      secondaryActionTarget: "pressureNpc",
      secondaryActionLabel: "追查灯塔",
      secondaryActionDescription: "进入旧灯塔机房检查被调包的备用灯芯。",
      secondaryActionRiskLevel: "high",
      tertiaryActionType: "travel",
      tertiaryActionTarget: "pressureLocation",
      tertiaryActionLabel: "召集船工",
      tertiaryActionDescription: "保护愿意作证的船工并把证词带回议事厅。",
      tertiaryActionRiskLevel: "medium",
      successEndingTitle: "灯塔复明",
      pressureEndingTitle: "黑帆接管",
      successEndingSummary: "灯塔重新照亮外海，码头有了继续谈判的资本。",
      pressureEndingSummary: "黑帆控制航道，港口进入被迫交易的新局势。",
    });

    expect(preview).toMatchObject({
      title: "港口试作",
      scenarioId: "harbor-maker",
      summary:
        "3 天 / 3 场景 / 2 地点 / 2 NPC / 2 阵营 / 1 任务 / 3 行动 / 2 结局",
    });
    expect(preview.sections).toEqual([
      {
        title: "地点",
        count: 2,
        items: [
          "潮汐议事厅：墙上挂着潮汐钟和维修账页。；公开：船工愿意公开作证，潮汐记录还没被黑帆拿走；隐藏：议事厅地板下有备用灯芯发票；危险：1",
          "旧灯塔机房：旧灯塔机房里满是盐雾和被拆开的灯座。；公开：机房门锁被撬开，黑帆守着外侧楼梯；隐藏：备用灯芯被换成劣质芯，墙后夹层有黑帆账页；危险：4",
        ],
      },
      {
        title: "NPC",
        count: 2,
        items: ["林澈", "黑帆船长"],
      },
      {
        title: "阵营",
        count: 2,
        items: [
          "码头互助会：公开修复灯塔并保护船工证词。；计划：先组织船工看守潮汐议事厅。；资源：船工 4，油料 2",
          "黑帆承包队：声称只有封航才能避免事故扩大。；计划：用巡逻船封住外海航标。；资源：巡逻船 3，账本 1",
        ],
      },
      {
        title: "危机钟",
        count: 2,
        items: [
          "港口试作稳定度 0/4：稳定度满格时，玩家能把危机转化为长期优势。",
          "灯塔停摆 2/6：灯塔停摆满格时，黑帆将控制外海航标。",
        ],
      },
      {
        title: "任务",
        count: 1,
        items: [
          "港口试作主线：在下一次潮汐前修复灯塔并公开黑帆的封航证据。；真相：停摆前夜有人把备用灯芯调包，只有潮汐记录能证明黑帆提前进场。；隐线：找出谁把备用灯芯交给黑帆船长。；失败：黑帆会把灯塔停摆解释成封航理由，码头失去谈判窗口。；影响：灯塔复明会开启码头自治线和下一章航路谈判。",
        ],
      },
      {
        title: "行动",
        count: 3,
        items: [
          "安抚码头：让船工和家属先承认同一份灯塔维修时间表。（类型：交易；目标：潮汐议事厅；风险：低）",
          "追查灯塔：进入旧灯塔机房检查被调包的备用灯芯。（类型：战斗；目标：黑帆船长；风险：高）",
          "召集船工：保护愿意作证的船工并把证词带回议事厅。（类型：旅行；目标：旧灯塔机房；风险：中）",
        ],
      },
      {
        title: "结局",
        count: 2,
        items: [
          "灯塔复明：灯塔重新照亮外海，码头有了继续谈判的资本。",
          "黑帆接管：黑帆控制航道，港口进入被迫交易的新局势。",
        ],
      },
    ]);
  });
});
