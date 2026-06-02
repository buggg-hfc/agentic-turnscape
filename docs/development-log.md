# Development Log

This log records tested implementation slices as the project moves from the Border Seven Days MVP toward the full game. Each entry should name the behavior that changed and the verification gate used before publishing.

## 2026-06-02

- Added runtime creator scenario management: import, export, protected deletion, browser-local restore, and API-side persistence for creator definitions.
- Added server-side Agent transparency redaction: immersive hides proposals, inference exposes only public reasoning, and debug exposes hidden summaries, hidden reasons, and hidden patch entries.
- Connected web state polling and SSE replay requests to the selected transparency mode, and added a tested Agent transparency view model for the panel.
- Verification used for the latest slice:
  - `npm run typecheck`
  - `npm test -- --reporter=dot`
  - `npm run build`

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
