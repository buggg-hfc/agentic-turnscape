import type { CampaignSummary } from "./api.js";

const phaseLabel: Record<CampaignSummary["phase"], string> = {
  morning: "清晨",
  afternoon: "午后",
  evening: "傍晚",
  night: "夜晚"
};

const turnStatusLabel: Partial<Record<NonNullable<CampaignSummary["lastTurnStatus"]>, string>> = {
  pending: "结算中",
  failed: "上回合失败"
};

export const formatCampaignProgress = (campaign: CampaignSummary) => {
  const turns = campaign.turnCount > 0 ? `${campaign.turnCount} 回合` : "未行动";
  const status = campaign.lastTurnStatus
    ? turnStatusLabel[campaign.lastTurnStatus]
    : undefined;
  return [
    `第 ${campaign.day} 天`,
    phaseLabel[campaign.phase],
    campaign.currentLocationName,
    turns,
    status
  ].filter(Boolean).join(" · ");
};
