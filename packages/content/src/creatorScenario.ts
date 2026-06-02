import {
  EndingSummarySchema,
  PlayerActionSchema,
  WorldStateSchema,
  type EndingSummary,
  type PlayerAction,
  type TimePhase,
  type WorldState
} from "@agentic-turnscape/shared";
import type { ScenarioDayPlan, ScenarioPackage } from "./scenarioRegistry.js";

export type CreatorScenarioSceneKind = "combat" | "social" | "exploration";

export type CreatorScenarioScene = {
  id: string;
  name: string;
  kind: CreatorScenarioSceneKind;
  day: number;
  locationId: string;
  npcIds: string[];
  crisisClockIds: string[];
  nonCombatSolutions: string[];
};

export type CreatorEndingCondition = {
  dayAtLeast?: number;
  phase?: TimePhase;
  clockAtMax?: string;
  momentumAtLeast?: number;
};

export type CreatorScenarioEnding = EndingSummary & {
  when: CreatorEndingCondition;
};

export type CreatorScenarioDefinition = {
  id: string;
  title: string;
  world: WorldState;
  days: ScenarioDayPlan[];
  scenes: CreatorScenarioScene[];
  actions: PlayerAction[];
  endings: CreatorScenarioEnding[];
};

const sceneKinds = new Set<CreatorScenarioSceneKind>(["combat", "social", "exploration"]);
const phases = new Set<TimePhase>(["morning", "afternoon", "evening", "night"]);

