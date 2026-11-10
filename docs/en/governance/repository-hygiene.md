# Versioned content and private files

## Policy

Git stores code, non-secret configuration, lockfiles, product assets, tests and
reproducible procedures. A reusable documented script belongs to the system
even if it only runs locally. Personal generators that depend on user paths or
a runtime outside the repository remain local.

| Content | Location | Git |
|---|---|---|
| Backend, web, mobile and source assets | their projects | yes |
| ES/EN architecture, contracts, guides and runbooks | `docs/` | yes |
| Public configuration, IAM, Compose and Worker | `infra/`, `.github/` | yes, without credentials |
| Import, migration, security, release and development tools | root/project/infra scripts | yes, with external configuration |
| Synthetic fixtures and test manifests | beside their suites | yes; no real accounts or usable tokens |
| Environments, R2 tokens, Apple/signing keys and DB credentials | secret manager or private file | no |
| Dumps, backups, originals and execution state/manifests | private operational archive | no |
| Personal planning, screenshots, reports and generated spreadsheets | local planning/artifacts and `outputs/` | no |
| Dependencies, caches and generated native projects | `node_modules/`, `.venv/`, `.expo/`, mobile `android/` and `ios/` | no |
| Agent instructions and shared memory project | root `AGENTS.md`, `.engram/config.json` | yes |
| Local agent tooling state | `.atl/`, `odd/`, `.claude/settings.local.json` | no |

AWS/Cloudflare IDs, bucket names, OAuth client IDs and public signing certificates
are identifiers, not secrets. Private keys, client secrets and tokens are secrets.
`VITE_*` and `EXPO_PUBLIC_*` variables are published inside the client.

## Tools retained in Git

| Family | Consumer or procedure |
|---|---|
| Impact, gates and revision checks | [CI/CD](../infra/guides/ci-cd.md) |
| Publishers and release contracts | [Deployment](../infra/guides/deployment.md) |
| Scanners, audits and mobile backports | [Dependency security](../infra/guides/dependency-security.md) |
| Dependency freshness report | [Dependency updates](../infra/guides/dependency-updates.md) |
| Issues/branches and project scheduling | [GitHub work items](github-work-items.md) |
| Importers and backup/restore | [Data](../backend/data/database-model.md), [backup/restore](../infra/operations/backup-and-disaster-recovery.md) |
| `scripts/wine-images` | [R2 catalogue](../infra/operations/catalog-images-r2.md), [R2 uploads](../infra/operations/user-images-r2.md) |
| Scan benchmark and fixtures | [Scanner quality](../frontend-mobile/testing/strategy.md) |
| Public content and email previews | [Public content](../modules/support/architecture.md), [emails](../modules/users/architecture.md) |
| Metro, phone, simulator and preview OTA | [Mobile development](../frontend-mobile/guides/development.md) |

These tools receive credentials and real data from outside the repository.
Procedures and manifest schemas are versioned; execution state, users and
results of individual runs are not.

## Checks before integration

From the root:

```bash
git status --short
git diff --cached --stat
git ls-files outputs
git ls-files '*/node_modules' '*/node_modules/*' 'node_modules' 'node_modules/*'
python3 scripts/validate_documentation.py
gitleaks git --redact --no-banner --log-opts="--all" .
```

The two local-file queries must return no content. `.gitignore` does not remove
tracked files. `git rm --cached -- <file>` untracks an artifact while preserving
its local copy; add its ignore rule too.

Gitleaks checks recognized credentials throughout the available history; it
does not prove absence of all PII or content rights. CI fetches full remote
history and retains the redacted report as a short-lived artifact.
`.gitleaksignore` accepts only specific explained historical fingerprints,
without folder/rule exclusions. An ephemeral key generated in memory by a test
is distinguished from a real key copied into Git.

Removing a file in a commit does not remove its history. For an actual secret,
revoke/rotate first and evaluate coordinated history cleanup. Rewriting history
changes hashes and clones and is outside a documentation correction.

## Evidence and publication

Guides describe contracts and verification commands. Active SHAs, builds, OTA
groups, execution results, backups and test accounts belong in private records
and CI artifacts. Do not infer that `main` is deployed or that an OTA means store
approval. API/web revisions, Expo manifests and App Store/Google Play state are
verified as independent surfaces.
