import { adjudicateTurn, applyStatePatch } from "@agentic-turnscape/core";
import {
  AgentActionProposalSchema,
  type AgentActionProposal,
  type EndingSummary,
  type PlayerAction,
  type TransparencyMode,
  type TurnResolution,
  type WorldState
} from "@agentic-turnscape/shared";
import type { LLMClient, LLMMessage } from "./llm.js";
import { buildLimitedObservation, narratorSystemPrompt, npcSystemPrompt, scriptedProposal, type LimitedObservation } from "./prompts.js";

export type RunTurnOptions = {
  state: WorldState;
  playerAction: PlayerAction;
  llm: LLMClient;
  turnId: string;
  seed?: string | undefined;
  transparency?: TransparencyMode | undefined;
  getAvailableActions?: ((state: WorldState) => PlayerAction[]) | undefined;
  evaluateEnding?: ((state: WorldState) => EndingSummary | undefined) | undefined;
};

const activeAgentIds = (state: WorldState, playerAction: PlayerAction): string[] => {
  const base = ["npc_zhou_jin"];
  if (state.currentLocationId === "clinic" || playerAction.targetId === "npc_rowan" || playerAction.targetId === "npc_adele") {
    return [...base, "npc_adele", "npc_rowan", "npc_manlo", "npc_eve"];
  }
  if (state.currentLocationId === "black_market" || playerAction.targetId === "npc_crow_nine") {
    return [...base, "npc_crow_nine", "npc_manlo"];
  }
  if (state.currentLocationId === "old_outpost" || playerAction.targetId === "old_outpost") {
    return [...base, "npc_kyle", "npc_hagen", "npc_manlo"];
  }
  return [...base, "npc_adele", "npc_manlo"];
};

const proposalValidationIssues = (proposal: AgentActionProposal, observation: LimitedObservation): string[] => {
  const issues: string[] = [];
  if (proposal.actorId !== observation.actor.id) {
    issues.push(`actorId must be ${observation.actor.id}, got ${proposal.actorId}`);
  }

  const availableResources = new Set(Object.keys(observation.actor.resources));
  const inventedResources = proposal.usedResources.filter((resource) => !availableResources.has(resource));
  if (inventedResources.length > 0) {
    issues.push(`usedResources contains unavailable resources: ${inventedResources.join(", ")}`);
  }

  return issues;
};

const validationRetryPrompt = (issues: string[], observation: LimitedObservation): string => {
  const resources = Object.keys(observation.actor.resources);
  return [
    `The previous JSON failed proposal validation: ${issues.join("; ")}.`,
    `Return only a proposal for actorId "${observation.actor.id}".`,
    `usedResources must be resource ids from this list only: ${resources.length > 0 ? resources.join(", ") : "(none)"}.`,
    "Do not invent resources, identities, hidden facts, or authority not present in your observation."
  ].join(" ");
};

const decide = async (actorId: string, state: WorldState, playerAction: PlayerAction, llm: LLMClient): Promise<AgentActionProposal> => {
  const observation = buildLimitedObservation(actorId, state, playerAction);
  const fallback = () => scriptedProposal(actorId, state, playerAction);
  if (!observation) return fallback();

  const baseMessages: LLMMessage[] = [
    { role: "system", content: npcSystemPrompt },
    { role: "user", content: JSON.stringify(observation, null, 2) }
  ];
  let messages = baseMessages;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const proposal = await llm.completeJson({
      messages,
      schema: AgentActionProposalSchema,
      temperature: 0.45,
      fallback
    });
    const issues = proposalValidationIssues(proposal, observation);
    if (issues.length === 0) return proposal;
      messages = [
        ...baseMessages,
      { role: "assistant", content: JSON.stringify(proposal) },
      { role: "user", content: validationRetryPrompt(issues, observation) }
    ];
  }

  const fallbackProposal = fallback();
  const allowedResources = new Set(Object.keys(observation.actor.resources));
  return {
    ...fallbackProposal,
    actorId: observation.actor.id,
    usedResources: fallbackProposal.usedResources.filter((resource) => allowedResources.has(resource))
  };
};

const narrativeFallback = (publicSummary: string, resolutionLabel: string): string =>
  `${publicSummary} 骰点裁定为${resolutionLabel}，所以局势没有被旁白随意改写，而是按规则留下后果。街上的目光、阵营时钟和角色关系都向前挪了一格；你能看见哪些人松了口气，也能感觉到有人正在重新计算你的价值。下一步，你可以继续追线索、处理诊所危机，或转向黑市寻找更危险但更直接的答案。`;

export const runTurn = async ({
  state,
  playerAction,
  llm,
  turnId,
  seed = turnId,
  getAvailableActions = () => [],
  evaluateEnding = () => undefined
}: RunTurnOptions): Promise<{ nextState: WorldState; resolution: TurnResolution }> => {
  const proposals = await Promise.all(activeAgentIds(state, playerAction).map((actorId) => decide(actorId, state, playerAction, llm)));
  const referee = adjudicateTurn({ state, playerAction, proposals, turnId, seed });
  const nextState = applyStatePatch(state, referee.patch);
  const narration = await llm.completeText({
    messages: [
      { role: "system", content: narratorSystemPrompt },
      {
        role: "user",
        content: JSON.stringify(
          {
            publicSummary: referee.publicSummary,
            roll: referee.roll,
            statePatch: referee.patch,
            nextVisibleClocks: Object.values(nextState.clocks).filter((clock) => clock.visible)
          },
          null,
          2
        )
      }
    ],
    temperature: 0.55,
    fallback: () => narrativeFallback(referee.publicSummary, referee.roll.label)
  });

  const resolution: TurnResolution = {
    turnId,
    proposals,
    statePatch: referee.patch,
    publicSummary: referee.publicSummary,
    hiddenSummary: referee.hiddenSummary,
    narration,
    ending: evaluateEnding(nextState),
    availableActions: getAvailableActions(nextState)
  };

  return { nextState, resolution };
};
