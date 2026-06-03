# Implementation Report

This report records verified runtime slices for the multi-Agent turn-based simulation MVP and its expansion path.

## 2026-06-03 - MVP Scene Resolution Coverage

### Scope

- Added executable scene action fixtures for all Border Seven Days combat and social MVP scenes.
- Added acceptance coverage for 5 combat scenes and 8 social scenes through the full `runTurn` pipeline.
- Each covered scene now proves three invariants: Agent proposals exist, state changes enter through the referee `state_patch`, and a public result is appended for player feedback.

### Runtime Screenshot

![Faction plan dashboard panel](screenshots/faction-plans-runtime-2026-06-03.png)

The report keeps a verified runtime screenshot inline as requested. This content/backend slice strengthens the playable scene coverage behind the same campaign dashboard and turn-resolution flow.

### Verification

```bash
npm test -- packages/agents/src/playthrough.test.ts --reporter=dot
npm run typecheck
npm test -- --reporter=dot
npm run build
```

## 2026-06-03 - Key NPC Proposal Coverage

### Scope

- Added a regression test proving the normal orchestrator can activate every Border Seven Days key NPC across representative MVP routes.
- Expanded active Agent selection for clinic, black market, old outpost, mine, and chapel scenes so Mina and White Crow participate in LLM proposal generation instead of staying content-only records.
- Filtered active Agent ids against the current world's character table so expansion packs do not receive unrelated Border Seven Days actors.

### Runtime Screenshot

![Faction plan dashboard panel](screenshots/faction-plans-runtime-2026-06-03.png)

The report keeps a verified runtime screenshot inline as requested. This backend Agent slice supports the same playable dashboard: the visible scenes and faction surfaces now have proposal coverage from all 10 important NPCs behind the turn-resolution flow.

### Verification

```bash
npm test -- packages/agents/src/orchestrator.test.ts --reporter=dot
npm run typecheck
npm test -- --reporter=dot
npm run build
```

## 2026-06-03 - Agent Observation Boundary

### Scope

- Added a regression test around NPC LLM prompt construction.
- NPC observations now include the actor faction's public strategy context so proposals can respond to faction pressure.
- The prompt whitelist excludes location `hiddenInfo`, faction `hiddenGoal`, and character `secret` strings, preserving the rule that Agents act only on what they can know.

### Runtime Screenshot

![Faction plan dashboard panel](screenshots/faction-plans-runtime-2026-06-03.png)

The report keeps a verified runtime screenshot inline as requested. This backend Agent safety slice protects the same dashboard surface: public faction plans may be shown to players and NPCs, while hidden faction goals remain available only to referee/debug paths.

### Verification

```bash
npm test -- packages/agents/src/orchestrator.test.ts --reporter=dot
```

## 2026-06-03 - Faction Plan Visibility

### Scope

- Added a tested web view model for visible faction plans, leaders, public clock pressure, and strongest resources.
- Added a dashboard Faction Plans panel so players can see what the Frontier Guild, Blackstone Consortium, and Rift Cult are currently trying to do.
- Kept the rule invariant intact: the UI only summarizes world state already produced by referee-owned patches.

### Runtime Screenshot

![Faction plan dashboard panel](screenshots/faction-plans-runtime-2026-06-03.png)

The screenshot was captured from a local runtime session after creating a fresh `border-seven-days` campaign. It shows the new Faction Plans panel alongside crisis clocks, relationships, LLM settings, and Agent transparency.

### Verification

```bash
npm test -- apps/web/src/factionPlans.test.ts --reporter=dot
npm test -- apps/web/src/factionPlans.test.ts apps/web/src/campaignProgression.test.ts apps/web/src/api.test.ts --reporter=dot
npm run typecheck
npm test -- --reporter=dot
npm run build
```

## 2026-06-03 - Long Campaign Progress Legality

### Scope

- Added API-side legality checks before long-campaign progression can create a turn, referee patch, snapshot, chronicle event, or memory log.
- Invalid completed quests, base facilities, training skills, and faction fronts now return `invalid_campaign_progression` with a concrete reason.
- Preserved the core invariant: long campaign state still changes only through valid referee-owned `state_patch` records.

### Runtime Screenshot

![Long campaign progression panel](screenshots/long-campaign-progress-panel-2026-06-02.png)

