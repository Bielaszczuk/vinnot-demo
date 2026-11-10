## Summary

Describe the observable result and the reason for the change.

## Related issue

Refs #

<!-- Use "Closes #123" only when this PR targets the repository default branch. -->

## Validation

- [ ] Automated tests cover the changed behavior.
- [ ] Lint, typecheck, build, and relevant quality gates pass.
- [ ] Documentation and contracts are updated when behavior changed.
- [ ] Security, data migration, rollback, and compatibility were considered.

## Before pushing

- [ ] The issue and its linked branch come from the **Create Work Branch** workflow, so the branch is `type/<issue>-slug`.
- [ ] `node scripts/ci-preflight.mjs` passed with Node 22, run from this checkout, after the last rebase (or the opt-in `.githooks/pre-push` hook ran it).
- [ ] New or changed tests that touch timers, concurrency, temp dirs, Testcontainers or async React state passed 3 runs in a row with no teardown warnings.
- [ ] Dependency or GitHub Action pin changes passed the workflow policy review.

## Before merging

- [ ] `gh pr checks <number>` shows every check passing or skipped, none failing or pending. No branch protection stops a red merge.
- [ ] A security scan failure (Trivy, npm or GHSA advisory) is fixed in its own bugfix, never merged around.
- [ ] Before a release, the Actions budget has room. A budget or artifact-quota stop is rerun with `gh run rerun <id> --failed`, not treated as a code failure.
- [ ] Deploy or infrastructure workflow edits passed a dry run: `actionlint`, `jq` syntax and the cloud plan's limits.
- [ ] Production ships only from the exact `main` commit; a checksum or provenance mismatch means rebuild, not retry.

## Evidence

Add screenshots, request IDs, logs, benchmark output, or reproduction details when relevant.
