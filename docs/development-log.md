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