The report keeps a runtime screenshot inline as requested. This slice protects the same long-campaign dashboard and Campaign Moves surface by rejecting requests that reference scenario hooks or world-state entries the current campaign does not expose.

### Verification

```bash
npm test -- apps/api/src/server.test.ts --reporter=dot
npm run typecheck
npm test -- --reporter=dot
npm run build
```

## 2026-06-03 - Long Campaign Move Choices

### Scope

- Added tested web view-model support for long-campaign move choices: base-building, training, and faction-front stabilization.
- Connected the dashboard to submit those choices through the existing `/campaigns/:id/campaign/progress` API, so each move still resolves through referee-owned `state_patch` records.
- Kept the long campaign expansion path replayable: returned state, scenario status, available actions, narration, and chronicle are refreshed after each move.

### Runtime Screenshot

![Long campaign progression panel](screenshots/long-campaign-progress-panel-2026-06-02.png)

The report keeps a runtime screenshot inline as requested. This slice extends the same long-campaign dashboard surface with actionable Campaign Moves; behavior is covered by focused UI view-model/API tests and the full build gate below.

### Verification

```bash
npm test -- apps/web/src/campaignProgression.test.ts apps/web/src/api.test.ts --reporter=dot
npm run typecheck
npm test -- --reporter=dot
npm run build
```

## 2026-06-03 - OpenAI-compatible LLM Token Budget

### Scope

- Added a validated `maxTokens` field to the shared LLM configuration contract, with browser-local persistence and API per-turn override support.
- Passed the token budget into the OpenAI-compatible chat completion request as `max_tokens`, covering DeepSeek-compatible base URLs and models without provider-specific code.
- Added an opt-in real-provider smoke test that reads credentials only from environment variables.
- Kept API keys out of world state, replay payloads, queue persistence, and documentation.

### Runtime Screenshot

![Long campaign progression panel](screenshots/long-campaign-progress-panel-2026-06-02.png)

The report continues to include a verified runtime screenshot inline. This LLM configuration slice is validated by focused tests and the full gate; the screenshot remains the current captured runtime surface for the web dashboard.

### Verification

```bash
npm test -- packages/agents/src/llm.test.ts apps/web/src/llmSettings.test.ts apps/web/src/api.test.ts apps/api/src/server.test.ts --reporter=dot
npm run test:llm:smoke
npm run typecheck
npm test -- --reporter=dot
npm run build
```

## 2026-06-02 - Active Campaign Arc Status

### Scope

- Added active campaign arc status to campaign payloads: current chapter number, current chapter details, unlocks, base facilities, and faction fronts.
- Added a web Campaign Arc panel that summarizes the active chapter focus after the player enters a campaign.
- Kept the existing invariant intact: this is derived scenario/package status and does not mutate world state outside referee-owned patches.

### Runtime Screenshot

![Long campaign progression panel](screenshots/long-campaign-progress-panel-2026-06-02.png)

The report keeps a runtime screenshot inline as requested. This stored capture remains the current verified runtime image for the long-campaign dashboard surface; the active Campaign Arc slice is covered by API and web view-model tests plus the build gate below.

### Verification

```bash
npm test -- apps/api/src/server.test.ts apps/web/src/campaignArcStatus.test.ts --reporter=dot
npm run typecheck
npm test -- --reporter=dot
npm run build
```

## 2026-06-02 - Long Campaign API and UI

### Scope

- Added a tested API endpoint, `POST /campaigns/:id/campaign/progress`, for referee-owned long campaign progression.
- Persisted long campaign progression as normal state snapshots, replay entries, chronicle events, and memory logs.
- Added a web dashboard panel that summarizes chapter, campaign XP, base facilities, and faction-war fronts.
- Kept the invariant intact: long campaign state changes still enter the world only through a referee `state_patch`.

### Runtime Screenshot

![Long campaign progression panel](screenshots/long-campaign-progress-panel-2026-06-02.png)

The screenshot was captured from a local `npm run dev` session after creating a `border-seven-days` campaign and applying a real `/campaign/progress` request with a base investment and faction front update.

### Verification

```bash
npm run typecheck
npm test -- --reporter=dot
npm run build
```

### Notes

- The full-page runtime capture is also stored at `docs/screenshots/long-campaign-progress-2026-06-02.png`.
- The focused panel screenshot is the report image because it clearly shows the new long campaign UI state.
