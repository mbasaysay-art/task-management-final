# Return and reintegration procedure

## Collaborator delivery

Work in a feature branch. Preserve BASELINE.json; do not regenerate it to hide differences. Separate (a) task logic/UI changes, (b) shared support/adapters, (c) standalone host work and (d) numbered schema migrations. Add source-to-destination path mapping for renamed files. Deliver a release tag/commit, change list, API/schema compatibility notes, tests and known limitations. Do not send databases, .env, private keys, uploads or a replacement copy of the main system.

## Integrate later into VERSION-5-COLLAB

1. Preserve its then-current working tree and take verified database/attachment/configuration backups.
2. Compare the collaborator's changes to the recorded sourceHead AND per-file working-tree hashes. The source repository was dirty at handoff; that commit alone is not the complete baseline.
3. Review renamed paths and sanitized fixture changes separately. Do not reintroduce demo fixtures into production or overwrite newer local work.
4. Port task changes into a separate integration copy. Keep standalone auth/database/host code as adapters, not replacements for canonical User Management or the main server.
5. Preserve DJI import, Inventory Assets, Confiscated Drones, map/heatmap, other workflows, identities, grants, audit records and attachment links.
6. Reconcile migration numbers with the current main system; use additive migrations. New functions require registry entries, server enforcement and Admin-only defaults.
7. Run the full main-system suite, all adapted task API tests, type checking, permission validation and production build. Test a restored deployed database and the workflows in WORKFLOWS.md.
8. Report exact files, migration/backup/rollback plan and results before deployment. Deploy under controlled maintenance, verify login/permissions/workflows/files/integrity, then reopen access. Roll back application plus its matching database/files/configuration together; preserve newer task data first.

No direct overwrite of the main project and no automatic deployment from this public repository.
