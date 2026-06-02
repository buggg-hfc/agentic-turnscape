import type { CampaignFrontState, WorldState } from "@agentic-turnscape/shared";

export type CampaignFrontSummary = {
  id: string;
  name: string;
  status: CampaignFrontState["status"];
  statusLabel: string;
  influence: number;
  pressure: number;
};

export type CampaignProgressionSummary = {
  available: boolean;
  chapterLabel: string;
  experienceLabel: string;
  baseLabel: string;
  facilities: string[];
  fronts: CampaignFrontSummary[];
  legacyFlags: string[];
};

const statusLabel: Record<CampaignFrontState["status"], string> = {
  contained: "受控",
  active: "活跃",
  dominant: "占优",
  broken: "瓦解",
};

const fallbackFactionNames: Record<string, string> = {
  frontier_guild: "边境公会",
  blackstone_consortium: "黑石商会",
  rift_cult: "裂隙教团",
};

export const buildCampaignProgressionSummary = (
  state: WorldState,
): CampaignProgressionSummary => {
  if (!state.campaign) {
    return {
      available: false,
      chapterLabel: "未开启",
      experienceLabel: "0 XP",
      baseLabel: "未建立",
      facilities: [],
      fronts: [],
      legacyFlags: [],
    };
  }

  const facilities = Object.entries(state.campaign.base.facilities)
    .filter(([, level]) => level > 0)
    .sort(([leftId, leftLevel], [rightId, rightLevel]) => rightLevel - leftLevel || leftId.localeCompare(rightId))
    .map(([id, level]) => `${id} Lv.${level}`);
  const fronts = Object.values(state.campaign.fronts)
    .sort((left, right) => right.pressure - left.pressure)
    .map((front) => ({
      id: front.factionId,
      name:
        fallbackFactionNames[front.factionId] ??
        state.factions[front.factionId]?.name ??
        front.factionId,
      status: front.status,
      statusLabel: statusLabel[front.status],
      influence: front.influence,
      pressure: front.pressure,
    }));

  return {
    available: true,
    chapterLabel: `第 ${state.campaign.chapter} 章`,
    experienceLabel: `${state.campaign.experience} XP`,
    baseLabel: `${state.campaign.base.name} Lv.${state.campaign.base.level}`,
    facilities,
    fronts,
    legacyFlags: state.campaign.legacyFlags,
  };
};
