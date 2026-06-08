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

const relationshipDimensionLabels: Record<string, string> = {
  trust: "信任",
  respect: "尊重",
  suspicion: "怀疑",
  interest: "兴趣",
  fear: "畏惧",
  affinity: "亲近",
};

type PatchChange = NonNullable<
  ChroniclePayload["replay"][number]["statePatch"]
>["changes"][number];

const signedDelta = (delta: number): string =>
  delta > 0 ? `+${delta}` : `${delta}`;

const summarizePatchChange = (change: PatchChange): string | undefined => {
  if (change.op === "inc") {
    const resource = change.path.match(/^player\.resources\.([^.]+)$/)?.[1];
    if (resource && typeof change.delta === "number") {
      return `${displayLabel(resource)} ${signedDelta(change.delta)}`;
    }

    const relationship = change.path.match(
      /^relationships\.player:([^.]*)\.([^.]+)$/,
    );
    if (relationship && typeof change.delta === "number") {
      const characterId = relationship[1];
      const dimension = relationship[2];
      if (!characterId || !dimension) return undefined;
      return `${displayLabel(characterId)}${
        relationshipDimensionLabels[dimension] ?? displayLabel(dimension)
      } ${signedDelta(change.delta)}`;
    }

    const clock = change.path.match(/^clocks\.([^.]+)\.progress$/)?.[1];
    if (clock && typeof change.delta === "number") {
      return `${displayLabel(clock)} ${signedDelta(change.delta)}`;
    }

    if (change.path === "player.momentum" && typeof change.delta === "number") {
      return `声势 ${signedDelta(change.delta)}`;
    }
  }

  if (change.op === "set" && change.path === "currentLocationId") {
    return `地点：${displayLabel(String(change.value))}`;
  }

  if (change.op === "tag" && change.path === "player.reputationTags") {
    return `声望：${displayLabel(String(change.value))}`;
  }

  return undefined;
};

const summarizePatchChanges = (changes: PatchChange[]): string => {
  const keyChanges = changes
    .map(summarizePatchChange)
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);
  const countSummary = `${changes.length} 项已确认变化`;
  return keyChanges.length > 0
    ? `${keyChanges.join(" · ")} · ${countSummary}`
    : countSummary;
};

export const buildChronicleTimeline = (chronicle: ChroniclePayload): ChronicleTimelineItem[] =>
  chronicle.replay.map((entry) => {
    const snapshot = chronicle.snapshots.find((item) => item.turnId === entry.id);
    const changes = entry.statePatch?.changes ?? [];
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
      patchSummary: summarizePatchChanges(changes),
      ...(entry.narration ? { detail: entry.narration } : {}),
      ...(entry.ending?.title ? { endingTitle: entry.ending.title } : {})
    };
  });
