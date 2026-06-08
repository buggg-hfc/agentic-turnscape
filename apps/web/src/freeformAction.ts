import type {
  CharacterState,
  ClockState,
  FactionState,
  LocationState,
  PlayerAction,
  WorldState,
} from "@agentic-turnscape/shared";
import { displayLabel } from "./displayLabels.js";

export const FREEFORM_ACTION_MAX_LENGTH = 500;
export const FREEFORM_ACTION_HISTORY_LIMIT = 5;
export const FREEFORM_ACTION_HISTORY_STORAGE_KEY =
  "agentic-turnscape.freeformActionHistory.v1";
export const FREEFORM_ACTION_DRAFT_STORAGE_KEY =
  "agentic-turnscape.freeformActionDraft.v1";
type FreeformIntent = Exclude<PlayerAction["actionType"], "custom">;
export type FreeformActionHistoryStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;
export type FreeformTargetContext = {
  locations?: Record<
    string,
    Pick<LocationState, "id" | "name" | "description" | "publicInfo" | "tags">
  >;
  characters?: Record<
    string,
    Pick<CharacterState, "id" | "name" | "role" | "publicImage" | "knownFacts">
  >;
  factions?: Record<
    string,
    Pick<FactionState, "id" | "name" | "publicGoal" | "currentPlan">
  >;
  clocks?: Record<
    string,
    Pick<ClockState, "id" | "name" | "consequence" | "visible">
  >;
  player?: Pick<WorldState["player"], "resources">;
};

type FreeformTargetCandidate = {
  id: string;
  label: string;
  keywords: string[];
  dynamic: boolean;
};

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

const getBrowserStorage = (): FreeformActionHistoryStorage | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
};

export const sanitizeFreeformActionHistory = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = normalizeFreeformText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    entries.push(normalized);
    if (entries.length >= FREEFORM_ACTION_HISTORY_LIMIT) break;
  }
  return entries;
};

export const addFreeformActionHistoryEntry = (
  history: string[],
  value: string,
): string[] => {
  const normalized = normalizeFreeformText(value);
  if (!normalized) return sanitizeFreeformActionHistory(history);
  return sanitizeFreeformActionHistory([
    normalized,
    ...history.filter((item) => normalizeFreeformText(item) !== normalized),
  ]);
};

