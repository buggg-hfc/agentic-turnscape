import { z } from "zod";

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

export const createOpenAICompatibleClient = ({
  baseUrl = "https://api.openai.com/v1",
  apiKey,
  model = "gpt-4.1-mini",
  timeoutMs = 15000,
  maxTokens = 1024,
  jsonRetries = 1,
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
    };
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
        if (!apiKey) return fallback();
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
              }),
            }),
          timeoutMs,
        );
        if (!response.ok) return fallback();
        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        return body.choices?.[0]?.message?.content?.trim() || fallback();
      } catch {
        return fallback();
      }
    },
  };
};
