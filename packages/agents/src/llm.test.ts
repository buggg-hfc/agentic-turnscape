import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createOpenAICompatibleClient } from "./llm.js";

describe("OpenAI-compatible LLM client", () => {
  it("retries structured JSON once when the model omits required fields", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ actorId: "npc_adele" }) } }] })
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
                  publicReason: "She wants the clinic kept open."
                })
              }
            }
          ]
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOpenAICompatibleClient({
      apiKey: "test-key",
      model: "local-json-model",
      jsonRetries: 1
    });
    const result = await client.completeJson({
      schema: z.object({
        actorId: z.string(),
        intent: z.string(),
        publicReason: z.string()
      }),
      messages: [{ role: "user", content: "Return an action proposal." }],
      fallback: () => ({ actorId: "fallback", intent: "fallback", publicReason: "fallback" })
    });

    expect(result).toEqual({
      actorId: "npc_adele",
      intent: "de-escalate",
      publicReason: "She wants the clinic kept open."
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).messages.at(-1)).toMatchObject({
      role: "user"
    });
  });
});
