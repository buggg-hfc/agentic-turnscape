import { Queue, Worker, type JobsOptions } from "bullmq";
import type { LlmConfig, PlayerAction, TransparencyMode } from "@agentic-turnscape/shared";

export type TurnJobPayload = {
  campaignId: string;
  turnId: string;
  action: PlayerAction;
  seed?: string;
  transparency: TransparencyMode;
  llmConfig?: LlmConfig;
};

export type TurnJobHandler = (payload: TurnJobPayload) => Promise<void>;

export type TurnJobQueue = {
  onProcess(handler: TurnJobHandler): void;
  enqueue(payload: TurnJobPayload): Promise<void>;
  drain?(): Promise<void>;
  close?(): Promise<void>;
};

export class InMemoryTurnQueue implements TurnJobQueue {
  private handler?: TurnJobHandler;
  private readonly pending: TurnJobPayload[] = [];
  private running = false;

  constructor(private readonly options: { autoRun?: boolean } = {}) {}

  onProcess(handler: TurnJobHandler): void {
    this.handler = handler;
  }

  async enqueue(payload: TurnJobPayload): Promise<void> {
    this.pending.push(payload);
    if (this.options.autoRun !== false) {
      queueMicrotask(() => {
        void this.drain();
      });
    }
  }

  async drain(): Promise<void> {
    if (this.running) return;
    if (!this.handler) throw new Error("Turn queue has no processor");
    this.running = true;
    try {
      while (this.pending.length > 0) {
        const payload = this.pending.shift();
        if (payload) await this.handler(payload);
      }
    } finally {
      this.running = false;
    }
  }
}

const redisConnection = (redisUrl: string | undefined) => {
  const url = new URL(redisUrl ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {})
  };
};

const withoutPersistedSecret = (payload: TurnJobPayload): TurnJobPayload => ({
  ...payload,
  ...(payload.seed ? { seed: payload.seed } : {}),
  ...(payload.llmConfig
    ? {
        llmConfig: {
          ...payload.llmConfig,
          apiKey: ""
        }
      }
    : {})
});

export class BullMqTurnQueue implements TurnJobQueue {
  private readonly queue: Queue<TurnJobPayload>;
  private worker?: Worker<TurnJobPayload>;

  constructor(
    redisUrl = process.env.REDIS_URL,
    private readonly queueName = process.env.TURN_QUEUE_NAME ?? "agentic-turnscape-turns"
  ) {
    this.queue = new Queue<TurnJobPayload>(this.queueName, {
      connection: redisConnection(redisUrl)
    });
  }

  onProcess(handler: TurnJobHandler): void {
    this.worker = new Worker<TurnJobPayload>(this.queueName, async (job) => handler(job.data), {
      connection: redisConnection(process.env.REDIS_URL)
    });
  }

  async enqueue(payload: TurnJobPayload): Promise<void> {
    const jobOptions: JobsOptions = {
      attempts: 2,
      removeOnComplete: 100,
      removeOnFail: 100
    };
    await this.queue.add("run-turn", withoutPersistedSecret(payload), jobOptions);
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
  }
}

export const createTurnQueue = (): TurnJobQueue =>
  process.env.TURN_QUEUE_DRIVER === "bullmq" ? new BullMqTurnQueue() : new InMemoryTurnQueue();
