import {
  DEFAULT_LLM_CONFIG,
  LlmConfigSchema,
  type LlmConfig,
  type LlmDiagnosticsSummary as SharedLlmDiagnosticsSummary,
  type LlmJsonMode,
  type LlmUsageSummary as SharedLlmUsageSummary,
} from "@agentic-turnscape/shared";
import type { LlmConnectionTestPayload } from "./api.js";

export const LLM_SETTINGS_STORAGE_KEY = "agentic-turnscape.llmSettings.v1";
export const LLM_SETTINGS_STORAGE_VERSION = 2;
export const CURRENT_LLM_SETTINGS_STORAGE_LABEL = `本地格式 V${LLM_SETTINGS_STORAGE_VERSION}`;
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
  jsonMode: LlmJsonMode;
  jsonRetries: number;
};
export type LlmRuntimeSummary = {
  providerLabel: string;
  endpointLabel: string;
  modelLabel: string;
  secretLabel: string;
  budgetLabel: string;
  jsonModeLabel: string;
  retryBudgetLabel: string;
  savedLabel: string;
  storageLabel: string;
};
export type LlmSettingsLoadResult = {
  settings: LlmConfig;
  storageLabel: string;
  migratedFromVersion?: number;
};
export type LlmUsageSummary = {
  requestLabel: string;
  promptLabel: string;
  completionLabel: string;
  totalLabel: string;
  pressure: "steady" | "warning" | "over";
  pressureLabel: string;
  pressureDetailLabel: string;
};
export type LlmDiagnosticsSummary = {
  health: "stable" | "retrying" | "fallback";
  attemptsLabel: string;
  retriesLabel: string;
  fallbackLabel: string;
  textFallbackLabel: string;
  healthLabel: string;
};

export const llmJsonModeOptions: Array<{
  value: LlmJsonMode;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "自动兼容",
    description: "优先请求 JSON mode，不支持时自动改用普通 JSON 提示",
  },
  {
    value: "strict",
    label: "严格 JSON",
    description: "始终发送 OpenAI response_format 参数",
  },
  {
    value: "off",
    label: "关闭格式参数",
    description: "不发送 response_format，适合部分本地兼容服务",
  },
];

const defaultLlmProviderPreset: LlmProviderPreset = {
  id: "openai",
  label: "OpenAI",
  description: "OpenAI compatible API",
  baseUrl: DEFAULT_LLM_CONFIG.baseUrl,
  model: DEFAULT_LLM_CONFIG.model,
  timeoutMs: DEFAULT_LLM_CONFIG.timeoutMs,
  maxTokens: DEFAULT_LLM_CONFIG.maxTokens,
  jsonMode: DEFAULT_LLM_CONFIG.jsonMode,
  jsonRetries: DEFAULT_LLM_CONFIG.jsonRetries,
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
    jsonMode: "auto",
    jsonRetries: DEFAULT_LLM_CONFIG.jsonRetries,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "DeepSeek OpenAI 兼容接口",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-pro",
    timeoutMs: 30000,
    maxTokens: 4096,
    jsonMode: "auto",
    jsonRetries: 1,
  },
  {
    id: "local",
    label: "本地兼容",
    description: "Ollama、LM Studio 等本地 OpenAI 兼容接口",
    baseUrl: "http://localhost:11434/v1",
    model: "local-story-model",
    timeoutMs: 15000,
    maxTokens: 4096,
    jsonMode: "off",
    jsonRetries: 0,
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
    jsonMode: preset.jsonMode,
    jsonRetries: preset.jsonRetries,
  });
};

export const detectLlmProviderPresetId = (
  settings: LlmConfig,
): LlmProviderPresetId | "" => {
  const sanitized = sanitizeLlmSettings(settings);
  const preset = llmProviderPresets.find(
    (candidate) =>
      candidate.baseUrl === sanitized.baseUrl &&
      candidate.model === sanitized.model &&
      candidate.timeoutMs === sanitized.timeoutMs &&
      candidate.maxTokens === sanitized.maxTokens &&
      candidate.jsonMode === sanitized.jsonMode,
  );
  return preset?.id ?? "";
};

const localEndpointPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i;
const llmJsonModeLabelOf = (mode: LlmJsonMode): string =>
  llmJsonModeOptions.find((option) => option.value === mode)?.label ??
  llmJsonModeOptions[0]?.label ??
  mode;
const llmRetryBudgetLabelOf = (retries: number): string =>
  retries <= 0 ? "不重试" : `最多 ${retries} 次`;

