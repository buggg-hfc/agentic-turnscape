import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import {
  buildCampaignProgressionChoices,
  buildCampaignProgressionSummary,
} from "./campaignProgression.js";

describe("campaign progression view model", () => {
  it("returns an empty summary before long campaign progress exists", () => {
    expect(buildCampaignProgressionSummary(createBorderSevenDaysWorld())).toEqual({
      available: false,
      chapterLabel: "未开启",
      experienceLabel: "0 XP",
      baseLabel: "未建立",
      facilities: [],
      assets: [],
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
        assets: { public_case_archive: 1, militia_oath: 2 },
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
      baseLabel: "Border House 2 级",
      facilities: ["医务室 2 级", "档案室 1 级"],
      assets: ["民兵誓约 x2", "公开案卷档案 x1"],
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

  it("offers a base-building move that can initialize long campaign play", () => {
    const state = createBorderSevenDaysWorld();

    expect(
      buildCampaignProgressionChoices(state, {
        baseFacilities: ["infirmary", "archive"],
      }),
    ).toEqual([
      {
        id: "base:infirmary",
        kind: "base",
        label: "建设医务室",
        description: "消耗 1 补给和 1 金钱，提升长期战役基地。",
        request: {
          baseInvestments: [{ facilityId: "infirmary", supplies: 1, money: 1 }],
        },
      },
    ]);
  });

  it("offers training and faction-front moves from current campaign pressure", () => {
    const state = createBorderSevenDaysWorld();
    state.campaign = {
      chapter: 2,
      experience: 4,
      base: {
        name: "Border House",
        level: 1,
        facilities: { infirmary: 1, archive: 0, workshop: 0 },
        assets: {},
      },
      fronts: {
        frontier_guild: {
          factionId: "frontier_guild",
          influence: 5,
          pressure: 3,
          status: "active",
        },
        blackstone_consortium: {
          factionId: "blackstone_consortium",
          influence: 6,
          pressure: 8,
          status: "dominant",
        },
      },
      legacyFlags: [],
    };

    expect(buildCampaignProgressionChoices(state).slice(0, 3)).toEqual([
      {
        id: "base:archive",
        kind: "base",
        label: "建设档案室",
        description: "消耗 1 补给和 1 金钱，提升长期战役基地。",
        request: {
          baseInvestments: [{ facilityId: "archive", supplies: 1, money: 1 }],
        },
      },
      {
        id: "training:engineering",
        kind: "training",
        label: "训练工程",
        description: "消耗 3 XP，提升后续篇章中的玩家技能。",
        request: { training: { skill: "engineering", experience: 3 } },
      },
      {
        id: "front:blackstone_consortium",
        kind: "front",
        label: "稳定黑石商会",
        description: "将压力最高的阵营战线降低 2 点。",
        request: {
          factionFronts: [
            { factionId: "blackstone_consortium", pressureDelta: -2 },
          ],
        },
      },
    ]);
  });

  it("offers a clear asset-project move from inherited ending assets", () => {
    const state = createBorderSevenDaysWorld();
    state.campaign = {
      chapter: 2,
      experience: 3,
      base: {
        name: "Border House",
        level: 0,
        facilities: { infirmary: 0, archive: 0, workshop: 0 },
        assets: { public_case_archive: 1 },
      },
      fronts: {
        blackstone_consortium: {
          factionId: "blackstone_consortium",
          influence: 6,
          pressure: 6,
          status: "active",
        },
      },
      legacyFlags: ["ending:guild_reform"],
    };

    expect(
      buildCampaignProgressionChoices(state, {
        baseFacilities: ["infirmary", "archive", "workshop"],
      }),
    ).toEqual(
      expect.arrayContaining([
        {
          id: "asset:public_case_archive",
          kind: "asset",
          label: "动员公开案卷档案",
          description: "消耗继承资产，压制黑石商会战线。",
          request: {
            assetProjects: [{ assetId: "public_case_archive" }],
          },
        },
      ]),
    );
  });
});
