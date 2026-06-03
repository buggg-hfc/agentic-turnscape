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

  it("keeps hidden world facts out of NPC LLM observations while exposing public faction context", async () => {
    const scenario = requireScenarioPackage("border-seven-days");
    const state = scenario.createWorld();
    const observations: Array<Record<string, unknown>> = [];
    const observingLlm: LLMClient = {
      completeJson: async ({ messages, fallback }) => {
        observations.push(JSON.parse(messages[1]?.content ?? "{}"));
        return fallback();
      },
      completeText: async ({ fallback }) => fallback()
    };

    await runTurn({
      state,
      llm: observingLlm,
      turnId: "turn-limited-observation",
      seed: "turn-limited-observation",
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

    const serializedObservations = JSON.stringify(observations);
    expect(serializedObservations).not.toContain("商会雇员正在观察谁会接近失踪商队的家属");
    expect(serializedObservations).not.toContain("矿区污染正在加速瘟疫扩散");
    expect(serializedObservations).not.toContain("寻找可控裂隙技术");
    expect(serializedObservations).not.toContain("垄断裂隙矿石");
    expect(serializedObservations).not.toContain("召唤裂隙中的高等存在");
    expect(serializedObservations).not.toContain("她怀疑旧井水样被裂隙矿污染");
    expect(serializedObservations).not.toContain("他知道走私派雇佣了密探煽动诊所冲突");

    const manloObservation = observations.find((observation) => {
      const actor = observation.actor as { id?: string } | undefined;
      return actor?.id === "npc_manlo";
    });
    expect(manloObservation).toBeDefined();
    expect(manloObservation?.actorFaction).toMatchObject({
      id: "blackstone_consortium",
      publicGoal: "控制边境贸易",
      currentPlan: "完成矿区收购并转移瘟疫责任"
    });
    expect(manloObservation?.actorFaction).not.toHaveProperty("hiddenGoal");
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
