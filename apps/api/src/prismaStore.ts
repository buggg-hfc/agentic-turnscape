import { Prisma, PrismaClient } from "@agentic-turnscape/core/prisma";
import {
  AgentActionProposalSchema,
  PlayerActionSchema,
  TurnResolutionSchema,
  WorldStateSchema,
  type PlayerAction,
  type TurnResolution,
  type WorldState,
} from "@agentic-turnscape/shared";
import { compressMemoryLog, type MemoryCompressionOptions } from "./memory.js";
import { summarizeCampaign } from "./store.js";
import type {
  CampaignRecord,
  CampaignStore,
  StoredAgentRun,
  StoredEvent,
  StoredMemoryLog,
  StoredRuntimeScenario,
  StoredSnapshot,
  StoredTurn,
} from "./store.js";

const includeCampaignRelations = {
  turns: { orderBy: { index: "asc" } },
  snapshots: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
  agentRuns: { orderBy: { createdAt: "asc" } },
  memoryLog: { orderBy: { createdAt: "asc" } },
} as const;

const toJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const fromDate = (value: Date): string => value.toISOString();
const isDatabaseNull = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === Prisma.DbNull ||
  value === Prisma.JsonNull ||
  value === (Prisma as any).AnyNull;

const optionalAction = (value: unknown): PlayerAction | undefined => {
  if (isDatabaseNull(value)) return undefined;
  return PlayerActionSchema.parse(value);
};

const optionalResolution = (value: unknown): TurnResolution | undefined => {
  if (isDatabaseNull(value)) return undefined;
  return TurnResolutionSchema.parse(value);
};

const toStoredTurn = (record: any): StoredTurn => {
  const playerAction = optionalAction(record.playerAction);
  const resolution = optionalResolution(record.resolution);
  return {
    id: record.id,
    index: record.index,
    status: record.status,
    createdAt: fromDate(record.createdAt),
    ...(playerAction ? { playerAction } : {}),
    ...(resolution ? { resolution } : {}),
    ...(record.completedAt
      ? { completedAt: fromDate(record.completedAt) }
      : {}),
  };
};

const toStoredSnapshot = (record: any): StoredSnapshot => ({
  id: record.id,
  state: WorldStateSchema.parse(record.state),
  createdAt: fromDate(record.createdAt),
  ...(record.turnId ? { turnId: record.turnId } : {}),
});

const toStoredEvent = (record: any): StoredEvent => ({
  id: record.id,
  kind: record.kind,
  payload: record.payload,
  visible: record.visible,
  createdAt: fromDate(record.createdAt),
  ...(record.turnId ? { turnId: record.turnId } : {}),
});

const toStoredAgentRun = (record: any): StoredAgentRun => ({
  id: record.id,
  agentType: record.agentType,
  actorId: record.actorId ?? "unknown",
  output: record.output,
  status: record.status,
  createdAt: fromDate(record.createdAt),
  ...(record.turnId ? { turnId: record.turnId } : {}),
  ...(record.error ? { error: record.error } : {}),
});

const toStoredMemoryLog = (record: any): StoredMemoryLog => ({
  id: record.id,
  scope: record.scope,
  summary: record.summary,
  hidden: record.hidden,
  createdAt: fromDate(record.createdAt),
  ...(record.turnId ? { turnId: record.turnId } : {}),
  ...(record.subjectId ? { subjectId: record.subjectId } : {}),
});

const toStoredRuntimeScenario = (record: any): StoredRuntimeScenario => ({
  id: record.id,
  title: record.title,
  definition: record.definition,
  createdAt: fromDate(record.createdAt),
  updatedAt: fromDate(record.updatedAt),
});

