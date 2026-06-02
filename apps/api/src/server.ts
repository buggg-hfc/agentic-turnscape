import cors from "@fastify/cors";
import {
  createOpenAICompatibleClient,
  runTurn,
  type LLMClient,
  type OpenAICompatibleOptions,
} from "@agentic-turnscape/agents";
import {
  getScenarioPackage,
  importCreatorScenarioPackage,
  listScenarioPackages,
  type ScenarioPackage,
} from "@agentic-turnscape/content";
import {
  applyStatePatch,
  resolveLongCampaignStep,
  toPlayerVisibleState,
} from "@agentic-turnscape/core";
import {
  LlmConfigSchema,
  PlayerActionSchema,
  TransparencyModeSchema,
  type AgentActionProposal,
  type StatePatch,
  type TransparencyMode,
  type TurnResolution,
  type WorldState,
} from "@agentic-turnscape/shared";
import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { PrismaCampaignStore } from "./prismaStore.js";
import {
  InMemoryCampaignStore,
  type CampaignStore,
  type StoredTurn,
} from "./store.js";
import {
  createTurnQueue,
  type TurnJobPayload,
  type TurnJobQueue,
} from "./turnQueue.js";

export type ServerOptions = {
  createLlmClient?:
    | ((config: OpenAICompatibleOptions) => LLMClient)
    | undefined;
  store?: CampaignStore | undefined;
  turnQueue?: TurnJobQueue | undefined;
};

type RuntimeScenarioRecord = {
  scenario: ScenarioPackage;
  definition: unknown;
};

const getScenarioStatus = (state: WorldState, scenario: ScenarioPackage) => ({
  dayPlan: scenario.getDayPlan(state.time.day),
  ending: scenario.evaluateEnding(state),
  sceneCounts: scenario.counts,
});

const cloneJson = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value));

type VisibleTurnResolution = Omit<TurnResolution, "hiddenSummary"> & {
  hiddenSummary?: string;
};

const isHiddenPatchChange = (change: StatePatch["changes"][number]) =>
  change.path === "hiddenEvents" || change.path.startsWith("hiddenEvents.");

const patchForTransparency = (
  patch: StatePatch,
  transparency: TransparencyMode,
): StatePatch =>
  transparency === "debug"
    ? patch
    : {
        ...patch,
        changes: patch.changes.filter((change) => !isHiddenPatchChange(change)),
      };

const proposalForTransparency = (
  proposal: AgentActionProposal,
  transparency: TransparencyMode,
): AgentActionProposal => {
  if (transparency === "debug") return proposal;
  const { hiddenReason: _hiddenReason, ...visibleProposal } = proposal;
  return visibleProposal;
};

const resolutionForTransparency = (
  resolution: TurnResolution,
  transparency: TransparencyMode,
): VisibleTurnResolution => {
  const visibleResolution = {
    ...resolution,
    proposals:
      transparency === "immersive"
        ? []
        : resolution.proposals.map((proposal) =>
            proposalForTransparency(proposal, transparency),
          ),
    statePatch: patchForTransparency(resolution.statePatch, transparency),
  };
  if (transparency === "debug") return visibleResolution;
  const { hiddenSummary: _hiddenSummary, ...publicResolution } =
    visibleResolution;
  return publicResolution;
};

const turnForTransparency = (
  turn: StoredTurn | undefined,
  transparency: TransparencyMode,
) =>
  turn?.resolution
    ? {
        ...turn,
        resolution: resolutionForTransparency(turn.resolution, transparency),
      }
    : turn;

const parseTransparencyQuery = (query: unknown): TransparencyMode =>
  z
    .object({ transparency: TransparencyModeSchema.default("inference") })
    .parse(query ?? {}).transparency;

const LongCampaignProgressBodySchema = z.object({
  completedQuestIds: z.array(z.string()).default([]),
  baseInvestments: z
    .array(
      z.object({
        facilityId: z.string(),
        supplies: z.number().int().min(0).default(0),
        money: z.number().int().min(0).default(0),
      }),
    )
    .default([]),
  training: z
    .object({
      skill: z.string(),
      experience: z.number().int().min(1),
    })
    .optional(),
  factionFronts: z
    .array(
      z.object({
        factionId: z.string(),
        influenceDelta: z.number().int().optional(),
        pressureDelta: z.number().int().optional(),
      }),
    )
    .default([]),
});

