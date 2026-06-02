import type { StorageLike } from "./llmSettings.js";

export const CREATOR_SCENARIO_STORAGE_KEY = "agentic-turnscape.creatorScenarios.v1";

export type ScenarioImportParseResult =
  | { ok: true; definition: Record<string, unknown> }
  | { ok: false; error: string };

export type SavedCreatorScenarioDefinition = {
  id: string;
  definition: Record<string, unknown>;
};

export type SavedCreatorScenarioSummary = {
  id: string;
  title: string;
};

export type CreatorScenarioRestoreResult = {
  restored: string[];
  skipped: string[];
  failed: Array<{ id: string; message: string }>;
};

export type CreatorScenarioRemovalResult =
  | { ok: true; runtimeAlreadyMissing: boolean; saved: SavedCreatorScenarioDefinition[] }
  | { ok: false; error: string };

const getBrowserStorage = (): StorageLike | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
};

const isSavedCreatorScenarioDefinition = (value: unknown): value is SavedCreatorScenarioDefinition => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { id?: unknown; definition?: unknown };
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    !!candidate.definition &&
    typeof candidate.definition === "object" &&
    !Array.isArray(candidate.definition)
  );
};

export const parseCreatorScenarioJson = (input: string): ScenarioImportParseResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a creator scenario JSON object before importing." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message : "Invalid JSON";
    return { ok: false, error: `Invalid scenario JSON: ${detail}` };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Creator scenario import must be a JSON object." };
  }

  return { ok: true, definition: parsed as Record<string, unknown> };
};

export const loadSavedCreatorScenarioDefinitions = (
  storage: StorageLike | undefined = getBrowserStorage()
): SavedCreatorScenarioDefinition[] => {
  if (!storage) return [];
  const raw = storage.getItem(CREATOR_SCENARIO_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedCreatorScenarioDefinition) : [];
  } catch {
    return [];
  }
};

export const saveCreatorScenarioDefinition = (
  id: string,
  definition: Record<string, unknown>,
  storage: StorageLike | undefined = getBrowserStorage()
): SavedCreatorScenarioDefinition[] => {
  const normalizedId = id.trim();
  if (!normalizedId || !storage) return loadSavedCreatorScenarioDefinitions(storage);
  const saved = loadSavedCreatorScenarioDefinitions(storage);
  const next = [
    ...saved.filter((scenario) => scenario.id !== normalizedId),
    { id: normalizedId, definition }
  ];
  storage.setItem(CREATOR_SCENARIO_STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const deleteCreatorScenarioDefinition = (
  id: string,
  storage: StorageLike | undefined = getBrowserStorage()
): SavedCreatorScenarioDefinition[] => {
  if (!storage) return [];
  const normalizedId = id.trim();
  const next = loadSavedCreatorScenarioDefinitions(storage).filter((scenario) => scenario.id !== normalizedId);
  if (next.length > 0) {
    storage.setItem(CREATOR_SCENARIO_STORAGE_KEY, JSON.stringify(next));
  } else {
    storage.removeItem(CREATOR_SCENARIO_STORAGE_KEY);
  }
  return next;
};

export const listSavedCreatorScenarioSummaries = (
  storage: StorageLike | undefined = getBrowserStorage()
): SavedCreatorScenarioSummary[] =>
  loadSavedCreatorScenarioDefinitions(storage).map((scenario) => ({
    id: scenario.id,
    title: typeof scenario.definition.title === "string" && scenario.definition.title.trim()
      ? scenario.definition.title.trim()
      : scenario.id
  }));

export const getSavedCreatorScenarioDefinition = (
  id: string,
  storage: StorageLike | undefined = getBrowserStorage()
): Record<string, unknown> | undefined =>
  loadSavedCreatorScenarioDefinitions(storage).find((scenario) => scenario.id === id)?.definition;

export const formatCreatorScenarioDefinition = (definition: Record<string, unknown>): string =>
  JSON.stringify(definition, null, 2);

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const isDuplicateScenarioError = (error: unknown) => errorMessage(error).includes("duplicate_scenario");
const isRuntimeScenarioMissingError = (error: unknown) => errorMessage(error).includes("runtime_scenario_not_found");

export const removeCreatorScenarioPackage = async (
  id: string,
  deleteRuntimeScenario: (id: string) => Promise<unknown>,
  storage: StorageLike | undefined = getBrowserStorage()
): Promise<CreatorScenarioRemovalResult> => {
  let runtimeAlreadyMissing = false;
  try {
    await deleteRuntimeScenario(id);
  } catch (caught) {
    if (isRuntimeScenarioMissingError(caught)) {
      runtimeAlreadyMissing = true;
    } else {
      return { ok: false, error: errorMessage(caught) };
    }
  }
  return {
    ok: true,
    runtimeAlreadyMissing,
    saved: deleteCreatorScenarioDefinition(id, storage)
  };
};

export const restoreSavedCreatorScenarioDefinitions = async (
  importScenario: (definition: Record<string, unknown>) => Promise<unknown>,
  storage: StorageLike | undefined = getBrowserStorage()
): Promise<CreatorScenarioRestoreResult> => {
  const result: CreatorScenarioRestoreResult = { restored: [], skipped: [], failed: [] };
  for (const saved of loadSavedCreatorScenarioDefinitions(storage)) {
    try {
      await importScenario(saved.definition);
      result.restored.push(saved.id);
    } catch (caught) {
      if (isDuplicateScenarioError(caught)) {
        result.skipped.push(saved.id);
      } else {
        result.failed.push({ id: saved.id, message: errorMessage(caught) });
      }
    }
  }
  return result;
};
