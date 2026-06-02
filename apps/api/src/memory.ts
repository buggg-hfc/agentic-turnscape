import type { StoredMemoryLog } from "./store.js";

export type MemoryCompressionOptions = {
  maxTurnEntries?: number;
  preserveRecentTurnEntries?: number;
  idFactory?: (kind: "public" | "hidden") => string;
  now?: () => string;
};

const DEFAULT_MAX_TURN_ENTRIES = 24;
const DEFAULT_PRESERVE_RECENT_TURN_ENTRIES = 10;

const summarizeEntries = (entries: StoredMemoryLog[]): string =>
  entries
    .map((entry) => entry.summary.trim())
    .filter(Boolean)
    .join(" | ");

const compressedEntry = (
  kind: "public" | "hidden",
  entries: StoredMemoryLog[],
  idFactory: NonNullable<MemoryCompressionOptions["idFactory"]>,
  now: NonNullable<MemoryCompressionOptions["now"]>
): StoredMemoryLog | undefined => {
  if (entries.length === 0) return undefined;
  const summary = summarizeEntries(entries);
  if (!summary) return undefined;
  return {
    id: idFactory(kind),
    scope: "campaign",
    subjectId: `compressed:${kind}`,
    summary,
    hidden: kind === "hidden",
    createdAt: now()
  };
};

export const compressMemoryLog = (memoryLog: StoredMemoryLog[], options: MemoryCompressionOptions = {}): StoredMemoryLog[] => {
  const maxTurnEntries = options.maxTurnEntries ?? DEFAULT_MAX_TURN_ENTRIES;
  const preserveRecentTurnEntries = options.preserveRecentTurnEntries ?? DEFAULT_PRESERVE_RECENT_TURN_ENTRIES;
  const idFactory = options.idFactory ?? ((kind: "public" | "hidden") => `memory_${kind}_${crypto.randomUUID()}`);
  const now = options.now ?? (() => new Date().toISOString());

  const turnEntries = memoryLog.filter((entry) => entry.scope === "turn");
  if (turnEntries.length <= maxTurnEntries) return memoryLog;

  const keepCount = Math.min(maxTurnEntries, Math.max(0, preserveRecentTurnEntries));
  const publicTurnEntries = turnEntries.filter((entry) => !entry.hidden);
  const hiddenTurnEntries = turnEntries.filter((entry) => entry.hidden);
  const recentPublicTurnEntries = publicTurnEntries.slice(-keepCount);
  const recentHiddenTurnEntries = hiddenTurnEntries.slice(-keepCount);
  const recentIds = new Set([...recentPublicTurnEntries, ...recentHiddenTurnEntries].map((entry) => entry.id));
  const oldPublicEntries = [
    ...memoryLog.filter((entry) => entry.scope === "campaign" && entry.subjectId === "compressed:public"),
    ...publicTurnEntries.filter((entry) => !recentIds.has(entry.id))
  ];
  const oldHiddenEntries = [
    ...memoryLog.filter((entry) => entry.scope === "campaign" && entry.subjectId === "compressed:hidden"),
    ...hiddenTurnEntries.filter((entry) => !recentIds.has(entry.id))
  ];
  const nonTurnEntries = memoryLog.filter(
    (entry) => entry.scope !== "turn" && entry.subjectId !== "compressed:public" && entry.subjectId !== "compressed:hidden"
  );
  const compressed = [
    compressedEntry("public", oldPublicEntries, idFactory, now),
    compressedEntry("hidden", oldHiddenEntries, idFactory, now)
  ].filter((entry): entry is StoredMemoryLog => Boolean(entry));

  const recentTurnEntries = [...recentPublicTurnEntries, ...recentHiddenTurnEntries].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );

  return [...nonTurnEntries, ...compressed, ...recentTurnEntries];
};
