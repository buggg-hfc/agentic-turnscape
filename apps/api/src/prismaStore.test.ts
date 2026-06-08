import { describe, expect, it, vi } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import { adjudicateTurn, applyStatePatch } from "@agentic-turnscape/core";
import type {
  AgentActionProposal,
  PlayerAction,
  TurnResolution,
} from "@agentic-turnscape/shared";
import { PrismaCampaignStore } from "./prismaStore.js";

type CampaignRow = {
  id: string;
  title: string;
  scenario: string;
  state: unknown;
  pendingAction: unknown;
  createdAt: Date;
  updatedAt: Date;
  turns: any[];
  snapshots: any[];
  events: any[];
  agentRuns: any[];
  memoryLog: any[];
};

type RuntimeScenarioRow = {
  id: string;
  title: string;
  definition: unknown;
  createdAt: Date;
  updatedAt: Date;
};

class FakePrismaClient {
  campaigns = new Map<string, CampaignRow>();
  runtimeScenarios = new Map<string, RuntimeScenarioRow>();
  disconnect = vi.fn();

  campaign = {
    create: async ({ data }: any) => {
      const now = new Date();
      const campaign: CampaignRow = {
        id: data.id,
        title: data.title,
        scenario: data.scenario,
        state: data.state,
        pendingAction: data.pendingAction,
        createdAt: now,
        updatedAt: now,
        turns: [],
        snapshots: [
          {
            campaignId: data.id,
            createdAt: now,
            turnId: null,
            ...data.snapshots.create,
          },
        ],
        events: [
          {
            campaignId: data.id,
            createdAt: now,
            turnId: null,
            ...data.events.create,
          },
        ],
        agentRuns: [],
        memoryLog: [
          {
            campaignId: data.id,
            createdAt: now,
            turnId: null,
            subjectId: null,
            ...data.memoryLog.create,
          },
        ],
      };
      this.campaigns.set(campaign.id, campaign);
      return this.cloneCampaign(campaign);
    },
    findUnique: async ({ where, select }: any) => {
      const campaign = this.campaigns.get(where.id);
      if (!campaign) return null;
      if (select?.id && select?.state)
        return { id: campaign.id, state: campaign.state };
      if (select?.id) return { id: campaign.id };
      return this.cloneCampaign(campaign);
    },
    findMany: async ({ take }: any) =>
      Array.from(this.campaigns.values())
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(0, take)
        .map((campaign) => this.cloneCampaign(campaign)),
    update: async ({ where, data }: any) => {
      const campaign = this.requireCampaign(where.id);
      if ("state" in data) campaign.state = data.state;
      if ("pendingAction" in data) campaign.pendingAction = data.pendingAction;
      campaign.updatedAt = new Date();
      return this.cloneCampaign(campaign);
    },
  };

  turn = {
    count: async ({ where }: any) =>
      this.requireCampaign(where.campaignId).turns.length,
    create: async ({ data }: any) => {
      const now = new Date();
      const turn = {
        createdAt: now,
        completedAt: null,
        resolution: null,
        ...data,
      };
      this.requireCampaign(data.campaignId).turns.push(turn);
      return { ...turn };
    },
    findFirst: async ({ where }: any) =>
      this.findTurn(where.campaignId, where.id),
    update: async ({ where, data }: any) => {
      const turn = this.findTurn(undefined, where.id);
      if (!turn) return null;
      Object.assign(turn, data);
      return { ...turn };
    },
  };

  snapshot = {
    create: async ({ data }: any) => {
      const row = { createdAt: new Date(), ...data };
      this.requireCampaign(data.campaignId).snapshots.push(row);
      return { ...row };
    },
  };

  event = {
    create: async ({ data }: any) => {
      const row = { createdAt: new Date(), ...data };
      this.requireCampaign(data.campaignId).events.push(row);
      return { ...row };
    },
    createMany: async ({ data }: any) => {
      for (const item of data) {
        this.requireCampaign(item.campaignId).events.push({
          createdAt: new Date(),
          ...item,
        });
      }
      return { count: data.length };
    },
  };

