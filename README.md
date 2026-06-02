# agentic-turnscape

A multi-agent turn-based narrative simulation game. The current implementation is a playable MVP vertical slice for the “边境七日” scenario from `多Agent回合制模拟游戏设计总案.docx`.

## What is implemented

- TypeScript npm workspace with `apps/web`, `apps/api`, and shared packages.
- React + Vite web client for the main turn interface.
- Fastify API with campaign, state, action, turn, SSE replay, and chronicle endpoints.
- Zod-validated world state, Agent proposal, player action, and referee patch schemas.
- Core rules for 2d6 checks, success levels, time progression, state patches, crisis clocks, relationships, pressure, momentum, and first-scene consequences.
- Agent orchestration where NPCs only propose actions and the referee is the only code path that mutates state.
- OpenAI-compatible LLM client with structured JSON parsing and deterministic scripted fallback for local development.
- In-game LLM configuration for base URL, model, API key, and timeout, with browser-local saved settings.
- Three Agent transparency modes with server-side redaction so hidden reasons, hidden summaries, and hidden patches only appear in debug views.
- Seed content for 3 factions, 10 NPCs, 6 locations, 3 visible crisis clocks, quests, and starting chronicle.
- Built-in scenario registry plus runtime creator scenario import, export, protected deletion, local restore, and API-side persistence.
- Chronicle replay records, state snapshots, Agent run records, and hidden memory logs.
- PostgreSQL/Redis Docker Compose, Prisma schema, optional `STORAGE_DRIVER=prisma` persistence, and optional `TURN_QUEUE_DRIVER=bullmq` turn workers.

## Run locally

```bash
npm install
npm run dev
```

Open the web app at `http://localhost:5173`. The API runs at `http://localhost:8787`.

To use a real LLM, copy `.env.example` to `.env` and set `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`. Without a key, the game uses scripted Agent fallbacks so the vertical slice remains playable.

The default store is in-memory for fast local iteration. Set `STORAGE_DRIVER=prisma` with `DATABASE_URL` pointed at PostgreSQL to use the Prisma-backed campaign store.

Turn resolution is synchronous by default. API clients can send `queued: true` to `POST /campaigns/:id/turns/run` for an asynchronous turn job; the in-memory queue runs locally, and `TURN_QUEUE_DRIVER=bullmq` uses Redis-backed BullMQ jobs. BullMQ jobs intentionally do not persist per-request API keys, so queued production turns should use environment-provided LLM credentials.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Development rule

This project is TDD-first. New gameplay, API, Agent, content, and UI behavior should start with a failing test or acceptance fixture before production code changes. The working roadmap and gates live in [docs/tdd-and-expansion-roadmap.md](docs/tdd-and-expansion-roadmap.md).

Documentation should be updated with each meaningful gameplay, API, Agent, persistence, or UX slice. Recent implementation notes are tracked in [docs/development-log.md](docs/development-log.md).
