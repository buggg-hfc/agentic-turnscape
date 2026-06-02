import { describe, expect, it } from "vitest";
import { requireScenarioPackage } from "@agentic-turnscape/content";
import type { LLMClient, LLMMessage } from "./llm.js";
import { runTurn } from "./orchestrator.js";

const fallbackLlm: LLMClient = {
  completeJson: async ({ fallback }) => fallback(),
  completeText: async ({ fallback }) => fallback()
};

describe("turn orchestrator", () => {
  it("runs a full local turn without letting agents mutate state directly", async () => {
    const scenario = requireScenarioPackage("border-seven-days");
    const state = scenario.createWorld();
    const { nextState, resolution } = await runTurn({
      state,
      llm: fallbackLlm,
      turnId: "turn-1",
      seed: "turn-1",
      playerAction: {
        actionType: "investigate",
        label: "调查失踪商队",
        description: "询问目击者，整理前往旧哨站的路线。",
        targetId: "old_outpost",
        leverage: ["public_rumor", "zhou_jin_help"],
        riskLevel: "medium"
      },
      getAvailableActions: scenario.getActions,
      evaluateEnding: scenario.evaluateEnding
    });

    expect(resolution.proposals.length).toBeGreaterThan(0);
    expect(resolution.statePatch.source).toBe("referee");
    expect(nextState.publicEvents.length).toBeGreaterThan(state.publicEvents.length);
    expect(resolution.availableActions.length).toBeGreaterThan(0);
  });

  it("retries and rejects proposals that impersonate another actor or invent resources", async () => {
    const scenario = requireScenarioPackage("border-seven-days");
    const state = scenario.createWorld();
    const seenMessages: LLMMessage[][] = [];
    const actorAttempts = new Map<string, number>();
    const guardedLlm: LLMClient = {
      completeJson: async ({ messages, fallback }) => {
        seenMessages.push(messages);
        const observation = JSON.parse(messages[1]?.content ?? "{}") as { actor?: { id?: string } };
        const actorId = observation.actor?.id ?? "unknown";
        const attempt = (actorAttempts.get(actorId) ?? 0) + 1;
        actorAttempts.set(actorId, attempt);
        if (actorId === "npc_zhou_jin" && attempt === 1) {
          return {
            actorId: "npc_manlo",
            intent: "call in impossible force",
            actionType: "coerce",
            target: "clinic",
            usedResources: ["orbital_cannon"],
            proposedAction: "冒充商会代表并动用并不存在的轨道武器。",
            riskLevel: "high",
            publicReason: "我可以凭空制造资源。"
          };
        }
        if (actorId === "npc_zhou_jin") {
          return {
            actorId: "npc_zhou_jin",
            intent: "watch for the hidden instigator",
            actionType: "observe",
            target: "crowd",
            usedResources: ["contacts"],
            proposedAction: "周烬让熟人盯住人群边缘的煽动者。",
            riskLevel: "low",
            publicReason: "他只使用自己手里的联系人。"
          };
        }
        return fallback();
      },
      completeText: async ({ fallback }) => fallback()
    };

    const { resolution } = await runTurn({
      state,
      llm: guardedLlm,
      turnId: "turn-guarded-proposals",
      seed: "turn-guarded-proposals",
      playerAction: {
        actionType: "protect",
        label: "保护诊所",
        description: "在诊所门口保护病人和医生。",
        targetId: "npc_adele",
        leverage: ["public_rumor"],
        riskLevel: "medium"
      },
      getAvailableActions: scenario.getActions,
      evaluateEnding: scenario.evaluateEnding
    });

    expect(actorAttempts.get("npc_zhou_jin")).toBe(2);
    expect(seenMessages.some((messages) => messages.at(-1)?.content.includes("failed proposal validation"))).toBe(true);
    expect(resolution.proposals.find((proposal) => proposal.actorId === "npc_zhou_jin")).toMatchObject({
      usedResources: ["contacts"],
      publicReason: "他只使用自己手里的联系人。"
    });
    expect(JSON.stringify(resolution.proposals)).not.toContain("orbital_cannon");
  });
});
