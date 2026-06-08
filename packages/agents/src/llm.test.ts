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
});
