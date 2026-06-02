# Development Log

This log records tested implementation slices as the project moves from the Border Seven Days MVP toward the full game. Each entry should name the behavior that changed and the verification gate used before publishing.

## 2026-06-03

- Added a tested max-token budget to the shared LLM configuration contract, browser-local saved settings, API per-turn overrides, and OpenAI-compatible request payloads.
- Added an opt-in real-provider LLM smoke test that reads credentials only from environment variables.
- Documented the optional `LLM_TIMEOUT_MS` and `LLM_MAX_TOKENS` environment variables and kept real provider credentials out of committed files.
- Kept the implementation report screenshot visible while recording the LLM configuration verification gate.
- Verification used for this slice:
  - `npm test -- packages/agents/src/llm.test.ts apps/web/src/llmSettings.test.ts apps/web/src/api.test.ts apps/api/src/server.test.ts --reporter=dot`
  - `npm run test:llm:smoke`
  - `npm run typecheck`
  - `npm test -- --reporter=dot`
  - `npm run build`

## 2026-06-02

- Exposed active long campaign arc status in campaign payloads. `scenarioStatus.campaignArc` now includes the current chapter number, current chapter details, base facility hooks, and faction fronts.
- Added a tested web Campaign Arc view model and dashboard panel so players can see the current chapter focus and upcoming unlock hooks after entering a campaign.
- Updated the implementation report to keep runtime screenshots visible in the report as requested.
- Added long campaign arc metadata for Border Seven Days and all first-wave expansion packs. Built-in scenarios now declare chapter beats, base facility hooks, and faction front hooks for post-MVP expansion.
- Exposed arc summaries through the scenario catalog and web scenario picker so players can see which scenario packs have long campaign structure.
- Added the long campaign progression API slice: `/campaigns/:id/campaign/progress` now resolves chapter/base/growth/front changes through the rules engine, stores the resulting snapshot, and records replayable referee patches.
- Added the web long campaign summary panel for chapter, campaign XP, base facilities, faction front pressure, and replay visibility.
- Captured a runtime screenshot for the implementation report:

![Long campaign progression panel](screenshots/long-campaign-progress-panel-2026-06-02.png)

- Added runtime creator scenario management: import, export, protected deletion, browser-local restore, and API-side persistence for creator definitions.
- Added server-side Agent transparency redaction: immersive hides proposals, inference exposes only public reasoning, and debug exposes hidden summaries, hidden reasons, and hidden patch entries.
- Connected web state polling and SSE replay requests to the selected transparency mode, and added a tested Agent transparency view model for the panel.
- Verification used for the latest slice:
  - `npm test -- apps/api/src/server.test.ts apps/web/src/campaignArcStatus.test.ts --reporter=dot`
  - `npm run typecheck`
  - `npm test -- --reporter=dot`
  - `npm run build`

## 2026-06-02 - Scenario long campaign arcs

- Added a `campaignArc` contract to built-in scenario packages with chapter beats, base facilities, and faction fronts.
- Added arc metadata for `border-seven-days`, `frost-lantern-trial`, `orbital-quarantine`, `salt-harbor-accord`, `rain-alley-haunting`, and `emergency-ward-night`.
- Exposed compact arc summaries in the API scenario catalog and web scenario selection model.
- Verification used: `npm test -- packages/content/src/scenarioRegistry.test.ts apps/api/src/server.test.ts apps/web/src/scenarioSelection.test.ts --reporter=dot`.

## Publishing Discipline

- Keep docs in the same change set as meaningful gameplay, API, Agent, persistence, or UX changes.
- Push verified slices to GitHub promptly after the gate passes.
- Prefer draft pull requests for ongoing work so the branch can keep moving while review remains explicit.

## 2026-06-02 - Failure recovery branches

- Added tested recovery branch actions for the plague, mine takeover, and cult ritual clocks when they approach collapse before the seventh-night ending check.
- Added referee-level recovery consequences for `recovery:plague`, `recovery:mine`, and `recovery:cult` leverage tokens. Successful recovery lowers the matching crisis clock and records a public recovery event; failed recovery increases pressure and keeps the campaign moving.
- Verification used: `npm test -- packages/content/src/borderSevenDays.test.ts --reporter=dot` and `npm test -- packages/core/src/core.test.ts --reporter=dot`.

## 2026-06-02 - First-wave expansion packs

- Added tested seed packages for the first expansion wave after the Border Seven Days MVP: science fiction (`Orbital Quarantine`), historical (`Salt Harbor Accord`), urban supernatural (`Rain Alley Haunting`), and realistic profession (`Emergency Ward Night`). The existing cultivation package remains `Frost Lantern Trial`.
- Each expansion package uses the shared `ScenarioPackage` registry contract, creates a `WorldStateSchema`-valid world, exposes playable actions, and evaluates deterministic success/failure endings.
- Verification used: `npm test -- packages/content/src/scenarioRegistry.test.ts --reporter=dot`.

## 2026-06-02 - Expansion playthroughs

- Added deterministic three-day playthrough coverage for all first-wave expansion packages through the shared Agent orchestration and referee pipeline.
- Added generic scenario clock consequences keyed by `scenario:*`, `clock:*`, and `pressureClock:*` leverage tokens. Successful expansion turns advance scenario stability clocks and player momentum; failures advance the pressure line without creating a hard game over.
- Made Border Seven Days-specific referee side effects conditional on the target relationship, location, or clock existing so the same rules engine can safely adjudicate other scenario worlds.
- Verification used: `npm test -- packages/agents/src/playthrough.test.ts --reporter=dot`.

## 2026-06-02 - Expansion pressure playthroughs

- Added deterministic pressure-route coverage for all first-wave expansion packages, proving cultivation, science fiction, historical, urban supernatural, and realistic profession packs can reach their failure/pressure endings.
- Pressure routes now replay from emitted `state_patch` records to the same endings as the original run.
- Referee checks now separate system leverage tokens (`scenario:*`, `clock:*`, `pressureClock:*`, `route:*`, `step:*`) from player-facing mechanical leverage so hidden routing markers cannot inflate dice results.
- Verification used: `npm test -- packages/agents/src/playthrough.test.ts --reporter=dot`.

## 2026-06-02 - Long campaign foundation

- Added optional `campaign` state for post-MVP expansion without breaking existing Border Seven Days and first-wave expansion worlds.
- Added referee-owned long campaign progression patches for chapter transitions, base facility upgrades, character skill growth, and faction-war front status changes.
- State patches can initialize the optional `campaign` root while still rejecting unknown nested fields elsewhere.
- Verification used: `npm test -- packages/core/src/campaignProgression.test.ts --reporter=dot`.

## 2026-06-02 - Long campaign API and dashboard

- Exposed tested long campaign progression through `POST /campaigns/:id/campaign/progress`.
- Added in-memory and Prisma store support for synthetic progression turns so state snapshots, replay records, public chronicle, hidden logs, and compressed memories remain complete.
- Added a tested web view model and dashboard module for long campaign chapter, XP, base facilities, and faction fronts.
- Verification used: `npm test -- apps/api/src/server.test.ts apps/web/src/api.test.ts apps/web/src/campaignProgression.test.ts --reporter=dot`, `npm run typecheck`, `npm test -- --reporter=dot`, and `npm run build`.
