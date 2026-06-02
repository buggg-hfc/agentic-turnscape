import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createOpenAICompatibleClient } from "./llm.js";

const runSmoke = process.env.RUN_REAL_LLM_SMOKE === "1";
const realLlmIt = runSmoke ? it : it.skip;

describe("real OpenAI-compatible LLM smoke test", () => {
  realLlmIt(
    "returns structured JSON through the configured provider",
    async () => {
      const client = createOpenAICompatibleClient({
        baseUrl: process.env.LLM_BASE_URL,
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL,
        timeoutMs: process.env.LLM_TIMEOUT_MS
          ? Number(process.env.LLM_TIMEOUT_MS)
          : 30000,
        maxTokens: process.env.LLM_MAX_TOKENS
          ? Number(process.env.LLM_MAX_TOKENS)
          : 256,
        jsonRetries: 1,
      });

      const result = await client.completeJson({
        schema: z.object({
          ok: z.boolean(),
          provider: z.string().min(1),
        }),
        messages: [
          {
            role: "user",
            content:
              'Return only JSON in this exact shape: {"ok": true, "provider": "configured-openai-compatible"}.',
          },
        ],
        fallback: () => ({ ok: false as const, provider: "fallback" }),
      });

      expect(result).toEqual({
        ok: true,
        provider: "configured-openai-compatible",
      });
    },
  );
});