export class PrismaCampaignStore implements CampaignStore {
  constructor(
    private readonly prisma: PrismaClient = new PrismaClient(),
    private readonly options: {
      memoryCompression?: MemoryCompressionOptions;
    } = {},
  ) {}

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async create(
    input: Omit<
      CampaignRecord,
      | "createdAt"
      | "updatedAt"
      | "turns"
      | "snapshots"
      | "events"
      | "agentRuns"
      | "memoryLog"
    >,
  ): Promise<CampaignRecord> {
    const record = await this.prisma.campaign.create({
      data: {
        id: input.id,
        title: input.title,
        scenario: input.scenario,
        state: toJson(input.state),
        pendingAction: Prisma.DbNull,
        snapshots: {
          create: {
            id: crypto.randomUUID(),
            state: toJson(input.state),
          },
        },
        events: {
          create: {
            id: crypto.randomUUID(),
            kind: "campaign_created",
            payload: toJson({ title: input.title, scenario: input.scenario }),
            visible: true,
          },
        },
        memoryLog: {
          create: {
            id: crypto.randomUUID(),
            scope: "campaign",
            summary: `${input.title} started.`,
            hidden: false,
          },
        },
      },
      include: includeCampaignRelations,
    });
    return this.toCampaign(record);
  }

  async get(id: string): Promise<CampaignRecord | undefined> {
    const record = await this.prisma.campaign.findUnique({
      where: { id },
      include: includeCampaignRelations,
    });
    return record ? this.toCampaign(record) : undefined;
  }

