# agentic-turnscape

A multi-agent turn-based narrative simulation game. The current implementation is a playable MVP vertical slice for the “边境七日” scenario from `多Agent回合制模拟游戏设计总案.docx`.

## What is implemented

- TypeScript npm workspace with `apps/web`, `apps/api`, and shared packages.
- React + Vite web client for the main turn interface.
- Fastify API with campaign, state, action, turn, SSE replay, and chronicle endpoints.
- Zod-validated world state, Agent proposal, player action, and referee patch schemas.
- Core rules for 2d6 checks, success levels, time progression, state patches, crisis clocks, relationships, pressure, momentum, and first-scene consequences.
- Crisis recovery branches for plague, mine control, and cult ritual clocks so near-collapse failures open new playable choices instead of an early game over.
- Agent orchestration where NPCs only propose actions and the referee is the only code path that mutates state.
- NPC LLM observations are built from a strict public-context whitelist: current public location facts, visible clocks, recent public events, player relationship, and the actor faction's public plan without hidden goals.
- Representative Border Seven Days scenes now activate all 10 key NPCs through legal limited-observation proposal routes.
- All 5 combat scenes and 8 social scenes in Border Seven Days have executable scene action fixtures covered by the turn/referee pipeline.
- OpenAI-compatible LLM client with structured JSON parsing and deterministic scripted fallback for local development.
- In-game LLM configuration for base URL, model, API key, timeout, and max token budget, with browser-local saved settings.
- Three Agent transparency modes with server-side redaction so hidden reasons, hidden summaries, and hidden patches only appear in debug views.
- Player-visible world state redacts location hidden info, character secrets, faction hidden goals, quest true backgrounds, unrevealed hidden events, and quest hidden goals.
- Seed content for 3 factions, 10 NPCs, 6 locations, 3 visible crisis clocks, quests, and starting chronicle.
- Web dashboard faction-plan panel showing each visible faction's leader, current plan, public clock pressure, and strongest resources.
- Faction-plan rules now cover advance, blocked, and redirected outcomes for all 3 Border Seven Days factions through referee-owned state patches.
- First-wave expansion scenario packs for cultivation, science fiction, historical, urban supernatural, and realistic profession play, all using the same tested `ScenarioPackage` contract.
- Deterministic expansion playthrough tests for all first-wave packs, covering both success and pressure endings with generic scenario clock progression and replayable state patches.
- Long campaign progression rules for post-MVP expansion: chapter transitions, base facilities, character growth, and faction-war fronts all enter world state through referee-owned patches.
- Long campaign progression is now available through `POST /campaigns/:id/campaign/progress`, persisted in snapshots/replay records, and surfaced in the web dashboard.
- Built-in MVP and first-wave expansion scenarios declare long campaign arc metadata for chapters, base facilities, and faction fronts; the API catalog and web scenario picker expose the summary.
- Active campaign state now exposes the current long campaign arc chapter, and the web dashboard shows a Campaign Arc panel with chapter focus, unlocks, base hooks, and faction fronts.
- Built-in scenario registry plus runtime creator scenario import, export, protected deletion, local restore, and API-side persistence.
- Chronicle replay records, state snapshots, Agent run records, and hidden memory logs.
- PostgreSQL/Redis Docker Compose, Prisma schema, optional `STORAGE_DRIVER=prisma` persistence, and optional `TURN_QUEUE_DRIVER=bullmq` turn workers.

## Run locally

```bash
npm install
npm run dev
```

Open the web app at `http://localhost:5173`. The API runs at `http://localhost:8787`.

To use a real LLM, copy `.env.example` to `.env` and set `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, and optionally `LLM_TIMEOUT_MS`/`LLM_MAX_TOKENS`. OpenAI-compatible providers such as DeepSeek can also be configured in the in-game LLM panel and saved locally in the browser. Without a key, the game uses scripted Agent fallbacks so the vertical slice remains playable.

To run an opt-in provider smoke test, set `RUN_REAL_LLM_SMOKE=1` plus the same `LLM_*` environment variables and run:

```bash
npm run test:llm:smoke
```

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

Runtime reports and screenshots are collected in [docs/implementation-report.md](docs/implementation-report.md).
