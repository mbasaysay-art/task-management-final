# Required workflow parity and acceptance

Each row must be demonstrated in the independent application before extraction is accepted. Included source does not mean every route is independently runnable yet.

| Workflow | Source areas | Acceptance |
|---|---|---|
| My Tasks, projects, boards, lists, calendar, timeline, dashboard | taskOrbit views; taskWorkspaceUi/taskDashboard/taskReferenceBoard | View/filter/search/sort without changing unrelated records |
| Task/project creation, editing, status, priority, due dates, dependencies and subtasks | context, modals, shared-task-workspace | Persist; reject stale/conflicting updates; enforce server grants |
| Individual and group assignments, claims and request preparation | taskGroupWork/taskAssigneeSearch; request-tasks; AutomaticRequestTasks | Canonical IDs, correct recipients, restricted claims/reassignments |
| Discussion, activity, comments and reactions | taskDiscussion; details; shared service | Preserve authors/history; correct notification recipients |
| Files, captures, related documents and previews | attachmentStorage; storage service; taskRelatedDocuments | Correct ownership, type/size limits, byte retention and access denial |
| Required IN/OUT, incident and confiscation forms | TaskRequiredForms; taskRequiredForms; related editors | Validate persisted form, link result and prevent unauthorized completion |
| Completion submission, approval and revision requests | taskCompletion; completion route | Enforce actor/version checks, approvals and activity history |
| Shared calendar events and legacy event compatibility | calendar views; shared service; events.mjs | Participant scope, create/edit/cancel and notifications |
| Templates, schedules, recurrence, rules and reminders | TaskAutomationPanel; task-automation; taskAutomation | Correct Qatar-local time, catch-up/dedup, recipients, tick lifecycle and grant checks |
| Autosave, concurrent work and live refresh | serverStorage; workspaceLiveSync; shared store | Save acknowledgement, conflict handling, reconnect and polling |
| Local browser data/file migration | serverStorage; attachmentStorage; import-local route | Preserve browser original and avoid duplicates/lost files |
| Administration Task Management settings | TaskManagementSettings; admin routes | Admin restriction, persisted limits and disable-edit behavior |
| Export, backup and restore | workspace context; store/backup support | JSON/CSV, full record/file backup, verified restore and rollback |
| Appearance, navigation and account changes | host styles, navigation, provider | Existing GUI behavior; no cross-account data leakage |

Run negative tests for direct API requests, disabled editing, removed users/groups, unrelated documents and invalid attachments. Preserve existing grants; newly introduced grants default to Admin only. Test fresh and upgrade databases. Capture results and known gaps; no blanket “all workflows passed” without evidence.
