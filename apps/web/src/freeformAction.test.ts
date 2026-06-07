import { describe, expect, it } from "vitest";
import { buildFreeformPlayerAction } from "./freeformAction.js";

describe("freeform action builder", () => {
  it("turns player text into a custom PlayerAction", () => {
    expect(buildFreeformPlayerAction("  伪装成药材车绕开封锁，把病人送到旧哨站。  ")).toMatchObject({
      actionType: "custom",
      label: "自由行动：伪装成药材车绕开封锁，把病人送到旧哨站。",
      description: "伪装成药材车绕开封锁，把病人送到旧哨站。",
      leverage: ["freeform"],
      riskLevel: "medium"
    });
  });

  it("rejects blank freeform text before a turn can be submitted", () => {
    expect(buildFreeformPlayerAction("   \n\t ")).toBeUndefined();
  });
});
