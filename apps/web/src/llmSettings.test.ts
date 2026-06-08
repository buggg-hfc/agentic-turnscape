import { describe, expect, it } from "vitest";
import {
  buildLlmDiagnosticsSummary,
  buildLlmUsageSummary,
  applyLlmProviderPreset,
  buildLlmRuntimeSummary,
  clearLlmSettings,
  detectLlmProviderPresetId,
  llmProviderPresets,
  loadLlmSettings,
  llmConnectionErrorStatus,
  llmConnectionSuccessStatus,
  llmJsonModeOptions,
  redactLlmSecrets,
  saveLlmSettings,
  type StorageLike,
} from "./llmSettings.js";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("LLM settings persistence", () => {
  it("applies provider presets without overwriting local API keys", () => {
    expect(llmProviderPresets.map((preset) => preset.id)).toEqual([
      "openai",
      "deepseek",
      "local",
    ]);

    expect(
      applyLlmProviderPreset(
        {
          baseUrl: "https://old.example.test/v1",
          model: "old-model",
          apiKey: "keep-this-local-key",
          timeoutMs: 9000,
          maxTokens: 777,
          jsonMode: "off",
          jsonRetries: 2,
        },
        "deepseek",
      ),
    ).toEqual({
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-pro",
      apiKey: "keep-this-local-key",
      timeoutMs: 30000,
      maxTokens: 4096,
      jsonMode: "auto",
      jsonRetries: 1,
    });

    expect(
      applyLlmProviderPreset(
        {
          baseUrl: "https://old.example.test/v1",
          model: "old-model",
          apiKey: "keep-this-local-key",
          timeoutMs: 9000,
          maxTokens: 777,
          jsonMode: "auto",
          jsonRetries: 2,
        },
        "local",
      ),
    ).toMatchObject({
      jsonMode: "off",
      jsonRetries: 0,
    });
    expect(llmJsonModeOptions.map((option) => option.label)).toEqual([
      "自动兼容",
      "严格 JSON",
      "关闭格式参数",
    ]);
  });

  it("detects the selected provider preset from non-secret settings", () => {
    expect(
      detectLlmProviderPresetId({
        baseUrl: "https://api.deepseek.com/",
        model: "deepseek-v4-pro",
        apiKey: "browser-only-secret",
        timeoutMs: 30000,
        maxTokens: 4096,
        jsonMode: "auto",
        jsonRetries: 1,
      }),
    ).toBe("deepseek");

    expect(
      detectLlmProviderPresetId({
        baseUrl: "https://api.deepseek.com",
        model: "custom-campaign-model",
        apiKey: "browser-only-secret",
        timeoutMs: 30000,
        maxTokens: 4096,
        jsonMode: "auto",
        jsonRetries: 1,
      }),
    ).toBe("");
  });

  it("saves and loads a sanitized local LLM configuration", () => {
    const storage = new MemoryStorage();

    saveLlmSettings(
      {
        baseUrl: " https://llm.example.test/v1/ ",
        model: " story-agent ",
        apiKey: " secret-key ",
        timeoutMs: 25000,
        maxTokens: 2048,
        jsonMode: "strict",
        jsonRetries: 3,
      },
      storage,
    );

    expect(loadLlmSettings(storage)).toEqual({
      baseUrl: "https://llm.example.test/v1",
      model: "story-agent",
      apiKey: "secret-key",
      timeoutMs: 25000,
      maxTokens: 2048,
      jsonMode: "strict",
      jsonRetries: 3,
    });
  });

  it("returns defaults for missing or invalid local data", () => {
    const storage = new MemoryStorage();
    storage.setItem("agentic-turnscape.llmSettings.v1", "{bad json");

    expect(loadLlmSettings(storage)).toEqual({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "",
      timeoutMs: 15000,
      maxTokens: 1024,
      jsonMode: "auto",
      jsonRetries: 1,
    });
  });

  it("clears saved local configuration", () => {
    const storage = new MemoryStorage();
    saveLlmSettings(
      {
        baseUrl: "http://localhost:11434/v1",
        model: "local",
        apiKey: "x",
        timeoutMs: 12000,
        maxTokens: 4096,
        jsonMode: "off",
        jsonRetries: 0,
      },
      storage,
    );
    clearLlmSettings(storage);

    expect(loadLlmSettings(storage).apiKey).toBe("");
    expect(loadLlmSettings(storage).baseUrl).toBe("https://api.openai.com/v1");
    expect(loadLlmSettings(storage).maxTokens).toBe(1024);
  });

  it("formats connection check status without exposing API key patterns", () => {
    expect(
      llmConnectionSuccessStatus({
        ok: true,
        baseUrl: "https://llm.example.test/v1",
        model: "story-model",
        latencyMs: 42.4,
        message: "ready",
      }),
    ).toEqual({
      kind: "success",
      message: "LLM 连接通过：story-model（42 ms）",
    });

    const secret = ["sk", "testSecret123"].join("-");
    const status = llmConnectionErrorStatus(
      new Error(`upstream rejected ${secret}`),
    );
    expect(status.kind).toBe("error");
    expect(status.message).toContain("LLM 连接失败");
    expect(status.message).toContain("[API_KEY_REDACTED]");
    expect(status.message).not.toContain(secret);
    expect(redactLlmSecrets("safe")).toBe("safe");
  });

  it("builds a non-secret runtime summary for the in-game settings panel", () => {
    const secret = ["sk", "deepseekLocalOnly123"].join("-");

    expect(
      buildLlmRuntimeSummary(
        {
          baseUrl: "https://api.deepseek.com/",
          model: "deepseek-v4-pro",
          apiKey: secret,
          timeoutMs: 30000,
          maxTokens: 4096,
          jsonMode: "auto",
          jsonRetries: 2,
        },
        true,
      ),
    ).toEqual({
      providerLabel: "DeepSeek",
      endpointLabel: "https://api.deepseek.com",
      modelLabel: "deepseek-v4-pro",
      secretLabel: "密钥已在本地配置",
      budgetLabel: "30 秒 / 4096 Token",
      jsonModeLabel: "自动兼容",
      retryBudgetLabel: "最多 2 次",
      savedLabel: "已保存",
    });

    const customSummary = buildLlmRuntimeSummary(
      {
        baseUrl: "http://localhost:11434/v1",
        model: "local-story-model",
        apiKey: "",
        timeoutMs: 15000,
        maxTokens: 2048,
        jsonMode: "off",
        jsonRetries: 0,
      },
      false,
    );

    expect(customSummary.providerLabel).toBe("本地兼容");
    expect(customSummary.secretLabel).toBe("未配置密钥");
    expect(customSummary.jsonModeLabel).toBe("关闭格式参数");
    expect(customSummary.retryBudgetLabel).toBe("不重试");
    expect(customSummary.savedLabel).toBe("有未保存更改");
    expect(JSON.stringify(customSummary)).not.toContain(secret);
  });

  it("builds a Chinese LLM usage summary for the last completed turn", () => {
    const summary = buildLlmUsageSummary(
      {
        requests: 6,
        promptTokens: 78,
        completionTokens: 39,
        totalTokens: 117,
      },
      {
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-v4-pro",
        apiKey: "sk-localSecretOnly123",
        timeoutMs: 30000,
        maxTokens: 4096,
        jsonMode: "auto",
        jsonRetries: 1,
      },
    );

    expect(summary).toEqual({
      requestLabel: "6 次",
      promptLabel: "78 输入",
      completionLabel: "39 输出",
      totalLabel: "117 / 4096 Token",
      pressure: "steady",
      pressureLabel: "预算正常",
      pressureDetailLabel: "已用约 3%",
    });
    expect(JSON.stringify(summary)).not.toContain("sk-localSecretOnly123");
  });

  it("classifies LLM token budget pressure for operator visibility", () => {
    expect(
      buildLlmUsageSummary(
        {
          requests: 4,
          promptTokens: 3000,
          completionTokens: 500,
          totalTokens: 3500,
        },
        {
          baseUrl: "https://api.deepseek.com",
          model: "deepseek-v4-pro",
          apiKey: "",
          timeoutMs: 30000,
          maxTokens: 4096,
          jsonMode: "auto",
          jsonRetries: 1,
        },
      ),
    ).toMatchObject({
      pressure: "warning",
      pressureLabel: "接近预算",
      pressureDetailLabel: "已用约 85%",
    });

    expect(
      buildLlmUsageSummary(
        {
          requests: 4,
          promptTokens: 3900,
          completionTokens: 400,
          totalTokens: 4300,
        },
        {
          baseUrl: "http://localhost:11434/v1",
          model: "local-story-model",
          apiKey: "",
          timeoutMs: 15000,
          maxTokens: 4096,
          jsonMode: "off",
          jsonRetries: 0,
        },
      ),
    ).toMatchObject({
      pressure: "over",
      pressureLabel: "已超预算",
      pressureDetailLabel: "已用约 105%",
    });
  });

  it("builds a Chinese LLM diagnostic summary without response content", () => {
    expect(
      buildLlmDiagnosticsSummary({
        jsonAttempts: 6,
        jsonRetries: 2,
        fallbacks: 1,
        textFallbacks: 1,
      }),
    ).toEqual({
      health: "fallback",
      attemptsLabel: "6 次",
      retriesLabel: "2 次",
      fallbackLabel: "1 次",
      textFallbackLabel: "1 次叙事兜底",
      healthLabel: "已启用兜底",
    });

    expect(
      buildLlmDiagnosticsSummary({
        jsonAttempts: 6,
        jsonRetries: 0,
        fallbacks: 0,
        textFallbacks: 0,
      }),
    ).toMatchObject({
      health: "stable",
      healthLabel: "结构稳定",
    });
  });
});
