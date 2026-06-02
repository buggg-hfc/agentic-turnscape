import type { EndingSummary, PlayerAction, WorldState } from "@agentic-turnscape/shared";
import {
  borderSevenDaysScenario,
  createBorderSevenDaysWorld,
  evaluateBorderSevenDaysEnding,
  getBorderSevenDaysActions,
  getBorderSevenDaysDayPlan
} from "./borderSevenDays.js";
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

export type ScenarioPackage = {
  id: string;
  title: string;
  counts: ScenarioCounts;
  createWorld: () => WorldState;
  getActions: (state: WorldState) => PlayerAction[];
  getDayPlan: (day: number) => ScenarioDayPlan | undefined;
  evaluateEnding: (state: WorldState) => EndingSummary | undefined;
};

export type ScenarioSummary = Pick<ScenarioPackage, "id" | "title" | "counts">;

export const borderSevenDaysPackage: ScenarioPackage = {
  id: borderSevenDaysScenario.id,
  title: borderSevenDaysScenario.title,
  counts: {
    combat: borderSevenDaysScenario.scenes.filter((scene) => scene.kind === "combat").length,
    social: borderSevenDaysScenario.scenes.filter((scene) => scene.kind === "social").length,
    endings: borderSevenDaysScenario.endings.length
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
    list: (): ScenarioSummary[] => Array.from(scenarios.values()).map(({ id, title, counts }) => ({ id, title, counts })),
    get: (id: string): ScenarioPackage | undefined => scenarios.get(id),
    require: (id: string): ScenarioPackage => {
      const scenario = scenarios.get(id);
      if (!scenario) throw new Error(`Unknown scenario package: ${id}`);
      return scenario;
    }
  };
};

const defaultScenarioRegistry = createScenarioRegistry([borderSevenDaysPackage, frostLanternTrialPackage]);

export const listScenarioPackages = () => defaultScenarioRegistry.list();
export const getScenarioPackage = (id: string) => defaultScenarioRegistry.get(id);
export const requireScenarioPackage = (id: string) => defaultScenarioRegistry.require(id);
