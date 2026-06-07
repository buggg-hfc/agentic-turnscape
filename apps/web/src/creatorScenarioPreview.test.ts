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
      pressureLocationName: "旧灯塔机房",
      crisisName: "灯塔停摆",
      guideName: "林澈",
      pressureNpcName: "黑帆船长",
      allyFactionName: "码头互助会",
      pressureFactionName: "黑帆承包队",
      primaryActionLabel: "安抚码头",
      secondaryActionLabel: "追查灯塔",
      tertiaryActionLabel: "召集船工",
      successEndingTitle: "灯塔复明",
      pressureEndingTitle: "黑帆接管",
      successEndingSummary: "灯塔重新照亮外海，码头有了继续谈判的资本。",
      pressureEndingSummary: "黑帆控制航道，港口进入被迫交易的新局势。",
    });

    expect(preview).toMatchObject({
      title: "港口试作",
      scenarioId: "harbor-maker",
      summary: "3 天 / 3 场景 / 2 地点 / 2 NPC / 2 阵营 / 3 行动 / 2 结局",
    });
    expect(preview.sections).toEqual([
      {
        title: "地点",
        count: 2,
        items: ["潮汐议事厅", "旧灯塔机房"],
      },
      {
        title: "NPC",
        count: 2,
        items: ["林澈", "黑帆船长"],
      },
      {
        title: "阵营",
        count: 2,
        items: ["码头互助会", "黑帆承包队"],
      },
      {
        title: "危机钟",
        count: 2,
        items: ["港口试作稳定度", "灯塔停摆"],
      },
      {
        title: "行动",
        count: 3,
        items: ["安抚码头", "追查灯塔", "召集船工"],
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
