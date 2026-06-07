import type {
  TransparencyMode,
  TurnResolution,
} from "@agentic-turnscape/shared";
import { displayLabel } from "./displayLabels.js";

export type AgentTransparencyRow = {
  id: string;
  headline: string;
  detail?: string;
  hiddenDetail?: string;
};

const actionTypeLabels: Record<string, string> = {
  custom: "自由行动",
  fight: "战斗",
  ignore: "观望",
  investigate: "调查",
  negotiate: "谈判",
  protect: "保护",
  rest: "休整",
  trade: "交易",
  travel: "移动",
};

const riskLabels: Record<string, string> = {
  high: "高",
  low: "低",
  medium: "中",
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

      const target = proposal.target ? ` -> ${displayLabel(proposal.target)}` : "";
      const resources =
        proposal.usedResources.length > 0
          ? ` · 资源：${proposal.usedResources.map(displayLabel).join(", ")}`
          : "";
      return {
        id,
        headline: `${displayLabel(proposal.actorId)}：${proposal.intent}`,
        detail: `${actionTypeLabels[proposal.actionType] ?? proposal.actionType}${target}${resources} · 风险：${riskLabels[proposal.riskLevel] ?? proposal.riskLevel}`,
        ...(proposal.hiddenReason
          ? { hiddenDetail: proposal.hiddenReason }
          : {}),
      };
    });
};