  agentRun = {
    createMany: async ({ data }: any) => {
      for (const item of data) {
        this.requireCampaign(item.campaignId).agentRuns.push({
          createdAt: new Date(),
          error: null,
          ...item,
        });
      }
      return { count: data.length };
    },
  };

  memoryLog = {
    findMany: async ({ where }: any) =>
      this.requireCampaign(where.campaignId).memoryLog.map((entry) => ({
        ...entry,
      })),
    deleteMany: async ({ where }: any) => {
      const campaign = this.requireCampaign(where.campaignId);
      const count = campaign.memoryLog.length;
      campaign.memoryLog = [];
      return { count };
    },
    create: async ({ data }: any) => {
      const row = {
        createdAt: new Date(),
        subjectId: null,
        turnId: null,
        ...data,
      };
      this.requireCampaign(data.campaignId).memoryLog.push(row);
      return { ...row };
    },
    createMany: async ({ data }: any) => {
      for (const item of data) {
        this.requireCampaign(item.campaignId).memoryLog.push({
          createdAt: new Date(),
          subjectId: null,
          ...item,
        });
      }
      return { count: data.length };
    },
  };

  runtimeScenario = {
    findMany: async () =>
      Array.from(this.runtimeScenarios.values())
        .sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        )
        .map((scenario) => this.cloneRuntimeScenario(scenario)),
    upsert: async ({ where, create, update }: any) => {
      const now = new Date();
      const existing = this.runtimeScenarios.get(where.id);
      if (existing) {
        existing.title = update.title;
        existing.definition = update.definition;
        existing.updatedAt = now;
        return this.cloneRuntimeScenario(existing);
      }

      const scenario: RuntimeScenarioRow = {
        id: create.id,
        title: create.title,
        definition: create.definition,
        createdAt: now,
        updatedAt: now,
      };
      this.runtimeScenarios.set(scenario.id, scenario);
      return this.cloneRuntimeScenario(scenario);
    },
    deleteMany: async ({ where }: any) => {
      const deleted = this.runtimeScenarios.delete(where.id);
      return { count: deleted ? 1 : 0 };
    },
  };

  $transaction = async <T>(callback: (tx: FakePrismaClient) => Promise<T>) =>
    callback(this);
  $disconnect = async () => this.disconnect();

  private requireCampaign(id: string): CampaignRow {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new Error(`Campaign not found: ${id}`);
    return campaign;
  }

  private findTurn(campaignId: string | undefined, turnId: string) {
    const campaigns = campaignId
      ? [this.requireCampaign(campaignId)]
      : Array.from(this.campaigns.values());
    return campaigns
      .flatMap((campaign) => campaign.turns)
      .find((turn) => turn.id === turnId);
  }

  private cloneCampaign(campaign: CampaignRow) {
    return {
      ...campaign,
      turns: campaign.turns.map((turn) => ({ ...turn })),
      snapshots: campaign.snapshots.map((snapshot) => ({ ...snapshot })),
      events: campaign.events.map((event) => ({ ...event })),
      agentRuns: campaign.agentRuns.map((run) => ({ ...run })),
      memoryLog: campaign.memoryLog.map((entry) => ({ ...entry })),
    };
  }

  private cloneRuntimeScenario(scenario: RuntimeScenarioRow) {
    return {
      ...scenario,
      definition: structuredClone(scenario.definition),
    };
  }
}

