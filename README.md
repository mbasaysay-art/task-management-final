# Task Management — extraction handoff

Sanitized source handoff from VERSION-5-COLLAB for the collaborator who will extract Task Management into an independent application.

**Status: extraction workspace, not a finished standalone application.** All discovered Task Management screens, workflow services, settings, permissions, migrations/support code and tests are included. The original full application host and live data are intentionally not included. Authentication/session/CSRF/realtime and required-form integration boundaries still need to be wired into the independent host. There is no standalone npm start yet. Do not claim end-to-end parity until the acceptance checklist passes.

## Start here

1. Install Node.js 24.16 or newer.
2. Clone this repository and run npm install.
3. Run npm run check, npm run typecheck and npm test.
4. Follow [SETUP.md](SETUP.md) to complete the independent host.
5. Use [WORKFLOWS.md](WORKFLOWS.md) to verify feature parity.
6. Return changes using [INTEGRATION.md](INTEGRATION.md).

## Contents

- src/features/taskOrbit/: project/task workspace, views, details, files, comments and navigation.
- src/components/Task*.tsx and preparation-task components: workspace integration, required forms, automation and Administration settings.
- server/task-*.mjs, shared-task-workspace.mjs, request-tasks.mjs, events.mjs: persistence, assignments, calendar events, approvals, history, automation and permissions.
- shared/: workflow rules and supporting shared contracts. Global registries are included as integration dependencies, not a request to copy unrelated modules.
- integration-reference/: original task routes, mount/provider wiring, task lifecycle hooks and styling/build references.
- tests/: runnable module tests plus host-dependent API tests kept for integration acceptance. The latter are deliberately excluded from npm test until a host exists.
- BASELINE.json: source commit plus per-file hashes, including uncommitted working-tree content. This is the merge baseline.
- DEPENDENCIES.json: explicit source dependency inventory.

Source records and portraits were replaced by synthetic/empty fixtures. No original operational database, .env, JWT secret, API key, uploaded attachment, Git history, map dataset or DJI parser is included. Shared database support still describes other domains; separate task migrations before running a standalone host.

## License and ownership

Preserve existing per-file copyright/SPDX notices. Some imported workspace sources identify Apache-2.0. This handoff does not grant a new license to the entire host application. Confirm redistribution rights and supply required upstream license/NOTICE materials before any external product release.
