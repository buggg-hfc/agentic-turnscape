import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createOpenAICompatibleClient } from "./llm.js";

describe("OpenAI-compatible LLM client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries structured JSON once when the model omits required fields", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: JSON.stringify({ actorId: "npc_adele" }) } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  actorId: "npc_adele",
                  intent: "de-escalate",
                  publicReason: "She wants the clinic kept open.",
                }),
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenAICompatibleClient({
      apiKey: "test-key",
      model: "local-json-model",
      jsonRetries: 1,
    });
    const result = await client.completeJson({
      schema: z.object({
        actorId: z.string(),
        intent: z.string(),
        publicReason: z.string(),
      }),
      messages: [{ role: "user", content: "Return an action proposal." }],
      fallback: () => ({
        actorId: "fallback",
        intent: "fallback",
        publicReason: "fallback",
      }),
    });

    expect(result).toEqual({
      actorId: "npc_adele",
      intent: "de-escalate",
      publicReason: "She wants the clinic kept open.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).messages.at(-1),
    ).toMatchObject({
      role: "user",
    });
  });

  it("sends OpenAI-compatible JSON requests with the configured token budget", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenAICompatibleClient({
      baseUrl: "https://api.deepseek.com/",
      apiKey: "test-key",
      model: "deepseek-v4-pro",
      timeoutMs: 7000,
      maxTokens: 512,
    });

    await expect(
      client.completeJson({
        schema: z.object({ ok: z.boolean() }),
        messages: [{ role: "user", content: "Return JSON." }],
        fallback: () => ({ ok: false }),
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "deepseek-v4-pro",
      max_tokens: 512,
      response_format: { type: "json_object" },
    });
  });

  it("falls back to plain JSON prompts when a provider rejects response_format", async () => {
    const diagnostics: unknown[] = [];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "response_format json_object is not supported",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenAICompatibleClient({
      apiKey: "test-key",
      model: "local-json-model",
      jsonMode: "auto",
      onDiagnostic: (event) => diagnostics.push(event),
    });

    await expect(
      client.completeJson({
        schema: z.object({ ok: z.boolean() }),
        messages: [{ role: "user", content: "Return JSON." }],
        fallback: () => ({ ok: false }),
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      response_format: { type: "json_object" },
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).not.toHaveProperty(
      "response_format",
    );
    expect(diagnostics).toContainEqual({
      type: "json_retry",
      channel: "json",
      attempt: 1,
      reason: "response_format",
    });
  });

  it("can disable response_format for local OpenAI-compatible providers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenAICompatibleClient({
      apiKey: "test-key",
      model: "local-json-model",
      jsonMode: "off",
    });

    await client.completeJson({
      schema: z.object({ ok: z.boolean() }),
      messages: [{ role: "user", content: "Return JSON." }],
      fallback: () => ({ ok: false }),
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).not.toHaveProperty(
      "response_format",
    );
  });

  it("reports OpenAI-compatible token usage without exposing response text", async () => {
    const usageEvents: unknown[] = [];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
        usage: {
          prompt_tokens: 21,
          completion_tokens: 7,
          total_tokens: 28,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenAICompatibleClient({
      apiKey: "test-key",
      model: "usage-model",
      onUsage: (usage) => usageEvents.push(usage),
    });

    await client.completeJson({
      schema: z.object({ ok: z.boolean() }),
      messages: [{ role: "user", content: "Return JSON." }],
      fallback: () => ({ ok: false }),
    });

    expect(usageEvents).toEqual([
      {
        requests: 1,
        promptTokens: 21,
        completionTokens: 7,
        totalTokens: 28,
      },
    ]);
    expect(JSON.stringify(usageEvents)).not.toContain('"ok":true');
  });

  it("reports JSON retry and fallback diagnostics without storing response text", async () => {
    const diagnostics: unknown[] = [];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ actorId: "npc" }) } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{bad json" } }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenAICompatibleClient({
      apiKey: "test-key",
      model: "diagnostic-model",
      jsonRetries: 1,
      onDiagnostic: (event) => diagnostics.push(event),
    });

    await expect(
      client.completeJson({
        schema: z.object({
          actorId: z.string(),
          intent: z.string(),
        }),
        messages: [{ role: "user", content: "Return an action proposal." }],
        fallback: () => ({ actorId: "fallback", intent: "fallback" }),
      }),
    ).resolves.toEqual({ actorId: "fallback", intent: "fallback" });

    expect(diagnostics).toEqual([
      { type: "json_attempt", channel: "json", attempt: 1 },
      {
        type: "json_retry",
        channel: "json",
        attempt: 1,
        reason: "schema",
      },
      { type: "json_attempt", channel: "json", attempt: 2 },
      {
        type: "fallback",
        channel: "json",
        attempt: 2,
        reason: "invalid_json",
      },
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain("actorId");
    expect(JSON.stringify(diagnostics)).not.toContain("{bad json");
  });
});
