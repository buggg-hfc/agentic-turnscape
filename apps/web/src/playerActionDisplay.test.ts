import { describe, expect, it } from "vitest";
import type { PlayerAction } from "@agentic-turnscape/shared";
import { displayPlayerAction } from "./playerActionDisplay.js";

describe("player action display", () => {
  it("localizes built-in scene action cards without changing the action payload", () => {
    const action: PlayerAction = {
      id: "scene:clinic_first_diagnosis",
      actionType: "protect",
      label: "Protect the clinic diagnosis",
      description:
        "Hold space for Adele and Mina long enough for the first diagnosis to matter.",
      targetId: "npc_mina",
      leverage: ["scene:clinic_first_diagnosis", "clinic_protocol"],
      riskLevel: "medium",
    };

    expect(displayPlayerAction(action)).toEqual({
      ...action,
      label: "保护诊所初诊",
      description: "为阿黛尔和米娜争取初诊时间，让诊断结果真正发挥作用。",
    });
    expect(action.label).toBe("Protect the clinic diagnosis");
  });

  it("localizes known replay labels even when old records have no action id", () => {
    expect(
      displayPlayerAction({
        actionType: "protect",
        label: "Support the clinic cure",
        description: "Protect the patients.",
        leverage: [],
        riskLevel: "medium",
      }),
    ).toMatchObject({
      label: "支援诊所治疗",
      description: "保护病人并协调阿黛尔的治疗工作。",
    });
  });

  it("preserves creator-authored or freeform action text", () => {
    const creatorAction: PlayerAction = {
      id: "creator:open-negotiation",
      actionType: "negotiate",
      label: "Open creator negotiation",
      description: "Use a custom authored action.",
      leverage: [],
      riskLevel: "medium",
    };

    expect(displayPlayerAction(creatorAction)).toEqual(creatorAction);
  });
});
