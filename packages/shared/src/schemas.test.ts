import { describe, expect, it } from "vitest";
import { PlayerActionSchema } from "./schemas.js";

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
