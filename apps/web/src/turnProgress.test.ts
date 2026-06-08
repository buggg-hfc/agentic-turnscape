import { describe, expect, it } from "vitest";
import {
  buildCompletedTurnProgressEvents,
  buildTurnProgressRows,
} from "./turnProgress.js";

describe("turn progress display", () => {
  it("builds a default queued progress row while a turn is running", () => {
    expect(buildTurnProgressRows([], true)).toEqual([
      {
        title: "队列等待",
        detail: "等待后台结算回合。",
      },
    ]);
    expect(buildTurnProgressRows([], false)).toEqual([]);
  });

  it("translates SSE events into Chinese player-facing progress rows", () => {
    expect(
      buildTurnProgressRows(
        [
          { event: "turn", data: { id: "turn-1", status: "pending" } },
          { event: "pending", data: { message: "turn_waiting_for_worker" } },
          {
            event: "agent_proposals",
            data: [{ actorId: "npc_adele" }, { actorId: "npc_rowan" }],
          },
          {
            event: "referee",
            data: { publicSummary: "玩家稳住了诊所门口。" },
          },
          { event: "narration", data: { text: "街口安静下来。" } },
          { event: "done", data: { ok: true } },
        ],
        true,
      ),
    ).toEqual([
      { title: "回合任务", detail: "状态：排队中" },
      { title: "队列等待", detail: "等待后台结算回合。" },
      { title: "智能体提案", detail: "2 条提案已生成" },
      { title: "规则裁判", detail: "玩家稳住了诊所门口。" },
      { title: "叙事输出", detail: "街口安静下来。" },
      { title: "完成", detail: "公开结果已同步。" },
    ]);
  });

  it("redacts secret-looking tokens from progress details", () => {
    const secret = ["sk", "progressSecret123"].join("-");

    expect(
      buildTurnProgressRows(
        [{ event: "error", data: { message: `provider rejected ${secret}` } }],
        true,
      )[0],
    ).toEqual({
      title: "错误",
      detail: "provider rejected [API_KEY_REDACTED]",
    });
  });

  it("adds a final completion event when a turn completes after an empty event poll", () => {
    const events = buildCompletedTurnProgressEvents(
      [{ event: "pending", data: { message: "turn_waiting_for_worker" } }],
      "玩家找到了商队线索。",
    );

    expect(buildTurnProgressRows(events, false)).toEqual([
      { title: "队列等待", detail: "等待后台结算回合。" },
      { title: "完成", detail: "玩家找到了商队线索。" },
    ]);
  });
});
