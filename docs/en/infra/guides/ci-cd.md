# CI/CD

## Workflows

| Workflow | Main trigger | Responsibility |
|---|---|---|
| `ci.yml` | PR, push to `main`/`development`, manual | Orchestrates impact, validation (including the pull request branch naming policy) and publication of the same commit |
| `security-checks.yml` | Reusable, manual and weekly | npm/Maven/Android Gradle dependencies, redacted history, backend image and SBOM; blocks deployment on high/critical findings |
| `ios-native-validation.yml` | Manual, or adding the `validate:ios-native` label to a PR | Resolves/scans CocoaPods and builds unsigned iphoneos Release on macOS; does not use EAS |
| `create-work-branch.yml` | Manual on `main` | Creates/reuses an issue and creates a linked branch |
| `deploy-backend-dev.yml` | Internal call from successful CI | Scanned image + ECR + EC2/SSM |
| `deploy-frontend-dev.yml` | Internal call from successful CI | Dev-configured build + S3/CloudFront |
| `production-release.yml` | Manual on `main` | Prepares an immutable candidate, publishes or rolls back production after CI and SHA approval |

## Check selection

`scripts/ci-impact.mjs` owns the dependency map. The whole workflow is not filtered
by paths: a stable `CI quality gate` result is always emitted.

| Change | Specific validation | Automatic publication on development |
|---|---|---|
| `docs/`, `docs-site/` | Documentation, common policies and documentation site (tests and types; Cloudflare Pages builds it) | None |
| `docs-site/package.json`, `package-lock.json` or its security backport manifest | Above + documentation site npm audit and backports | None |
| Root README | Documentation and common policies | None |
| `backend/` (code and tests) | Maven verify and coverage | Backend; exact image scanned before ECR |
| `backend/pom.xml`, `backend/Dockerfile`, `backend/.dockerignore` | Above + Maven dependencies and candidate image scanning | Backend; exact image scanned before ECR |
| `frontend-react/` | Lint, coverage and build | Web |
| `frontend-react/package.json`, `package-lock.json` | Above + web npm audit | Web |
| Mobile screens, TS/JS code, assets or Jest mocks | Doctor, lint, types, coverage and export | None; EAS is not invoked |
| Mobile configuration/plugins or native code | Above checks + Android Gradle resolution and scanning | None |
| Mobile `package.json`, `package-lock.json`, `.npmrc` or security backports | Above checks + mobile npm audit and backport verification | None |
| Web header/readiness scripts | Web validation and deployment policy | Web |
| Backend deployment Compose/script | Backend validation | Backend |
| Backend/web tests | Their component and common checks | None for tests |
| Known workflows | Automation and components validated by that workflow | None for CI YAML |
| Local diagram renderer (`tools/docs-diagrams/`) | Common policies only: CI builds nothing from it | None |
| Shared content or unclassified paths | All components | Both, when publication is enabled |

The `infra/aws-low-cost/` `Caddyfile` is listed among backend deployment files:
`deploy-backend-dev.yml` stages it on the host and `deploy.sh` validates it before
activating it; see [Deployment](deployment.md).

Documentation, architecture, automation tests and secret scanning always run, in
the `Repository checks` job, together with impact detection and, on pull requests,
the branch naming policy.
Secret scanning retains the full redacted history, including for documentation
changes. Explicitly skipping unaffected components does not skip these common
checks.

PRs compare against the merge base. Pushes compare against the last successful
push CI on the same branch that is an ancestor of the current commit: that result
includes deployments. Changes from failed, cancelled or still-running merges are
therefore included in the next run. Renames are treated as removal and addition;
paths are NUL-delimited. Missing history, API errors or no valid baseline select
the full check set. Reruns cannot use their own SHA as a baseline. A green result
from another commit never approves the current revision.

One exception covers the development → main promotion. When the PR merge commit or
the `main` push has exactly the same Git tree as a commit whose `ci.yml` push run on
`development` succeeded, or as the tree a successful pull request into `development`
validated (its `ci-validated-tree-<tree>` artifact, described below), component jobs
are skipped: those bytes were already built, tested and scanned. The second source
covers a promotion opened while the `development` push pipeline is still running.
Only an exact tree match with a completed, successful run counts; a failed,
in-progress or fork run proves nothing. `Repository checks` and the quality gate
still run on the current SHA, which is what the production release verifies. If
`main` diverged, the tree differs and the full check set runs.

