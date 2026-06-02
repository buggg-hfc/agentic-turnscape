# Implementation Report

This report records verified runtime slices for the multi-Agent turn-based simulation MVP and its expansion path.

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
