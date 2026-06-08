import { z } from "zod";
import type { LlmUsageSummary } from "@agentic-turnscape/shared";

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMClient = {
  completeJson<T>(input: {
    messages: LLMMessage[];
    schema: z.ZodType<T>;
    temperature?: number;
    fallback: () => T;
  }): Promise<T>;
  completeText(input: {
    messages: LLMMessage[];
    temperature?: number;
    fallback: () => string;
  }): Promise<string>;
};

export type OpenAICompatibleOptions = {
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  model?: string | undefined;
  timeoutMs?: number | undefined;
  maxTokens?: number | undefined;
  jsonRetries?: number | undefined;
  onUsage?: ((usage: LlmUsageSummary) => void) | undefined;
};

const withTimeout = async <T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const usageNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0;

const openAiUsageOf = (usage: unknown): LlmUsageSummary | undefined => {
  if (!usage || typeof usage !== "object") return undefined;
  const record = usage as Record<string, unknown>;
  const promptTokens = usageNumber(
    record.prompt_tokens ?? record.promptTokens,
  );
  const completionTokens = usageNumber(
    record.completion_tokens ?? record.completionTokens,
  );
  const totalTokens =
    usageNumber(record.total_tokens ?? record.totalTokens) ||
    promptTokens + completionTokens;
  if (promptTokens + completionTokens + totalTokens <= 0) return undefined;
  return {
    requests: 1,
    promptTokens,
    completionTokens,
    totalTokens,
  };
};

export const createOpenAICompatibleClient = ({
  baseUrl = "https://api.openai.com/v1",
  apiKey,
  model = "gpt-4.1-mini",
  timeoutMs = 15000,
  maxTokens = 1024,
  jsonRetries = 1,
  onUsage,
}: OpenAICompatibleOptions): LLMClient => {
  const request = async (
    messages: LLMMessage[],
    temperature = 0.3,
    jsonMode = true,
  ): Promise<string | undefined> => {
    if (!apiKey) return undefined;
    const response = await withTimeout(
      (signal) =>
        fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature,
            max_tokens: maxTokens,
            messages,
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
        }),
      timeoutMs,
    );
    if (!response.ok) {
      throw new Error(
        `LLM request failed with ${response.status}: ${await response.text()}`,
      );
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: unknown;
    };
    const usage = openAiUsageOf(body.usage);
    if (usage) onUsage?.(usage);
    return body.choices?.[0]?.message?.content;
  };

  return {
    async completeJson<T>({
      messages,
      schema,
      temperature,
      fallback,
    }: {
      messages: LLMMessage[];
      schema: z.ZodType<T>;
      temperature?: number;
      fallback: () => T;
    }) {
      let retryMessages = messages;
      for (let attempt = 0; attempt <= jsonRetries; attempt += 1) {
        try {
          const content = await request(retryMessages, temperature, true);
          if (!content) return fallback();
          const parsed = schema.safeParse(JSON.parse(content));
          if (parsed.success) return parsed.data;
          retryMessages = [
            ...messages,
            { role: "assistant", content },
            {
              role: "user",
              content: `The previous JSON failed schema validation: ${parsed.error.issues
                .map(
                  (issue) =>
                    `${issue.path.join(".") || "root"} ${issue.message}`,
                )
                .join("; ")}. Return only valid JSON with all required fields.`,
            },
          ];
        } catch {
          retryMessages = [
            ...messages,
            {
              role: "user",
              content:
                "The previous response was not valid JSON. Return only valid JSON with all required fields.",
            },
          ];
        }
      }
      return fallback();
    },
    async completeText({ messages, temperature, fallback }) {
      try {
        const content = await request(messages, temperature, false);
        return content?.trim() || fallback();
      } catch {
        return fallback();
      }
    },
  };
};
