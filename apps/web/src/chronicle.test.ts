import { describe, expect, it } from "vitest";
import type { ChroniclePayload } from "./api.js";
import { buildChronicleTimeline } from "./chronicle.js";

describe("chronicle timeline view model", () => {
  it("connects replay entries to snapshots and referee patch summaries", () => {
    const payload: ChroniclePayload = {
      publicEvents: [
        {
          id: "evt-1",
          turnId: "turn-1",
          day: 1,
          phase: "morning",
          title: "Clinic held",
          body: "Patients stayed inside the clinic.",
          tags: ["clinic"],
          createdAt: "2026-06-02T00:00:00.000Z"
        }
      ],
      revealedHiddenEvents: [],
      snapshots: [
        {
          id: "snap-0",
          day: 1,
          phase: "morning",
          currentLocationId: "clinic",
          createdAt: "2026-06-02T00:00:00.000Z"
        },
        {
          id: "snap-1",
          turnId: "turn-1",
          day: 1,
          phase: "afternoon",
          currentLocationId: "clinic",
          createdAt: "2026-06-02T00:01:00.000Z"
        }
      ],
      replay: [
        {
          id: "turn-1",
          index: 1,
          playerAction: {
            actionType: "protect",
            label: "Support the clinic cure",
            description: "Protect the patients.",
            leverage: [],
            riskLevel: "medium"
          },
          publicSummary: "The clinic cure effort gains time.",
          narration: "Adele closes the ledger and nods.",
          statePatch: {
            type: "state_patch",
            source: "referee",
            changes: [
              { op: "set", path: "time.phase", value: "afternoon", reason: "time advances" },
              { op: "inc", path: "player.resources.intel", delta: -1, reason: "spent intel" },
              { op: "inc", path: "relationships.player:npc_adele.trust", delta: 1, reason: "Adele saw the player protect patients" },
              { op: "inc", path: "clocks.plague_spread.progress", delta: -1, reason: "slowed plague" }
            ]
          }
        }
      ],
      turns: [
        {
          id: "turn-1",
          index: 1,
          status: "complete",
          narration: "Adele closes the ledger and nods."
        }
      ]
    };

    expect(buildChronicleTimeline(payload)).toEqual([
      {
        id: "turn-1",
        title: "第 1 回合：支援诊所治疗",
        body: "The clinic cure effort gains time.",
        detail: "Adele closes the ledger and nods.",
        meta: "第 1 天 · 午后 · 诊所",
        patchSummary: "情报 -1 · 阿黛尔信任 +1 · 瘟疫扩散 -1 · 4 项已确认变化"
      }
    ]);
  });
});