  async list(limit = 20) {
    const records = await this.prisma.campaign.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        turns: { orderBy: { index: "asc" } },
      },
    });
    return records.map((record: any) =>
      summarizeCampaign({
        id: record.id,
        title: record.title,
        scenario: record.scenario,
        state: WorldStateSchema.parse(record.state),
        turns: (record.turns ?? []).map(toStoredTurn),
        createdAt: fromDate(record.createdAt),
        updatedAt: fromDate(record.updatedAt),
      }),
    );
  }

  async hasCampaignsForScenario(scenarioId: string): Promise<boolean> {
    return (
      (await this.prisma.campaign.count({ where: { scenario: scenarioId } })) >
      0
    );
  }

  async listRuntimeScenarios(): Promise<StoredRuntimeScenario[]> {
    const records = await this.prisma.runtimeScenario.findMany({
      orderBy: { createdAt: "asc" },
    });
    return records.map(toStoredRuntimeScenario);
  }

  async saveRuntimeScenario(
    input: Pick<StoredRuntimeScenario, "id" | "title" | "definition">,
  ): Promise<StoredRuntimeScenario> {
    const record = await this.prisma.runtimeScenario.upsert({
      where: { id: input.id },
      update: {
        title: input.title,
        definition: toJson(input.definition),
      },
      create: {
        id: input.id,
        title: input.title,
        definition: toJson(input.definition),
      },
    });
    return toStoredRuntimeScenario(record);
  }

  async deleteRuntimeScenario(id: string): Promise<boolean> {
    const deleted = await this.prisma.runtimeScenario.deleteMany({
      where: { id },
    });
    return deleted.count > 0;
  }

  async setPendingAction(
    campaignId: string,
    action: PlayerAction,
  ): Promise<CampaignRecord> {
    const record = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { pendingAction: toJson(action) },
      include: includeCampaignRelations,
    });
    return this.toCampaign(record);
  }

  async createTurn(
    campaignId: string,
    playerAction: PlayerAction,
  ): Promise<StoredTurn> {
    const turn = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true },
      });
      if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
      const index = (await tx.turn.count({ where: { campaignId } })) + 1;
      const created = await tx.turn.create({
        data: {
          id: crypto.randomUUID(),
          campaignId,
          index,
          status: "pending",
          playerAction: toJson(playerAction),
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { pendingAction: Prisma.DbNull },
      });
      return created;
    });
    return toStoredTurn(turn);
  }

  async completeTurn(
    campaignId: string,
    turnId: string,
    nextState: WorldState,
    resolution: TurnResolution,
  ): Promise<StoredTurn> {
    const completedTurn = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, state: true },
      });
      if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
      const existingTurn = await tx.turn.findFirst({
        where: { id: turnId, campaignId },
      });
      if (!existingTurn) throw new Error(`Turn not found: ${turnId}`);

      const previousState = WorldStateSchema.parse(campaign.state);
      const completedAt = new Date();
      const updatedTurn = await tx.turn.update({
        where: { id: turnId },
        data: {
          status: "complete",
          resolution: toJson(resolution),
          completedAt,
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { state: toJson(nextState) },
      });
      await tx.snapshot.create({
        data: {
          id: crypto.randomUUID(),
          campaignId,
          turnId,
          state: toJson(nextState),
          createdAt: completedAt,
        },
      });
      await tx.event.create({
        data: {
          id: crypto.randomUUID(),
          campaignId,
          turnId,
          kind: "state_patch",
          payload: toJson(resolution.statePatch),
          visible: false,
          createdAt: completedAt,
        },
      });

      const publicEvents = nextState.publicEvents.slice(
        previousState.publicEvents.length,
      );
      const hiddenEvents = nextState.hiddenEvents.slice(
        previousState.hiddenEvents.length,
      );
      if (publicEvents.length > 0) {
        await tx.event.createMany({
          data: publicEvents.map((event) => ({
            id: crypto.randomUUID(),
            campaignId,
            turnId,
            kind: "public_chronicle",
            payload: toJson(event),
            visible: true,
            createdAt: completedAt,
          })),
        });
      }
      if (hiddenEvents.length > 0) {
        await tx.event.createMany({
          data: hiddenEvents.map((event) => ({
            id: crypto.randomUUID(),
            campaignId,
            turnId,
            kind: "hidden_chronicle",
            payload: toJson(event),
            visible: false,
            createdAt: completedAt,
          })),
        });
      }
      await tx.agentRun.createMany({
        data: resolution.proposals.map((proposal) => ({
          id: crypto.randomUUID(),
          campaignId,
          turnId,
          agentType: "npc",
          actorId: proposal.actorId,
          prompt: "limited_observation",
          output: toJson(AgentActionProposalSchema.parse(proposal)),
          status: "complete",
          createdAt: completedAt,
        })),
      });
      await tx.memoryLog.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            campaignId,
            turnId,
            scope: "turn",
            summary: resolution.publicSummary,
            hidden: false,
            createdAt: completedAt,
          },
          {
            id: crypto.randomUUID(),
            campaignId,
            turnId,
            scope: "turn",
            summary: resolution.hiddenSummary,
            hidden: true,
            createdAt: completedAt,
          },
        ],
      });
      await this.compressMemory(tx, campaignId);
      return updatedTurn;
    });
    return toStoredTurn(completedTurn);
  }

  async recordCampaignProgress(
    campaignId: string,
    nextState: WorldState,
    resolution: TurnResolution,
  ): Promise<StoredTurn> {
    const completedTurn = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, state: true },
      });
      if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

      const previousState = WorldStateSchema.parse(campaign.state);
      const completedAt = new Date();
      const index = (await tx.turn.count({ where: { campaignId } })) + 1;
      const createdTurn = await tx.turn.create({
        data: {
          id: resolution.turnId,
          campaignId,
          index,
          status: "complete",
          resolution: toJson(resolution),
          completedAt,
          createdAt: completedAt,
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { state: toJson(nextState) },
      });
      await tx.snapshot.create({
        data: {
          id: crypto.randomUUID(),
          campaignId,
          turnId: createdTurn.id,
          state: toJson(nextState),
          createdAt: completedAt,
        },
      });
      await tx.event.create({
        data: {
          id: crypto.randomUUID(),
          campaignId,
          turnId: createdTurn.id,
          kind: "state_patch",
          payload: toJson(resolution.statePatch),
          visible: false,
          createdAt: completedAt,
        },
      });

      const publicEvents = nextState.publicEvents.slice(
        previousState.publicEvents.length,
      );
      const hiddenEvents = nextState.hiddenEvents.slice(
        previousState.hiddenEvents.length,
      );
      if (publicEvents.length > 0) {
        await tx.event.createMany({
          data: publicEvents.map((event) => ({
            id: crypto.randomUUID(),
            campaignId,
            turnId: createdTurn.id,
            kind: "public_chronicle",
            payload: toJson(event),
            visible: true,
            createdAt: completedAt,
          })),
        });
      }
      if (hiddenEvents.length > 0) {
        await tx.event.createMany({
          data: hiddenEvents.map((event) => ({
            id: crypto.randomUUID(),
            campaignId,
            turnId: createdTurn.id,
            kind: "hidden_chronicle",
            payload: toJson(event),
            visible: false,
            createdAt: completedAt,
          })),
        });
      }
      await tx.memoryLog.create({
        data: {
          id: crypto.randomUUID(),
          campaignId,
          turnId: createdTurn.id,
          scope: "turn",
          summary: resolution.publicSummary,
          hidden: false,
          createdAt: completedAt,
        },
      });
      await this.compressMemory(tx, campaignId);
      return createdTurn;
    });
    return toStoredTurn(completedTurn);
  }

  async failTurn(
    campaignId: string,
    turnId: string,
    error: string,
  ): Promise<StoredTurn> {
    const failedTurn = await this.prisma.$transaction(async (tx) => {
      const existingTurn = await tx.turn.findFirst({
        where: { id: turnId, campaignId },
      });
      if (!existingTurn) throw new Error(`Turn not found: ${turnId}`);
      const completedAt = new Date();
      const updatedTurn = await tx.turn.update({
        where: { id: turnId },
        data: {
          status: "failed",
          completedAt,
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { pendingAction: Prisma.DbNull },
      });
      await tx.event.create({
        data: {
          id: crypto.randomUUID(),
          campaignId,
          turnId,
          kind: "turn_failed",
          payload: toJson({ error }),
          visible: false,
          createdAt: completedAt,
        },
      });
      await tx.memoryLog.create({
        data: {
          id: crypto.randomUUID(),
          campaignId,
          turnId,
          scope: "turn",
          summary: error,
          hidden: true,
          createdAt: completedAt,
        },
      });
      await this.compressMemory(tx, campaignId);
      return updatedTurn;
    });
    return toStoredTurn(failedTurn);
  }

  async getTurn(
    campaignId: string,
    turnId: string,
  ): Promise<StoredTurn | undefined> {
    const turn = await this.prisma.turn.findFirst({
      where: { id: turnId, campaignId },
    });
    return turn ? toStoredTurn(turn) : undefined;
  }

  private toCampaign(record: any): CampaignRecord {
    const pendingAction = optionalAction(record.pendingAction);
    return {
      id: record.id,
      title: record.title,
      scenario: record.scenario,
      state: WorldStateSchema.parse(record.state),
      turns: (record.turns ?? []).map(toStoredTurn),
      snapshots: (record.snapshots ?? []).map(toStoredSnapshot),
      events: (record.events ?? []).map(toStoredEvent),
      agentRuns: (record.agentRuns ?? []).map(toStoredAgentRun),
      memoryLog: (record.memoryLog ?? []).map(toStoredMemoryLog),
      createdAt: fromDate(record.createdAt),
      updatedAt: fromDate(record.updatedAt),
      ...(pendingAction ? { pendingAction } : {}),
    };
  }

  private async compressMemory(tx: any, campaignId: string): Promise<void> {
    const rows = await tx.memoryLog.findMany({
      where: { campaignId },
      orderBy: { createdAt: "asc" },
    });
    const current = rows.map(toStoredMemoryLog);
    const compressed = compressMemoryLog(
      current,
      this.options.memoryCompression,
    );
    const unchanged =
      compressed.length === current.length &&
      compressed.every((entry, index) => entry.id === current[index]?.id);
    if (unchanged) return;

    await tx.memoryLog.deleteMany({ where: { campaignId } });
    if (compressed.length === 0) return;
    await tx.memoryLog.createMany({
      data: compressed.map((entry) => ({
        id: entry.id,
        campaignId,
        scope: entry.scope,
        summary: entry.summary,
        hidden: entry.hidden,
        createdAt: new Date(entry.createdAt),
        ...(entry.turnId ? { turnId: entry.turnId } : {}),
        ...(entry.subjectId ? { subjectId: entry.subjectId } : {}),
      })),
    });
  }
}