describe("PrismaCampaignStore", () => {
  it("persists campaign lifecycle records and rehydrates the store contract", async () => {
    const prisma = new FakePrismaClient();
    const store = new PrismaCampaignStore(prisma as any);
    const initialState = createBorderSevenDaysWorld();
    const action: PlayerAction = {
      actionType: "negotiate",
      label: "稳住诊所门口",
      description: "拿出隔离诊断方案，争取半天时间。",
      targetId: "npc_rowan",
      leverage: ["medical_plan", "resident_trust"],
      riskLevel: "medium",
    };
    const proposal: AgentActionProposal = {
      actorId: "npc_zhou_jin",
      intent: "协助盯防煽动者",
      actionType: "observe",
      target: "clinic",
      usedResources: ["contacts"],
      proposedAction: "周烬让熟人盯住诊所门口重复谣言的人。",
      riskLevel: "low",
      publicReason: "他熟悉边境人群里的陌生面孔。",
    };

    const campaign = await store.create({
      id: "campaign-persist",
      title: "边境七日",
      scenario: "border-seven-days",
      state: initialState,
    });
    await store.setPendingAction(campaign.id, action);
    const turn = await store.createTurn(campaign.id, action);
    const referee = adjudicateTurn({
      state: initialState,
      playerAction: action,
      proposals: [proposal],
      turnId: turn.id,
      seed: "social-chip-check",
    });
    const nextState = applyStatePatch(initialState, referee.patch);
    const resolution: TurnResolution = {
      turnId: turn.id,
      proposals: [proposal],
      statePatch: referee.patch,
      publicSummary: referee.publicSummary,
      hiddenSummary: referee.hiddenSummary,
      narration: "诊所门口的喧闹被压低，罗文暂时收起命令。",
      availableActions: [],
    };

    await store.completeTurn(campaign.id, turn.id, nextState, resolution);
    const loaded = await store.get(campaign.id);
    const summaries = await store.list();

    expect(loaded?.pendingAction).toBeUndefined();
    expect(loaded?.state.time.phase).toBe("afternoon");
    expect(loaded?.turns).toEqual([
      expect.objectContaining({ id: turn.id, status: "complete", resolution }),
    ]);
    expect(loaded?.snapshots).toHaveLength(2);
    expect(loaded?.events.map((event) => event.kind)).toEqual(
      expect.arrayContaining([
        "campaign_created",
        "state_patch",
        "public_chronicle",
        "hidden_chronicle",
      ]),
    );
    expect(loaded?.agentRuns).toEqual([
      expect.objectContaining({ actorId: "npc_zhou_jin", output: proposal }),
    ]);
    expect(loaded?.memoryLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hidden: false,
          summary: referee.publicSummary,
        }),
        expect.objectContaining({
          hidden: true,
          summary: referee.hiddenSummary,
        }),
      ]),
    );
    expect(summaries[0]).toMatchObject({
      id: campaign.id,
      scenario: "border-seven-days",
      day: 1,
      phase: "afternoon",
      currentLocationName: "阿黛尔诊所",
      turnCount: 1,
      lastTurnStatus: "complete",
    });
  });

  it("compresses persistent memory logs after long campaign progress", async () => {
    const prisma = new FakePrismaClient();
    const store = new PrismaCampaignStore(prisma as any, {
      memoryCompression: { maxTurnEntries: 6, preserveRecentTurnEntries: 2 },
    });
    const state = createBorderSevenDaysWorld();
    const campaign = await store.create({
      id: "campaign-memory-compression",
      title: "边境七日",
      scenario: "border-seven-days",
      state,
    });

    for (let index = 1; index <= 6; index += 1) {
      const action: PlayerAction = {
        actionType: "ignore",
        label: `等待第 ${index} 回合`,
        description: "让局势自行推进。",
        leverage: [],
        riskLevel: "low",
      };
      const turn = await store.createTurn(campaign.id, action);
      const resolution: TurnResolution = {
        turnId: turn.id,
        proposals: [],
        statePatch: { type: "state_patch", source: "referee", changes: [] },
        publicSummary: `persistent public ${index}`,
        hiddenSummary: `persistent hidden ${index}`,
        narration: `narration ${index}`,
        availableActions: [],
      };
      await store.completeTurn(campaign.id, turn.id, state, resolution);
    }

    const loaded = await store.get(campaign.id);
    expect(
      loaded?.memoryLog.filter((entry) => entry.scope === "turn"),
    ).toHaveLength(4);
    expect(loaded?.memoryLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "campaign",
          hidden: false,
          subjectId: "compressed:public",
        }),
        expect.objectContaining({
          scope: "campaign",
          hidden: true,
          subjectId: "compressed:hidden",
        }),
      ]),
    );
  });

  it("persists runtime creator scenario definitions", async () => {
    const prisma = new FakePrismaClient();
    const store = new PrismaCampaignStore(prisma as any);
    const definition = {
      id: "runtime-pack",
      title: "Runtime Pack",
      premise: "A creator scenario saved outside the browser.",
      locations: [],
    };

    await expect(store.listRuntimeScenarios()).resolves.toEqual([]);

    const saved = await store.saveRuntimeScenario({
      id: "runtime-pack",
      title: "Runtime Pack",
      definition,
    });
    const updated = await store.saveRuntimeScenario({
      id: "runtime-pack",
      title: "Runtime Pack Updated",
      definition: { ...definition, title: "Runtime Pack Updated" },
    });

    expect(saved).toMatchObject({
      id: "runtime-pack",
      title: "Runtime Pack",
      definition,
    });
    expect(updated).toMatchObject({
      id: "runtime-pack",
      title: "Runtime Pack Updated",
    });
    await expect(store.listRuntimeScenarios()).resolves.toEqual([
      expect.objectContaining({
        id: "runtime-pack",
        title: "Runtime Pack Updated",
        definition: expect.objectContaining({ title: "Runtime Pack Updated" }),
      }),
    ]);
    await expect(store.deleteRuntimeScenario("runtime-pack")).resolves.toBe(
      true,
    );
    await expect(store.deleteRuntimeScenario("runtime-pack")).resolves.toBe(
      false,
    );
    await expect(store.listRuntimeScenarios()).resolves.toEqual([]);
  });

  it("marks failed queued turns as the latest persistent campaign activity", async () => {
    vi.useFakeTimers();
    try {
      const prisma = new FakePrismaClient();
      const store = new PrismaCampaignStore(prisma as any);
      const action: PlayerAction = {
        actionType: "investigate",
        label: "追查失败任务",
        description: "测试失败回合是否会进入恢复列表。",
        targetId: "old_outpost",
        leverage: [],
        riskLevel: "medium",
      };

      vi.setSystemTime(new Date("2026-06-08T00:00:00.000Z"));
      const failedCampaign = await store.create({
        id: "campaign-failed-latest",
        title: "失败恢复",
        scenario: "border-seven-days",
        state: createBorderSevenDaysWorld(),
      });
      const turn = await store.createTurn(failedCampaign.id, action);

      vi.setSystemTime(new Date("2026-06-08T00:05:00.000Z"));
      await store.create({
        id: "campaign-older-active",
        title: "较新的正常战役",
        scenario: "border-seven-days",
        state: createBorderSevenDaysWorld(),
      });

      vi.setSystemTime(new Date("2026-06-08T00:10:00.000Z"));
      await store.failTurn(
        failedCampaign.id,
        turn.id,
        "LLM provider timed out",
      );

      const loaded = await store.get(failedCampaign.id);
      expect(loaded?.turns[0]).toEqual(
        expect.objectContaining({
          id: turn.id,
          status: "failed",
          completedAt: "2026-06-08T00:10:00.000Z",
        }),
      );
      expect(loaded?.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            turnId: turn.id,
            kind: "turn_failed",
            visible: false,
            payload: { error: "LLM provider timed out" },
          }),
        ]),
      );
      expect(loaded?.memoryLog).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            turnId: turn.id,
            hidden: true,
            summary: "LLM provider timed out",
          }),
        ]),
      );

      await expect(store.list()).resolves.toEqual([
        expect.objectContaining({
          id: failedCampaign.id,
          lastTurnStatus: "failed",
          updatedAt: "2026-06-08T00:10:00.000Z",
        }),
        expect.objectContaining({ id: "campaign-older-active" }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("can close the underlying Prisma connection", async () => {
    const prisma = new FakePrismaClient();
    const store = new PrismaCampaignStore(prisma as any);

    await store.close();

    expect(prisma.disconnect).toHaveBeenCalledOnce();
  });
});
