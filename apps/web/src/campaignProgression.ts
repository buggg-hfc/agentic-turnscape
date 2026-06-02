import type { CampaignFrontState, WorldState } from "@agentic-turnscape/shared";
import type { LongCampaignProgressionRequest } from "./api.js";

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

export type CampaignProgressionChoice = {
  id: string;
  kind: "base" | "training" | "front";
  label: string;
  description: string;
  request: LongCampaignProgressionRequest;
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

const defaultBaseFacilities = ["infirmary", "workshop", "archive"];

const factionName = (state: WorldState, factionId: string): string =>
  fallbackFactionNames[factionId] ?? state.factions[factionId]?.name ?? factionId;

const nextFacility = (
  state: WorldState,
  baseFacilities: string[],
): string | undefined => {
  const currentFacilities = state.campaign?.base.facilities ?? {};
  const priority = new Map(baseFacilities.map((id, index) => [id, index]));
  return [...baseFacilities]
    .sort(
      (left, right) =>
        (currentFacilities[left] ?? 0) - (currentFacilities[right] ?? 0) ||
        (priority.get(left) ?? 0) - (priority.get(right) ?? 0),
    )
    .at(0);
};

const nextTrainingSkill = (state: WorldState): string | undefined =>
  Object.entries(state.player.skills)
    .filter(([, level]) => level < 5)
    .sort(([leftSkill, leftLevel], [rightSkill, rightLevel]) => leftLevel - rightLevel || leftSkill.localeCompare(rightSkill))
    .at(0)?.[0];

const highestPressureFront = (
  state: WorldState,
): CampaignFrontState | undefined =>
  Object.values(state.campaign?.fronts ?? {})
    .filter((front) => front.pressure > 0)
    .sort((left, right) => right.pressure - left.pressure || left.factionId.localeCompare(right.factionId))
    .at(0);

export const buildCampaignProgressionChoices = (
  state: WorldState,
  options: { baseFacilities?: string[] | undefined } = {},
): CampaignProgressionChoice[] => {
  const choices: CampaignProgressionChoice[] = [];
  const baseFacilities =
    options.baseFacilities && options.baseFacilities.length > 0
      ? options.baseFacilities
      : Object.keys(state.campaign?.base.facilities ?? {}).length > 0
        ? Object.keys(state.campaign?.base.facilities ?? {})
        : defaultBaseFacilities;
  const facilityId = nextFacility(state, baseFacilities);
  const supplies = state.player.resources.supplies ?? 0;
  const money = state.player.resources.money ?? 0;
  if (facilityId && supplies >= 1 && money >= 1) {
    choices.push({
      id: `base:${facilityId}`,
      kind: "base",
      label: `Build ${facilityId}`,
      description: "Spend 1 supplies and 1 money to improve the campaign base.",
      request: {
        baseInvestments: [{ facilityId, supplies: 1, money: 1 }],
      },
    });
  }

  const trainingSkill = nextTrainingSkill(state);
  if (trainingSkill && (state.campaign?.experience ?? 0) >= 3) {
    choices.push({
      id: `training:${trainingSkill}`,
      kind: "training",
      label: `Train ${trainingSkill}`,
      description: "Spend 3 XP to raise a player skill for future chapters.",
      request: { training: { skill: trainingSkill, experience: 3 } },
    });
  }

  const front = highestPressureFront(state);
  if (front) {
    choices.push({
      id: `front:${front.factionId}`,
      kind: "front",
      label: `Stabilize ${factionName(state, front.factionId)}`,
      description: "Reduce the highest-pressure faction front by 2.",
      request: {
        factionFronts: [{ factionId: front.factionId, pressureDelta: -2 }],
      },
    });
  }

  return choices;
};
