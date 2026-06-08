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

export type LlmDiagnosticEvent = {
  type: "json_attempt" | "json_retry" | "fallback";
  channel: "json" | "text";
  attempt: number;
  reason?: "schema" | "invalid_json" | "request" | "missing_content" | "empty_text";
};

export type OpenAICompatibleOptions = {
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  model?: string | undefined;
  timeoutMs?: number | undefined;
  maxTokens?: number | undefined;
  jsonRetries?: number | undefined;
  onUsage?: ((usage: LlmUsageSummary) => void) | undefined;
  onDiagnostic?: ((event: LlmDiagnosticEvent) => void) | undefined;
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
  onDiagnostic,
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
        const attemptNumber = attempt + 1;
        onDiagnostic?.({
          type: "json_attempt",
          channel: "json",
          attempt: attemptNumber,
        });
        try {
          const content = await request(retryMessages, temperature, true);
          if (!content) {
            onDiagnostic?.({
              type: "fallback",
              channel: "json",
              attempt: attemptNumber,
              reason: "missing_content",
            });
            return fallback();
          }
          let raw: unknown;
          try {
            raw = JSON.parse(content);
          } catch {
            if (attempt < jsonRetries) {
              onDiagnostic?.({
                type: "json_retry",
                channel: "json",
                attempt: attemptNumber,
                reason: "invalid_json",
              });
              retryMessages = [
                ...messages,
                {
                  role: "user",
                  content:
                    "The previous response was not valid JSON. Return only valid JSON with all required fields.",
                },
              ];
              continue;
            }
            onDiagnostic?.({
              type: "fallback",
              channel: "json",
              attempt: attemptNumber,
              reason: "invalid_json",
            });
            return fallback();
          }
          const parsed = schema.safeParse(raw);
          if (parsed.success) return parsed.data;
          if (attempt >= jsonRetries) {
            onDiagnostic?.({
              type: "fallback",
              channel: "json",
              attempt: attemptNumber,
              reason: "schema",
            });
            return fallback();
          }
          onDiagnostic?.({
            type: "json_retry",
            channel: "json",
            attempt: attemptNumber,
            reason: "schema",
          });
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
          if (attempt < jsonRetries) {
            onDiagnostic?.({
              type: "json_retry",
              channel: "json",
              attempt: attemptNumber,
              reason: "request",
            });
            retryMessages = [
              ...messages,
              {
                role: "user",
                content:
                  "The previous response was not valid JSON. Return only valid JSON with all required fields.",
              },
            ];
          } else {
            onDiagnostic?.({
              type: "fallback",
              channel: "json",
              attempt: attemptNumber,
              reason: "request",
            });
          }
        }
      }
      return fallback();
    },
    async completeText({ messages, temperature, fallback }) {
      try {
        const content = await request(messages, temperature, false);
        const trimmed = content?.trim();
        if (trimmed) return trimmed;
        onDiagnostic?.({
          type: "fallback",
          channel: "text",
          attempt: 1,
          reason: "empty_text",
        });
        return fallback();
      } catch {
        onDiagnostic?.({
          type: "fallback",
          channel: "text",
          attempt: 1,
          reason: "request",
        });
        return fallback();
      }
    },
  };
};