export const buildServer = (options: ServerOptions = {}) => {
  const app = Fastify({ logger: true });
  const store: CampaignStore =
    options.store ??
    (process.env.STORAGE_DRIVER === "prisma"
      ? new PrismaCampaignStore()
      : new InMemoryCampaignStore());
  const createLlmClient =
    options.createLlmClient ?? createOpenAICompatibleClient;
  const turnQueue = options.turnQueue ?? createTurnQueue();
  const runtimeScenarios = new Map<string, RuntimeScenarioRecord>();
  let runtimeScenariosLoaded = false;
  const scenarioSummary = ({ id, title, counts }: ScenarioPackage) => ({
    id,
    title,
    counts,
  });
  const loadRuntimeScenarios = async () => {
    if (runtimeScenariosLoaded) return;
    for (const stored of await store.listRuntimeScenarios()) {
      try {
        const scenario = importCreatorScenarioPackage(stored.definition);
        runtimeScenarios.set(scenario.id, {
          scenario,
          definition: cloneJson(stored.definition),
        });
      } catch (caught) {
        app.log.warn(
          { scenarioId: stored.id, error: caught },
          "failed_to_load_runtime_scenario",
        );
      }
    }
    runtimeScenariosLoaded = true;
  };
  const listAvailableScenarios = async () => {
    await loadRuntimeScenarios();
    return [
      ...listScenarioPackages(),
      ...Array.from(runtimeScenarios.values()).map(({ scenario }) =>
        scenarioSummary(scenario),
      ),
    ];
  };
  const getAvailableScenario = async (id: string) => {
    await loadRuntimeScenarios();
    return runtimeScenarios.get(id)?.scenario ?? getScenarioPackage(id);
  };
  const requireAvailableScenario = async (
    id: string,
  ): Promise<ScenarioPackage> => {
    const scenario = await getAvailableScenario(id);
    if (!scenario) throw new Error(`Unknown scenario package: ${id}`);
    return scenario;
  };
  const envLlmConfig: OpenAICompatibleOptions = {
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
  };
  const envLlm = createLlmClient(envLlmConfig);
  const llmForConfig = (config: TurnJobPayload["llmConfig"]): LLMClient =>
    config
      ? createLlmClient({
          baseUrl: config.baseUrl,
          model: config.model,
          apiKey: config.apiKey || undefined,
          timeoutMs: config.timeoutMs,
        })
      : envLlm;

  const settleTurnJob = async (job: TurnJobPayload) => {
    try {
      const campaign = await store.get(job.campaignId);
      if (!campaign) throw new Error(`Campaign not found: ${job.campaignId}`);
      const scenario = await requireAvailableScenario(campaign.scenario);
      const { nextState, resolution } = await runTurn({
        state: campaign.state,
        playerAction: job.action,
        llm: llmForConfig(job.llmConfig),
        turnId: job.turnId,
        seed: job.seed,
        transparency: job.transparency,
        getAvailableActions: scenario.getActions,
        evaluateEnding: scenario.evaluateEnding,
      });
      await store.completeTurn(
        job.campaignId,
        job.turnId,
        nextState,
        resolution,
      );
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "queued_turn_failed";
      await store.failTurn(job.campaignId, job.turnId, message);
    }
  };

  turnQueue.onProcess(settleTurnJob);
  app.addHook("onClose", async () => {
    await turnQueue.close?.();
    await store.close?.();
  });

  void app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? true,
  });

  app.get("/health", async () => ({
    ok: true,
    service: "agentic-turnscape-api",
  }));

  app.get("/scenarios", async () => ({
    scenarios: await listAvailableScenarios(),
  }));

  app.post("/scenarios/import", async (request, reply) => {
    let scenario: ScenarioPackage;
    try {
      scenario = importCreatorScenarioPackage(request.body);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "invalid creator scenario";
      return reply.code(400).send({ error: "invalid_scenario", message });
    }

    if (await getAvailableScenario(scenario.id)) {
      return reply.code(409).send({ error: "duplicate_scenario" });
    }
    const definition = cloneJson(request.body);
    await store.saveRuntimeScenario({
      id: scenario.id,
      title: scenario.title,
      definition,
    });
    runtimeScenarios.set(scenario.id, { scenario, definition });
    return { scenario: scenarioSummary(scenario) };
  });

  app.get("/scenarios/:id/export", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    await loadRuntimeScenarios();
    if (getScenarioPackage(params.id)) {
      return reply
        .code(400)
        .send({ error: "builtin_scenario_cannot_be_exported" });
    }
    const runtime = runtimeScenarios.get(params.id);
    if (!runtime) {
      return reply.code(404).send({ error: "runtime_scenario_not_found" });
    }
    return { scenarioId: params.id, definition: runtime.definition };
  });

  app.delete("/scenarios/:id", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    await loadRuntimeScenarios();
    if (getScenarioPackage(params.id)) {
      return reply
        .code(400)
        .send({ error: "builtin_scenario_cannot_be_deleted" });
    }
    if (!runtimeScenarios.has(params.id)) {
      return reply.code(404).send({ error: "runtime_scenario_not_found" });
    }
    if (await store.hasCampaignsForScenario(params.id)) {
      return reply.code(409).send({ error: "scenario_in_use" });
    }
    runtimeScenarios.delete(params.id);
    await store.deleteRuntimeScenario(params.id);
    return { deleted: true, scenarioId: params.id };
  });

  app.get("/campaigns", async (request) => {
    const query = z
      .object({ limit: z.coerce.number().int().min(1).max(100).default(20) })
      .parse(request.query ?? {});
    return { campaigns: await store.list(query.limit) };
  });

  app.post("/campaigns", async (request, reply) => {
    const body = z
      .object({ scenarioId: z.string().default("border-seven-days") })
      .parse(request.body ?? {});
    const scenario = await getAvailableScenario(body.scenarioId);
    if (!scenario) return reply.code(400).send({ error: "unknown_scenario" });

    const state = scenario.createWorld();
    const campaign = await store.create({
      id: crypto.randomUUID(),
      title: scenario.title,
      scenario: scenario.id,
      state,
    });

    return {
      campaignId: campaign.id,
      title: campaign.title,
      scenario: campaign.scenario,
      scenarioStatus: getScenarioStatus(campaign.state, scenario),
      state: toPlayerVisibleState(campaign.state),
      availableActions: scenario.getActions(campaign.state),
    };
  });

  app.get("/campaigns/:id/state", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const transparency = parseTransparencyQuery(request.query);
    const campaign = await store.get(params.id);
    if (!campaign) return reply.code(404).send({ error: "campaign_not_found" });
    const scenario = await requireAvailableScenario(campaign.scenario);
    return {
      campaignId: campaign.id,
      title: campaign.title,
      scenario: campaign.scenario,
      scenarioStatus: getScenarioStatus(campaign.state, scenario),
      state: toPlayerVisibleState(campaign.state),
      availableActions: scenario.getActions(campaign.state),
      pendingAction: campaign.pendingAction,
      lastTurn: turnForTransparency(campaign.turns.at(-1), transparency),
    };
  });

  app.post("/campaigns/:id/actions", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = PlayerActionSchema.parse(request.body);
    try {
      const campaign = await store.setPendingAction(params.id, body);
      return {
        campaignId: campaign.id,
        pendingAction: campaign.pendingAction,
      };
    } catch {
      return reply.code(404).send({ error: "campaign_not_found" });
    }
  });

  app.post("/campaigns/:id/campaign/progress", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = LongCampaignProgressBodySchema.parse(request.body ?? {});
    const campaign = await store.get(params.id);
    if (!campaign) return reply.code(404).send({ error: "campaign_not_found" });
    const scenario = await requireAvailableScenario(campaign.scenario);
    const turnId = crypto.randomUUID();
    const patch = resolveLongCampaignStep({
      state: campaign.state,
      turnId,
      completedQuestIds: body.completedQuestIds,
      baseInvestments: body.baseInvestments,
      ...(body.training ? { training: body.training } : {}),
      factionFronts: body.factionFronts.map((front) => ({
        factionId: front.factionId,
        ...(front.influenceDelta !== undefined
          ? { influenceDelta: front.influenceDelta }
          : {}),
        ...(front.pressureDelta !== undefined
          ? { pressureDelta: front.pressureDelta }
          : {}),
      })),
    });
    const nextState = applyStatePatch(campaign.state, patch);
    const resolution: TurnResolution = {
      turnId,
      proposals: [],
      statePatch: patch,
      publicSummary: "Long campaign progression updated.",
      hiddenSummary: "No hidden long campaign updates.",
      narration:
        "The campaign ledger updates, carrying the group's choices into the next layer of play.",
      ending: scenario.evaluateEnding(nextState),
      availableActions: scenario.getActions(nextState),
    };
    const completed = await store.recordCampaignProgress(
      campaign.id,
      nextState,
      resolution,
    );

    return {
      campaignId: campaign.id,
      turnId: completed.id,
      status: completed.status,
      resolution: resolutionForTransparency(resolution, "inference"),
      scenarioStatus: getScenarioStatus(nextState, scenario),
      state: toPlayerVisibleState(nextState),
      availableActions: scenario.getActions(nextState),
    };
  });

  app.post("/campaigns/:id/turns/run", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        action: PlayerActionSchema.optional(),
        seed: z.string().optional(),
        queued: z.boolean().default(false),
        transparency: TransparencyModeSchema.default("inference"),
        llmConfig: LlmConfigSchema.optional(),
      })
      .parse(request.body ?? {});

    const campaign = await store.get(params.id);
    if (!campaign) return reply.code(404).send({ error: "campaign_not_found" });
    const scenario = await requireAvailableScenario(campaign.scenario);

    const action = body.action ?? campaign.pendingAction;
    if (!action)
      return reply.code(400).send({ error: "missing_player_action" });

    const turn = await store.createTurn(campaign.id, action);
    const turnJob: TurnJobPayload = {
      campaignId: campaign.id,
      turnId: turn.id,
      action,
      transparency: body.transparency,
      ...(body.seed ? { seed: body.seed } : {}),
      ...(body.llmConfig ? { llmConfig: body.llmConfig } : {}),
    };
    if (body.queued) {
      await turnQueue.enqueue(turnJob);
      return reply.code(202).send({
        campaignId: campaign.id,
        turnId: turn.id,
        status: turn.status,
        queued: true,
      });
    }

    const { nextState, resolution } = await runTurn({
      state: campaign.state,
      playerAction: action,
      llm: llmForConfig(body.llmConfig),
      turnId: turn.id,
      seed: body.seed,
      transparency: body.transparency,
      getAvailableActions: scenario.getActions,
      evaluateEnding: scenario.evaluateEnding,
    });
    const completed = await store.completeTurn(
      campaign.id,
      turn.id,
      nextState,
      resolution,
    );

    return {
      campaignId: campaign.id,
      turnId: completed.id,
      status: completed.status,
      resolution: resolutionForTransparency(resolution, body.transparency),
      scenarioStatus: getScenarioStatus(nextState, scenario),
      state: toPlayerVisibleState(nextState),
      availableActions: scenario.getActions(nextState),
    };
  });

  app.get("/campaigns/:id/turns/:turnId/events", async (request, reply) => {
    const params = z
      .object({ id: z.string(), turnId: z.string() })
      .parse(request.params);
    const transparency = parseTransparencyQuery(request.query);
    const turn = await store.getTurn(params.id, params.turnId);
    if (!turn) return reply.code(404).send({ error: "turn_not_found" });

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send("turn", { id: turn.id, status: turn.status, index: turn.index });
    if (turn.resolution) {
      const visibleResolution = resolutionForTransparency(
        turn.resolution,
        transparency,
      );
      if (transparency !== "immersive") {
        send("agent_proposals", visibleResolution.proposals);
      }
      send("referee", {
        publicSummary: visibleResolution.publicSummary,
        statePatch: visibleResolution.statePatch,
        ...(transparency === "debug"
          ? { hiddenSummary: turn.resolution.hiddenSummary }
          : {}),
      });
      send("narration", { text: visibleResolution.narration });
    } else if (turn.status === "pending") {
      send("pending", {
        id: turn.id,
        status: turn.status,
        message: "turn_waiting_for_worker",
      });
    } else if (turn.status === "failed") {
      send("error", {
        id: turn.id,
        status: turn.status,
        completedAt: turn.completedAt,
      });
    }
    send("done", { ok: true });
    reply.raw.end();
  });

  app.get("/campaigns/:id/chronicle", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const campaign = await store.get(params.id);
    if (!campaign) return reply.code(404).send({ error: "campaign_not_found" });
    return {
      campaignId: campaign.id,
      publicEvents: campaign.state.publicEvents,
      revealedHiddenEvents: campaign.state.hiddenEvents.filter(
        (event) => event.revealed,
      ),
      snapshots: campaign.snapshots.map((snapshot) => ({
        id: snapshot.id,
        turnId: snapshot.turnId,
        day: snapshot.state.time.day,
        phase: snapshot.state.time.phase,
        currentLocationId: snapshot.state.currentLocationId,
        createdAt: snapshot.createdAt,
      })),
      replay: campaign.turns
        .filter((turn) => turn.resolution)
        .map((turn) => ({
          id: turn.id,
          index: turn.index,
          playerAction: turn.playerAction,
          publicSummary: turn.resolution?.publicSummary,
          narration: turn.resolution?.narration,
          statePatch: turn.resolution
            ? patchForTransparency(turn.resolution.statePatch, "inference")
            : undefined,
          ending: turn.resolution?.ending,
        })),
      turns: campaign.turns.map((turn) => ({
        id: turn.id,
        index: turn.index,
        status: turn.status,
        playerAction: turn.playerAction,
        narration: turn.resolution?.narration,
      })),
    };
  });

  app.get("/campaigns/:id/debug/hidden-log", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const campaign = await store.get(params.id);
    if (!campaign) return reply.code(404).send({ error: "campaign_not_found" });
    return {
      campaignId: campaign.id,
      hiddenEvents: campaign.events.filter((event) => !event.visible),
      agentRuns: campaign.agentRuns,
      memoryLog: campaign.memoryLog,
      snapshots: campaign.snapshots.map((snapshot) => ({
        id: snapshot.id,
        turnId: snapshot.turnId,
        day: snapshot.state.time.day,
        phase: snapshot.state.time.phase,
        createdAt: snapshot.createdAt,
      })),
    };
  });

  return app;
};

const entrypoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (import.meta.url === entrypoint) {
  const port = Number(process.env.PORT ?? 8787);
  const app = buildServer();
  app.listen({ host: "0.0.0.0", port }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
