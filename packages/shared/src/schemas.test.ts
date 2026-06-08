import { describe, expect, it } from "vitest";
import { LlmConfigSchema, PlayerActionSchema } from "./schemas.js";

describe("LLM config schema", () => {
  it("defaults to automatic JSON mode compatibility and accepts explicit modes", () => {
    expect(
      LlmConfigSchema.parse({
        baseUrl: "https://api.deepseek.com/",
        model: "deepseek-v4-pro",
      }),
    ).toMatchObject({
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-pro",
      jsonMode: "auto",
    });

    expect(
      LlmConfigSchema.parse({
        baseUrl: "http://localhost:11434/v1",
        model: "local-story-model",
        jsonMode: "off",
      }).jsonMode,
    ).toBe("off");
  });
});

describe("player action schema", () => {
  it("accepts freeform custom actions as first-class player intent", () => {
    expect(
      PlayerActionSchema.parse({
        actionType: "custom",
        label: "自由行动：伪装成药材车",
        description: "伪装成药材车绕开封锁，把病人送到旧哨站。",
        leverage: ["freeform"],
        riskLevel: "medium"
      })
    ).toMatchObject({
      actionType: "custom",
      description: "伪装成药材车绕开封锁，把病人送到旧哨站。",
      leverage: ["freeform"]
    });
  });
});
