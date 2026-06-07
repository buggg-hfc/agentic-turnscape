import type { CampaignFrontState, WorldState } from "@agentic-turnscape/shared";
import type { LongCampaignProgressionRequest } from "./api.js";
import { displayLabel } from "./displayLabels.js";

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
  assets: string[];
  fronts: CampaignFrontSummary[];
  legacyFlags: string[];
};

export type CampaignProgressionChoice = {
  id: string;
  kind: "base" | "training" | "front" | "asset";
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
      assets: [],
      fronts: [],
      legacyFlags: [],
    };
  }

  const facilities = Object.entries(state.campaign.base.facilities)
    .filter(([, level]) => level > 0)
    .sort(([leftId, leftLevel], [rightId, rightLevel]) => rightLevel - leftLevel || leftId.localeCompare(rightId))
    .map(([id, level]) => `${displayLabel(id)} ${level} 级`);
  const assets = Object.entries(state.campaign.base.assets)
    .filter(([, count]) => count > 0)
    .sort(([leftId, leftCount], [rightId, rightCount]) => rightCount - leftCount || leftId.localeCompare(rightId))
    .map(([id, count]) => `${displayLabel(id)} x${count}`);
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
    baseLabel: `${state.campaign.base.name} ${state.campaign.base.level} 级`,
    facilities,
    assets,
    fronts,
    legacyFlags: state.campaign.legacyFlags,
  };
};

const defaultBaseFacilities = ["infirmary", "workshop", "archive"];

const assetProjectLabels: Record<string, { label: string; description: string }> = {
  sealed_ritual_site: {
    label: "动员封印仪式遗址",
    description: "消耗继承资产，扰乱教团战线。",
  },
  public_case_archive: {
    label: "动员公开案卷档案",
    description: "消耗继承资产，压制黑石商会战线。",
  },
  exile_clinic_network: {
    label: "动员流亡诊所网络",
    description: "消耗继承资产，转移病患并缓和裂隙压力。",
  },
  quarantine_relief_route: {
    label: "动员隔离救援路线",
    description: "消耗继承资产，稳定救援工作。",
  },
  blackstone_credit_line: {
    label: "动员黑石信用额度",
    description: "消耗继承资产，买低商会压力。",
  },
  rift_scar_map: {
    label: "动员裂隙伤痕地图",
    description: "消耗继承资产，把裂隙知识转化为行动。",
  },
};

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
      label: `建设${displayLabel(facilityId)}`,
      description: "消耗 1 补给和 1 金钱，提升长期战役基地。",
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
      label: `训练${displayLabel(trainingSkill)}`,
      description: "消耗 3 XP，提升后续篇章中的玩家技能。",
      request: { training: { skill: trainingSkill, experience: 3 } },
    });
  }

  const front = highestPressureFront(state);
  if (front) {
    choices.push({
      id: `front:${front.factionId}`,
      kind: "front",
      label: `稳定${factionName(state, front.factionId)}`,
      description: "将压力最高的阵营战线降低 2 点。",
      request: {
        factionFronts: [{ factionId: front.factionId, pressureDelta: -2 }],
      },
    });
  }

  for (const [assetId, count] of Object.entries(state.campaign?.base.assets ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const project = assetProjectLabels[assetId];
    if (!project || count <= 0) continue;
    choices.push({
      id: `asset:${assetId}`,
      kind: "asset",
      label: project.label,
      description: project.description,
      request: { assetProjects: [{ assetId }] },
    });
  }

  return choices;
};
