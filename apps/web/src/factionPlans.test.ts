import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { buildFactionPlanSummaries } from "./factionPlans.js";

const mustGet = <T>(value: T | undefined, id: string): T => {
  if (!value) throw new Error(`Missing test fixture: ${id}`);
  return value;
};

describe("faction plan view model", () => {
  it("summarizes visible faction plans, leaders, clocks, and strongest resources", () => {
    const state = createBorderSevenDaysWorld();
    mustGet(state.factions.frontier_guild, "frontier_guild").resources.legitimacy = 7;
    mustGet(state.factions.blackstone_consortium, "blackstone_consortium").resources.contracts = 6;
    mustGet(state.factions.rift_cult, "rift_cult").resources.believers = 8;

    const summaries = buildFactionPlanSummaries(state);

    expect(summaries).toHaveLength(3);
    expect(summaries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "rift_cult",
        name: "裂隙教团",
        leaderName: "无面司祭",
        plan: "收集感染者并准备仪式",
        clockLabel: "教团仪式 0/6",
        resourceBadges: ["believers 8", "relics 3"],
      }),
      expect.objectContaining({
        id: "frontier_guild",
        name: "边境公会",
        leaderName: "罗文",
        plan: "控制感染者并调查失踪商队",
        clockLabel: "瘟疫扩散 0/8",
        resourceBadges: ["legitimacy 7", "guards 6"],
      }),
      expect.objectContaining({
        id: "blackstone_consortium",
        name: "黑石商会",
        leaderName: "曼洛",
        plan: "完成矿区收购并转移瘟疫责任",
        clockLabel: "商会控制矿区 0/5",
        resourceBadges: ["money 9", "contracts 6"],
      }),
    ]));
  });

  it("moves factions with advanced clocks to the top of the visible plan list", () => {
    const state = createBorderSevenDaysWorld();
    mustGet(state.clocks.mine_takeover, "mine_takeover").progress = 5;

    const [first] = buildFactionPlanSummaries(state);

    expect(first).toMatchObject({
      id: "blackstone_consortium",
      clockLabel: "商会控制矿区 5/5",
    });
  });
});
