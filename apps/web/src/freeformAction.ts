import type { PlayerAction } from "@agentic-turnscape/shared";

export const FREEFORM_ACTION_MAX_LENGTH = 500;
type FreeformIntent = Exclude<PlayerAction["actionType"], "custom">;

export type FreeformActionAnalysis = {
  intent: FreeformIntent;
  intentLabel: string;
  riskLevel: PlayerAction["riskLevel"];
  targetId?: string;
  targetLabel?: string;
  leverage: string[];
};

const normalizeFreeformText = (value: string): string =>
  value.trim().replace(/\s+/g, " ").slice(0, FREEFORM_ACTION_MAX_LENGTH);

const shortLabel = (value: string): string => {
  const limit = 34;
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
};

const stableId = (value: string): string => {
  let hash = 5381;
  for (const char of value) {
    hash = (hash * 33) ^ char.charCodeAt(0);
  }
  return `custom_${(hash >>> 0).toString(36)}`;
};

const intentLabels: Record<FreeformIntent, string> = {
  investigate: "Investigate",
  negotiate: "Negotiate",
  fight: "Fight",
  protect: "Protect",
  trade: "Trade",
  rest: "Rest",
  travel: "Travel",
  ignore: "Observe"
};

const intentKeywords: Array<{ intent: FreeformIntent; keywords: string[] }> = [
  {
    intent: "protect",
    keywords: [
      "protect",
      "escort",
      "evacuate",
      "rescue",
      "shield",
      "patient",
      "clinic",
      "\u4fdd\u62a4",
      "\u62a4\u9001",
      "\u8f6c\u79fb",
      "\u6551",
      "\u75c5\u4eba",
      "\u8bca\u6240"
    ]
  },
  {
    intent: "fight",
    keywords: ["fight", "attack", "ambush", "strike", "weapon", "\u6218\u6597", "\u653b\u51fb", "\u4f0f\u51fb"]
  },
  {
    intent: "negotiate",
    keywords: ["negotiate", "persuade", "talk", "parley", "convince", "\u8c08\u5224", "\u8bf4\u670d", "\u534f\u5546"]
  },
  {
    intent: "trade",
    keywords: ["trade", "buy", "sell", "bribe", "pay", "market", "\u4ea4\u6613", "\u8d2d\u4e70", "\u8d3f\u8d42", "\u9ed1\u5e02"]
  },
  {
    intent: "travel",
    keywords: ["travel", "move", "cross", "route", "go to", "\u524d\u5f80", "\u7ed5\u5f00", "\u8def\u7ebf"]
  },
  {
    intent: "rest",
    keywords: ["rest", "wait", "recover", "sleep", "\u4f11\u606f", "\u7b49\u5f85", "\u6062\u590d"]
  },
  {
    intent: "investigate",
    keywords: [
      "investigate",
      "search",
      "scout",
      "evidence",
      "clue",
      "question",
      "outpost",
      "\u8c03\u67e5",
      "\u641c\u7d22",
      "\u7ebf\u7d22",
      "\u8bc1\u636e",
      "\u8be2\u95ee",
      "\u54e8\u7ad9"
    ]
  }
];

const targetKeywords: Array<{ id: string; label: string; keywords: string[] }> = [
  { id: "old_outpost", label: "Old outpost", keywords: ["old outpost", "outpost", "\u65e7\u54e8\u7ad9", "\u54e8\u7ad9"] },
  { id: "clinic", label: "Clinic", keywords: ["clinic", "adele", "patient", "\u8bca\u6240", "\u963f\u9edb\u5c14", "\u75c5\u4eba"] },
  { id: "black_market", label: "Black market", keywords: ["black market", "crow", "market", "\u9ed1\u5e02", "\u4e4c\u9e26"] },
  { id: "mine", label: "Mine", keywords: ["mine", "blackstone", "manlo", "\u77ff\u533a", "\u9ed1\u77f3", "\u66fc\u6d1b"] },
  { id: "chapel", label: "Chapel", keywords: ["chapel", "cult", "rift", "\u793c\u62dc\u5802", "\u6559\u56e2", "\u88c2\u9699"] },
  { id: "npc_rowan", label: "Rowan", keywords: ["rowan", "captain", "\u7f57\u6587", "\u961f\u957f"] }
];

const highRiskKeywords = [
  "blockade",
  "ambush",
  "armed",
  "fight",
  "forbidden",
  "danger",
  "\u5c01\u9501",
  "\u4f0f\u51fb",
  "\u6b66\u88c5",
  "\u5371\u9669"
];
const lowRiskKeywords = ["quietly", "carefully", "observe", "rest", "wait", "\u6084\u6084", "\u5c0f\u5fc3", "\u89c2\u5bdf"];

const containsAny = (value: string, keywords: string[]): boolean =>
  keywords.some((keyword) => value.includes(keyword));

export const analyzeFreeformAction = (value: string): FreeformActionAnalysis | undefined => {
  const description = normalizeFreeformText(value);
  if (!description) return undefined;

  const normalized = description.toLocaleLowerCase();
  const intent =
    intentKeywords.find((candidate) => containsAny(normalized, candidate.keywords))?.intent ?? "investigate";
  const target = targetKeywords.find((candidate) => containsAny(normalized, candidate.keywords));
  const riskLevel: PlayerAction["riskLevel"] = containsAny(normalized, highRiskKeywords)
    ? "high"
    : containsAny(normalized, lowRiskKeywords)
      ? "low"
      : intent === "fight"
        ? "high"
        : "medium";
  const leverage = ["freeform", `freeform:intent:${intent}`, `freeform:risk:${riskLevel}`];
  if (target) leverage.push(`freeform:target:${target.id}`);

  return {
    intent,
    intentLabel: intentLabels[intent],
    riskLevel,
    leverage,
    ...(target ? { targetId: target.id, targetLabel: target.label } : {})
  };
};

export const buildFreeformActionPreview = (action: PlayerAction): string[] => {
  const intent = action.leverage
    .find((item) => item.startsWith("freeform:intent:"))
    ?.slice("freeform:intent:".length) as FreeformIntent | undefined;
  const risk = action.leverage.find((item) => item.startsWith("freeform:risk:"))?.slice("freeform:risk:".length);
  const riskLabel = risk ? `${risk[0]?.toUpperCase() ?? ""}${risk.slice(1)}` : "Medium";
  const target = targetKeywords.find((candidate) => candidate.id === action.targetId);
  return [
    `Intent: ${intent ? intentLabels[intent] : "Open"}`,
    `Risk: ${riskLabel}`,
    ...(target ? [`Target: ${target.label}`] : [])
  ];
};

export const buildFreeformPlayerAction = (value: string): PlayerAction | undefined => {
  const description = normalizeFreeformText(value);
  if (!description) return undefined;
  const analysis = analyzeFreeformAction(description);

  return {
    id: stableId(description),
    actionType: "custom",
    label: `\u81ea\u7531\u884c\u52a8\uff1a${shortLabel(description)}`,
    description,
    ...(analysis?.targetId ? { targetId: analysis.targetId } : {}),
    leverage: analysis?.leverage ?? ["freeform"],
    riskLevel: analysis?.riskLevel ?? "medium"
  };
};
