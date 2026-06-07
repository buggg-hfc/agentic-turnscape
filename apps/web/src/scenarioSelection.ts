import type { ScenarioCatalogPayload } from "./api.js";

export const DEFAULT_SCENARIO_ID = "border-seven-days";

export type ScenarioOption = ScenarioCatalogPayload["scenarios"][number] & {
  summary: string;
  arcSummary?: string;
};

export type ScenarioSelection = {
  options: ScenarioOption[];
  selectedId: string;
};

export const formatScenarioCounts = (counts: ScenarioOption["counts"]) =>
  `战斗 ${counts.combat} · 社交 ${counts.social} · 结局 ${counts.endings}`;

export const formatCampaignArcSummary = (
  campaignArc: NonNullable<ScenarioOption["campaignArc"]> | undefined
) =>
  campaignArc
    ? `长期 ${campaignArc.chapterCount} 章 · 基地 ${campaignArc.baseFacilities.length} · 战线 ${campaignArc.factionFronts.length}`
    : undefined;

export const buildScenarioSelection = (
  catalog: ScenarioCatalogPayload,
  preferredId = DEFAULT_SCENARIO_ID
): ScenarioSelection => {
  const options = catalog.scenarios.map((scenario) => {
    const arcSummary = formatCampaignArcSummary(scenario.campaignArc);
    return {
      ...scenario,
      summary: formatScenarioCounts(scenario.counts),
      ...(arcSummary ? { arcSummary } : {})
    };
  });

  const selectedId = options.some((option) => option.id === preferredId)
    ? preferredId
    : (options[0]?.id ?? DEFAULT_SCENARIO_ID);

  return { options, selectedId };
};
