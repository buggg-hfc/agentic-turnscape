import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { WorldStateSchema } from "@agentic-turnscape/shared";
import { applyStatePatch } from "./patch.js";
import { resolveLongCampaignStep } from "./campaignProgression.js";

describe("long campaign progression", () => {
  it("initializes campaign progress and advances to the next chapter after a terminal-night quest resolution", () => {
    const state = createBorderSevenDaysWorld();
    state.time = { day: 7, phase: "night" };

    const patch = resolveLongCampaignStep({
      state,
      turnId: "chapter-one-close",
      completedQuestIds: ["missing_caravan"]
    });
    const next = applyStatePatch(state, patch);

    expect(next.campaign?.chapter).toBe(2);
    expect(next.time).toEqual({ day: 1, phase: "morning" });
    expect(next.quests.missing_caravan?.status).toBe("resolved");
    expect(next.campaign?.experience).toBe(2);
    expect(next.campaign?.legacyFlags).toContain("quest:missing_caravan:resolved");
    expect(next.publicEvents.at(-1)?.tags).toContain("chapter");
    expect(() => WorldStateSchema.parse(next)).not.toThrow();
  });

  it("turns a terminal ending into long-campaign legacy for the next chapter", () => {
    const state = createBorderSevenDaysWorld();
    state.time = { day: 7, phase: "night" };

    const patch = resolveLongCampaignStep({
      state,
      turnId: "ending-aftermath",
      endingId: "guild_reform",
      endingTitle: "Guild Reform"
    });
    const next = applyStatePatch(state, patch);

    expect(next.campaign?.chapter).toBe(2);
    expect(next.time).toEqual({ day: 1, phase: "morning" });
    expect(next.campaign?.experience).toBe(3);
    expect(next.campaign?.legacyFlags).toContain("ending:guild_reform");
    expect(next.publicEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Ending carried forward",
          tags: expect.arrayContaining(["campaign", "ending"])
        }),
        expect.objectContaining({
          title: "Next chapter begins",
          tags: expect.arrayContaining(["chapter", "campaign"])
        })
      ])
    );
    expect(() => WorldStateSchema.parse(next)).not.toThrow();
  });

  it.each([
    ["ritual_stopped", "sealed_ritual_site", "rift_cult"],
    ["guild_reform", "public_case_archive", "frontier_guild"],
    ["cure_with_exiles", "exile_clinic_network", "rift_cult"],
    ["town_quarantined", "quarantine_relief_route", "frontier_guild"],
    ["consortium_rule", "blackstone_credit_line", "blackstone_consortium"],
    ["rift_opened", "rift_scar_map", "rift_cult"]
  ])("turns ending %s into a distinct playable legacy consequence", (endingId, assetId, frontId) => {
    const state = createBorderSevenDaysWorld();
    state.time = { day: 7, phase: "night" };
    const beforeFront = state.campaign?.fronts[frontId];

    const patch = resolveLongCampaignStep({
      state,
      turnId: `ending-${endingId}`,
      endingId,
      endingTitle: endingId
    });
    const next = applyStatePatch(state, patch);
    const afterFront = next.campaign?.fronts[frontId];

    expect(next.campaign?.base.assets[assetId]).toBe(1);
    expect(next.campaign?.legacyFlags).toContain(`ending:${endingId}`);
    expect(afterFront).toBeDefined();
    expect(afterFront).not.toEqual(beforeFront);
    expect(next.publicEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Legacy consequence unlocked",
          tags: expect.arrayContaining(["campaign", "ending", "consequence"])
        })
      ])
    );
    expect(() => WorldStateSchema.parse(next)).not.toThrow();
  });

  it("upgrades base facilities through referee patches while spending player resources", () => {
    const state = createBorderSevenDaysWorld();

    const patch = resolveLongCampaignStep({
      state,
      turnId: "base-upgrade",
      baseInvestments: [{ facilityId: "infirmary", supplies: 2, money: 1 }]
    });
    const next = applyStatePatch(state, patch);

    expect(next.player.resources.supplies).toBe(2);
    expect(next.player.resources.money).toBe(4);
    expect(next.campaign?.base.facilities.infirmary).toBe(1);
    expect(next.campaign?.base.level).toBe(1);
    expect(next.publicEvents.at(-1)?.tags).toContain("base");
  });

  it("spends earned experience on character growth and updates faction war fronts", () => {
    const state = createBorderSevenDaysWorld();
    state.campaign = {
      chapter: 2,
      experience: 4,
      base: { name: "Border House", level: 1, facilities: { infirmary: 1 }, assets: {} },
      fronts: {
        blackstone_consortium: {
          factionId: "blackstone_consortium",
          influence: 5,
          pressure: 5,
          status: "active"
        }
      },
      legacyFlags: []
    };

    const patch = resolveLongCampaignStep({
      state,
      turnId: "growth-and-war",
      training: { skill: "medical", experience: 3 },
      factionFronts: [{ factionId: "blackstone_consortium", influenceDelta: -5, pressureDelta: 4 }]
    });
    const next = applyStatePatch(state, patch);

    expect(next.campaign?.experience).toBe(1);
    expect(next.player.skills.medical).toBe(2);
    expect(next.campaign?.fronts.blackstone_consortium?.influence).toBe(0);
    expect(next.campaign?.fronts.blackstone_consortium?.pressure).toBe(9);
    expect(next.campaign?.fronts.blackstone_consortium?.status).toBe("broken");
    expect(next.publicEvents.at(-1)?.tags).toContain("faction_war");
  });
});
