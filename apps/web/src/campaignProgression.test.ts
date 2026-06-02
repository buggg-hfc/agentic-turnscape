import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { buildCampaignProgressionSummary } from "./campaignProgression.js";

describe("campaign progression view model", () => {
  it("returns an empty summary before long campaign progress exists", () => {
    expect(buildCampaignProgressionSummary(createBorderSevenDaysWorld())).toEqual({
      available: false,
      chapterLabel: "未开启",
      experienceLabel: "0 XP",
      baseLabel: "未建立",
      facilities: [],
      fronts: [],
      legacyFlags: [],
    });
  });

  it("summarizes chapter, base facilities, growth points, and faction fronts", () => {
    const state = createBorderSevenDaysWorld();
    state.campaign = {
      chapter: 2,
      experience: 5,
      base: {
        name: "Border House",
        level: 2,
        facilities: { infirmary: 2, archive: 1, workshop: 0 },
        assets: {},
      },
      fronts: {
        blackstone_consortium: {
          factionId: "blackstone_consortium",
          influence: 3,
          pressure: 8,
          status: "dominant",
        },
        rift_cult: {
          factionId: "rift_cult",
          influence: 0,
          pressure: 6,
          status: "broken",
        },
      },
      legacyFlags: ["quest:missing_caravan:resolved"],
    };

    expect(buildCampaignProgressionSummary(state)).toEqual({
      available: true,
      chapterLabel: "第 2 章",
      experienceLabel: "5 XP",
      baseLabel: "Border House Lv.2",
      facilities: ["infirmary Lv.2", "archive Lv.1"],
      fronts: [
        {
          id: "blackstone_consortium",
          name: "黑石商会",
          status: "dominant",
          statusLabel: "占优",
          influence: 3,
          pressure: 8,
        },
        {
          id: "rift_cult",
          name: "裂隙教团",
          status: "broken",
          statusLabel: "瓦解",
          influence: 0,
          pressure: 6,
        },
      ],
      legacyFlags: ["quest:missing_caravan:resolved"],
    });
  });
});
