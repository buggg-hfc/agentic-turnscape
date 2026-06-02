import type {
  LlmConfig,
  PlayerAction,
  TransparencyMode,
  TurnResolution,
  WorldState,
} from "@agentic-turnscape/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export type CampaignPayload = {
  campaignId: string;
  title?: string;
  scenario?: string;
  scenarioStatus: {
    dayPlan?: {
      day: number;
      mainEvent: string;
      defaultLocationId: string;
      sceneIds: string[];
      clockPressure: string[];
    };
    ending?: {
      id: string;
      title: string;
      summary: string;
    };
    sceneCounts: {
      combat: number;
      social: number;
      endings: number;
    };
    campaignArc?: {
      chapterCount: number;
      chapterNumber: number;
      currentChapter: {
        id: string;
        title: string;
        focus: string;
        unlocks: string[];
      };
      baseFacilities: string[];
      factionFronts: string[];
    };
  };
  state: WorldState;
  availableActions: PlayerAction[];
  pendingAction?: PlayerAction;
  lastTurn?: {
    id: string;
    index: number;
    status: string;
    resolution?: TurnResolution;
  };
};

export type ScenarioSummary = {
  id: string;
  title: string;
  counts: {
    combat: number;
    social: number;
    endings: number;
  };
  campaignArc?: {
    chapterCount: number;
    baseFacilities: string[];
    factionFronts: string[];
  };
};

export type ScenarioCatalogPayload = {
  scenarios: ScenarioSummary[];
};

export type ScenarioImportPayload = {
  scenario: ScenarioSummary;
};

export type ScenarioDeletePayload = {
  deleted: boolean;
  scenarioId: string;
};

export type ScenarioExportPayload = {
  scenarioId: string;
  definition: Record<string, unknown>;
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
  lastTurnStatus?: string;
};

export type CampaignListPayload = {
  campaigns: CampaignSummary[];
};

export type RunTurnPayload = CampaignPayload & {
  turnId: string;
  status: string;
  resolution?: TurnResolution;
  queued?: boolean;
};

export type LongCampaignProgressionRequest = {
  completedQuestIds?: string[];
  baseInvestments?: Array<{
    facilityId: string;
    supplies?: number;
    money?: number;
  }>;
  training?: {
    skill: string;
    experience: number;
  };
  factionFronts?: Array<{
    factionId: string;
    influenceDelta?: number;
    pressureDelta?: number;
  }>;
};

export type ChroniclePayload = {
  publicEvents: WorldState["publicEvents"];
  revealedHiddenEvents: WorldState["hiddenEvents"];
  snapshots: Array<{
    id: string;
    turnId?: string;
    day: number;
    phase: WorldState["time"]["phase"];
    currentLocationId: string;
    createdAt: string;
  }>;
  replay: Array<{
    id: string;
    index: number;
    playerAction?: PlayerAction;
    publicSummary?: string;
    narration?: string;
    statePatch?: TurnResolution["statePatch"];
    ending?: TurnResolution["ending"];
  }>;
  turns: Array<{
    id: string;
    index: number;
    status: string;
    narration?: string;
  }>;
};

export type TurnProgressEvent = {
  event: string;
  data: unknown;
};

const json = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
};

const text = async (url: string, init?: RequestInit): Promise<string> => {
  const response = await fetch(`${API_BASE}${url}`, init);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.text();
};

const transparencyQuery = (transparency?: TransparencyMode) =>
  transparency ? `?transparency=${encodeURIComponent(transparency)}` : "";

export const parseSseEvents = (stream: string): TurnProgressEvent[] => {
  const events: TurnProgressEvent[] = [];
  for (const block of stream.split(/\n\s*\n/)) {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const event =
      lines
        .find((line) => line.startsWith("event:"))
        ?.slice("event:".length)
        .trim() ?? "message";
    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim());
    const rawData = dataLines.join("\n");
    events.push({
      event,
      data: rawData ? JSON.parse(rawData) : null,
    });
  }
  return events;
};

export const api = {
  scenarios: () => json<ScenarioCatalogPayload>("/scenarios"),
  importScenario: (definition: unknown) =>
    json<ScenarioImportPayload>("/scenarios/import", {
      method: "POST",
      body: JSON.stringify(definition),
    }),
  deleteScenario: (scenarioId: string) =>
    json<ScenarioDeletePayload>(
      `/scenarios/${encodeURIComponent(scenarioId)}`,
      {
        method: "DELETE",
      },
    ),
  exportScenario: (scenarioId: string) =>
    json<ScenarioExportPayload>(
      `/scenarios/${encodeURIComponent(scenarioId)}/export`,
    ),
  campaigns: (limit = 10) =>
    json<CampaignListPayload>(`/campaigns?limit=${limit}`),
  createCampaign: (scenarioId = "border-seven-days") =>
    json<CampaignPayload>("/campaigns", {
      method: "POST",
      body: JSON.stringify({ scenarioId }),
    }),
  getState: (campaignId: string, transparency?: TransparencyMode) =>
    json<CampaignPayload>(
      `/campaigns/${campaignId}/state${transparencyQuery(transparency)}`,
    ),
  runTurn: (
    campaignId: string,
    action: PlayerAction,
    transparency: TransparencyMode,
    llmConfig?: LlmConfig,
    options: { queued?: boolean } = {},
  ) =>
    json<RunTurnPayload>(`/campaigns/${campaignId}/turns/run`, {
      method: "POST",
      body: JSON.stringify({
        action,
        transparency,
        llmConfig,
        queued: options.queued ?? false,
      }),
    }),
  progressCampaign: (
    campaignId: string,
    request: LongCampaignProgressionRequest,
  ) =>
    json<RunTurnPayload>(
      `/campaigns/${campaignId}/campaign/progress`,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    ),
  turnEvents: async (
    campaignId: string,
    turnId: string,
    transparency?: TransparencyMode,
  ) =>
    parseSseEvents(
      await text(
        `/campaigns/${campaignId}/turns/${turnId}/events${transparencyQuery(transparency)}`,
      ),
    ),
  chronicle: (campaignId: string) =>
    json<ChroniclePayload>(`/campaigns/${campaignId}/chronicle`),
};
