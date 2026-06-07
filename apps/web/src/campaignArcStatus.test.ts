import { describe, expect, it } from "vitest";
import type { CampaignPayload } from "./api.js";
import { buildCampaignArcStatusSummary } from "./campaignArcStatus.js";

describe("campaign arc status view model", () => {
  it("returns an unavailable summary when the active scenario has no campaign arc", () => {
    expect(
      buildCampaignArcStatusSummary({
        sceneCounts: { combat: 1, social: 1, endings: 1 },
      }),
    ).toEqual({
      available: false,
      chapterLabel: "无长期篇章",
      focus: "",
      unlocks: [],
      baseFacilities: [],
      factionFronts: [],
    });
  });

  it("summarizes the current chapter with Chinese display labels", () => {
    const status = {
      sceneCounts: { combat: 1, social: 1, endings: 2 },
      campaignArc: {
        chapterCount: 3,
        chapterNumber: 1,
        currentChapter: {
          id: "orbital-quarantine_opening_arc",
          title: "Orbital Quarantine: Opening Crisis",
          focus: "Contain the station signal before quarantine hardens.",
          unlocks: ["orbital-quarantine_signal", "orbital_medbay"],
        },
        baseFacilities: ["medbay", "engineering_bay"],
        factionFronts: [
          "orbital-quarantine_allies",
          "orbital-quarantine_pressure",
        ],
      },
    } satisfies CampaignPayload["scenarioStatus"];

    expect(buildCampaignArcStatusSummary(status)).toEqual({
      available: true,
      chapterLabel: "第 1/3 章 · 轨道隔离：开局危机",
      focus: "Contain the station signal before quarantine hardens.",
      unlocks: ["orbital-quarantine_signal", "orbital_medbay"],
      baseFacilities: ["medbay", "engineering_bay"],
      factionFronts: [
        "orbital-quarantine_allies",
        "orbital-quarantine_pressure",
      ],
    });
  });
});
