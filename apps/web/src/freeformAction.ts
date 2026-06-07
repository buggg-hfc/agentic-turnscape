import type { PlayerAction } from "@agentic-turnscape/shared";

export const FREEFORM_ACTION_MAX_LENGTH = 500;

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

export const buildFreeformPlayerAction = (value: string): PlayerAction | undefined => {
  const description = normalizeFreeformText(value);
  if (!description) return undefined;

  return {
    id: stableId(description),
    actionType: "custom",
    label: `自由行动：${shortLabel(description)}`,
    description,
    leverage: ["freeform"],
    riskLevel: "medium"
  };
};