export const buildLlmRuntimeSummary = (
  settings: LlmConfig,
  saved: boolean,
  storageLabel = CURRENT_LLM_SETTINGS_STORAGE_LABEL,
): LlmRuntimeSummary => {
  const sanitized = sanitizeLlmSettings(settings);
  const presetId = detectLlmProviderPresetId(sanitized);
  const preset = llmProviderPresets.find((candidate) => candidate.id === presetId);
  const providerLabel =
    preset?.label ??
    (localEndpointPattern.test(sanitized.baseUrl) ? "本地兼容" : "自定义配置");

  return {
    providerLabel,
    endpointLabel: sanitized.baseUrl,
    modelLabel: sanitized.model,
    secretLabel: sanitized.apiKey ? "密钥已在本地配置" : "未配置密钥",
    budgetLabel: `${Math.max(1, Math.round(sanitized.timeoutMs / 1000))} 秒 / ${sanitized.maxTokens} Token`,
    jsonModeLabel: llmJsonModeLabelOf(sanitized.jsonMode),
    retryBudgetLabel: llmRetryBudgetLabelOf(sanitized.jsonRetries),
    savedLabel: saved ? "已保存" : "有未保存更改",
    storageLabel,
  };
};

export const buildLlmUsageSummary = (
  usage: SharedLlmUsageSummary | undefined,
  settings: LlmConfig,
): LlmUsageSummary | undefined => {
  if (!usage || usage.requests <= 0) return undefined;
  const sanitized = sanitizeLlmSettings(settings);
  const usedPercent = Math.max(
    0,
    Math.round((usage.totalTokens / sanitized.maxTokens) * 100),
  );
  const pressure =
    usage.totalTokens >= sanitized.maxTokens
      ? "over"
      : usage.totalTokens >= Math.ceil(sanitized.maxTokens * 0.8)
        ? "warning"
        : "steady";
  const pressureLabel =
    pressure === "over"
      ? "已超预算"
      : pressure === "warning"
        ? "接近预算"
        : "预算正常";
  return {
    requestLabel: `${usage.requests} 次`,
    promptLabel: `${usage.promptTokens} 输入`,
    completionLabel: `${usage.completionTokens} 输出`,
    totalLabel: `${usage.totalTokens} / ${sanitized.maxTokens} Token`,
    pressure,
    pressureLabel,
    pressureDetailLabel: `已用约 ${usedPercent}%`,
  };
};

export const buildLlmDiagnosticsSummary = (
  diagnostics: SharedLlmDiagnosticsSummary | undefined,
): LlmDiagnosticsSummary | undefined => {
  if (
    !diagnostics ||
    diagnostics.jsonAttempts +
      diagnostics.jsonRetries +
      diagnostics.fallbacks +
      diagnostics.textFallbacks <=
      0
  ) {
    return undefined;
  }
  const health =
    diagnostics.fallbacks > 0
      ? "fallback"
      : diagnostics.jsonRetries > 0
        ? "retrying"
        : "stable";
  const healthLabel =
    health === "fallback"
      ? "已启用兜底"
      : health === "retrying"
        ? "已重试恢复"
        : "结构稳定";
  return {
    health,
    attemptsLabel: `${diagnostics.jsonAttempts} 次`,
    retriesLabel: `${diagnostics.jsonRetries} 次`,
    fallbackLabel: `${diagnostics.fallbacks} 次`,
    textFallbackLabel: `${diagnostics.textFallbacks} 次叙事兜底`,
    healthLabel,
  };
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const loadLlmSettingsWithMetadata = (
  storage: StorageLike | undefined = getBrowserStorage(),
): LlmSettingsLoadResult => {
  if (!storage) {
    return {
      settings: defaultLlmSettings(),
      storageLabel: "未保存",
    };
  }
  const raw = storage.getItem(LLM_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return {
      settings: defaultLlmSettings(),
      storageLabel: "未保存",
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      isPlainRecord(parsed) &&
      parsed.version === LLM_SETTINGS_STORAGE_VERSION
    ) {
      return {
        settings: sanitizeLlmSettings(parsed.settings),
        storageLabel: CURRENT_LLM_SETTINGS_STORAGE_LABEL,
      };
    }

    const legacy = LlmConfigSchema.safeParse(parsed);
    if (legacy.success) {
      return {
        settings: legacy.data,
        storageLabel: "旧版 V1，可保存升级",
        migratedFromVersion: 1,
      };
    }

    return {
      settings: defaultLlmSettings(),
      storageLabel: "保存格式不兼容，已使用默认值",
    };
  } catch {
    return {
      settings: defaultLlmSettings(),
      storageLabel: "保存格式损坏，已使用默认值",
    };
  }
};

export const loadLlmSettings = (
  storage: StorageLike | undefined = getBrowserStorage(),
): LlmConfig => loadLlmSettingsWithMetadata(storage).settings;

export const saveLlmSettings = (settings: LlmConfig, storage: StorageLike | undefined = getBrowserStorage()): LlmConfig => {
  const sanitized = sanitizeLlmSettings(settings);
  storage?.setItem(
    LLM_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      version: LLM_SETTINGS_STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      settings: sanitized,
    }),
  );
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
