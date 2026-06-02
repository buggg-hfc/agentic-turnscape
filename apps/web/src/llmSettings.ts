import { DEFAULT_LLM_CONFIG, LlmConfigSchema, type LlmConfig } from "@agentic-turnscape/shared";

export const LLM_SETTINGS_STORAGE_KEY = "agentic-turnscape.llmSettings.v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const defaultLlmSettings = (): LlmConfig => ({ ...DEFAULT_LLM_CONFIG });

const getBrowserStorage = (): StorageLike | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
};

export const sanitizeLlmSettings = (settings: unknown): LlmConfig => {
  const parsed = LlmConfigSchema.safeParse(settings);
  return parsed.success ? parsed.data : defaultLlmSettings();
};

export const loadLlmSettings = (storage: StorageLike | undefined = getBrowserStorage()): LlmConfig => {
  if (!storage) return defaultLlmSettings();
  const raw = storage.getItem(LLM_SETTINGS_STORAGE_KEY);
  if (!raw) return defaultLlmSettings();

  try {
    return sanitizeLlmSettings(JSON.parse(raw));
  } catch {
    return defaultLlmSettings();
  }
};

export const saveLlmSettings = (settings: LlmConfig, storage: StorageLike | undefined = getBrowserStorage()): LlmConfig => {
  const sanitized = sanitizeLlmSettings(settings);
  storage?.setItem(LLM_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
};

export const clearLlmSettings = (storage: StorageLike | undefined = getBrowserStorage()): LlmConfig => {
  storage?.removeItem(LLM_SETTINGS_STORAGE_KEY);
  return defaultLlmSettings();
};