export const loadFreeformActionHistory = (
  storage: FreeformActionHistoryStorage | undefined = getBrowserStorage(),
): string[] => {
  if (!storage) return [];
  const raw = storage.getItem(FREEFORM_ACTION_HISTORY_STORAGE_KEY);
  if (!raw) return [];
  try {
    return sanitizeFreeformActionHistory(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveFreeformActionHistory = (
  history: string[],
  storage: FreeformActionHistoryStorage | undefined = getBrowserStorage(),
): string[] => {
  const sanitized = sanitizeFreeformActionHistory(history);
  storage?.setItem(
    FREEFORM_ACTION_HISTORY_STORAGE_KEY,
    JSON.stringify(sanitized),
  );
  return sanitized;
};

export const sanitizeFreeformActionDraft = (value: unknown): string =>
  typeof value === "string"
    ? value.slice(0, FREEFORM_ACTION_MAX_LENGTH)
    : "";

export const loadFreeformActionDraft = (
  storage: FreeformActionHistoryStorage | undefined = getBrowserStorage(),
): string => {
  if (!storage) return "";
  const raw = storage.getItem(FREEFORM_ACTION_DRAFT_STORAGE_KEY);
  if (!raw) return "";
  try {
    return sanitizeFreeformActionDraft(JSON.parse(raw));
  } catch {
    return "";
  }
};

export const saveFreeformActionDraft = (
  value: string,
  storage: FreeformActionHistoryStorage | undefined = getBrowserStorage(),
): string => {
  const sanitized = sanitizeFreeformActionDraft(value);
  if (sanitized) {
    storage?.setItem(
      FREEFORM_ACTION_DRAFT_STORAGE_KEY,
      JSON.stringify(sanitized),
    );
  } else {
    storage?.removeItem(FREEFORM_ACTION_DRAFT_STORAGE_KEY);
  }
  return sanitized;
};

export const clearFreeformActionDraft = (
  storage: FreeformActionHistoryStorage | undefined = getBrowserStorage(),
): string => {
  storage?.removeItem(FREEFORM_ACTION_DRAFT_STORAGE_KEY);
  return "";
};

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

const customTargetId = (value: string): string =>
  `custom_target_${stableId(value).slice("custom_".length)}`;

const intentLabels: Record<FreeformIntent, string> = {
  investigate: "调查",
  negotiate: "谈判",
  fight: "战斗",
  protect: "保护",
  trade: "交易",
  rest: "休整",
  travel: "移动",
  ignore: "观望"
};

const riskLabels: Record<PlayerAction["riskLevel"], string> = {
  low: "低",
  medium: "中",
  high: "高",
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
  { id: "old_outpost", label: "旧哨站", keywords: ["old outpost", "outpost", "\u65e7\u54e8\u7ad9", "\u54e8\u7ad9"] },
  { id: "clinic", label: "诊所", keywords: ["clinic", "adele", "patient", "\u8bca\u6240", "\u963f\u9edb\u5c14", "\u75c5\u4eba"] },
  { id: "black_market", label: "黑市", keywords: ["black market", "crow", "market", "\u9ed1\u5e02", "\u4e4c\u9e26"] },
  { id: "mine", label: "矿区", keywords: ["mine", "blackstone", "manlo", "\u77ff\u533a", "\u9ed1\u77f3", "\u66fc\u6d1b"] },
  { id: "chapel", label: "礼拜堂", keywords: ["chapel", "cult", "rift", "\u793c\u62dc\u5802", "\u6559\u56e2", "\u88c2\u9699"] },
  { id: "npc_rowan", label: "罗文", keywords: ["rowan", "captain", "\u7f57\u6587", "\u961f\u957f"] }
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

const explicitIntentAliases = {
  investigate: ["investigate", "search", "scout", "调查", "侦查", "搜索", "询问"],
  negotiate: ["negotiate", "talk", "persuade", "谈判", "协商", "说服", "沟通"],
  fight: ["fight", "attack", "combat", "战斗", "攻击", "伏击", "压制"],
  protect: ["protect", "rescue", "escort", "保护", "护送", "救援", "转移"],
  trade: ["trade", "buy", "sell", "交易", "购买", "贿赂", "交换"],
  rest: ["rest", "recover", "wait", "休整", "休息", "恢复", "等待"],
  travel: ["travel", "move", "go", "移动", "前往", "旅行", "转移地点"],
  ignore: ["ignore", "watch", "observe", "观望", "放弃", "不介入"]
} satisfies Record<FreeformIntent, string[]>;

const explicitRiskAliases = {
  low: ["low", "safe", "careful", "低", "安全", "谨慎"],
  medium: ["medium", "normal", "moderate", "中", "普通", "适中"],
  high: ["high", "dangerous", "risky", "高", "危险", "冒险"]
} satisfies Record<PlayerAction["riskLevel"], string[]>;

const containsAny = (value: string, keywords: string[]): boolean =>
  keywords.some((keyword) => value.includes(keyword));

const targetTextTokenPrefix = "freeform:targetText:";
const approachTextTokenPrefix = "freeform:approachText:";
const constraintTextTokenPrefix = "freeform:constraintText:";

const freeformResourceAliases = {
  intel: ["intel", "情报", "线索", "证据", "消息"],
  money: ["money", "金钱", "资金", "现金", "买通"],
  favor: ["favor", "人情", "情面", "帮手"],
  supplies: ["supplies", "补给", "物资", "药品"],
  stamina: ["stamina", "体力", "精力"],
  focus: ["focus", "专注", "注意力"],
} satisfies Record<string, string[]>;
const freeformResourceIds = Object.keys(freeformResourceAliases);
const freeformResourceIdSet = new Set(freeformResourceIds);
const nonCommittableResourceAliases = {
  pressure: ["pressure", "压力"],
} satisfies Record<string, string[]>;

const explicitFieldOf = (description: string, labels: string[]): string | undefined => {
  const labelPattern = labels.join("|");
  const match = description.match(new RegExp(`(?:${labelPattern})\\s*[:：]\\s*([^\\s,.;!?，。；、]{1,24})`, "iu"));
  return match?.[1]?.trim().toLocaleLowerCase();
};

const explicitIntentOf = (description: string): FreeformIntent | undefined => {
  const label = explicitFieldOf(description, ["意图", "intent"]);
  if (!label) return undefined;
  return Object.entries(explicitIntentAliases).find(([, aliases]) =>
    aliases.some((alias) => label.includes(alias.toLocaleLowerCase()))
  )?.[0] as FreeformIntent | undefined;
};

const explicitRiskOf = (description: string): PlayerAction["riskLevel"] | undefined => {
  const label = explicitFieldOf(description, ["风险", "risk"]);
  if (!label) return undefined;
  return Object.entries(explicitRiskAliases).find(([, aliases]) =>
    aliases.some((alias) => label.includes(alias.toLocaleLowerCase()))
  )?.[0] as PlayerAction["riskLevel"] | undefined;
};

const explicitPhraseFieldOf = (
  description: string,
  labels: string[],
  maxLength = 40,
): string | undefined => {
  const labelPattern = labels.join("|");
  const match = description.match(
    new RegExp(
      `(?:${labelPattern})\\s*[:：]\\s*([^,.;!?，。；、！？\\n]{1,${maxLength}})`,
      "iu",
    ),
  );
  return match?.[1]?.trim();
};

const explicitApproachTextOf = (description: string): string | undefined =>
  explicitPhraseFieldOf(description, ["方式", "做法", "approach", "method"]);

const explicitConstraintTextOf = (description: string): string | undefined =>
  explicitPhraseFieldOf(description, ["避免", "避开", "底线", "avoid", "constraint"]);

const explicitResourceTextOf = (description: string): string | undefined => {
  const labelPattern = ["资源", "投入", "使用", "resource", "resources", "use"].join(
    "|",
  );
  const match = description.match(
    new RegExp(
      `(?:${labelPattern})\\s*[:：]\\s*([^。；;!?！？\n]{1,80})`,
      "iu",
    ),
  );
  return match?.[1]?.trim();
};

const cleanKeyword = (value: string | undefined): string | undefined => {
  const keyword = value?.trim().toLocaleLowerCase();
  return keyword && keyword.length >= 2 ? keyword : undefined;
};

const keywordList = (values: Array<string | undefined>): string[] => [
  ...new Set(values.flatMap((value) => cleanKeyword(value) ?? [])),
];

const resourceKeywords = (id: string): string[] =>
  keywordList([
    id,
    displayLabel(id),
    ...(freeformResourceAliases[
      id as keyof typeof freeformResourceAliases
    ] ?? []),
  ]);

const committedResourceIdsOf = (
  description: string,
  context?: FreeformTargetContext,
): string[] => {
  const resourceText = explicitResourceTextOf(description);
  const playerResources = context?.player?.resources;
  if (!resourceText || !playerResources) return [];

  const normalizedResourceText = resourceText.toLocaleLowerCase();
  return freeformResourceIds.filter((id) => {
    if ((playerResources[id] ?? 0) <= 0) return false;
    return resourceKeywords(id).some((keyword) =>
      normalizedResourceText.includes(keyword),
    );
  });
};

const mentionsResource = (resourceText: string, id: string): boolean =>
  resourceKeywords(id).some((keyword) => resourceText.includes(keyword));

export const buildFreeformResourceWarnings = (
  value: string,
  context?: FreeformTargetContext,
): string[] => {
  const description = normalizeFreeformText(value);
  const resourceText = explicitResourceTextOf(description)?.toLocaleLowerCase();
  if (!resourceText) return [];

  const playerResources = context?.player?.resources;
  const warnings: string[] = [];
  for (const id of freeformResourceIds) {
    if (!mentionsResource(resourceText, id)) continue;
    if ((playerResources?.[id] ?? 0) <= 0) {
      warnings.push(`未投入：${displayLabel(id)}不足`);
    }
  }

  for (const [id, aliases] of Object.entries(nonCommittableResourceAliases)) {
    if (
      keywordList([id, displayLabel(id), ...aliases]).some((keyword) =>
        resourceText.includes(keyword),
      )
    ) {
      warnings.push(`未投入：${displayLabel(id)}不是可投入资源`);
    }
  }

  return [...new Set(warnings)];
};

const committedResourceLabelsOf = (action: PlayerAction): string[] => [
  ...new Set(
    action.leverage
      .filter((item) => freeformResourceIdSet.has(item))
      .map((id) => displayLabel(id)),
  ),
];

const staticTargetCandidates: FreeformTargetCandidate[] = targetKeywords.map(
  (target) => ({
    ...target,
    dynamic: false,
    keywords: keywordList([target.id, target.label, ...target.keywords]),
  }),
);

export const buildFreeformTargetCandidates = (
  context?: FreeformTargetContext,
): FreeformTargetCandidate[] => {
  if (!context) return staticTargetCandidates;

  const locations = Object.values(context.locations ?? {}).map((location) => ({
    id: location.id,
    label: location.name,
    dynamic: true,
    keywords: keywordList([
      location.id,
      location.name,
      location.description,
      ...location.publicInfo,
      ...location.tags,
    ]),
  }));
  const characters = Object.values(context.characters ?? {}).map(
    (character) => ({
      id: character.id,
      label: character.name,
      dynamic: true,
      keywords: keywordList([
        character.id,
        character.name,
        character.role,
        character.publicImage,
        ...character.knownFacts,
      ]),
    }),
  );
  const factions = Object.values(context.factions ?? {}).map((faction) => ({
    id: faction.id,
    label: faction.name,
    dynamic: true,
    keywords: keywordList([
      faction.id,
      faction.name,
      faction.publicGoal,
      faction.currentPlan,
    ]),
  }));
  const clocks = Object.values(context.clocks ?? {})
    .filter((clock) => clock.visible)
    .map((clock) => ({
      id: clock.id,
      label: clock.name,
      dynamic: true,
      keywords: keywordList([clock.id, clock.name, clock.consequence]),
    }));

  const byId = new Map<string, FreeformTargetCandidate>();
  for (const candidate of [
    ...staticTargetCandidates,
    ...locations,
    ...characters,
    ...factions,
    ...clocks,
  ]) {
    const existing = byId.get(candidate.id);
    byId.set(candidate.id, {
      ...candidate,
      keywords: keywordList([
        ...(existing?.keywords ?? []),
        ...candidate.keywords,
      ]),
      dynamic: existing?.dynamic || candidate.dynamic,
    });
  }
  return [...byId.values()];
};

const targetScore = (
  normalizedText: string,
  candidate: FreeformTargetCandidate,
): number => {
  const matchedLengths = candidate.keywords
    .filter((keyword) => normalizedText.includes(keyword))
    .map((keyword) => keyword.length);
  if (matchedLengths.length === 0) return -1;
  return Math.max(...matchedLengths) + (candidate.dynamic ? 1000 : 0);
};

const findTarget = (
  normalizedText: string,
  context?: FreeformTargetContext,
): FreeformTargetCandidate | undefined =>
  buildFreeformTargetCandidates(context)
    .map((candidate) => ({
      candidate,
      score: targetScore(normalizedText, candidate),
    }))
    .filter((result) => result.score >= 0)
    .sort((left, right) => right.score - left.score)[0]?.candidate;

const targetById = (
  targetId: string | undefined,
  context?: FreeformTargetContext,
): FreeformTargetCandidate | undefined =>
  targetId
    ? buildFreeformTargetCandidates(context).find(
        (candidate) => candidate.id === targetId,
      )
    : undefined;

const explicitTargetTextOf = (description: string): string | undefined => {
  const match =
    description.match(/目标[:：]\s*([^，。；;,.!?！？\n]{2,24})/u) ??
    description.match(/target\s*:\s*([^,.;!?\n]{2,40})/iu);
  return match?.[1]?.trim();
};

const targetTextOf = (action: PlayerAction): string | undefined =>
  action.leverage
    .find((item) => item.startsWith(targetTextTokenPrefix))
    ?.slice(targetTextTokenPrefix.length)
    .trim();

const approachTextOf = (action: PlayerAction): string | undefined =>
  action.leverage
    .find((item) => item.startsWith(approachTextTokenPrefix))
    ?.slice(approachTextTokenPrefix.length)
    .trim();

const constraintTextOf = (action: PlayerAction): string | undefined =>
  action.leverage
    .find((item) => item.startsWith(constraintTextTokenPrefix))
    ?.slice(constraintTextTokenPrefix.length)
    .trim();

const freeformTargetOf = (
  description: string,
  normalized: string,
  context?: FreeformTargetContext,
): FreeformTargetCandidate | undefined => {
  const explicitTargetText = explicitTargetTextOf(description);
  if (!explicitTargetText) return findTarget(normalized, context);

  const explicitTarget = findTarget(explicitTargetText.toLocaleLowerCase(), context);
  if (explicitTarget) return explicitTarget;

  return {
    id: customTargetId(explicitTargetText),
    label: explicitTargetText,
    keywords: keywordList([explicitTargetText]),
    dynamic: true,
  };
};

export const analyzeFreeformAction = (
  value: string,
  context?: FreeformTargetContext,
): FreeformActionAnalysis | undefined => {
  const description = normalizeFreeformText(value);
  if (!description) return undefined;

  const normalized = description.toLocaleLowerCase();
  const explicitIntent = explicitIntentOf(description);
  const intent =
    explicitIntent ??
    intentKeywords.find((candidate) => containsAny(normalized, candidate.keywords))?.intent ??
    "investigate";
  const target = freeformTargetOf(description, normalized, context);
  const riskLevel: PlayerAction["riskLevel"] =
    explicitRiskOf(description) ??
    (containsAny(normalized, highRiskKeywords)
      ? "high"
      : containsAny(normalized, lowRiskKeywords)
        ? "low"
        : intent === "fight"
          ? "high"
          : "medium");
  const leverage = ["freeform", `freeform:intent:${intent}`, `freeform:risk:${riskLevel}`];
  const addLeverage = (token: string): void => {
    if (!leverage.includes(token)) leverage.push(token);
  };
  if (target) {
    addLeverage(`freeform:target:${target.id}`);
    if (target.id.startsWith("custom_target_")) {
      addLeverage(`${targetTextTokenPrefix}${target.label}`);
    }
  }
  for (const resourceId of committedResourceIdsOf(description, context)) {
    addLeverage(resourceId);
  }
  const approachText = explicitApproachTextOf(description);
  if (approachText) {
    addLeverage(`${approachTextTokenPrefix}${approachText}`);
  }
  const constraintText = explicitConstraintTextOf(description);
  if (constraintText) {
    addLeverage(`${constraintTextTokenPrefix}${constraintText}`);
  }

  return {
    intent,
    intentLabel: intentLabels[intent],
    riskLevel,
    leverage,
    ...(target ? { targetId: target.id, targetLabel: target.label } : {})
  };
};

export const buildFreeformActionPreview = (
  action: PlayerAction,
  context?: FreeformTargetContext,
): string[] => {
  const intent = action.leverage
    .find((item) => item.startsWith("freeform:intent:"))
    ?.slice("freeform:intent:".length) as FreeformIntent | undefined;
  const risk = action.leverage.find((item) => item.startsWith("freeform:risk:"))?.slice("freeform:risk:".length) as
    | PlayerAction["riskLevel"]
    | undefined;
  const target = targetById(action.targetId, context);
  const targetText = targetTextOf(action);
  const approachText = approachTextOf(action);
  const constraintText = constraintTextOf(action);
  const committedResourceLabels = committedResourceLabelsOf(action);
  return [
    `意图：${intent ? intentLabels[intent] : "开放"}`,
    `风险：${risk ? riskLabels[risk] : "中"}`,
    ...(target || targetText
      ? [`目标：${target ? displayLabel(target.id, target.label) : targetText}`]
      : []),
    ...(committedResourceLabels.length > 0
      ? [`投入：${committedResourceLabels.join("、")}`]
      : []),
    ...(approachText ? [`方式：${approachText}`] : []),
    ...(constraintText ? [`避开：${constraintText}`] : [])
  ];
};

export const buildFreeformActionInterpretation = (
  action: PlayerAction,
  context?: FreeformTargetContext,
): string => {
  const intent = action.leverage
    .find((item) => item.startsWith("freeform:intent:"))
    ?.slice("freeform:intent:".length) as FreeformIntent | undefined;
  const risk = action.leverage
    .find((item) => item.startsWith("freeform:risk:"))
    ?.slice("freeform:risk:".length) as
    | PlayerAction["riskLevel"]
    | undefined;
  const target = targetById(action.targetId, context);
  const targetText = targetTextOf(action);
  const committedResourceLabels = committedResourceLabelsOf(action);
  const segments = [
    `裁判将按“${intent ? intentLabels[intent] : "开放行动"}”结算`,
    ...(target || targetText
      ? [`目标：${target ? displayLabel(target.id, target.label) : targetText}`]
      : []),
    `风险：${risk ? riskLabels[risk] : "中"}`,
    ...(committedResourceLabels.length > 0
      ? [`投入：${committedResourceLabels.join("、")}`]
      : []),
  ];
  return `${segments.join("；")}。结果仍由规则裁判确认。`;
};

export type FreeformComposerState = {
  selected: boolean;
  selectDisabled: boolean;
  directSubmitDisabled: boolean;
  selectLabel: string;
  directSubmitLabel: string;
};

export const buildFreeformComposerState = (
  action: PlayerAction | undefined,
  selectedAction: PlayerAction | undefined,
  running: boolean,
): FreeformComposerState => {
  const selected =
    Boolean(action) &&
    selectedAction?.actionType === "custom" &&
    selectedAction.id === action?.id;

  return {
    selected,
    selectDisabled: !action || running,
    directSubmitDisabled: !action || running,
    selectLabel: selected ? "已加入本回合" : "加入本回合",
    directSubmitLabel: running ? "结算中..." : "直接执行",
  };
};

export const buildFreeformPlayerAction = (
  value: string,
  context?: FreeformTargetContext,
): PlayerAction | undefined => {
  const description = normalizeFreeformText(value);
  if (!description) return undefined;
  const analysis = analyzeFreeformAction(description, context);

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
