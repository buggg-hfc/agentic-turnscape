import { describe, expect, it } from "vitest";
import type {
  LLMClient,
  OpenAICompatibleOptions,
  BorderSevenDaysRouteId,
} from "@agentic-turnscape/agents";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import type { PlayerAction } from "@agentic-turnscape/shared";
import { buildServer } from "./server.js";
import { InMemoryCampaignStore } from "./store.js";
import { InMemoryTurnQueue } from "./turnQueue.js";

const borderRouteAction = (
  routeId: BorderSevenDaysRouteId,
  turnIndex: number,
): PlayerAction => {
  const base = {
    id: `api_${routeId}_${turnIndex}`,
    leverage: [`strategy:${routeId}`, `step:${turnIndex}`],
    riskLevel: "medium" as const,
  };

  switch (routeId) {
    case "guild_case":
      return {
        ...base,
        actionType: "investigate",
        label: "Build the public case",
        description: "Gather evidence carefully enough that Rowan can act.",
        targetId: "npc_rowan",
      };
    case "cure_alliance":
      return {
        ...base,
        actionType: "protect",
        label: "Support the clinic cure",
        description: "Protect patients and coordinate Adele's work with Eve.",
        targetId: "npc_adele",
      };
    case "neglect_plague":
      return {
        ...base,
        actionType: "ignore",
        label: "Wait out the crisis",
        description: "Avoid direct commitments while the town's clocks advance.",
      };
    case "consortium_deal":
      return {
        ...base,
        actionType: "trade",
        label: "Back the consortium deal",
        description: "Trade influence and time for Blackstone's promises.",
        targetId: "npc_manlo",
      };
    case "open_rift":
      return {
        ...base,
        actionType: "investigate",
        label: "Follow the rift omens",
        description: "Trace White Crow's signs toward the chapel anomaly.",
        targetId: "npc_white_crow",
      };
    case "balanced_hero":
      return {
        ...base,
        actionType: "negotiate",
        label: "Balance the factions",
        description: "Slow each crisis without giving any faction full control.",
        targetId: "npc_rowan",
      };
  }
};

const creatorScenarioDefinition = () => {
  const world = createBorderSevenDaysWorld();
  return {
    id: "api-creator-border-lite",
    title: "API Creator Border Lite",
    world,
    days: [
      {
        day: 1,
        mainEvent: "A runtime creator scenario begins at the clinic.",
        defaultLocationId: "clinic",
        sceneIds: ["api_creator_clinic"],
        clockPressure: ["plague_spread"],
      },
    ],
    scenes: [
      {
        id: "api_creator_clinic",
        name: "API Creator Clinic",
        kind: "social",
        day: 1,
        locationId: "clinic",
        npcIds: ["npc_adele", "npc_rowan"],
        crisisClockIds: ["plague_spread"],
        nonCombatSolutions: ["negotiate"],
      },
      {
        id: "api_creator_fight",
        name: "API Creator Fight",
        kind: "combat",
        day: 1,
        locationId: "town_square",
        npcIds: ["npc_hagen"],
        crisisClockIds: ["martial_lockdown"],
        nonCombatSolutions: ["withdraw"],
      },
    ],
    actions: [
      {
        actionType: "negotiate",
        label: "Use runtime creator action",
        description: "Resolve an action from an imported scenario.",
        targetId: "npc_rowan",
        leverage: ["runtime_import"],
        riskLevel: "medium",
      },
    ],
    endings: [
      {
        id: "api_creator_ending",
        title: "API Creator Ending",
        summary: "The runtime imported ending can resolve.",
        when: { dayAtLeast: 1, clockAtMax: "plague_spread" },
      },
    ],
  };
};

