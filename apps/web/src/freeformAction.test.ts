import { describe, expect, it } from "vitest";
import {
  buildFreeformActionPreview,
  buildFreeformPlayerAction,
} from "./freeformAction.js";

describe("freeform action builder", () => {
  it("turns player text into a custom PlayerAction", () => {
    expect(buildFreeformPlayerAction("  伪装成药材车绕开封锁，把病人送到旧哨站。  ")).toMatchObject({
      actionType: "custom",
      description: "伪装成药材车绕开封锁，把病人送到旧哨站。",
      targetId: "old_outpost",
      leverage: expect.arrayContaining(["freeform", "freeform:target:old_outpost"]),
      riskLevel: "high"
    });
  });

  it("rejects blank freeform text before a turn can be submitted", () => {
    expect(buildFreeformPlayerAction("   \n\t ")).toBeUndefined();
  });

  it("infers intent, risk, and target hints from open-ended text", () => {
    const action = buildFreeformPlayerAction(
      "Escort patients through the blockade to the old outpost.",
    );

    expect(action).toMatchObject({
      actionType: "custom",
      targetId: "old_outpost",
      riskLevel: "high",
      leverage: expect.arrayContaining([
        "freeform",
        "freeform:intent:protect",
        "freeform:target:old_outpost",
        "freeform:risk:high",
      ]),
    });
    expect(buildFreeformActionPreview(action!)).toEqual([
      "Intent: Protect",
      "Risk: High",
      "Target: Old outpost",
    ]);
  });
});
