import type {
  PlayerAction,
  TurnResolution,
  WorldState,
} from "@agentic-turnscape/shared";
import { compressMemoryLog, type MemoryCompressionOptions } from "./memory.js";

export type StoredSnapshot = {
  id: string;
  turnId?: string;
  state: WorldState;
  createdAt: string;
};

export type StoredEvent = {
  id: string;
  turnId?: string;
  kind:
    | "campaign_created"
    | "public_chronicle"
    | "hidden_chronicle"
    | "state_patch"
    | "turn_failed";
  payload: unknown;
  visible: boolean;
  createdAt: string;
};

export type StoredAgentRun = {
  id: string;
  turnId?: string;
  agentType: "npc";
  actorId: string;
  output: unknown;
  status: "complete" | "failed";
  error?: string;
  createdAt: string;
};

export type StoredMemoryLog = {
  id: string;
  turnId?: string;
  scope: "campaign" | "turn";
  subjectId?: string;
  summary: string;
  hidden: boolean;
  createdAt: string;
};

export type StoredTurn = {
  id: string;
  index: number;
  status: "pending" | "complete" | "failed";
  playerAction?: PlayerAction;
  resolution?: TurnResolution;
  createdAt: string;
  completedAt?: string;
};

export type CampaignRecord = {
  id: string;
  title: string;
  scenario: string;
  state: WorldState;
  turns: StoredTurn[];
  snapshots: StoredSnapshot[];
  events: StoredEvent[];
  agentRuns: StoredAgentRun[];
  memoryLog: StoredMemoryLog[];
  pendingAction?: PlayerAction;
  createdAt: string;
  updatedAt: string;
};

export type CampaignSummary = {
  id: string;
  title: string;
  scenario: string;
  day: number;
  phase: WorldState["time"]["phase"];
  currentLocationId: string;
  currentLocationName: string;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
  lastTurnStatus?: StoredTurn["status"];
};

export type StoredRuntimeScenario = {
  id: string;
  title: string;
  definition: unknown;
  createdAt: string;
  updatedAt: string;
};

export type MaybePromise<T> = T | Promise<T>;

export type CampaignStore = {
  create(
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
  ): MaybePromise<CampaignRecord>;
  list(limit?: number): MaybePromise<CampaignSummary[]>;
  hasCampaignsForScenario(scenarioId: string): MaybePromise<boolean>;
  listRuntimeScenarios(): MaybePromise<StoredRuntimeScenario[]>;
  saveRuntimeScenario(
    input: Pick<StoredRuntimeScenario, "id" | "title" | "definition">,
  ): MaybePromise<StoredRuntimeScenario>;
  deleteRuntimeScenario(id: string): MaybePromise<boolean>;
  get(id: string): MaybePromise<CampaignRecord | undefined>;
  setPendingAction(
    campaignId: string,
    action: PlayerAction,
  ): MaybePromise<CampaignRecord>;
  createTurn(
    campaignId: string,
    playerAction: PlayerAction,
  ): MaybePromise<StoredTurn>;
  completeTurn(
    campaignId: string,
    turnId: string,
    nextState: WorldState,
    resolution: TurnResolution,
  ): MaybePromise<StoredTurn>;
  recordCampaignProgress(
    campaignId: string,
    nextState: WorldState,
    resolution: TurnResolution,
  ): MaybePromise<StoredTurn>;
  failTurn(
    campaignId: string,
    turnId: string,
    error: string,
  ): MaybePromise<StoredTurn>;
  getTurn(
    campaignId: string,
    turnId: string,
  ): MaybePromise<StoredTurn | undefined>;
  close?: () => MaybePromise<void>;
};

const cloneState = (state: WorldState): WorldState =>
  structuredClone(state) as WorldState;
const cloneJson = <T>(value: T): T => structuredClone(value) as T;

export const summarizeCampaign = (
  campaign: Pick<
    CampaignRecord,
    "id" | "title" | "scenario" | "state" | "turns" | "createdAt" | "updatedAt"
  >,
): CampaignSummary => {
  const location = campaign.state.locations[campaign.state.currentLocationId];
  const lastTurn = campaign.turns.at(-1);
  return {
    id: campaign.id,
    title: campaign.title,
    scenario: campaign.scenario,
    day: campaign.state.time.day,
    phase: campaign.state.time.phase,
    currentLocationId: campaign.state.currentLocationId,
    currentLocationName: location?.name ?? campaign.state.currentLocationId,
    turnCount: campaign.turns.length,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    ...(lastTurn ? { lastTurnStatus: lastTurn.status } : {}),
  };
};

