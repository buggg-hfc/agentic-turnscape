import { requireScenarioPackage, type BorderSevenDaysEnding } from "@agentic-turnscape/content";
import { roll2d6 } from "@agentic-turnscape/core";
import type { EndingSummary, PlayerAction, TurnResolution, WorldState } from "@agentic-turnscape/shared";
import type { LLMClient } from "./llm.js";
import { runTurn } from "./orchestrator.js";

export type BorderSevenDaysRouteId =
  | "balanced_hero"
  | "guild_case"
  | "cure_alliance"
  | "neglect_plague"
  | "consortium_deal"
  | "open_rift";

export type BorderSevenDaysPlaythroughInput = {
  routeId: BorderSevenDaysRouteId;
  llm: LLMClient;
  seed?: string | undefined;
};

export type BorderSevenDaysPlaythroughResult = {
  routeId: BorderSevenDaysRouteId;
  state: WorldState;
  ending: BorderSevenDaysEnding | undefined;
  turns: number;
  resolutions: TurnResolution[];
};

export type ExpansionScenarioPlaythroughInput = {
  scenarioId: string;
  route: "success" | "pressure";
  llm: LLMClient;
  seed?: string | undefined;
};

export type ExpansionScenarioPlaythroughResult = {
  scenarioId: string;
  route: ExpansionScenarioPlaythroughInput["route"];
  state: WorldState;
  ending: EndingSummary | undefined;
  turns: number;
  resolutions: TurnResolution[];
};

const routeAction = (routeId: BorderSevenDaysRouteId, turnIndex: number): PlayerAction => {
  const base = {
    id: `${routeId}_${turnIndex}`,
    leverage: [`strategy:${routeId}`, `step:${turnIndex}`],
    riskLevel: "medium" as const
  };

  switch (routeId) {
    case "guild_case":
      return {
        ...base,
        actionType: "investigate",
        label: "Build the public case",
        description: "Gather evidence carefully enough that Rowan can act.",
        targetId: "npc_rowan"
      };
    case "cure_alliance":
      return {
        ...base,
        actionType: "protect",
        label: "Support the clinic cure",
        description: "Protect patients and coordinate Adele's work with Eve.",
        targetId: "npc_adele"
      };
    case "neglect_plague":
      return {
        ...base,
        actionType: "ignore",
        label: "Wait out the crisis",
        description: "Avoid direct commitments while the town's clocks advance."
      };
    case "consortium_deal":
      return {
        ...base,
        actionType: "trade",
        label: "Back the consortium deal",
        description: "Trade influence and time for Blackstone's promises.",
        targetId: "npc_manlo"
      };
    case "open_rift":
      return {
        ...base,
        actionType: "investigate",
        label: "Follow the rift omens",
        description: "Trace White Crow's signs toward the chapel anomaly.",
        targetId: "npc_white_crow"
      };
    case "balanced_hero":
      return {
        ...base,
        actionType: "negotiate",
        label: "Balance the factions",
        description: "Slow each crisis without giving any faction full control.",
        targetId: "npc_rowan"
      };
  }
};

const isFinalNight = (state: WorldState): boolean => state.time.day === 7 && state.time.phase === "night";
const isExpansionFinalNight = (state: WorldState): boolean => state.time.day === 3 && state.time.phase === "night";

const highRollSeed = (base: string, minimum = 10): string => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = `${base}_high_${attempt}`;
    if (roll2d6(candidate).total >= minimum) return candidate;
  }
  throw new Error(`Unable to find deterministic high-roll seed for ${base}`);
};

export const runBorderSevenDaysPlaythrough = async ({
  routeId,
  llm,
  seed = routeId
}: BorderSevenDaysPlaythroughInput): Promise<BorderSevenDaysPlaythroughResult> => {
  const scenario = requireScenarioPackage("border-seven-days");
  let state = scenario.createWorld();
  const resolutions: TurnResolution[] = [];
  let turnIndex = 0;

  while (!isFinalNight(state)) {
    turnIndex += 1;
    const action = routeAction(routeId, turnIndex);
    const result = await runTurn({
      state,
      playerAction: action,
      llm,
      turnId: `${routeId}_turn_${turnIndex}`,
      seed: `${seed}_${turnIndex}`,
      getAvailableActions: scenario.getActions,
      evaluateEnding: scenario.evaluateEnding
    });
    state = result.nextState;
    resolutions.push({
      ...result.resolution,
      ending: scenario.evaluateEnding(state)
    });

    if (turnIndex > 32) {
      throw new Error(`Border Seven Days playthrough exceeded expected turn count for route ${routeId}`);
    }
  }

  return {
    routeId,
    state,
    ending: scenario.evaluateEnding(state),
    turns: turnIndex,
    resolutions
  };
};

export const runExpansionScenarioPlaythrough = async ({
  scenarioId,
  route,
  llm,
  seed = scenarioId
}: ExpansionScenarioPlaythroughInput): Promise<ExpansionScenarioPlaythroughResult> => {
  const scenario = requireScenarioPackage(scenarioId);
  let state = scenario.createWorld();
  const resolutions: TurnResolution[] = [];
  let turnIndex = 0;

  while (!isExpansionFinalNight(state)) {
    turnIndex += 1;
    const actions = scenario.getActions(state);
    const baseAction = route === "success" ? actions[0] : actions.at(-1);
    if (!baseAction) throw new Error(`Expansion scenario ${scenarioId} did not provide playable actions`);
    const action: PlayerAction = {
      ...baseAction,
      id: `${scenarioId}_${route}_${turnIndex}`,
      leverage: Array.from(new Set([...baseAction.leverage, `route:${route}`, `step:${turnIndex}`]))
    };
    const result = await runTurn({
      state,
      playerAction: action,
      llm,
      turnId: `${scenarioId}_${route}_turn_${turnIndex}`,
      seed: route === "success" ? highRollSeed(`${seed}_${turnIndex}`) : `${seed}_${turnIndex}`,
      getAvailableActions: scenario.getActions,
      evaluateEnding: scenario.evaluateEnding
    });
    state = result.nextState;
    resolutions.push({
      ...result.resolution,
      ending: scenario.evaluateEnding(state)
    });

    if (turnIndex > 16) {
      throw new Error(`Expansion scenario ${scenarioId} playthrough exceeded expected turn count`);
    }
  }

  return {
    scenarioId,
    route,
    state,
    ending: scenario.evaluateEnding(state),
    turns: turnIndex,
    resolutions
  };
};
