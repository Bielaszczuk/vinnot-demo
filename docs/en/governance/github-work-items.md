# Issue, branch, and pull request workflow

## Purpose

The repository uses an issue as the stable identity of every work item. The
branch is created after the issue and is linked in GitHub's **Development**
section. This prevents untraceable branches and names that appear to reference
a nonexistent issue.

## Work types

| Type | Use | Base branch | Example |
|---|---|---|---|
| `feature` | new product or business capability | `development` | `feature/101-business-payment-logic` |
| `bugfix` | reproducible defect without a production emergency | `development` | `bugfix/102-fix-wine-search` |
| `hotfix` | urgent incident currently affecting production | `main` | `hotfix/103-restore-authentication` |
| `task` | infrastructure, documentation, refactoring, or maintenance | `development` | `task/104-update-ci-policy` |

`#` is used when mentioning the issue (`#101`), but not inside the branch name.
The number is not zero-padded because it must match the number assigned by
GitHub literally.

Issues and branches are created with the **Create Work Branch** workflow
(`.github/workflows/create-work-branch.yml`), not by hand; see the next section.

### Returning a hotfix to `development`

No workflow or script carries a hotfix from `main` to `development`. After the
hotfix PR merges into `main`, open a PR from `main` into `development` (or apply
the hotfix commit with `git cherry-pick` on a branch that targets
`development`). This way the next release from `development` does not revert the
fix.

## Creating an issue and branch from GitHub

The `.github/workflows/create-work-branch.yml` workflow exposes a manual form:

1. open **Actions → Create Work Branch → Run workflow**;
2. select the work type;
3. for an existing issue, enter `issue_number`;
4. for new work, leave that field empty and enter `title` and `description`;
5. optionally enter `start_date` and `end_date` as `YYYY-MM-DD` dates;
6. run the workflow from `main`.

The workflow validates the type and issue, creates the `type:*` label when it
does not exist, preserves previous labels, resolves the base branch commit, and
uses the official `createLinkedBranch` mutation. The run summary reports the
issue, branch, base, and links.

Manual workflows are displayed only when their file exists on the repository's
default branch. This workflow must therefore reach `main` before it can be run
from the Actions interface.

## Dates and the GitHub Projects roadmap

Dates belong to the **issue's Project item**, not to its branch. The form accepts
ISO text (for example, `2026-09-16`), not a calendar picker: Actions does not offer
a date input type. `end_date` represents the planned finish, not the actual issue
closure date. Both dates are optional as a pair; supplying either requires the
other. Dates must exist in the calendar and the end cannot precede the start.
Leaving both empty preserves the branch-only flow without querying Projects or
changing existing dates.

### Repository and Project configuration

Under **Settings → Secrets and variables → Actions**, configure:

| Setting | Type | Default / purpose |
|---|---|---|
| `PROJECT_TOKEN` | Secret | Personal token with write access to the user's Project; a classic PAT requires the `project` scope and, for private issues, repository access through `repo`. |
| `WORK_PROJECT_OWNER` | Variable | `Bielaszczuk`; update if the owner or login changes. |
| `WORK_PROJECT_NUMBER` | Variable | `3`; the Project number, not its view number. |
| `WORK_PROJECT_START_FIELD` | Variable | `Start date`; exact start field name. |
| `WORK_PROJECT_END_FIELD` | Variable | `Target date`; exact end field name. |

The user-owned Project must contain both fields with the **Date** type. Existing
fields are reused; fields are not created and views are not changed automatically.
In **Roadmap → Date fields**, select these same fields for the start and end.
Individual item visibility also depends on the view's filters. If fields have
been renamed, configure the corresponding variables using their exact case and
spacing. Never store the token in files or workflow inputs. The regular
`GITHUB_TOKEN` still creates issues, labels, and branches; the additional secret
is used exclusively for Projects, which requires separate permissions.

### Sequence and recovery

1. Validate dates and configuration; check Project write access and resolve its
   date fields, including pagination, before creating the issue.
2. Create the issue or reuse the supplied number and preserve its labels.
3. Add the issue to the Project, or reuse its existing item, and save both dates.
   Supplied dates replace previous values.
4. Create the linked branch and publish links and dates in the Actions summary.

Invalid configuration detected during preflight does not create issues or
branches. Remote mutations are not a transaction: a later failure may leave an
issue created, an item added, or one date saved. The workflow reports the issue
number so a retry can supply `issue_number` instead of creating a duplicate.
If saving dates fails, branch creation is not attempted. If failure occurs during
branch creation, first check whether GitHub created it before retrying: branch
creation is not an update operation.

References: [automating Projects with Actions](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions)
and [roadmap configuration](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-roadmap-layout).

## Issue forms

`.github/ISSUE_TEMPLATE` contains separate forms:

- feature: need, outcome, and acceptance criteria;
- bugfix: observed/expected behavior, reproduction, and regression coverage;
- hotfix: production impact, evidence, mitigation, and rollback;
- task: objective, scope, completion, and dependencies.

The forms ensure a minimum information set when an issue is created manually
first. **Create Work Branch** is then run with its number.

## Pull requests

The template requires a summary, related issue, validation, and evidence. A
branch created through `createLinkedBranch` is displayed on the issue and its
pull request inherits that relationship.

GitHub interprets `Closes #123` as automatic closure only when the pull request
targets the default branch. A PR into `development` uses `Refs #123`; closure
occurs in the release PR into `main` or explicitly when appropriate for the
integration flow.

The `Repository checks` job of `ci.yml` validates the branch name of internal
pull requests when they are opened, reopened, or their branch is updated. The
policy is enforced only when the policy script already exists in the pull
request's base commit. This lets the migration pull request be integrated even
when it was created with the previous naming format. Once merged into the base
branch, every subsequent pull request is subject to the policy. The check runs
the policy scripts from the base commit, never from the pull request head, so a
pull request cannot change the rule it is validated against; a policy change
takes effect only once it is merged into the base branch.

It accepts the canonical convention, `main`, `development`, and Dependabot or
Renovate branches. External forks skip this validation so repository automation
does not evaluate untrusted code under internal assumptions.

## Pre-merge checklist

The pull request template lists the checks to walk before pushing and before
merging. Each item prevents one class of failure seen in the 72 failed GitHub
Actions runs between 2026-06-20 and 2026-10-21: invalid branch names, pushes
without the full preflight, flaky timer tests, unreviewed Action pins, red pull
requests merged anyway, security advisories merged around, Actions budget stops,
untested deploy workflow edits and production releases built from the wrong
commit. The repository has no branch protection, so the checklist is the gate.

## Verifiable implementation

- `.github/workflows/create-work-branch.yml`;
- `.github/workflows/ci.yml` (`Repository checks` job);
- `.github/ISSUE_TEMPLATE/*.yml`;
- `.github/pull_request_template.md`;
- `scripts/github-work-item-policy.mjs`;
- `scripts/create-github-work-item.mjs`;
- `scripts/github-project-schedule.mjs`;
- `scripts/validate-github-branch.mjs`;
- `scripts/test/github-work-item-policy.test.mjs`;
- `scripts/test/create-github-work-item.test.mjs`;
- `scripts/test/github-project-schedule.test.mjs`;
- `scripts/test/create-github-work-item-project.test.mjs`.
