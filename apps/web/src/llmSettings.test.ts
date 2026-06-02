import { describe, expect, it } from "vitest";
import {
  clearLlmSettings,
  loadLlmSettings,
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
  it("saves and loads a sanitized local LLM configuration", () => {
    const storage = new MemoryStorage();

    saveLlmSettings(
      {
        baseUrl: " https://llm.example.test/v1/ ",
        model: " story-agent ",
        apiKey: " secret-key ",
        timeoutMs: 25000,
        maxTokens: 2048,
      },
      storage,
    );

    expect(loadLlmSettings(storage)).toEqual({
      baseUrl: "https://llm.example.test/v1",
      model: "story-agent",
      apiKey: "secret-key",
      timeoutMs: 25000,
      maxTokens: 2048,
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
      },
      storage,
    );
    clearLlmSettings(storage);

    expect(loadLlmSettings(storage).apiKey).toBe("");
    expect(loadLlmSettings(storage).baseUrl).toBe("https://api.openai.com/v1");
    expect(loadLlmSettings(storage).maxTokens).toBe(1024);
  });
});
