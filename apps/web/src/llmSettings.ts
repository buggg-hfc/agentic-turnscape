import { DEFAULT_LLM_CONFIG, LlmConfigSchema, type LlmConfig } from "@agentic-turnscape/shared";
import type { LlmConnectionTestPayload } from "./api.js";

export const LLM_SETTINGS_STORAGE_KEY = "agentic-turnscape.llmSettings.v1";
const SECRET_PATTERN = /sk-[A-Za-z0-9]+/g;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type LlmConnectionStatus = {
  kind: "running" | "success" | "error";
  message: string;
};
export type LlmProviderPresetId = "openai" | "deepseek" | "local";
export type LlmProviderPreset = {
  id: LlmProviderPresetId;
  label: string;
  description: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
};

const defaultLlmProviderPreset: LlmProviderPreset = {
  id: "openai",
  label: "OpenAI",
  description: "OpenAI compatible API",
  baseUrl: DEFAULT_LLM_CONFIG.baseUrl,
  model: DEFAULT_LLM_CONFIG.model,
  timeoutMs: DEFAULT_LLM_CONFIG.timeoutMs,
  maxTokens: DEFAULT_LLM_CONFIG.maxTokens,
};

export const llmProviderPresets: LlmProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    description: "OpenAI 官方兼容接口",
    baseUrl: DEFAULT_LLM_CONFIG.baseUrl,
    model: DEFAULT_LLM_CONFIG.model,
    timeoutMs: DEFAULT_LLM_CONFIG.timeoutMs,
    maxTokens: DEFAULT_LLM_CONFIG.maxTokens,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "DeepSeek OpenAI 兼容接口",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-pro",
    timeoutMs: 30000,
    maxTokens: 4096,
  },
  {
    id: "local",
    label: "本地兼容",
    description: "Ollama、LM Studio 等本地 OpenAI 兼容接口",
    baseUrl: "http://localhost:11434/v1",
    model: "local-story-model",
    timeoutMs: 15000,
    maxTokens: 4096,
  },
];

export const defaultLlmSettings = (): LlmConfig => ({ ...DEFAULT_LLM_CONFIG });

const getBrowserStorage = (): StorageLike | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
};

export const sanitizeLlmSettings = (settings: unknown): LlmConfig => {
  const parsed = LlmConfigSchema.safeParse(settings);
  return parsed.success ? parsed.data : defaultLlmSettings();
};

export const applyLlmProviderPreset = (
  settings: LlmConfig,
  presetId: LlmProviderPresetId,
): LlmConfig => {
  const preset =
    llmProviderPresets.find((candidate) => candidate.id === presetId) ??
    defaultLlmProviderPreset;
  return sanitizeLlmSettings({
    ...settings,
    baseUrl: preset.baseUrl,
    model: preset.model,
    timeoutMs: preset.timeoutMs,
    maxTokens: preset.maxTokens,
  });
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

export const redactLlmSecrets = (value: string): string =>
  value.replace(SECRET_PATTERN, "[API_KEY_REDACTED]");

export const llmConnectionSuccessStatus = (
  result: LlmConnectionTestPayload,
): LlmConnectionStatus => ({
  kind: "success",
  message: `LLM 连接通过：${result.model}（${Math.max(
    0,
    Math.round(result.latencyMs),
  )} ms）`,
});

export const llmConnectionErrorStatus = (
  error: unknown,
): LlmConnectionStatus => ({
  kind: "error",
  message: `LLM 连接失败：${redactLlmSecrets(
    error instanceof Error ? error.message : "unknown error",
  )}`,
});