export class InMemoryCampaignStore implements CampaignStore {
  private campaigns = new Map<string, CampaignRecord>();
  private runtimeScenarios = new Map<string, StoredRuntimeScenario>();

  constructor(
    private readonly options: {
      memoryCompression?: MemoryCompressionOptions;
    } = {},
  ) {}

  create(
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
  ): CampaignRecord {
    const now = new Date().toISOString();
    const record: CampaignRecord = {
      ...input,
      state: cloneState(input.state),
      turns: [],
      snapshots: [
        {
          id: crypto.randomUUID(),
          state: cloneState(input.state),
          createdAt: now,
        },
      ],
      events: [
        {
          id: crypto.randomUUID(),
          kind: "campaign_created",
          payload: { title: input.title, scenario: input.scenario },
          visible: true,
          createdAt: now,
        },
      ],
      agentRuns: [],
      memoryLog: [
        {
          id: crypto.randomUUID(),
          scope: "campaign",
          summary: `${input.title} started.`,
          hidden: false,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    this.campaigns.set(record.id, record);
    return record;
  }

  get(id: string): CampaignRecord | undefined {
    return this.campaigns.get(id);
  }

  list(limit = 20): CampaignSummary[] {
    return Array.from(this.campaigns.values())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map(summarizeCampaign);
  }

  hasCampaignsForScenario(scenarioId: string): boolean {
    return Array.from(this.campaigns.values()).some(
      (campaign) => campaign.scenario === scenarioId,
    );
  }

  listRuntimeScenarios(): StoredRuntimeScenario[] {
    return Array.from(this.runtimeScenarios.values())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((scenario) => cloneJson(scenario));
  }

  saveRuntimeScenario(
    input: Pick<StoredRuntimeScenario, "id" | "title" | "definition">,
  ): StoredRuntimeScenario {
    const existing = this.runtimeScenarios.get(input.id);
    const now = new Date().toISOString();
    const record: StoredRuntimeScenario = {
      id: input.id,
      title: input.title,
      definition: cloneJson(input.definition),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.runtimeScenarios.set(record.id, record);
    return cloneJson(record);
  }

  deleteRuntimeScenario(id: string): boolean {
    return this.runtimeScenarios.delete(id);
  }

  setPendingAction(campaignId: string, action: PlayerAction): CampaignRecord {
    const campaign = this.require(campaignId);
    campaign.pendingAction = action;
    campaign.updatedAt = new Date().toISOString();
    return campaign;
  }

  createTurn(campaignId: string, playerAction: PlayerAction): StoredTurn {
    const campaign = this.require(campaignId);
    const turn: StoredTurn = {
      id: crypto.randomUUID(),
      index: campaign.turns.length + 1,
      status: "pending",
      playerAction,
      createdAt: new Date().toISOString(),
    };
    campaign.turns.push(turn);
    delete campaign.pendingAction;
    campaign.updatedAt = new Date().toISOString();
    return turn;
  }

  completeTurn(
    campaignId: string,
    turnId: string,
    nextState: WorldState,
    resolution: TurnResolution,
  ): StoredTurn {
    const campaign = this.require(campaignId);
    const turn = campaign.turns.find((item) => item.id === turnId);
    if (!turn) throw new Error(`Turn not found: ${turnId}`);
    const previousPublicEventCount = campaign.state.publicEvents.length;
    const previousHiddenEventCount = campaign.state.hiddenEvents.length;
    const completedAt = new Date().toISOString();
    turn.status = "complete";
    turn.resolution = resolution;
    turn.completedAt = completedAt;
    campaign.state = cloneState(nextState);
    campaign.snapshots.push({
      id: crypto.randomUUID(),
      turnId,
      state: cloneState(nextState),
      createdAt: completedAt,
    });
    campaign.events.push({
      id: crypto.randomUUID(),
      turnId,
      kind: "state_patch",
      payload: resolution.statePatch,
      visible: false,
      createdAt: completedAt,
    });
    for (const publicEvent of nextState.publicEvents.slice(
      previousPublicEventCount,
    )) {
      campaign.events.push({
        id: crypto.randomUUID(),
        turnId,
        kind: "public_chronicle",
        payload: publicEvent,
        visible: true,
        createdAt: completedAt,
      });
    }
    for (const hiddenEvent of nextState.hiddenEvents.slice(
      previousHiddenEventCount,
    )) {
      campaign.events.push({
        id: crypto.randomUUID(),
        turnId,
        kind: "hidden_chronicle",
        payload: hiddenEvent,
        visible: false,
        createdAt: completedAt,
      });
    }
    for (const proposal of resolution.proposals) {
      campaign.agentRuns.push({
        id: crypto.randomUUID(),
        turnId,
        agentType: "npc",
        actorId: proposal.actorId,
        output: proposal,
        status: "complete",
        createdAt: completedAt,
      });
    }
    campaign.memoryLog.push(
      {
        id: crypto.randomUUID(),
        turnId,
        scope: "turn",
        summary: resolution.publicSummary,
        hidden: false,
        createdAt: completedAt,
      },
      {
        id: crypto.randomUUID(),
        turnId,
        scope: "turn",
        summary: resolution.hiddenSummary,
        hidden: true,
        createdAt: completedAt,
      },
    );
    this.compressMemory(campaign);
    campaign.updatedAt = completedAt;
    return turn;
  }

  recordCampaignProgress(
    campaignId: string,
    nextState: WorldState,
    resolution: TurnResolution,
  ): StoredTurn {
    const campaign = this.require(campaignId);
    const previousPublicEventCount = campaign.state.publicEvents.length;
    const previousHiddenEventCount = campaign.state.hiddenEvents.length;
    const completedAt = new Date().toISOString();
    const turn: StoredTurn = {
      id: resolution.turnId,
      index: campaign.turns.length + 1,
      status: "complete",
      resolution,
      createdAt: completedAt,
      completedAt,
    };
    campaign.turns.push(turn);
    campaign.state = cloneState(nextState);
    campaign.snapshots.push({
      id: crypto.randomUUID(),
      turnId: turn.id,
      state: cloneState(nextState),
      createdAt: completedAt,
    });
    campaign.events.push({
      id: crypto.randomUUID(),
      turnId: turn.id,
      kind: "state_patch",
      payload: resolution.statePatch,
      visible: false,
      createdAt: completedAt,
    });
    for (const publicEvent of nextState.publicEvents.slice(
      previousPublicEventCount,
    )) {
      campaign.events.push({
        id: crypto.randomUUID(),
        turnId: turn.id,
        kind: "public_chronicle",
        payload: publicEvent,
        visible: true,
        createdAt: completedAt,
      });
    }
    for (const hiddenEvent of nextState.hiddenEvents.slice(
      previousHiddenEventCount,
    )) {
      campaign.events.push({
        id: crypto.randomUUID(),
        turnId: turn.id,
        kind: "hidden_chronicle",
        payload: hiddenEvent,
        visible: false,
        createdAt: completedAt,
      });
    }
    campaign.memoryLog.push({
      id: crypto.randomUUID(),
      turnId: turn.id,
      scope: "turn",
      summary: resolution.publicSummary,
      hidden: false,
      createdAt: completedAt,
    });
    this.compressMemory(campaign);
    campaign.updatedAt = completedAt;
    return turn;
  }

  failTurn(campaignId: string, turnId: string, error: string): StoredTurn {
    const campaign = this.require(campaignId);
    const turn = campaign.turns.find((item) => item.id === turnId);
    if (!turn) throw new Error(`Turn not found: ${turnId}`);
    const completedAt = new Date().toISOString();
    turn.status = "failed";
    turn.completedAt = completedAt;
    campaign.events.push({
      id: crypto.randomUUID(),
      turnId,
      kind: "turn_failed",
      payload: { error },
      visible: false,
      createdAt: completedAt,
    });
    campaign.memoryLog.push({
      id: crypto.randomUUID(),
      turnId,
      scope: "turn",
      summary: error,
      hidden: true,
      createdAt: completedAt,
    });
    this.compressMemory(campaign);
    campaign.updatedAt = completedAt;
    return turn;
  }

  getTurn(campaignId: string, turnId: string): StoredTurn | undefined {
    return this.require(campaignId).turns.find((turn) => turn.id === turnId);
  }

  private require(id: string): CampaignRecord {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new Error(`Campaign not found: ${id}`);
    return campaign;
  }

  private compressMemory(campaign: CampaignRecord) {
    campaign.memoryLog = compressMemoryLog(
      campaign.memoryLog,
      this.options.memoryCompression,
    );
  }
}
