import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayerAction } from "@agentic-turnscape/shared";
import { api, parseSseEvents } from "./api.js";

const action: PlayerAction = {
  actionType: "protect",
  label: "Support the clinic cure",
  description: "Protect patients while gathering cure evidence.",
  targetId: "npc_adele",
  leverage: ["strategy:cure_alliance"],
  riskLevel: "medium",
};

describe("web API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits queued turn requests without persisting secrets elsewhere", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        campaignId: "campaign-1",
        turnId: "turn-1",
        status: "pending",
        queued: true,
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.runTurn(
      "campaign-1",
      action,
      "debug",
      {
        baseUrl: "http://localhost:11434/v1",
        model: "local-model",
        apiKey: "secret",
        timeoutMs: 5000,
        maxTokens: 2048,
        jsonMode: "off",
      },
      { queued: true },
    );

    expect(result).toMatchObject({
      turnId: "turn-1",
      status: "pending",
      queued: true,
    });
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [, init] = call as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      queued: true,
      transparency: "debug",
      llmConfig: {
        baseUrl: "http://localhost:11434/v1",
        model: "local-model",
        apiKey: "secret",
        timeoutMs: 5000,
        maxTokens: 2048,
        jsonMode: "off",
      },
    });
  });

  it("posts long campaign progression requests to the campaign endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        campaignId: "campaign-1",
        state: {
          campaign: {
            chapter: 2,
            base: { level: 1, facilities: { infirmary: 1 } },
          },
        },
        availableActions: [],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api.progressCampaign("campaign-1", {
        baseInvestments: [{ facilityId: "infirmary", supplies: 2, money: 1 }],
        training: { skill: "medical", experience: 3 },
        factionFronts: [
          { factionId: "blackstone_consortium", pressureDelta: -2 },
        ],
      }),
    ).resolves.toMatchObject({
      campaignId: "campaign-1",
      state: {
        campaign: {
          chapter: 2,
          base: { level: 1, facilities: { infirmary: 1 } },
        },
      },
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/campaigns/campaign-1/campaign/progress");
    expect(JSON.parse(String(init.body))).toEqual({
      baseInvestments: [{ facilityId: "infirmary", supplies: 2, money: 1 }],
      training: { skill: "medical", experience: 3 },
      factionFronts: [
        { factionId: "blackstone_consortium", pressureDelta: -2 },
      ],
    });
  });

  it("lists scenarios and posts an explicit campaign creation body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          scenarios: [
            {
              id: "border-seven-days",
              title: "边境七日",
              counts: { combat: 5, social: 8, endings: 6 },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          campaignId: "campaign-1",
          scenario: "border-seven-days",
          availableActions: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.scenarios()).resolves.toEqual({
      scenarios: [
        {
          id: "border-seven-days",
          title: "边境七日",
          counts: { combat: 5, social: 8, endings: 6 },
        },
      ],
    });
    await api.createCampaign("border-seven-days");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/scenarios");
    const [, createInit] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(String(createInit.body))).toEqual({
      scenarioId: "border-seven-days",
    });
  });

  it("imports creator scenario packages without local mutation", async () => {
    const scenarioDefinition = {
      id: "creator-smoke",
      title: "Creator Smoke",
      world: { time: { day: 1, phase: "morning" } },
      scenes: [],
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        scenario: {
          id: "creator-smoke",
          title: "Creator Smoke",
          counts: { combat: 0, social: 0, endings: 0 },
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.importScenario(scenarioDefinition)).resolves.toEqual({
      scenario: {
        id: "creator-smoke",
        title: "Creator Smoke",
        counts: { combat: 0, social: 0, endings: 0 },
      },
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/scenarios/import");
    expect(JSON.parse(String(init.body))).toEqual(scenarioDefinition);
  });

  it("posts LLM connection checks without storing settings elsewhere", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        baseUrl: "https://llm.example.test/v1",
        model: "story-model",
        latencyMs: 42,
        message: "ready",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api.testLlmConnection({
        baseUrl: "https://llm.example.test/v1",
        model: "story-model",
        apiKey: "local-secret",
        timeoutMs: 6000,
        maxTokens: 128,
        jsonMode: "strict",
      }),
    ).resolves.toEqual({
      ok: true,
      baseUrl: "https://llm.example.test/v1",
      model: "story-model",
      latencyMs: 42,
      message: "ready",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/llm/test");
    expect(JSON.parse(String(init.body))).toEqual({
      baseUrl: "https://llm.example.test/v1",
      model: "story-model",
      apiKey: "local-secret",
      timeoutMs: 6000,
      maxTokens: 128,
      jsonMode: "strict",
    });
  });

  it("turns structured API errors into readable connection messages", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      text: async () =>
        JSON.stringify({
          ok: false,
          error: "missing_api_key",
          message: "请输入 API Key 后再测试连接。",
        }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api.testLlmConnection({
        baseUrl: "https://llm.example.test/v1",
        model: "story-model",
        apiKey: "",
        timeoutMs: 6000,
        maxTokens: 128,
        jsonMode: "auto",
      }),
    ).rejects.toThrow("请输入 API Key 后再测试连接。");
  });

  it("deletes runtime creator scenario packages by id", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ deleted: true, scenarioId: "creator-smoke" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.deleteScenario("creator-smoke")).resolves.toEqual({
      deleted: true,
      scenarioId: "creator-smoke",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/scenarios/creator-smoke");
    expect(init.method).toBe("DELETE");
  });

  it("exports runtime creator scenario packages by id", async () => {
    const definition = { id: "creator-smoke", title: "Creator Smoke" };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ scenarioId: "creator-smoke", definition }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.exportScenario("creator-smoke")).resolves.toEqual({
      scenarioId: "creator-smoke",
      definition,
    });
    const [url] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit | undefined,
    ];
    expect(url).toBe("/api/scenarios/creator-smoke/export");
  });

  it("lists resumable campaigns with an explicit limit", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        campaigns: [
          {
            id: "campaign-1",
            title: "边境七日",
            scenario: "border-seven-days",
            day: 1,
            phase: "afternoon",
            currentLocationId: "clinic",
            currentLocationName: "边境诊所",
            turnCount: 1,
            lastTurnStatus: "complete",
            createdAt: "2026-06-02T00:00:00.000Z",
            updatedAt: "2026-06-02T01:00:00.000Z",
          },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.campaigns(6)).resolves.toMatchObject({
      campaigns: [expect.objectContaining({ id: "campaign-1", turnCount: 1 })],
    });
    const call = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit | undefined,
    ];
    expect(call[0]).toBe("/api/campaigns?limit=6");
  });

  it("requests state and turn events with the selected transparency mode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ campaignId: "campaign-1", availableActions: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          ["event: turn", 'data: {"id":"turn-1","status":"complete"}', ""].join(
            "\n",
          ),
      });
    vi.stubGlobal("fetch", fetchMock);

    await api.getState("campaign-1", "debug");
    await api.turnEvents("campaign-1", "turn-1", "debug");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/campaigns/campaign-1/state?transparency=debug",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/campaigns/campaign-1/turns/turn-1/events?transparency=debug",
    );
  });

  it("parses turn SSE progress into typed events", () => {
    const events = parseSseEvents(
      [
        "event: turn",
        'data: {"id":"turn-1","status":"pending"}',
        "",
        "event: pending",
        'data: {"message":"turn_waiting_for_worker"}',
        "",
        "event: referee",
        'data: {"publicSummary":"Players held the clinic.","statePatch":{"type":"state_patch","source":"referee","changes":[]}}',
        "",
        "event: narration",
        'data: {"text":"The street goes quiet."}',
        "",
      ].join("\n"),
    );

    expect(events).toEqual([
      { event: "turn", data: { id: "turn-1", status: "pending" } },
      { event: "pending", data: { message: "turn_waiting_for_worker" } },
      {
        event: "referee",
        data: {
          publicSummary: "Players held the clinic.",
          statePatch: { type: "state_patch", source: "referee", changes: [] },
        },
      },
      { event: "narration", data: { text: "The street goes quiet." } },
    ]);
  });
});
