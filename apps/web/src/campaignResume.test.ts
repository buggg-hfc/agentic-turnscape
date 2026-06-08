import { describe, expect, it } from "vitest";
import type { CampaignSummary } from "./api.js";
import { formatCampaignProgress } from "./campaignResume.js";

const summary: CampaignSummary = {
  id: "campaign-1",
  title: "边境七日",
  scenario: "border-seven-days",
  day: 2,
  phase: "evening",
  currentLocationId: "clinic",
  currentLocationName: "边境诊所",
  turnCount: 3,
  lastTurnStatus: "complete",
  createdAt: "2026-06-02T00:00:00.000Z",
  updatedAt: "2026-06-02T01:00:00.000Z"
};

describe("campaign resume helpers", () => {
  it("formats visible progress without exposing hidden campaign data", () => {
    expect(formatCampaignProgress(summary)).toBe("第 2 天 · 傍晚 · 边境诊所 · 3 回合");
  });

  it("surfaces recoverable pending and failed turn states", () => {
    expect(formatCampaignProgress({ ...summary, lastTurnStatus: "pending" })).toBe(
      "第 2 天 · 傍晚 · 边境诊所 · 3 回合 · 结算中",
    );
    expect(formatCampaignProgress({ ...summary, lastTurnStatus: "failed" })).toBe(
      "第 2 天 · 傍晚 · 边境诊所 · 3 回合 · 上回合失败",
    );
  });

  it("marks new campaigns before the first resolved turn", () => {
    const { lastTurnStatus, ...newCampaign } = summary;
    expect(formatCampaignProgress({ ...newCampaign, turnCount: 0 })).toBe("第 2 天 · 傍晚 · 边境诊所 · 未行动");
    expect(lastTurnStatus).toBe("complete");
  });
});
