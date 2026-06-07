import { describe, expect, it } from "vitest";
import type { TurnResolution } from "@agentic-turnscape/shared";
import { buildAgentTransparencyRows } from "./agentTransparency.js";

const resolution: TurnResolution = {
  turnId: "turn-1",
  proposals: [
    {
      actorId: "npc_adele",
      intent: "protect patients",
      actionType: "negotiate",
      target: "npc_rowan",
      usedResources: ["medical"],
      proposedAction: "Ask for a diagnosis delay.",
      riskLevel: "medium",
      publicReason: "Adele wants the clinic kept open.",
      hiddenReason: "The illness points back to mine pollution.",
    },
  ],
  statePatch: { type: "state_patch", source: "referee", changes: [] },
  publicSummary: "The clinic standoff calms.",
  hiddenSummary: "The merchant spy raises suspicion.",
  narration: "The street goes quiet.",
  availableActions: [],
};

describe("Agent transparency view model", () => {
  it("hides Agent internals in immersive mode", () => {
    expect(buildAgentTransparencyRows(resolution, "immersive")).toEqual([]);
  });

  it("shows only public reasoning in inference mode", () => {
    expect(buildAgentTransparencyRows(resolution, "inference")).toEqual([
      {
        id: "npc_adele-protect patients",
        headline: "Adele wants the clinic kept open.",
      },
    ]);
  });

  it("shows debug reasoning when debug data is available", () => {
    expect(buildAgentTransparencyRows(resolution, "debug")).toEqual([
      {
        id: "npc_adele-protect patients",
        headline: "阿黛尔：protect patients",
        detail: "谈判 -> 罗文 · 资源：医疗 · 风险：中",
        hiddenDetail: "The illness points back to mine pollution.",
      },
    ]);
  });
});
