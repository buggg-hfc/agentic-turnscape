import type { ChroniclePayload } from "./api.js";
import { displayLabel } from "./displayLabels.js";
import { displayPlayerAction } from "./playerActionDisplay.js";

export type ChronicleTimelineItem = {
  id: string;
  title: string;
  body: string;
  detail?: string;
  meta: string;
  patchSummary: string;
  endingTitle?: string;
};

const phaseLabels: Record<string, string> = {
  morning: "清晨",
  afternoon: "午后",
  evening: "傍晚",
  night: "夜晚",
};

export const buildChronicleTimeline = (chronicle: ChroniclePayload): ChronicleTimelineItem[] =>
  chronicle.replay.map((entry) => {
    const snapshot = chronicle.snapshots.find((item) => item.turnId === entry.id);
    const changeCount = entry.statePatch?.changes.length ?? 0;
    const action = entry.playerAction
      ? displayPlayerAction(entry.playerAction)
      : undefined;
    return {
      id: entry.id,
      title: `第 ${entry.index} 回合：${action?.label ?? "未记录行动"}`,
      body: entry.publicSummary ?? "尚无公开裁判摘要。",
      meta: snapshot
        ? `第 ${snapshot.day} 天 · ${phaseLabels[snapshot.phase] ?? snapshot.phase} · ${displayLabel(
            snapshot.currentLocationId,
          )}`
        : "快照待生成",
      patchSummary: `${changeCount} 项已确认变化`,
      ...(entry.narration ? { detail: entry.narration } : {}),
      ...(entry.ending?.title ? { endingTitle: entry.ending.title } : {})
    };
  });
