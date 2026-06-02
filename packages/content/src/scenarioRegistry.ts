import type { EndingSummary, PlayerAction, WorldState } from "@agentic-turnscape/shared";
import {
  borderSevenDaysScenario,
  createBorderSevenDaysWorld,
  evaluateBorderSevenDaysEnding,
  getBorderSevenDaysActions,
  getBorderSevenDaysDayPlan
} from "./borderSevenDays.js";
import { firstWaveExpansionPackages } from "./expansionScenarios.js";
import { frostLanternTrialPackage } from "./frostLanternTrial.js";

export type ScenarioCounts = {
  combat: number;
  social: number;
  endings: number;
};

export type ScenarioDayPlan = {
  day: number;
  mainEvent: string;
  defaultLocationId: string;
  sceneIds: string[];
  clockPressure: string[];
};

export type ScenarioCampaignArcChapter = {
  id: string;
  title: string;
  focus: string;
  unlocks: string[];
};

export type ScenarioCampaignArc = {
  chapters: ScenarioCampaignArcChapter[];
  baseFacilities: string[];
  factionFronts: string[];
};

export type ScenarioCampaignArcSummary = {
  chapterCount: number;
  baseFacilities: string[];
  factionFronts: string[];
};

export type ScenarioPackage = {
  id: string;
  title: string;
  counts: ScenarioCounts;
  campaignArc?: ScenarioCampaignArc;
  createWorld: () => WorldState;
  getActions: (state: WorldState) => PlayerAction[];
  getDayPlan: (day: number) => ScenarioDayPlan | undefined;
  evaluateEnding: (state: WorldState) => EndingSummary | undefined;
};

export type ScenarioSummary = Pick<ScenarioPackage, "id" | "title" | "counts"> & {
  campaignArc?: ScenarioCampaignArcSummary;
};

export const summarizeCampaignArc = (campaignArc: ScenarioCampaignArc | undefined): ScenarioCampaignArcSummary | undefined =>
  campaignArc
    ? {
        chapterCount: campaignArc.chapters.length,
        baseFacilities: [...campaignArc.baseFacilities],
        factionFronts: [...campaignArc.factionFronts]
      }
    : undefined;

export const borderSevenDaysPackage: ScenarioPackage = {
  id: borderSevenDaysScenario.id,
  title: borderSevenDaysScenario.title,
  counts: {
    combat: borderSevenDaysScenario.scenes.filter((scene) => scene.kind === "combat").length,
    social: borderSevenDaysScenario.scenes.filter((scene) => scene.kind === "social").length,
    endings: borderSevenDaysScenario.endings.length
  },
  campaignArc: {
    chapters: [
      {
        id: "border-seven-days_crisis",
        title: "Border Crisis",
        focus: "Resolve the seven-day town crisis and decide which faction story becomes history.",
        unlocks: ["missing_caravan", "clinic_conflict", "old_outpost"]
      },
      {
        id: "border-seven-days_aftermath",
        title: "Border Aftermath",
        focus: "Turn the ending into a playable base, faction front, and legacy record.",
        unlocks: ["infirmary", "workshop", "archive"]
      },
      {
        id: "border-seven-days_rift_war",
        title: "Rift War Front",
        focus: "Carry surviving NPCs and crisis clocks into a wider regional campaign.",
        unlocks: ["frontier_guild", "blackstone_consortium", "rift_cult"]
      }
    ],
    baseFacilities: ["infirmary", "workshop", "archive"],
    factionFronts: ["frontier_guild", "blackstone_consortium", "rift_cult"]
  },
  createWorld: createBorderSevenDaysWorld,
  getActions: getBorderSevenDaysActions,
  getDayPlan: getBorderSevenDaysDayPlan,
  evaluateEnding: evaluateBorderSevenDaysEnding
};

export const createScenarioRegistry = (packages: ScenarioPackage[]) => {
  const scenarios = new Map<string, ScenarioPackage>();
  for (const scenario of packages) {
    if (scenarios.has(scenario.id)) {
      throw new Error(`Duplicate scenario package: ${scenario.id}`);
    }
    scenarios.set(scenario.id, scenario);
  }

  return {
    list: (): ScenarioSummary[] =>
      Array.from(scenarios.values()).map(({ id, title, counts, campaignArc }) => {
        const arcSummary = summarizeCampaignArc(campaignArc);
        return {
          id,
          title,
          counts,
          ...(arcSummary ? { campaignArc: arcSummary } : {})
        };
      }),
    get: (id: string): ScenarioPackage | undefined => scenarios.get(id),
    require: (id: string): ScenarioPackage => {
      const scenario = scenarios.get(id);
      if (!scenario) throw new Error(`Unknown scenario package: ${id}`);
      return scenario;
    }
  };
};

const defaultScenarioRegistry = createScenarioRegistry([
  borderSevenDaysPackage,
  frostLanternTrialPackage,
  ...firstWaveExpansionPackages
]);

export const listScenarioPackages = () => defaultScenarioRegistry.list();
export const getScenarioPackage = (id: string) => defaultScenarioRegistry.get(id);
export const requireScenarioPackage = (id: string) => defaultScenarioRegistry.require(id);