describe("campaign turn API", () => {
  it("applies long campaign progression through the rules engine and persists the snapshot", async () => {
    const store = new InMemoryCampaignStore();
    const app = buildServer({ store });

    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: {},
    });
    const campaign = campaignResponse.json<{ campaignId: string }>();
    const record = store.get(campaign.campaignId);
    if (!record) throw new Error("test campaign was not created");
    record.state.time = { day: 7, phase: "night" };

    const progressResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/campaign/progress`,
      headers: { "content-type": "application/json" },
      payload: {
        completedQuestIds: ["missing_caravan"],
      },
    });

    expect(progressResponse.statusCode).toBe(200);
    expect(progressResponse.json()).toMatchObject({
      campaignId: campaign.campaignId,
      scenarioStatus: {
        campaignArc: {
          chapterCount: 3,
          chapterNumber: 2,
          currentChapter: {
            id: "border-seven-days_aftermath",
            title: "Border Aftermath",
            unlocks: expect.arrayContaining(["infirmary", "archive"]),
          },
          baseFacilities: expect.arrayContaining(["infirmary", "archive"]),
          factionFronts: expect.arrayContaining(["blackstone_consortium"]),
        },
      },
      state: {
        time: { day: 1, phase: "morning" },
        campaign: {
          chapter: 2,
          experience: 5,
          legacyFlags: [
            "quest:missing_caravan:resolved",
            "ending:ritual_stopped",
          ],
        },
      },
    });

    const upgradeResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/campaign/progress`,
      headers: { "content-type": "application/json" },
      payload: {
        baseInvestments: [{ facilityId: "infirmary", supplies: 2, money: 1 }],
        factionFronts: [
          {
            factionId: "blackstone_consortium",
            influenceDelta: -6,
            pressureDelta: 4,
          },
        ],
      },
    });

    expect(upgradeResponse.statusCode).toBe(200);
    expect(upgradeResponse.json()).toMatchObject({
      state: {
        player: { resources: { supplies: 2, money: 4 } },
        campaign: {
          base: { level: 1, facilities: { infirmary: 1 } },
          fronts: {
            blackstone_consortium: {
              influence: 0,
              pressure: 4,
              status: "broken",
            },
          },
        },
      },
    });

    const chronicleResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/chronicle`,
    });
    const chronicle = chronicleResponse.json();
    expect(chronicle.snapshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ day: 1, phase: "morning" }),
      ]),
    );
    expect(chronicle.replay).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicSummary: "Long campaign progression updated.",
        }),
      ]),
    );
    expect(
      chronicle.replay.some(
        (entry: { statePatch?: { source?: string } }) =>
          entry.statePatch?.source === "referee",
      ),
    ).toBe(true);

    await app.close();
  });

  it("rejects long campaign progression requests that reference unavailable campaign hooks", async () => {
    const store = new InMemoryCampaignStore();
    const app = buildServer({ store });

    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: {},
    });
    const campaign = campaignResponse.json<{ campaignId: string }>();

    const invalidPayloads = [
      {
        payload: { completedQuestIds: ["missing_airship"] },
        message: "Unknown completed quest: missing_airship",
      },
      {
        payload: {
          baseInvestments: [{ facilityId: "contraband_lab", supplies: 1 }],
        },
        message: "Unavailable base facility: contraband_lab",
      },
      {
        payload: { training: { skill: "alchemy", experience: 3 } },
        message: "Unknown training skill: alchemy",
      },
      {
        payload: {
          factionFronts: [{ factionId: "ghost_faction", pressureDelta: -2 }],
        },
        message: "Unavailable faction front: ghost_faction",
      },
    ];

    for (const { payload, message } of invalidPayloads) {
      const response = await app.inject({
        method: "POST",
        url: `/campaigns/${campaign.campaignId}/campaign/progress`,
        headers: { "content-type": "application/json" },
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: "invalid_campaign_progression",
        message,
      });
    }

    expect(store.get(campaign.campaignId)?.turns).toHaveLength(0);
    expect(store.get(campaign.campaignId)?.state.campaign).toBeUndefined();
    await app.close();
  });

  it("inherits a terminal MVP ending into the long campaign aftermath", async () => {
    const store = new InMemoryCampaignStore();
    const app = buildServer({ store });

    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "border-seven-days" },
    });
    const campaign = campaignResponse.json<{ campaignId: string }>();
    const record = store.get(campaign.campaignId);
    if (!record) throw new Error("test campaign was not created");
    record.state.time = { day: 7, phase: "night" };
    record.state.player.resources.intel = 7;
    const rowan = record.state.relationships["player:npc_rowan"];
    if (!rowan) throw new Error("test fixture missing Rowan relationship");
    rowan.respect = 3;

    const progressResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/campaign/progress`,
      headers: { "content-type": "application/json" },
      payload: {},
    });

    expect(progressResponse.statusCode).toBe(200);
    const progressed = progressResponse.json<{
      scenarioStatus: { ending?: { id: string } };
      state: {
        time: { day: number; phase: string };
        campaign?: {
          chapter: number;
          experience: number;
          base: { assets: Record<string, number> };
          legacyFlags: string[];
        };
      };
      resolution: {
        ending?: { id: string };
        statePatch: {
          changes: Array<{ op: string; path: string; value?: unknown }>;
        };
      };
    }>();

    expect(progressed.state.time).toEqual({ day: 1, phase: "morning" });
    expect(progressed.state.campaign?.chapter).toBe(2);
    expect(progressed.state.campaign?.experience).toBe(3);
    expect(progressed.state.campaign?.base.assets.public_case_archive).toBe(1);
    expect(progressed.state.campaign?.legacyFlags).toContain(
      "ending:guild_reform",
    );
    expect(progressed.scenarioStatus.ending).toBeUndefined();
    expect(progressed.resolution.ending).toBeUndefined();
    expect(progressed.resolution.statePatch.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          op: "tag",
          path: "campaign.legacyFlags",
          value: "ending:guild_reform",
        }),
      ]),
    );

    const chronicleResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/chronicle`,
    });
    expect(chronicleResponse.json().replay).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          statePatch: expect.objectContaining({ source: "referee" }),
        }),
      ]),
    );

    await app.close();
  });

  it("lists resumable campaigns with current progress summaries", async () => {
    const fakeClient: LLMClient = {
      completeJson: async ({ fallback }) => fallback(),
      completeText: async ({ fallback }) => fallback(),
    };
    const app = buildServer({
      createLlmClient: () => fakeClient,
    });

    const firstResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "border-seven-days" },
    });
    const first = firstResponse.json<{
      campaignId: string;
      availableActions: Array<Record<string, unknown>>;
    }>();

    const secondResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "frost-lantern-trial" },
    });
    const second = secondResponse.json<{ campaignId: string }>();

    await app.inject({
      method: "POST",
      url: `/campaigns/${first.campaignId}/turns/run`,
      headers: { "content-type": "application/json" },
      payload: {
        action: first.availableActions[0],
        seed: "campaign-list-progress",
      },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/campaigns",
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      campaigns: expect.arrayContaining([
        expect.objectContaining({
          id: first.campaignId,
          title: "边境七日",
          scenario: "border-seven-days",
          day: 1,
          phase: "afternoon",
          turnCount: 1,
          lastTurnStatus: "complete",
        }),
        expect.objectContaining({
          id: second.campaignId,
          title: "Frost Lantern Trial",
          scenario: "frost-lantern-trial",
          day: 1,
          phase: "morning",
          turnCount: 0,
        }),
      ]),
    });

    await app.close();
  });

  it("lists installed scenario packages and creates campaigns from a requested scenario id", async () => {
    const app = buildServer();

    const scenariosResponse = await app.inject({
      method: "GET",
      url: "/scenarios",
    });
    expect(scenariosResponse.statusCode).toBe(200);
    expect(scenariosResponse.json()).toEqual({
      scenarios: expect.arrayContaining([
        expect.objectContaining({
          id: "border-seven-days",
          title: "边境七日",
          counts: { combat: 5, social: 8, endings: 6 },
        }),
        expect.objectContaining({
          id: "frost-lantern-trial",
          title: "Frost Lantern Trial",
          counts: { combat: 1, social: 1, endings: 2 },
        }),
        expect.objectContaining({
          id: "orbital-quarantine",
          title: "Orbital Quarantine",
          counts: { combat: 1, social: 1, endings: 2 },
          campaignArc: {
            chapterCount: 3,
            baseFacilities: expect.arrayContaining([
              "medbay",
              "engineering_bay",
            ]),
            factionFronts: expect.arrayContaining([
              "orbital-quarantine_allies",
              "orbital-quarantine_pressure",
            ]),
          },
        }),
        expect.objectContaining({
          id: "salt-harbor-accord",
          title: "Salt Harbor Accord",
          counts: { combat: 1, social: 1, endings: 2 },
        }),
        expect.objectContaining({
          id: "rain-alley-haunting",
          title: "Rain Alley Haunting",
          counts: { combat: 1, social: 1, endings: 2 },
        }),
        expect.objectContaining({
          id: "emergency-ward-night",
          title: "Emergency Ward Night",
          counts: { combat: 1, social: 1, endings: 2 },
        }),
      ]),
    });

    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "border-seven-days" },
    });
    expect(campaignResponse.statusCode).toBe(200);
    expect(campaignResponse.json()).toMatchObject({
      scenario: "border-seven-days",
      title: "边境七日",
      scenarioStatus: {
        sceneCounts: { combat: 5, social: 8, endings: 6 },
      },
    });

    const expansionResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "frost-lantern-trial" },
    });
    expect(expansionResponse.statusCode).toBe(200);
    expect(expansionResponse.json()).toMatchObject({
      scenario: "frost-lantern-trial",
      title: "Frost Lantern Trial",
      scenarioStatus: {
        dayPlan: { day: 1 },
        sceneCounts: { combat: 1, social: 1, endings: 2 },
      },
    });

    const scienceFictionResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "orbital-quarantine" },
    });
    expect(scienceFictionResponse.statusCode).toBe(200);
    expect(scienceFictionResponse.json()).toMatchObject({
      scenario: "orbital-quarantine",
      title: "Orbital Quarantine",
      scenarioStatus: {
        dayPlan: { day: 1, defaultLocationId: "orbital_medbay" },
        sceneCounts: { combat: 1, social: 1, endings: 2 },
        campaignArc: {
          chapterCount: 3,
          chapterNumber: 1,
          currentChapter: {
            id: "orbital-quarantine_opening_arc",
            title: "Orbital Quarantine: Opening Crisis",
            unlocks: expect.arrayContaining([
              "station_quarantine",
              "orbital_medbay",
            ]),
          },
          baseFacilities: expect.arrayContaining(["medbay"]),
          factionFronts: expect.arrayContaining([
            "orbital-quarantine_allies",
            "orbital-quarantine_pressure",
          ]),
        },
      },
    });

    const unknownResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "missing-scenario" },
    });
    expect(unknownResponse.statusCode).toBe(400);
    expect(unknownResponse.json()).toEqual({ error: "unknown_scenario" });

    await app.close();
  });

  it("runs every Border Seven Days MVP ending through the public turn API with replay records", async () => {
    const fakeClient: LLMClient = {
      completeJson: async ({ fallback }) => fallback(),
      completeText: async ({ fallback }) => fallback(),
    };
    const app = buildServer({
      createLlmClient: () => fakeClient,
    });
    const cases: Array<{ routeId: BorderSevenDaysRouteId; endingId: string }> =
      [
        { routeId: "balanced_hero", endingId: "ritual_stopped" },
        { routeId: "guild_case", endingId: "guild_reform" },
        { routeId: "cure_alliance", endingId: "cure_with_exiles" },
        { routeId: "neglect_plague", endingId: "town_quarantined" },
        { routeId: "consortium_deal", endingId: "consortium_rule" },
        { routeId: "open_rift", endingId: "rift_opened" },
      ];

    for (const { routeId, endingId } of cases) {
      const campaignResponse = await app.inject({
        method: "POST",
        url: "/campaigns",
        headers: { "content-type": "application/json" },
        payload: { scenarioId: "border-seven-days" },
      });
      expect(campaignResponse.statusCode).toBe(200);
      const campaign = campaignResponse.json<{
        campaignId: string;
        scenarioStatus: { ending?: { id: string } };
      }>();
      expect(campaign.scenarioStatus.ending, routeId).toBeUndefined();

      let latestTurn:
        | {
            turnId: string;
            status: string;
            scenarioStatus: { ending?: { id: string } };
            state: { time: { day: number; phase: string } };
            resolution: {
              ending?: { id: string };
              statePatch: { source: string };
              availableActions: unknown[];
            };
          }
        | undefined;

      for (let turnIndex = 1; turnIndex <= 32; turnIndex += 1) {
        const turnResponse = await app.inject({
          method: "POST",
          url: `/campaigns/${campaign.campaignId}/turns/run`,
          headers: { "content-type": "application/json" },
          payload: {
            action: borderRouteAction(routeId, turnIndex),
            seed: `${routeId}_${turnIndex}`,
          },
        });
        expect(turnResponse.statusCode, `${routeId} turn ${turnIndex}`).toBe(
          200,
        );
        latestTurn = turnResponse.json<typeof latestTurn>();
        expect(latestTurn?.status, `${routeId} turn ${turnIndex}`).toBe(
          "complete",
        );
        expect(latestTurn?.resolution.statePatch.source, routeId).toBe(
          "referee",
        );

        if (
          latestTurn?.state.time.day === 7 &&
          latestTurn.state.time.phase === "night"
        ) {
          break;
        }
      }

      expect(latestTurn?.state.time, routeId).toEqual({
        day: 7,
        phase: "night",
      });
      expect(latestTurn?.scenarioStatus.ending?.id, routeId).toBe(endingId);
      expect(latestTurn?.resolution.ending?.id, routeId).toBe(endingId);
      expect(latestTurn?.resolution.availableActions.length, routeId).toBeGreaterThan(
        0,
      );

      const chronicleResponse = await app.inject({
        method: "GET",
        url: `/campaigns/${campaign.campaignId}/chronicle`,
      });
      expect(chronicleResponse.statusCode).toBe(200);
      const chronicle = chronicleResponse.json<{
        snapshots: unknown[];
        replay: Array<{
          ending?: { id: string };
          statePatch?: { source: string };
        }>;
        turns: Array<{ status: string }>;
      }>();
      expect(chronicle.replay.length, routeId).toBeGreaterThanOrEqual(24);
      expect(chronicle.turns, routeId).toHaveLength(chronicle.replay.length);
      expect(chronicle.snapshots, routeId).toHaveLength(
        chronicle.replay.length + 1,
      );
      expect(chronicle.turns.every((turn) => turn.status === "complete")).toBe(
        true,
      );
      expect(chronicle.replay.at(-1)?.ending?.id, routeId).toBe(endingId);
      expect(chronicle.replay.at(-1)?.statePatch?.source, routeId).toBe(
        "referee",
      );
    }

    await app.close();
  });

  it("imports creator scenario packages at runtime and starts campaigns from them", async () => {
    const app = buildServer();
    const definition = creatorScenarioDefinition();

    const importResponse = await app.inject({
      method: "POST",
      url: "/scenarios/import",
      headers: { "content-type": "application/json" },
      payload: definition,
    });
    expect(importResponse.statusCode).toBe(200);
    expect(importResponse.json()).toEqual({
      scenario: {
        id: "api-creator-border-lite",
        title: "API Creator Border Lite",
        counts: { combat: 1, social: 1, endings: 1 },
      },
    });

    const scenariosResponse = await app.inject({
      method: "GET",
      url: "/scenarios",
    });
    expect(scenariosResponse.json()).toEqual({
      scenarios: expect.arrayContaining([
        {
          id: "api-creator-border-lite",
          title: "API Creator Border Lite",
          counts: { combat: 1, social: 1, endings: 1 },
        },
      ]),
    });

    const exportResponse = await app.inject({
      method: "GET",
      url: "/scenarios/api-creator-border-lite/export",
    });
    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.json()).toEqual({
      scenarioId: "api-creator-border-lite",
      definition,
    });

    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "api-creator-border-lite" },
    });
    expect(campaignResponse.statusCode).toBe(200);
    expect(campaignResponse.json()).toMatchObject({
      scenario: "api-creator-border-lite",
      title: "API Creator Border Lite",
      scenarioStatus: {
        dayPlan: { day: 1, defaultLocationId: "clinic" },
        sceneCounts: { combat: 1, social: 1, endings: 1 },
      },
      availableActions: [
        expect.objectContaining({ label: "Use runtime creator action" }),
      ],
    });
    const campaign = campaignResponse.json<{ campaignId: string }>();

    const unavailableFacilityResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/campaign/progress`,
      headers: { "content-type": "application/json" },
      payload: {
        baseInvestments: [{ facilityId: "infirmary", supplies: 1 }],
      },
    });
    expect(unavailableFacilityResponse.statusCode).toBe(400);
    expect(unavailableFacilityResponse.json()).toEqual({
      error: "invalid_campaign_progression",
      message: "Unavailable base facility: infirmary",
    });

    const unavailableFrontResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/campaign/progress`,
      headers: { "content-type": "application/json" },
      payload: {
        factionFronts: [{ factionId: "frontier_guild", pressureDelta: -1 }],
      },
    });
    expect(unavailableFrontResponse.statusCode).toBe(400);
    expect(unavailableFrontResponse.json()).toEqual({
      error: "invalid_campaign_progression",
      message: "Unavailable faction front: frontier_guild",
    });

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/scenarios/import",
      headers: { "content-type": "application/json" },
      payload: definition,
    });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toEqual({ error: "duplicate_scenario" });

    await app.close();
  });

  it("loads persisted runtime creator scenarios after rebuilding the API server", async () => {
    const store = new InMemoryCampaignStore();
    const definition = {
      ...creatorScenarioDefinition(),
      id: "api-persisted-runtime-pack",
    };
    const firstApp = buildServer({ store });

    const importResponse = await firstApp.inject({
      method: "POST",
      url: "/scenarios/import",
      headers: { "content-type": "application/json" },
      payload: definition,
    });
    expect(importResponse.statusCode).toBe(200);
    await firstApp.close();

    const secondApp = buildServer({ store });
    const scenariosResponse = await secondApp.inject({
      method: "GET",
      url: "/scenarios",
    });
    expect(scenariosResponse.json()).toEqual({
      scenarios: expect.arrayContaining([
        expect.objectContaining({
          id: "api-persisted-runtime-pack",
          title: "API Creator Border Lite",
          counts: { combat: 1, social: 1, endings: 1 },
        }),
      ]),
    });

    const campaignResponse = await secondApp.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "api-persisted-runtime-pack" },
    });
    expect(campaignResponse.statusCode).toBe(200);
    expect(campaignResponse.json()).toMatchObject({
      scenario: "api-persisted-runtime-pack",
      title: "API Creator Border Lite",
    });

    await secondApp.close();
  });

  it("deletes runtime creator scenarios without touching built-in scenarios", async () => {
    const app = buildServer();
    const definition = {
      ...creatorScenarioDefinition(),
      id: "api-delete-runtime-pack",
    };

    const importResponse = await app.inject({
      method: "POST",
      url: "/scenarios/import",
      headers: { "content-type": "application/json" },
      payload: definition,
    });
    expect(importResponse.statusCode).toBe(200);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: "/scenarios/api-delete-runtime-pack",
    });
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.json()).toEqual({
      deleted: true,
      scenarioId: "api-delete-runtime-pack",
    });

    const scenariosResponse = await app.inject({
      method: "GET",
      url: "/scenarios",
    });
    expect(JSON.stringify(scenariosResponse.json())).not.toContain(
      "api-delete-runtime-pack",
    );

    const builtInDeleteResponse = await app.inject({
      method: "DELETE",
      url: "/scenarios/border-seven-days",
    });
    expect(builtInDeleteResponse.statusCode).toBe(400);
    expect(builtInDeleteResponse.json()).toEqual({
      error: "builtin_scenario_cannot_be_deleted",
    });

    const builtInExportResponse = await app.inject({
      method: "GET",
      url: "/scenarios/border-seven-days/export",
    });
    expect(builtInExportResponse.statusCode).toBe(400);
    expect(builtInExportResponse.json()).toEqual({
      error: "builtin_scenario_cannot_be_exported",
    });

    await app.close();
  });

  it("refuses to delete runtime creator scenarios that still have campaigns", async () => {
    const app = buildServer();
    const definition = {
      ...creatorScenarioDefinition(),
      id: "api-used-runtime-pack",
    };

    const importResponse = await app.inject({
      method: "POST",
      url: "/scenarios/import",
      headers: { "content-type": "application/json" },
      payload: definition,
    });
    expect(importResponse.statusCode).toBe(200);

    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: { scenarioId: "api-used-runtime-pack" },
    });
    expect(campaignResponse.statusCode).toBe(200);
    const campaign = campaignResponse.json<{ campaignId: string }>();

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: "/scenarios/api-used-runtime-pack",
    });
    expect(deleteResponse.statusCode).toBe(409);
    expect(deleteResponse.json()).toEqual({ error: "scenario_in_use" });

    const stateResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/state`,
    });
    expect(stateResponse.statusCode).toBe(200);
    expect(stateResponse.json()).toMatchObject({
      scenario: "api-used-runtime-pack",
      title: "API Creator Border Lite",
    });

    await app.close();
  });

  it("rejects invalid runtime creator scenario imports with a useful message", async () => {
    const app = buildServer();
    const invalid = creatorScenarioDefinition();
    const firstScene = invalid.scenes[0];
    if (!firstScene) throw new Error("test fixture missing first scene");
    invalid.scenes[0] = { ...firstScene, locationId: "missing_location" };

    const response = await app.inject({
      method: "POST",
      url: "/scenarios/import",
      headers: { "content-type": "application/json" },
      payload: invalid,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "invalid_scenario",
      message: expect.stringContaining("missing_location"),
    });

    await app.close();
  });

  it("accepts per-turn LLM config without persisting secrets into state", async () => {
    const seenConfigs: OpenAICompatibleOptions[] = [];
    const fakeClient: LLMClient = {
      completeJson: async ({ fallback }) => fallback(),
      completeText: async ({ fallback }) => fallback(),
    };
    const app = buildServer({
      createLlmClient: (config) => {
        seenConfigs.push(config);
        return fakeClient;
      },
    });
    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: {},
    });
    const campaign = campaignResponse.json<{
      campaignId: string;
      availableActions: Array<Record<string, unknown>>;
      scenarioStatus: {
        dayPlan: { day: number; mainEvent: string };
        sceneCounts: { combat: number; social: number; endings: number };
        ending?: { id: string };
      };
    }>();

    expect(campaign.scenarioStatus.dayPlan.day).toBe(1);
    expect(campaign.scenarioStatus.sceneCounts).toEqual({
      combat: 5,
      social: 8,
      endings: 6,
    });
    expect(campaign.scenarioStatus.ending).toBeUndefined();

    const turnResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/turns/run`,
      headers: { "content-type": "application/json" },
      payload: {
        action: campaign.availableActions[0],
        transparency: "debug",
        llmConfig: {
          baseUrl: "http://localhost:11434/v1",
          model: "local-story-model",
          apiKey: "local-secret",
          timeoutMs: 5000,
          maxTokens: 2048,
        },
      },
    });

    expect(turnResponse.statusCode).toBe(200);
    const body = turnResponse.json();
    expect(seenConfigs.at(-1)).toMatchObject({
      baseUrl: "http://localhost:11434/v1",
      model: "local-story-model",
      apiKey: "local-secret",
      timeoutMs: 5000,
      maxTokens: 2048,
    });
    expect(JSON.stringify(body.state)).not.toContain("local-secret");
    expect(body.resolution.proposals.length).toBeGreaterThan(0);
    await app.close();
  });

  it("redacts hidden resolution details unless debug transparency is requested", async () => {
    const fakeClient: LLMClient = {
      completeJson: async ({ fallback }) => fallback(),
      completeText: async ({ fallback }) => fallback(),
    };
    const app = buildServer({
      createLlmClient: () => fakeClient,
    });
    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: {},
    });
    const campaign = campaignResponse.json<{ campaignId: string }>();
    const action = {
      actionType: "negotiate",
      label: "Stabilize the clinic standoff",
      description: "Buy Adele enough time with a credible diagnosis plan.",
      targetId: "npc_rowan",
      leverage: ["medical_plan", "resident_trust"],
      riskLevel: "medium",
    };

    const turnResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/turns/run`,
      headers: { "content-type": "application/json" },
      payload: {
        action,
        seed: "social-chip-check",
        transparency: "inference",
      },
    });

    expect(turnResponse.statusCode).toBe(200);
    const turnBody = turnResponse.json();
    expect(turnBody.resolution.hiddenSummary).toBeUndefined();
    expect(JSON.stringify(turnBody.resolution)).not.toContain("hiddenReason");
    expect(turnBody.resolution.statePatch.changes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "hiddenEvents" }),
      ]),
    );

    const stateResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/state`,
    });
    const stateBody = stateResponse.json();
    expect(stateBody.lastTurn.resolution.hiddenSummary).toBeUndefined();
    expect(JSON.stringify(stateBody.lastTurn.resolution)).not.toContain(
      "hiddenReason",
    );

    const chronicleResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/chronicle`,
    });
    expect(JSON.stringify(chronicleResponse.json().replay)).not.toContain(
      "hiddenReason",
    );
    expect(JSON.stringify(chronicleResponse.json().replay)).not.toContain(
      "hiddenEvents",
    );

    const inferenceEvents = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/turns/${turnBody.turnId}/events`,
    });
    expect(inferenceEvents.body).toContain("event: agent_proposals");
    expect(inferenceEvents.body).not.toContain("hiddenReason");
    expect(inferenceEvents.body).not.toContain("hiddenSummary");
    expect(inferenceEvents.body).not.toContain("hiddenEvents");

    const immersiveEvents = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/turns/${turnBody.turnId}/events?transparency=immersive`,
    });
    expect(immersiveEvents.body).not.toContain("event: agent_proposals");
    expect(immersiveEvents.body).not.toContain("hiddenReason");

    const debugStateResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/state?transparency=debug`,
    });
    expect(debugStateResponse.json().lastTurn.resolution.hiddenSummary).toEqual(
      expect.any(String),
    );

    const debugEvents = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/turns/${turnBody.turnId}/events?transparency=debug`,
    });
    expect(debugEvents.body).toContain("hiddenReason");
    expect(debugEvents.body).toContain("hiddenSummary");
    expect(debugEvents.body).toContain("hiddenEvents");

    const hiddenLogResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/debug/hidden-log`,
    });
    expect(hiddenLogResponse.json().memoryLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scope: "turn", hidden: true }),
      ]),
    );

    await app.close();
  });

  it("records snapshots, replay entries, agent runs, and hidden memory logs", async () => {
    const fakeClient: LLMClient = {
      completeJson: async ({ fallback }) => fallback(),
      completeText: async ({ fallback }) => fallback(),
    };
    const app = buildServer({
      createLlmClient: () => fakeClient,
    });
    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: {},
    });
    const campaign = campaignResponse.json<{
      campaignId: string;
      availableActions: Array<Record<string, unknown>>;
    }>();

    const turnResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/turns/run`,
      headers: { "content-type": "application/json" },
      payload: {
        action: campaign.availableActions[0],
        seed: "api-replay-recording",
      },
    });
    expect(turnResponse.statusCode).toBe(200);
    const turnBody = turnResponse.json();
    expect(turnBody.resolution.hiddenSummary).toBeUndefined();

    const chronicleResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/chronicle`,
    });
    expect(chronicleResponse.statusCode).toBe(200);
    const chronicle = chronicleResponse.json();
    expect(chronicle.snapshots).toHaveLength(2);
    expect(chronicle.replay).toHaveLength(1);
    expect(chronicle.replay[0].statePatch).toMatchObject({
      type: "state_patch",
      source: "referee",
    });
    expect(chronicle.replay[0].publicSummary).toBe(
      turnBody.resolution.publicSummary,
    );

    const hiddenLogResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/debug/hidden-log`,
    });
    expect(hiddenLogResponse.statusCode).toBe(200);
    const hiddenLog = hiddenLogResponse.json();
    expect(hiddenLog.agentRuns).toHaveLength(
      turnBody.resolution.proposals.length,
    );
    expect(hiddenLog.memoryLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "turn",
          hidden: false,
          summary: turnBody.resolution.publicSummary,
        }),
        expect.objectContaining({
          scope: "turn",
          hidden: true,
          summary: expect.any(String),
        }),
      ]),
    );

    await app.close();
  });

  it("queues turn jobs and exposes pending and completed progress through SSE", async () => {
    const queue = new InMemoryTurnQueue({ autoRun: false });
    const fakeClient: LLMClient = {
      completeJson: async ({ fallback }) => fallback(),
      completeText: async ({ fallback }) => fallback(),
    };
    const app = buildServer({
      createLlmClient: () => fakeClient,
      turnQueue: queue,
    });
    const campaignResponse = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { "content-type": "application/json" },
      payload: {},
    });
    const campaign = campaignResponse.json<{
      campaignId: string;
      state: { time: { day: number; phase: string } };
      availableActions: Array<Record<string, unknown>>;
    }>();

    const queuedResponse = await app.inject({
      method: "POST",
      url: `/campaigns/${campaign.campaignId}/turns/run`,
      headers: { "content-type": "application/json" },
      payload: {
        action: campaign.availableActions[0],
        seed: "queued-turn-lifecycle",
        queued: true,
      },
    });
    expect(queuedResponse.statusCode).toBe(202);
    const queued = queuedResponse.json<{
      turnId: string;
      status: string;
      queued: boolean;
    }>();
    expect(queued.status).toBe("pending");
    expect(queued.queued).toBe(true);

    const pendingStateResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/state`,
    });
    const pendingState = pendingStateResponse.json();
    expect(pendingState.lastTurn.status).toBe("pending");
    expect(pendingState.state.time).toEqual(campaign.state.time);

    const pendingEvents = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/turns/${queued.turnId}/events`,
    });
    expect(pendingEvents.body).toContain('"status":"pending"');
    expect(pendingEvents.body).toContain("event: pending");

    await queue.drain();

    const completedStateResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/state`,
    });
    const completedState = completedStateResponse.json();
    expect(completedState.lastTurn.status).toBe("complete");
    expect(completedState.state.time.phase).not.toBe(campaign.state.time.phase);

    const completedEvents = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/turns/${queued.turnId}/events`,
    });
    expect(completedEvents.body).toContain("event: agent_proposals");
    expect(completedEvents.body).toContain("event: referee");
    expect(completedEvents.body).toContain("event: narration");

    const chronicleResponse = await app.inject({
      method: "GET",
      url: `/campaigns/${campaign.campaignId}/chronicle`,
    });
    const chronicle = chronicleResponse.json();
    expect(chronicle.snapshots).toHaveLength(2);
    expect(chronicle.replay).toHaveLength(1);

    await app.close();
  });
});
