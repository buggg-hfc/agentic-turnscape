import type {
  TransparencyMode,
  TurnResolution,
} from "@agentic-turnscape/shared";

export type AgentTransparencyRow = {
  id: string;
  headline: string;
  detail?: string;
  hiddenDetail?: string;
};

export const buildAgentTransparencyRows = (
  resolution: TurnResolution | undefined,
  transparency: TransparencyMode,
): AgentTransparencyRow[] => {
  if (!resolution || transparency === "immersive") return [];

  return resolution.proposals
    .slice(0, transparency === "debug" ? 8 : 3)
    .map((proposal) => {
      const id = `${proposal.actorId}-${proposal.intent}`;
      if (transparency !== "debug") {
        return {
          id,
          headline: proposal.publicReason,
        };
      }

      const target = proposal.target ? ` -> ${proposal.target}` : "";
      const resources =
        proposal.usedResources.length > 0
          ? ` · resources: ${proposal.usedResources.join(", ")}`
          : "";
      return {
        id,
        headline: `${proposal.actorId}: ${proposal.intent}`,
        detail: `${proposal.actionType}${target}${resources} · risk: ${proposal.riskLevel}`,
        ...(proposal.hiddenReason
          ? { hiddenDetail: proposal.hiddenReason }
          : {}),
      };
    });
};
