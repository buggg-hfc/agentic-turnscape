import type { ChroniclePayload } from "./api.js";

export type ChronicleTimelineItem = {
  id: string;
  title: string;
  body: string;
  detail?: string;
  meta: string;
  patchSummary: string;
  endingTitle?: string;
};

export const buildChronicleTimeline = (chronicle: ChroniclePayload): ChronicleTimelineItem[] =>
  chronicle.replay.map((entry) => {
    const snapshot = chronicle.snapshots.find((item) => item.turnId === entry.id);
    const changeCount = entry.statePatch?.changes.length ?? 0;
    return {
      id: entry.id,
      title: `Turn ${entry.index}: ${entry.playerAction?.label ?? "No recorded action"}`,
      body: entry.publicSummary ?? "No public referee summary recorded.",
      meta: snapshot ? `Day ${snapshot.day} · ${snapshot.phase} · ${snapshot.currentLocationId}` : "Snapshot pending",
      patchSummary: `${changeCount} confirmed ${changeCount === 1 ? "change" : "changes"}`,
      ...(entry.narration ? { detail: entry.narration } : {}),
      ...(entry.ending?.title ? { endingTitle: entry.ending.title } : {})
    };
  });
