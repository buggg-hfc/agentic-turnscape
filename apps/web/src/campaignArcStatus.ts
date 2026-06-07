import type { CampaignPayload } from "./api.js";

export type CampaignArcStatusSummary = {
  available: boolean;
  chapterLabel: string;
  focus: string;
  unlocks: string[];
  baseFacilities: string[];
  factionFronts: string[];
};

export const buildCampaignArcStatusSummary = (
  status: CampaignPayload["scenarioStatus"] | undefined,
): CampaignArcStatusSummary => {
  const campaignArc = status?.campaignArc;
  if (!campaignArc) {
    return {
      available: false,
      chapterLabel: "无长期篇章",
      focus: "",
      unlocks: [],
      baseFacilities: [],
      factionFronts: [],
    };
  }

  const chapterNumber = Math.min(
    Math.max(campaignArc.chapterNumber, 1),
    campaignArc.chapterCount,
  );

  return {
    available: true,
    chapterLabel: `第 ${chapterNumber}/${campaignArc.chapterCount} 章 · ${campaignArc.currentChapter.title}`,
    focus: campaignArc.currentChapter.focus,
    unlocks: [...campaignArc.currentChapter.unlocks],
    baseFacilities: [...campaignArc.baseFacilities],
    factionFronts: [...campaignArc.factionFronts],
  };
};