Every pull request into `main` also runs Release security over every dependency
graph (npm for web, mobile and documentation site, Maven, backend image and Android
Gradle), even when its tree was already validated: advisories are published without
code changes, and the promotion is the last check before production. The push to
`main` after the merge does not repeat it.

The same rule covers merging a pull request into `development`. Every CI run of a
pull request into `development` leaves a `ci-validated-tree-<tree>` artifact with
the exact Git tree it validated (GitHub's test merge), retained for 7 days. On the
push to `development`, when the merge commit's tree matches an artifact whose
`ci.yml` run is a completed, successful `pull_request` from the same repository,
component and security jobs are skipped and the `prevalidated` output is `true`.
Deploy flags are still computed against the last successful push: pending
deployments still run and backend still scans the exact image before ECR. If the
base moved between the pull request and the merge, the tree differs. If the run
failed, is still running, comes from a fork or the API fails, the full set runs.

Later pushes to the same pull request into `development` reuse validation per
component. Each run leaves one `ci-validated-<component>-<key>` artifact (retained
for 7 days) for every component it validates (`backend`, `web`, `mobile`, `docs`).
The key is a SHA-256 of the Git objects the component job reads plus every
top-level entry outside the component folders (`backend/`, `frontend-react/`,
`frontend-mobile/`, `docs/`, `docs-site/`):

| Component | Inputs inside the component folders |
|---|---|
| `backend` | `backend/` |
| `web` | `frontend-react/` and `frontend-mobile/assets/` (web tests compare the brand artwork and illustrations with the mobile copies) |
| `mobile` | `frontend-mobile/` and `docs-site/scripts/security-backports/` (the backport tests read the site's pinned manifest) |
| `docs` | `docs/`, `docs-site/` and `frontend-mobile/scripts/apply-security-backports.mjs` (the site installs through it) |

When the diff selects a component and an artifact with its current key belongs to a
completed, successful `pull_request` run of `ci.yml` from the same repository, its
job is skipped and the component is listed in the `reused` output (`none` when
nothing is reused). Any change outside the component folders (scripts, workflows,
`infra/`, root files) changes every key, so every selected component runs again; a
changed component input always runs its job. A failed, cancelled, in-progress or
fork run proves nothing, an unreadable tree disables reuse, and an unavailable
lookup validates that component. Dependency scans and deploy flags are not reused.
A new cross-component read must be added to `componentInputs` in `ci-impact.mjs`.

`content/public-pages.json` and `scripts/sync-public-content.mjs` select web, mobile
and the web deploy, never backend or native work: the copy is generated into both
clients.

## Gates

- Security: [dependencies and artifacts](dependency-security.md), called once per CI with the affected dependency graphs. It receives no AWS credentials. A graph is scanned only when its inputs change, because an advisory depends on the resolved graph and sources never change it: npm audit per project follows its `package.json`, `package-lock.json` and `.npmrc` (plus the security backport manifests for mobile and the documentation site); Maven and the backend candidate image follow `pom.xml`, `Dockerfile` and `.dockerignore`; Android Gradle follows mobile native configuration (`app.config.ts`, `eas.json`, `plugins/`, `config/`, manifests, Gradle scripts and native code). The impact outputs are `web_deps`, `mobile_deps`, `docs_deps`, `backend_deps` and `native`. Pull requests into `main`, the weekly sweep and manual runs scan every graph. Changes to `ci.yml` and `production-release.yml` scan every graph except Android; `security-checks.yml` also adds Android. Publishing dev always scans, inside deployment, the exact image sent to ECR; `prepare` scans the production image. With nothing to scan, the job does not run. Secrets are scanned in `Repository checks`.

- Repository checks: a single job, because GitHub bills every job as at least one minute and these checks take seconds. On Node 22 it computes impact and validates the Action policy; on same-repository pull requests it validates the branch name with the base commit's script (a `git worktree` of the base SHA), so a pull request cannot relax the rule it is validated against; it validates bilingual structure, indexes, links, canonical content and full-size diagram links; it runs `scripts/test/` tests except the image benchmark requiring mobile dependencies; it runs version/checksum-pinned `actionlint` and gitleaks, architecture validation and secret scanning of the full redacted history. No real credentials are used. Branch creation tests use a simulated API and verify execution from the repository root, web, mobile and an unrelated temporary directory.
- Backend: JDK 25, checkstyle, tests, coverage, and build.
- Web: `npm ci`, lint, tests, and build.
- Mobile: `npm ci`, expo-doctor through `scripts/expo-doctor-check.mjs`, lint, typecheck, tests, and configured checks. When the only failed expo-doctor check is Expo SDK version drift ("Check that packages match versions required by installed Expo SDK"), the step passes with a warning annotation; the monthly native release train aligns those versions (see [Dependency updates](dependency-updates.md)). Any other failed check, a crash or an output the script does not recognise still fails the step.
- Documentation site: `npm ci` with the verified braces backport, tests with 100% coverage and typecheck. Cloudflare Pages builds both languages on every push, failing on broken links, and reports it as the `Cloudflare Pages: vinnot-docs` check; CI does not repeat it because it never publishes the site. The local preflight does run it. Runs when `docs/`, `docs-site/`, the backport script, or the CI, security, and production release workflows change; never publishes. See [Documentation site](../../governance/documentation-site.md).
- Branches: `type/issue-number-slug`, according to the work-item policy, validated in `Repository checks`.
- Lockfiles must be synchronized; CI uses clean installs.

The benchmark step within Mobile runs `wine-label-benchmark.test.mjs`, followed by manifest validation with
`VINNOT_SCAN_VALIDATE_ONLY=YES`. This mode does not call the recognition provider.
GitHub automation tests report in `Repository checks` and resolve the script under
test from `import.meta.url`, independently of Node's initial working directory.
Benchmark session tests run in automation, without duplication in Mobile.

`CI quality gate` runs with `always()` and requires success for every mandatory
check; `skipped` is accepted only when the map identifies an unaffected component.
Failures, cancellations, incomplete outputs and unexpected skips block publication.
Security is expected only when there is something to scan: one of `backend_deps`,
`native`, `web_deps`, `mobile_deps` or `docs_deps`. A dependency scan never requires
its component job, so a promotion that scans without revalidating stays consistent.
With `prevalidated=true` the gate requires that no component or dependency scan asks
for validation and allows pending deployments. A component listed in `reused` must be
skipped and satisfies the deploy flag that depends on it; listing a component that
also asks for validation, or an unknown value, blocks the gate.
When the GitHub plan supports private branch protection, select this gate and
`Repository checks` as required checks. Changing YAML does not automatically change
repository protection settings. For a private repository on GitHub Free, the
operating procedure is to open a PR, verify both checks on its latest revision,
and merge only after they pass; GitHub does not prevent a manual merge that
violates this policy. Deployments still technically depend on the same-commit gate.

Promote through a `development` to `main` PR using a merge commit to preserve
commit ancestry between both branches. If the base changes during review, update
and validate the integration again before merging. CI runs on `main`, but does
not deploy production or republish development. Scheduled and manual workflows
become available from the default branch; production requires its own release flow.

Impact, gate-decision, revision-guard and expo-doctor classification scripts enforce
100% line, branch and function coverage in Node tests. These include a real temporary Git repository
and CLI entrypoint execution, not only YAML text assertions. `actionlint` validates
reusable workflows, inputs, secrets and cross-job references.

## Publication and manual execution

Deployment adapters expose only `workflow_call`, not independent triggers. CI calls
them for relevant development pushes. When both components change, backend must
finish before web; web-only changes do not wait for an unnecessary backend deploy.
Web retains the browser-session/legal contract readiness checks.

To validate everything manually, use **CI → Run workflow**. To republish dev, select
the `development` branch and enable `deploy_development`. This runs all checks before
both deployments. Other branches cannot publish. No deploy button bypasses the gate.
Manual dispatch requires the workflow to exist on GitHub's default branch.

Successful CI alone does not establish that development is published: check
the expected deployment jobs and `/api/version` (the development web does not
publish its revision: the `Deploy web development` job confirms it). Both deploys use
`always()`, reject cancellation and require the successful gate for the same commit.
Backend can publish when web/mobile are explicitly skipped; web requires backend
success or a valid skip. Skipping a component marked for publication remains an
operational failure, never deployment evidence.

Web does not repeat lint/tests during deployment. It does build with development's
variables and secrets: the CI build validates compilation without environment
secrets. Backend builds its publication image once, scans that same object, retains
the report/SBOM and publishes it without rebuilding. Merging into development does not repeat
the validation of an identical tree the pull request already passed (see Check
selection); a different tree is validated again.

The flow and type semantics are documented in
[Issues, branches, and pull requests](../../governance/github-work-items.md).

## Credentials

| Environment | Workflows | AWS authentication | Secrets | Variables |
|---|---|---|---|---|
| Development | `ci.yml` → `deploy-backend-dev.yml`, `deploy-frontend-dev.yml` | Static IAM access keys | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `VITE_GOOGLE_MAPS_API_KEY` | `VITE_GOOGLE_OAUTH_CLIENT_ID`, `VITE_APPLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID` |
| Production | `production-release.yml` | OIDC (`id-token: write`) with the `vinnot-production-release` role | `PROD_GOOGLE_MAPS_BROWSER_KEY` | `PROD_GOOGLE_OAUTH_CLIENT_ID` |

Only production uses OIDC. Development keys are long-lived: rotate them and keep
them bounded by `infra/aws-low-cost/iam/dev-deployer-boundary.json`. The boundary
grants no Secrets Manager read (the host instance role reads `vinnot/dev/backend`
through `refresh-runtime-env.sh`) and no retired ECS/RDS rights. Editing the file
does not change AWS: applying it to the deployer user is a separate, approved
manual step.
`infra/aws-low-cost/ec2-scheduler-runtime-policy.json` limits the scheduler to
starting and stopping the development instance.
Deploy identity does not share runtime permissions. Large policies are managed
policies rather than inline when inline limits or auditability become a concern.

## Concurrency and failures

New commits cancel earlier checks for the same PR. On pushes, the Backend, React
Web, Mobile and Release security jobs of a superseded run are cancelled per job;
that run's gate then fails, so it never deploys, and the next run's successful
baseline still includes its changes. Pushes do not cancel an active publication. Each deployment adapter has a development-only concurrency
group to prevent overlap on its resource. After acquiring its slot, before using
AWS credentials, `verify-deploy-revision.mjs` compares the SHA with the remote
development tip. A superseded run is an expected outcome, not a failure: the script
writes `current=false`, adds a "Deployment skipped" notice, and every later step of
that deployment is skipped, so the run ends green and only the newest pipeline
publishes. That run also uploads the `deploy-superseded-<backend|web>-<attempt>`
artifact; `ci-impact.mjs` never takes a marked run as the baseline, because it did not
deploy its changes. Another ref or event, or an unreadable remote tip, still fails. An already-started deployment
finishes before the next one on that resource. GitHub queues are not assumed FIFO.
The successful baseline preserves changes from replaced or failed runs.

Scripts use strict
mode, checksums, and safely serialized parameters. On remote failure, inspect the
SSM invocation and container logs instead of blindly rerunning.

Web/mobile use npm caches, backend/source security use Maven caches, and native
Android security uses npm and Gradle caches. Clean
lockfile installs remain mandatory and caches never replace tests or scanning.
Weekly/manual security sweeps review every surface, even without new
commits, to detect vulnerabilities published since the last change. The weekly
sweep targets the default branch, not every deployed environment.

Two caches skip repeated work whose result only depends on its inputs:

- Android security reuses the release `gradle.lockfile` resolved for the same
  native inputs (every `frontend-mobile` file except `src/`, `app/`, `assets/`,
  `__mocks__/` and `scripts/test/`, the same scope the native classification
  uses, plus `security-checks.yml`) during the same ISO week,
  skipping prebuild and the Gradle resolution. Trivy scans the lockfile on every
  run, so new advisories still block.
- The dev deployment and the candidate image scan reuse the backend Docker build
  stage (the `pom.xml` dependency layer) through `actions/cache`, keyed on
  `pom.xml`, `Dockerfile` and `.dockerignore`. Only the build stage is cached: the
  runtime stage and its operating system packages are rebuilt every time.

Weekly/manual sweeps resolve the Android graph and build the image from scratch,
and only seed those caches. The production `prepare` build uses `docker build
--pull` with no cache.

Operating system packages do not depend on the Ubuntu servers answering at that moment.
`backend/docker/apt-install.sh` installs Ubuntu packages from the official archive
(`archive.ubuntu.com` and `security.ubuntu.com`) first and, when it does not answer, from
mirrors on other domains (kernel.org, MIT, Leaseweb, RWTH Aachen). It uses the first
three that answer, and apt verifies everything against the Ubuntu archive key, so a
mirror cannot change the packages. When nothing answers, it retries three times with a
growing wait and ends with `APT failed after 3 attempts`. It is used by:

- The Backend job, for the WebP encoder. The `.deb` packages are cached with
  `actions/cache` per runner architecture and image (`ImageOS` and `ImageVersion`); with
  the cache they install with no network.
- The runtime stage of the backend `Dockerfile`, so an outage of `ubuntu.com` DNS does
  not fail the image scan, the dev deploy or the production `prepare`.

## Maintenance

Linux uses `ubuntu-24.04`; JavaScript Actions use Node 24 and full commit SHAs.
`infra/security/actions-policy.json` records reviewed metadata;
`verify-workflow-policy.mjs` rejects mutable tags, `*-latest` runners, unreviewed
runtimes and unsupported inputs. `--online` checks each SHA against its official
`action.yml`. Changing a version comment or suppressing a warning is insufficient.
Review permissions and metadata before updating the catalog.

### Local pre-push strategy

Every failure in Actions costs minutes and a rerun. Before each push or dispatch,
using Node 22 and available local dependencies, run the preflight:

```sh
node scripts/ci-preflight.mjs origin/development        # work branch → development
node scripts/ci-preflight.mjs origin/main               # release PR development → main
node scripts/ci-preflight.mjs origin/development --all  # every component
node scripts/production-component-plan.mjs --inspect "$(git rev-parse origin/main)"
```

The preflight computes the diff's impact with the same `ci-impact.mjs` as CI and
runs, in CI's order, everything that applies:

| Impact | Checks |
|---|---|
| Always | Branch name, Action policy (`--online`), actionlint, automation tests with 100% coverage, documentation and diagrams, test architecture, gitleaks on commits not yet on the base and on uncommitted changes |
| Backend | `mvn clean install` (includes `verify`: checkstyle, tests, coverage and packaging) |
| Backend image inputs | Maven resolution and trivy of the graph; Docker image build and trivy of the image |
| Web | `npm ci`, npm audit, lint, coverage, build and Chromium retention/rollback |
| Mobile | `npm ci`, security backports, npm audit, expo-doctor (version drift warns, other failures block), release configuration, lint, types, coverage, iOS export and benchmark without paid requests |
| Mobile native configuration | On macOS, `npm run preflight:ios:native` with production values: prebuild, `pod install` and an iphoneos compile that includes the device-only OCR module and production's iOS Maps setup |
| Docs | `npm ci`, security backports, npm audit, tests, types and a build of both languages |

The first failure stops the run; at the end it prints each check's duration. A
native Android change prints a notice that its Gradle resolution remains a CI
check. CI compiles iOS only when the `validate:ios-native` label is added to a PR
(or on manual dispatch); later commits are not recompiled until the label is
removed and added again, so a native
change is compiled locally before it reaches git; outside macOS the preflight
prints a notice to run it on a Mac before pushing. It never pushes, sends email, changes AWS or starts Actions. Run it in a
checkout containing exactly the delivery files, without reinstalling dependencies
beneath a user-operated Metro process. Local tests cannot guarantee future
external-service availability.

Optional per-clone hook: `git config core.hooksPath .githooks` enables
`.githooks/pre-push`, which runs the preflight against `origin/main` when the
push targets `main` and against `origin/development` otherwise. To skip it once:
`VINNOT_SKIP_PREFLIGHT=1 git push` or `git push --no-verify`.

### Actions minutes

GitHub bills each job rounded up to the minute, and macOS counts ten times. A
skipped job is not billed. That is why short checks share `Repository checks`, the
gate is the only other fixed job, merging into development does not repeat an
already validated tree, a promotion to `main` accepts the tree its pull request
already validated, dependency scans run only when dependency inputs change, a
superseded development deployment is skipped instead of failing, iOS native
validation starts only when its label is added, and the documentation site build
stays on Cloudflare Pages. To recover an interrupted job, use `gh run rerun --failed`, never the full
run.

CI validates Action policy in Repository checks and waits for that job
before expensive Maven, frontend and security jobs. `github-read.mjs` allows at
most three attempts only for transient GET failures (socket/timeout,
429/502/503/504); 401/403/404, invalid data and deployment writes are not retried.
Inspect a failed SSM operation before another publication. Do not rerun the entire
pipeline to recover one interrupted job.

Keep the weekly security sweep. Review new warnings each release, update Actions
and runtimes before retirement and record evidence. Dependabot opens a monthly
grouped PR to `development` for pinned Actions; its first run stops in
`Repository checks` (about one minute, before any component job) until one reviewed
commit records the new SHA, runtime and inputs in
`infra/security/actions-policy.json`. The error names the Action and the step. It also opens
one monthly grouped patch/minor PR per npm, Maven and Docker project; see
[Dependency updates](dependency-updates.md). Do not trigger repeated builds
just to appear current. Only an identical, already approved Git tree avoids
repeating validation; another tree's successful gate is never transferred.

The 2026-10-06 review removed Node 20 Action, floating runner and unsupported AWS
input warnings. Vite uses native ESM configuration; jsdom 27.4 removes
`whatwg-encoding` from web testing and mobile tests use RNTL matchers.
Transitive warnings remain in Expo/Jest/MLKit (glob, inflight, rimraf, uuid,
jsdom 20 and jest-native still declared by MLKit), plus Java/Mockito/Spring test
warnings. They are neither security exceptions nor suppressed: keep compatible
upgrades pending in #217, trace the tree with `npm explain` and do not force
incompatible API overrides. Preflight and CI still block security findings under
the existing high/critical gates; backports must match exact versions, paths
and advisories.

## Production candidate and publication

`production-release.yml` is dispatched manually from `main`. The operator supplies
its current full SHA. `prepare` verifies a successful `ci.yml` run for that revision,
repository/origin, branch, event and successful-attempt jobs; it reuses the existing
gate. With `baseline_candidate_run_id`, it downloads a complete previous candidate,
verifies provenance/CI/checksums and ancestry, compares artefact changes and builds
only modified backend/web components. It reuses verified bytes for the other
component and checks its current production revision. Without a verifiable baseline,
both components are built; an explicitly supplied invalid baseline blocks the run.
`force_rebuild` rebuilds after build variables/secrets change outside Git.

Manifest format 2 retains the operator revision and each component revision,
publication flags, OCI-labelled AMD64 image, tar, SBOM, reports and complete web
for rollback; checksums cover the entire artifact retained for 30 days. Previous
format 1 candidates remain valid. Prepare receives no AWS credentials. Local
inspection determines whether this workflow is needed: mobile-only releases use
compatible OTA without preparing/publishing unchanged backend and web.

`publish` downloads the candidate by run, validates provenance and the complete
inventory before assuming the production OIDC role, and never rebuilds. It verifies
the ECR image has the same ID and component label. Only changed backend is sent to
SSM by digest; only changed web is published/invalidated, after host success if a
backend deploy was needed. Preserved components are rechecked before credentials
and before switching web. If both are unchanged, no AWS role is assumed and no
resources are written. Therefore `/version` and web meta revision can retain SHAs
different from the operator revision. Rollback restores both parts of the complete
candidate regardless of its original flags, skipping a part already at its target
revision instead of reverting its history twice. It accepts a retained candidate; the host
requires the recorded previous release and matching schema/configuration. Both
actions recheck that the operating `main` revision remains current. Each publication
retains `deployment-result.json` without secrets; the published state still requires
browser acceptance from the permitted operator IP.

GitHub Free private repositories do not provide protected environments or mandatory
approval. Human approval, workflow review and explicit dispatch are operational
controls; they cannot prevent a writer able to modify `main` from changing the flow.
The separate role limits resources and uses the observed exact repository/ref `sub`,
including immutable IDs when enabled. Never grant production to the development deployer.

Expired artifacts must not be rebuilt under a previous release identity: prepare
a new candidate or recover a verified complete archive. Deploys never delete assets
or release archives; cleanup requires an inventory, a minimum 30-day window and
preservation of active/previous releases.

The local `optimize-static-artwork.py` generator validates web and mobile without resolving native dependencies; `preview_transactional_emails.py` validates backend. These scripts alone do not publish artifacts: committed generated files determine the corresponding deployments.
