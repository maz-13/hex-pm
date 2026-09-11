# HEX PM

Studio project, timeline, team, and assignment tracker. Production is deployed from `maz-13/hex-pm` to Vercel. `/api/data` stores the shared projects and team documents in Neon.

## Completion and schedules

- The current stage is the first unfinished deliverable, in project order. Dates never complete a stage.
- The first clock begins at kickoff; later clocks start at the previous stage's recorded completion timestamp. Durations are elapsed calendar time, including feedback waits and weekends.
- An overdue current stage extends to today and moves remaining work back. Completed stages keep their finish times. Future explicit schedule overrides cannot overlap unfinished predecessors.
- `baseline` preserves the existing planned dates when first loaded, and is persisted on the next normal save. New projects capture their baseline at creation. It is not shifted by delays or edits to the working schedule. New scope receives a baseline when added.
- `timing` stores actual timestamps. Legacy completed tasks have no invented completion dates. Their detail panel allows a known finish time to be entered; this also sets the next stage's start.
- Completing stages out of order is disabled. Reopening a stage confirms before clearing later completion/timing records. Closing a project requires its deliverables to be completed first.
- The project detail panel shows current/planned stage, original/forecast finish, and schedule variance. Timing is shown only inside individual deliverables.

## Assignments

Assignments shows every unfinished deliverable, with search and active/upcoming/unassigned filters. People can be added or removed directly. Team workload counts distinguish current stages from upcoming commitments; they are task counts, not hourly capacity estimates. Assignments preserve contribution logs.

## Local verification

`npm test` runs the pure scheduling regressions. `npm run preview` serves sample projects at http://127.0.0.1:4178. Its API writes only to local process memory; it never uses production credentials. Restarting or POSTing `/__reset` resets the samples.

With Playwright and Chrome available, `node tests/browser-check.cjs` checks the isolated preview's project pace, timing, assignments, persistence, filters, flags, reopening, and new project creation. `NODE_PATH` may point to an existing Playwright installation.

The production save API still replaces the shared project/team documents. Saves within one tab are serialized, but simultaneous editors are not merged.
