import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import type { TurnResolution } from "@agentic-turnscape/shared";
import { compressMemoryLog } from "./memory.js";
import { InMemoryCampaignStore, type StoredMemoryLog } from "./store.js";

const memoryEntry = (index: number, hidden: boolean, summary: string): StoredMemoryLog => ({
  id: `${hidden ? "hidden" : "public"}-${index}`,
  turnId: `turn-${index}`,
  scope: "turn",
  summary,
  hidden,
  createdAt: new Date(index * 1000).toISOString()
});

describe("memory compression", () => {
  it("compresses old public and hidden memories separately without leaking hidden facts", () => {
    const memoryLog: StoredMemoryLog[] = [
      { id: "campaign-start", scope: "campaign", summary: "边境七日 started.", hidden: false, createdAt: new Date(0).toISOString() },
      ...Array.from({ length: 6 }, (_, index) => memoryEntry(index + 1, false, `public consequence ${index + 1}`)),
      ...Array.from({ length: 6 }, (_, index) => memoryEntry(index + 1, true, `hidden truth ${index + 1}`))
    ];

    const compressed = compressMemoryLog(memoryLog, {
      maxTurnEntries: 4,
      preserveRecentTurnEntries: 2,
      idFactory: (kind) => `compressed-${kind}`,
      now: () => "compressed-now"
    });

    const publicSummary = compressed.find((entry) => entry.id === "compressed-public");
    const hiddenSummary = compressed.find((entry) => entry.id === "compressed-hidden");

    expect(publicSummary).toMatchObject({ scope: "campaign", hidden: false, subjectId: "compressed:public" });
    expect(publicSummary?.summary).toContain("public consequence 1");
    expect(publicSummary?.summary).not.toContain("hidden truth");
    expect(hiddenSummary).toMatchObject({ scope: "campaign", hidden: true, subjectId: "compressed:hidden" });
    expect(hiddenSummary?.summary).toContain("hidden truth 1");
    expect(compressed.filter((entry) => entry.scope === "turn")).toHaveLength(4);
  });

  it("leaves short memory logs untouched", () => {
    const memoryLog = [memoryEntry(1, false, "public consequence"), memoryEntry(1, true, "hidden truth")];

    expect(compressMemoryLog(memoryLog, { maxTurnEntries: 4 })).toEqual(memoryLog);
  });

  it("compresses campaign memory automatically after many completed turns", () => {
    const store = new InMemoryCampaignStore({ memoryCompression: { maxTurnEntries: 6, preserveRecentTurnEntries: 2 } });
    const state = createBorderSevenDaysWorld();
    const campaign = store.create({
      id: "memory-campaign",
      title: "边境七日",
      scenario: "border-seven-days",
      state
    });

    for (let index = 1; index <= 6; index += 1) {
      const turn = store.createTurn(campaign.id, {
        actionType: "ignore",
        label: `观察第 ${index} 回合`,
        description: "让局势自行推进。",
        leverage: [],
        riskLevel: "low"
      });
      const resolution: TurnResolution = {
        turnId: turn.id,
        proposals: [],
        statePatch: { type: "state_patch", source: "referee", changes: [] },
        publicSummary: `public turn ${index}`,
        hiddenSummary: `hidden turn ${index}`,
        narration: `narration ${index}`,
        availableActions: []
      };
      store.completeTurn(campaign.id, turn.id, state, resolution);
    }

    const loaded = store.get(campaign.id);
    expect(loaded?.memoryLog.filter((entry) => entry.scope === "turn")).toHaveLength(4);
    expect(loaded?.memoryLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scope: "campaign", hidden: false, subjectId: "compressed:public" }),
        expect.objectContaining({ scope: "campaign", hidden: true, subjectId: "compressed:hidden" })
      ])
    );
  });
});