const assertNonEmptyString = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Creator scenario requires non-empty string at ${path}`);
  }
  return value;
};

const assertArray = <T>(value: unknown, path: string): T[] => {
  if (!Array.isArray(value)) throw new Error(`Creator scenario requires array at ${path}`);
  return value as T[];
};

const assertRef = (knownIds: Set<string>, id: string, path: string) => {
  if (!knownIds.has(id)) throw new Error(`Creator scenario reference not found at ${path}: ${id}`);
};

const parseScene = (value: unknown, index: number): CreatorScenarioScene => {
  const input = value as Record<string, unknown>;
  const kind = input.kind;
  if (!sceneKinds.has(kind as CreatorScenarioSceneKind)) {
    throw new Error(`Creator scenario invalid scene kind at scenes.${index}.kind: ${String(kind)}`);
  }
  const day = Number(input.day);
  if (!Number.isInteger(day) || day < 1) {
    throw new Error(`Creator scenario invalid day at scenes.${index}.day`);
  }
  return {
    id: assertNonEmptyString(input.id, `scenes.${index}.id`),
    name: assertNonEmptyString(input.name, `scenes.${index}.name`),
    kind: kind as CreatorScenarioSceneKind,
    day,
    locationId: assertNonEmptyString(input.locationId, `scenes.${index}.locationId`),
    npcIds: assertArray<string>(input.npcIds, `scenes.${index}.npcIds`).map((id, npcIndex) =>
      assertNonEmptyString(id, `scenes.${index}.npcIds.${npcIndex}`)
    ),
    crisisClockIds: assertArray<string>(input.crisisClockIds, `scenes.${index}.crisisClockIds`).map((id, clockIndex) =>
      assertNonEmptyString(id, `scenes.${index}.crisisClockIds.${clockIndex}`)
    ),
    nonCombatSolutions: assertArray<string>(input.nonCombatSolutions, `scenes.${index}.nonCombatSolutions`).map((solution, solutionIndex) =>
      assertNonEmptyString(solution, `scenes.${index}.nonCombatSolutions.${solutionIndex}`)
    )
  };
};

const parseDay = (value: unknown, index: number): ScenarioDayPlan => {
  const input = value as Record<string, unknown>;
  const day = Number(input.day);
  if (!Number.isInteger(day) || day < 1) {
    throw new Error(`Creator scenario invalid day at days.${index}.day`);
  }
  return {
    day,
    mainEvent: assertNonEmptyString(input.mainEvent, `days.${index}.mainEvent`),
    defaultLocationId: assertNonEmptyString(input.defaultLocationId, `days.${index}.defaultLocationId`),
    sceneIds: assertArray<string>(input.sceneIds, `days.${index}.sceneIds`).map((id, sceneIndex) =>
      assertNonEmptyString(id, `days.${index}.sceneIds.${sceneIndex}`)
    ),
    clockPressure: assertArray<string>(input.clockPressure, `days.${index}.clockPressure`).map((id, clockIndex) =>
      assertNonEmptyString(id, `days.${index}.clockPressure.${clockIndex}`)
    )
  };
};

const parseEnding = (value: unknown, index: number): CreatorScenarioEnding => {
  const input = value as Record<string, unknown>;
  const summary = EndingSummarySchema.parse({
    id: input.id,
    title: input.title,
    summary: input.summary
  });
  const whenInput = (input.when ?? {}) as Record<string, unknown>;
  const condition: CreatorEndingCondition = {};
  if (whenInput.dayAtLeast !== undefined) {
    const dayAtLeast = Number(whenInput.dayAtLeast);
    if (!Number.isInteger(dayAtLeast) || dayAtLeast < 1) throw new Error(`Creator scenario invalid dayAtLeast at endings.${index}.when`);
    condition.dayAtLeast = dayAtLeast;
  }
  if (whenInput.phase !== undefined) {
    if (!phases.has(whenInput.phase as TimePhase)) throw new Error(`Creator scenario invalid phase at endings.${index}.when.phase`);
    condition.phase = whenInput.phase as TimePhase;
  }
  if (whenInput.clockAtMax !== undefined) {
    condition.clockAtMax = assertNonEmptyString(whenInput.clockAtMax, `endings.${index}.when.clockAtMax`);
  }
  if (whenInput.momentumAtLeast !== undefined) {
    const momentumAtLeast = Number(whenInput.momentumAtLeast);
    if (!Number.isInteger(momentumAtLeast) || momentumAtLeast < 0) {
      throw new Error(`Creator scenario invalid momentumAtLeast at endings.${index}.when`);
    }
    condition.momentumAtLeast = momentumAtLeast;
  }
  return { ...summary, when: condition };
};

const parseDefinition = (value: unknown): CreatorScenarioDefinition => {
  const input = value as Record<string, unknown>;
  const definition = {
    id: assertNonEmptyString(input.id, "id"),
    title: assertNonEmptyString(input.title, "title"),
    world: WorldStateSchema.parse(input.world),
    days: assertArray<unknown>(input.days, "days").map(parseDay),
    scenes: assertArray<unknown>(input.scenes, "scenes").map(parseScene),
    actions: assertArray<unknown>(input.actions, "actions").map((action) => PlayerActionSchema.parse(action)),
    endings: assertArray<unknown>(input.endings, "endings").map(parseEnding)
  };
  if (definition.days.length === 0) throw new Error("Creator scenario requires at least one day plan");
  if (definition.scenes.length === 0) throw new Error("Creator scenario requires at least one scene");
  if (definition.actions.length === 0) throw new Error("Creator scenario requires at least one action");
  if (definition.endings.length === 0) throw new Error("Creator scenario requires at least one ending");
  return definition;
};

const validateWorldReferences = (definition: CreatorScenarioDefinition) => {
  const { world } = definition;
  const locationIds = new Set(Object.keys(world.locations));
  const characterIds = new Set(Object.keys(world.characters));
  const factionIds = new Set(Object.keys(world.factions));
  const clockIds = new Set(Object.keys(world.clocks));
  const sceneIds = new Set(definition.scenes.map((scene) => scene.id));

  assertRef(locationIds, world.currentLocationId, "world.currentLocationId");

  for (const character of Object.values(world.characters)) {
    if (character.factionId) assertRef(factionIds, character.factionId, `characters.${character.id}.factionId`);
  }
  for (const faction of Object.values(world.factions)) {
    assertRef(locationIds, faction.baseId, `factions.${faction.id}.baseId`);
    for (const clockId of faction.clockIds) assertRef(clockIds, clockId, `factions.${faction.id}.clockIds`);
  }
  for (const quest of Object.values(world.quests)) {
    for (const locationId of quest.locationIds) assertRef(locationIds, locationId, `quests.${quest.id}.locationIds`);
    for (const npcId of quest.npcIds) assertRef(characterIds, npcId, `quests.${quest.id}.npcIds`);
    for (const factionId of quest.factionIds) assertRef(factionIds, factionId, `quests.${quest.id}.factionIds`);
  }
  for (const relationshipId of Object.keys(world.relationships)) {
    const [, targetId] = relationshipId.split(":");
    if (targetId) assertRef(characterIds, targetId, `relationships.${relationshipId}`);
  }

  for (const day of definition.days) {
    assertRef(locationIds, day.defaultLocationId, `days.${day.day}.defaultLocationId`);
    for (const sceneId of day.sceneIds) assertRef(sceneIds, sceneId, `days.${day.day}.sceneIds`);
    for (const clockId of day.clockPressure) assertRef(clockIds, clockId, `days.${day.day}.clockPressure`);
  }
  for (const scene of definition.scenes) {
    assertRef(locationIds, scene.locationId, `scenes.${scene.id}.locationId`);
    for (const npcId of scene.npcIds) assertRef(characterIds, npcId, `scenes.${scene.id}.npcIds`);
    for (const clockId of scene.crisisClockIds) assertRef(clockIds, clockId, `scenes.${scene.id}.crisisClockIds`);
  }
  const targetIds = new Set([...characterIds, ...locationIds, ...factionIds, ...clockIds, ...sceneIds]);
  for (const action of definition.actions) {
    if (action.targetId) assertRef(targetIds, action.targetId, `actions.${action.label}.targetId`);
  }
  for (const ending of definition.endings) {
    if (ending.when.clockAtMax) assertRef(clockIds, ending.when.clockAtMax, `endings.${ending.id}.when.clockAtMax`);
  }
};

const endingMatches = (state: WorldState, ending: CreatorScenarioEnding): boolean => {
  const { when } = ending;
  if (when.dayAtLeast !== undefined && state.time.day < when.dayAtLeast) return false;
  if (when.phase !== undefined && state.time.phase !== when.phase) return false;
  if (when.clockAtMax !== undefined) {
    const clock = state.clocks[when.clockAtMax];
    if (!clock || clock.progress < clock.max) return false;
  }
  if (when.momentumAtLeast !== undefined && state.player.momentum < when.momentumAtLeast) return false;
  return true;
};

export const importCreatorScenarioPackage = (value: unknown): ScenarioPackage => {
  const definition = parseDefinition(value);
  validateWorldReferences(definition);
  const days = structuredClone(definition.days);
  const actions = structuredClone(definition.actions);
  const endings = structuredClone(definition.endings);
  const world = structuredClone(definition.world);

  return {
    id: definition.id,
    title: definition.title,
    counts: {
      combat: definition.scenes.filter((scene) => scene.kind === "combat").length,
      social: definition.scenes.filter((scene) => scene.kind === "social").length,
      endings: definition.endings.length
    },
    createWorld: () => structuredClone(world) as WorldState,
    getActions: () => structuredClone(actions) as PlayerAction[],
    getDayPlan: (day: number) => structuredClone(days.find((plan) => plan.day === day)),
    evaluateEnding: (state: WorldState) => {
      const found = endings.find((ending) => endingMatches(state, ending));
      if (!found) return undefined;
      const { when: _when, ...summary } = found;
      return structuredClone(summary);
    }
  };
};
