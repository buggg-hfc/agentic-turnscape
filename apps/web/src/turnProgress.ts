import type { TurnProgressEvent } from "./api.js";

export type TurnProgressRow = {
  title: string;
  detail: string;
};

const secretPattern = /sk-[A-Za-z0-9]+/g;

const progressTitle: Record<string, string> = {
  turn: "回合任务",
  pending: "队列等待",
  campaign_progress: "战役推进",
  agent_proposals: "智能体提案",
  referee: "规则裁判",
  narration: "叙事输出",
  done: "完成",
  error: "错误",
};

const statusLabel: Record<string, string> = {
  pending: "排队中",
  complete: "已完成",
  failed: "失败",
};

const messageLabel: Record<string, string> = {
  turn_waiting_for_worker: "等待后台结算回合。",
  queued_turn_failed: "后台结算失败。可以选择其他行动继续推进。",
};

const redactProgressSecrets = (value: string): string =>
  value.replace(secretPattern, "[API_KEY_REDACTED]");

const stringDetail = (value: string): string =>
  redactProgressSecrets(messageLabel[value] ?? value);

const detailFromData = (event: TurnProgressEvent): string => {
  const data = event.data as Record<string, unknown> | unknown[] | null;
  if (!data) return "";
  if (Array.isArray(data)) return `${data.length} 条提案已生成`;
  if (typeof data.message === "string") return stringDetail(data.message);
  if (typeof data.status === "string") {
    return `状态：${statusLabel[data.status] ?? data.status}`;
  }
  if (typeof data.publicSummary === "string") {
    return stringDetail(data.publicSummary);
  }
  if (typeof data.text === "string") return stringDetail(data.text);
  if (event.event === "done" && data.ok === true) return "公开结果已同步。";
  return "";
};

export const buildTurnProgressRows = (
  events: TurnProgressEvent[],
  running: boolean,
): TurnProgressRow[] => {
  const visibleEvents =
    events.length > 0
      ? events
      : running
        ? [{ event: "pending", data: { message: "turn_waiting_for_worker" } }]
        : [];

  return visibleEvents.map((event) => ({
    title: progressTitle[event.event] ?? event.event,
    detail: detailFromData(event),
  }));
};

export const buildCompletedTurnProgressEvents = (
  events: TurnProgressEvent[],
  publicSummary?: string,
): TurnProgressEvent[] => {
  if (events.some((event) => event.event === "done" || event.event === "error")) {
    return events;
  }

  return [
    ...events,
    {
      event: "done",
      data: publicSummary ? { publicSummary } : { ok: true },
    },
  ];
};

export const buildResumeTurnProgressEvents = (lastTurn?: {
  id?: string;
  status?: string;
}): TurnProgressEvent[] => {
  if (!lastTurn || lastTurn.status === "complete") return [];
  if (lastTurn.status === "pending") {
    return [
      { event: "turn", data: { id: lastTurn.id, status: "pending" } },
      {
        event: "pending",
        data: { id: lastTurn.id, message: "turn_waiting_for_worker" },
      },
    ];
  }
  if (lastTurn.status === "failed") {
    return [
      { event: "turn", data: { id: lastTurn.id, status: "failed" } },
      {
        event: "error",
        data: { id: lastTurn.id, message: "queued_turn_failed" },
      },
    ];
  }
  return [];
};
