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
        label: "Build infirmary",
        description: "Spend 1 supplies and 1 money to improve the campaign base.",
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
        label: "Build archive",
        description: "Spend 1 supplies and 1 money to improve the campaign base.",
        request: {
          baseInvestments: [{ facilityId: "archive", supplies: 1, money: 1 }],
        },
      },
      {
        id: "training:engineering",
        kind: "training",
        label: "Train engineering",
        description: "Spend 3 XP to raise a player skill for future chapters.",
        request: { training: { skill: "engineering", experience: 3 } },
      },
      {
        id: "front:blackstone_consortium",
        kind: "front",
        label: "Stabilize 黑石商会",
        description: "Reduce the highest-pressure faction front by 2.",
        request: {
          factionFronts: [
            { factionId: "blackstone_consortium", pressureDelta: -2 },
          ],
        },
      },
    ]);
  });
});
