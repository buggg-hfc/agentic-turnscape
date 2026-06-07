import { describe, expect, it } from "vitest";
import {
  buildFreeformActionPreview,
  buildFreeformComposerState,
  buildFreeformPlayerAction,
} from "./freeformAction.js";

describe("freeform action builder", () => {
  it("turns player text into a custom PlayerAction", () => {
    expect(
      buildFreeformPlayerAction("  伪装成药材车绕开封锁，把病人送到旧哨站。 "),
    ).toMatchObject({
      actionType: "custom",
      description: "伪装成药材车绕开封锁，把病人送到旧哨站。",
      targetId: "old_outpost",
      leverage: expect.arrayContaining([
        "freeform",
        "freeform:target:old_outpost",
      ]),
      riskLevel: "high",
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
      "意图：保护",
      "风险：高",
      "目标：旧哨站",
    ]);
  });

  it("keeps direct freeform submission available without preselecting the action", () => {
    const action = buildFreeformPlayerAction("护送病人穿过封锁线。");

    expect(buildFreeformComposerState(action, undefined, false)).toEqual({
      selected: false,
      selectDisabled: false,
      directSubmitDisabled: false,
      selectLabel: "加入本回合",
      directSubmitLabel: "直接执行",
    });
    expect(buildFreeformComposerState(action, action, false)).toMatchObject({
      selected: true,
      selectLabel: "已加入本回合",
    });
    expect(buildFreeformComposerState(action, action, true)).toMatchObject({
      selectDisabled: true,
      directSubmitDisabled: true,
      directSubmitLabel: "结算中...",
    });
    expect(
      buildFreeformComposerState(undefined, undefined, false),
    ).toMatchObject({
      selectDisabled: true,
      directSubmitDisabled: true,
    });
  });
});
