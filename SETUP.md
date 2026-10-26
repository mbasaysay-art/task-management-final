# Setup and extraction instructions

## What works now

Node 24.16+; run npm install, npm run check, npm run typecheck and npm test. Module service tests use temporary databases and synthetic records. Host-dependent *-api.test.mjs files start the original server.ts; they are supplied for adaptation, not reported as passing in this standalone handoff.

## Build the independent host

1. Create a Vite/React/Tailwind browser entry and an Express server entry. The upstream package/config/style references are included. Keep task views and tokens intact; use port 3100 and a new runtime-data directory. Never point this project at a VERSION-5-COLLAB database.
2. Add a local test-only account directory with canonical user/group IDs and an explicit login/session flow. Implement password hashing, JWT/session verification, CSRF, rate limits and server authorization. Do not replace authorization with a UI role selector or hard-coded administrator.
3. Define the store adapter expected by server services: db (node:sqlite), transaction, load, directory, attachmentDirectory, audit/notification record methods and full backup/restore. server/database.mjs is shared reference support; it includes unrelated domain schema. Extract only task migrations plus required identity/attachment/audit support into numbered, additive standalone migrations.
4. Port integration-reference/task-routes.ts.txt and event-routes.ts.txt into route registration. Inject the store, authenticated actor, stateFor, broadcast, audit and CSRF helpers. Wire automation startup/tick/shutdown hooks exactly once.
5. Mount TaskManagementSample within TaskRequiredFormsProvider with directory, current user, group permissions and the relevant domain-form adapters. Mount TaskManagementSettings in an Admin-only settings page.
6. Keep task-required IN/OUT, incident and confiscation form creation as explicit adapters. The original editor/preview dependencies are included. Do not silently drop them or claim completion of a required form without validating the persisted report. For isolated development, use generated test documents and clearly marked test adapters; retain production contracts for later reintegration.
7. Port the realtime adapter: state saves, version conflicts/rebase, websocket/change notifications, reconnect/focus/visibility and polling fallback. Preserve account scoping and old local attachment migration.
8. Wire attachment upload/download/preview and related-document permission checks. Enforce limits and server file ownership. Preserve both records and bytes during full backup/restore.
9. Add private environment configuration from .env.example. Generate a local JWT secret; never commit it. Set file limits, autosave and sync intervals through Task Management settings.
10. Provide npm run dev, npm run build and npm start only after the independent host actually works. Then adapt and run every supplied API test and complete WORKFLOWS.md.

## Current settings preserved in source

Task Management enable/edit flag, attachment maximum size, autosave delay, refresh interval, storage totals and shared revision/pending notifications; manual full-system backup action and restore guidance. Template/schedule/rule settings are in TaskAutomationPanel and its service. Appearance currently follows the host's Settings and needs an explicit adapter. Backup controls currently call the host backup API and need an independent implementation or a documented adapter.

Do not copy a real database to make the preview look populated. Synthetic initial fixture substitutions are recorded in BASELINE.json.
