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

Assignments starts with current tasks that need staffing. Multiple people can be assigned to a deliverable. The explicit Fully staffed switch is independent of the member list: adding people does not close the staffing need, and removing a person reopens it. A task with zero valid assignees cannot be marked fully staffed. Existing records without an explicit staffing confirmation remain in the staffing queue for review. The same switch is available in the deliverable panel. Task cards use the deliverable color and show assigned people as an avatar stack. Selecting a task pins its assigned members above a separated Remaining team list. Each person shows only their saved skill tags, current work, upcoming count, and Assign/Remove action. All current tasks are available in a second tab; next stages are in a collapsed Plan ahead section. Assignment changes can be undone. Workload counts deliverables, not hours. Assignments preserve contribution logs.

Project flags are limited to Red Flag and Waiting for Feedback. Staffing status lives in Assignments rather than appearing as a separate project-level Need to Assign flag.

## Local verification

`npm test` runs the pure scheduling regressions. `npm run preview` serves sample projects at http://127.0.0.1:4178. The default fictional workspace has 15 active projects and 10 team members, with five stages needing staffing (three empty and two partially staffed) and varied workloads. Its API writes only to local process memory; it never uses production credentials. Restarting or POSTing `/__reset` resets the samples. `/__reset?small=1` selects the small regression fixture. Open `/#assignments` to go directly to Assignments.

With Playwright and Chrome available, `npm run test:browser` checks the isolated preview's project pace, timing, assignments, persistence, filters, flags, reopening, and new project creation. `npm run test:assignments` verifies the realistic assignment workspace, multi-person staffing, skill sorting, workload, assignment removal/undo, and layout. `npm run test:photos` verifies profile photo upload, optimization, display, persistence, removal, and initials fallback. `NODE_PATH` may point to an existing Playwright installation.

The production save API still replaces the shared project/team documents. Saves within one tab are serialized, but simultaneous editors are not merged.

## Team photos

Edit a team member and choose a JPG, PNG, or WebP profile picture. The browser center-crops it to a square, resizes it to 256×256, and stores the optimized image with the member record. The photo appears across Team, Assignments, projects, timeline assignments, and deliverable details. Removing it restores the member's initials and fallback color.
