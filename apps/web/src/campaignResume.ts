import type { CampaignSummary } from "./api.js";

const phaseLabel: Record<CampaignSummary["phase"], string> = {
  morning: "清晨",
  afternoon: "午后",
  evening: "傍晚",
  night: "夜晚"
};

export const formatCampaignProgress = (campaign: CampaignSummary) => {
  const turns = campaign.turnCount > 0 ? `${campaign.turnCount} 回合` : "未行动";
  return `第 ${campaign.day} 天 · ${phaseLabel[campaign.phase]} · ${campaign.currentLocationName} · ${turns}`;
};
