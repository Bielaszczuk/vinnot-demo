# Step-by-step release

How to take any change from the local machine to production without help: backend, web,
documentation or mobile app, by OTA or with a native build, with or without database
migrations. Every step gives the exact command or the place in each web console where it
happens.

The technical detail of each piece lives in other guides, linked from here:
[Deployment guide](deployment.md), [CI/CD](ci-cd.md),
[Mobile distribution](../../frontend-mobile/guides/distribution.md),
[Mobile development](../../frontend-mobile/guides/development.md) and
[Issues and branches](../../governance/github-work-items.md).

Console labels are given in English, with the Spanish label in parentheses where the
account shows Spanish.

## Quick map

| What changed | Steps |
|---|---|
| Documentation only | 1 to 5, then 9 and 10 |
| Backend or web, no migrations | 1 to 6, then 9 and 10 |
| Backend with new migrations or runtime files (the `prepare` plan says so) | 1 to 5, 6.1, 6.2, 7, then 9 and 10 |
| Mobile app, JS or images only (`src/`, `app/`, `assets/`) | 1 to 5, then 8.A and 10 |
| Mobile app with native changes or an Expo version change | 1 to 5, then 8.B and 10 |
| Production configuration or secrets (`vinnot/prod/backend`) | With a release that changes the backend: 1 to 5, 6.1, 7.5, 6.2 and 6.3, then 9 and 10 |
| Several at once | Every step that applies, in order |

A production emergency takes the same path as a `hotfix` (see [Hotfix](#hotfix)).

## 0. Setup (once)

Tools on the local machine:

- Node 22 (`nvm install 22 && nvm use 22`). The preflight fails on any other version.
- Docker running: backend tests use Testcontainers.
- GitHub CLI signed in: `gh auth login`.
- AWS CLI with the `vinnot-prod-provisioner` profile, only for the host preparation of step 7
  (`aws login --profile vinnot-prod-provisioner`).
- For the app: Xcode (the preflight builds iOS on macOS), Java 17
  (`/Library/Java/JavaVirtualMachines/temurin-17.jdk`) and the Android SDK
  (`~/Library/Android/sdk`) for the local Android build.
- An Expo session: `npx eas-cli@25.3.0 login`.

Web access: GitHub (repository `Bielaszczuk/vinnot`), AWS console (account
`497675597655`, region `us-east-1`), Cloudflare (Pages project `vinnot-docs`), Expo
(account `vinnot`), App Store Connect (app `6817992780`) and Google Play Console.

The rest of the local setup is in [Local development](../../getting-started/local-development.md).

## 1. Issue and branch

1. In GitHub: **Actions › Create Work Branch › Run workflow**, branch `main`.
2. Fill in `work_type` (`feature`, `bugfix`, `task` or `hotfix`), `title` and
   `description`. For an existing issue, fill in only `issue_number`.
3. The workflow creates the issue and the branch `<type>/<number>-<slug>`. `feature`,
   `bugfix` and `task` start from `development`; `hotfix` starts from `main`.

From the terminal:

```bash
gh workflow run create-work-branch.yml --ref main \
  -f work_type=feature -f title="Title" -f description="Goal"
git fetch origin
git switch <type>/<number>-<slug>
```

## 2. Local work and preflight

1. Make the changes with their tests and the documentation in `docs/es` and `docs/en`.
2. Commit with Conventional Commits (`feat:`, `fix:`, `docs:`, `build:`, `ci:`).
3. Before every push, from the repository root:

```bash
node scripts/ci-preflight.mjs origin/development
```

The preflight only runs the checks for what changed. With native app changes on macOS,
it also builds iOS with the production configuration. It must end with
`Local preflight passed`. If it fails, fix and run it again; see
[Common problems](#common-problems).

## 3. Pull request to development

```bash
git push -u origin <branch>
gh pr create --base development --title "feat: ..." --body "Refs #<number>"
gh pr checks <pr-number> --watch
```

- PRs to `development` use `Refs #N`: `Closes #N` does not close the issue on that branch.
- If something native in the app changed (Expo dependencies, `app.config.ts`, plugins),
  add the `validate:ios-native` label to the PR. It runs the iOS build in CI:
  `gh pr edit <pr-number> --add-label validate:ios-native`.
- In GitHub: **Pull requests › the PR › Checks**. There is no branch protection: the
  control is that every check is green before merging.

## 4. Merge and development deploy

```bash
gh pr merge <pr-number> --merge
gh run list --workflow ci.yml --branch development --limit 1
gh run watch <run-id>
```

The push to `development` runs CI and, when backend or web changed, the
`Deploy backend development` and `Deploy web development` jobs.

Check:

- API: `curl -s https://api-dev.vinnot.com/api/version` shows the merge commit in
  `revision` (only when the backend changed) and
  `curl -s https://api-dev.vinnot.com/api/actuator/health` shows `UP`.
- Web: open `https://dev.vinnot.com` and try the change. The development web does not
  publish its revision; a green `Deploy web development` job is the confirmation.

To redeploy development without changes: **Actions › CI › Run workflow**, branch
`development`, enable `deploy_development`.

### Trying the app in preview

If the app changed, publish an OTA to the `preview` channel for test installs:

```bash
cd frontend-mobile
npm run eas:update:preview -- --message "What changed (#N)" --platform all
```

Without `--platform`, it publishes iOS only. The OTA reaches preview installs whose
version matches `version` in `app.config.ts` (see [OTA or native build](#8-mobile-app)).

## 5. Release pull request to main

1. Preflight against `main`, from the root with `development` up to date:

```bash
git switch development && git pull
node scripts/ci-preflight.mjs origin/main
```

2. Create the PR, wait for the checks and merge with a merge commit:

```bash
gh pr create --base main --head development \
  --title "release: change summary (#N)" --body "Release of #N"
gh pr checks <pr-number> --watch
gh pr merge <pr-number> --merge
```

3. Wait for the `main` CI to pass and note its ID; step 6 uses it:

```bash
git fetch origin
gh run list --workflow ci.yml --branch main --commit "$(git rev-parse origin/main)" --limit 1
gh run watch <main-ci-id>
```

If only the app changed by OTA, step 6 is not needed.

## 6. Production: backend and web

The **Production Release** workflow has two phases: `prepare` builds an immutable
candidate and `publish` deploys it. GitHub asks for no approval: the operator decides
when launching each phase.

### 6.1 Prepare

Inputs:

| Field | Where it comes from |
|---|---|
| `operation` | `prepare` |
| `approved_sha` | Full `main` SHA: `git fetch origin && git rev-parse origin/main` |
| `ci_run_id` | ID of the `main` CI from step 5 (the URL ends in `/actions/runs/<id>`) |
| `baseline_candidate_run_id` | ID of the last `prepare` that was published. It reuses what did not change. Empty rebuilds everything (slower) |
| `force_rebuild` | Only when the build environment or the deployment configuration changed |

From GitHub: **Actions › Production Release › Run workflow**, branch `main`, fill in the
fields. From the terminal:

```bash
gh workflow run production-release.yml --ref main \
  -f operation=prepare -f approved_sha=<main-sha> \
  -f ci_run_id=<main-ci-id> -f baseline_candidate_run_id=<last-published-prepare>
gh run list --workflow production-release.yml --limit 1
gh run watch <prepare-id>
```

The first step checks `baseline_candidate_run_id` before building anything: it must be a
successful `prepare` on `main`, its `production-candidate-<id>` artifact must still exist
(artifacts expire after 30 days) and its revision must be an ancestor of `approved_sha`.
Each case fails with its own message; with an expired baseline, leave the field empty and
everything is rebuilt.

In the Production Release run list, a `prepare` is the run with the
**Prepare production candidate** job green and **Publish approved production candidate**
skipped. Note the published `prepare` ID when closing each release: it is the next
baseline.

**Read the plan.** The `prepare` summary (the run page, **Production host preparation**
section) compares the candidate with the baseline, or with the backend running in
production when there is no baseline:

- `No host preparation required: ...`: go to 6.2.
- `REQUIRES MIGRATION: V85__....sql, ...`: new or changed Flyway migrations. Step 7.
- `REQUIRES RUNTIME INSTALL: <files> (candidate runtime hash <hash>)`: host files
  (`deploy-production.sh`, compose files, `Caddyfile`) changed. Step 7.

The plan is sealed inside the candidate as `host-preparation.json`.

### 6.2 Publish

```bash
gh workflow run production-release.yml --ref main \
  -f operation=publish -f approved_sha=<main-sha> -f candidate_run_id=<prepare-id>
gh run watch <publish-id>
```

`approved_sha` must still be the tip of `main`. If another merge reached `main` in
between, run step 5.3 and the `prepare` again.

When the plan requires host preparation, this `publish` uploads the image to the
registry and stops without touching production: the run ends green with the summary
**Production publish stopped before the host: preparation required**, the image to
migrate with (`...vinnot-backend-prod@sha256:...`) and status
`host-preparation-required` in `deployment-result.json`. Follow step 7 and then publish
again with the same `candidate_run_id` and `-f host_prepared=true`. Without host
preparation, `host_prepared` changes nothing.

### 6.3 Verification

```bash
curl -s https://api.vinnot.com/api/version
curl -s https://api.vinnot.com/api/actuator/health
curl -s https://vinnot.com/ | grep -o 'vinnot-revision" content="[0-9a-f]*'
```

- The web shows the published `main` SHA.
- The API shows that SHA only when the backend changed; otherwise it keeps the previous
  revision, which is correct.
- Health must answer `UP`.

If `publish` fails on the host with `Schema history differs` or
`Runtime files differ from the approved candidate`, the host was not prepared for that
candidate: step 7.

## 7. Production with database migrations or runtime files

Applies when the `prepare` plan (6.1) shows `REQUIRES MIGRATION` or
`REQUIRES RUNTIME INSTALL`. In production, Flyway is off at startup and
`deploy-production.sh` never migrates nor installs files: both happen on the server,
with `infra/aws-low-cost/migrate-production.sh`, before the backend is replaced.
Migrations are always additive: the previous backend must keep working with the new
schema. A mistake is fixed forward, never by reverting the migration.

Order, without skipping steps:

1. `prepare` (6.1) and read the plan.
2. First `publish` (6.2) without `host_prepared`: it stages the image and stops. Note
   the image from the summary.
3. Install the files the plan names, plus `migrate-production.sh` when it is missing or
   changed (7.2).
4. If it says `REQUIRES MIGRATION`: migration window (7.3). It includes the backup.
5. If it says `REQUIRES RUNTIME INSTALL`: register the runtime files (7.4).
6. Second `publish` with the same `candidate_run_id` and `-f host_prepared=true`.
7. Verification (6.3).

### 7.1 Running commands on the server

The production server is the EC2 instance `i-06bff053f7584c6c2`, managed through AWS
Systems Manager.

From the AWS console:

1. Region `us-east-1`. Go to **Systems Manager › Run Command › Run command**.
2. Document `AWS-RunShellScript`.
3. Paste the commands into **Commands**.
4. Under **Targets**, pick **Choose instances manually** and tick `i-06bff053f7584c6c2`.
5. **Run**. The output is under **Command history** › the command › the instance ›
   **Output**.

From the terminal, with a `script.sh` file holding the commands:

```bash
AWS=(aws --profile vinnot-prod-provisioner --region us-east-1)
PARAMS=$(python3 -c 'import json,sys; print(json.dumps({"commands": open(sys.argv[1]).read().splitlines(), "executionTimeout": ["900"]}))' script.sh)
CMD=$("${AWS[@]}" ssm send-command --instance-ids i-06bff053f7584c6c2 \
  --document-name AWS-RunShellScript --parameters "$PARAMS" \
  --query Command.CommandId --output text)
"${AWS[@]}" ssm get-command-invocation --command-id "$CMD" \
  --instance-id i-06bff053f7584c6c2 \
  --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
```

`get-command-invocation` shows `InProgress` until it ends; repeat it until it shows
`Success` or `Failed`.

### 7.2 Installing files on the server

Files are copied from the approved revision, never from a working copy. This command
writes a `script.sh` for 7.1 that installs each file in `/opt/vinnot-prod`, checks its
SHA-256 and keeps the previous copy as `<file>.before-<date>`:

```bash
git fetch origin
python3 - <main-sha> infra/aws-low-cost/migrate-production.sh infra/aws-low-cost/docker-compose.yml > script.sh <<'PY'
import base64, hashlib, subprocess, sys
sha, paths = sys.argv[1], sys.argv[2:]
print('set -euo pipefail\ncd /opt/vinnot-prod\nSTAMP=$(date -u +%Y%m%dT%H%M%SZ)')
for path in paths:
    data = subprocess.run(['git', 'show', f'{sha}:{path}'], check=True, capture_output=True).stdout
    name, mode = path.rsplit('/', 1)[-1], '0755' if path.endswith('.sh') else '0600'
    print(f"printf '%s' '{base64.b64encode(data).decode()}' | base64 -d > .install-{name}")
    print(f"echo '{hashlib.sha256(data).hexdigest()}  .install-{name}' | sha256sum -c -")
    print(f"if [ -e {name} ]; then cp -p {name} {name}.before-$STAMP; MODE=$(stat -c %a {name}); else MODE={mode}; fi")
    print(f'install -o root -g root -m "$MODE" .install-{name} {name}; rm .install-{name}; echo "installed {name}"')
PY
```

List the paths the plan names (`infra/aws-low-cost/<file>`), plus
`infra/aws-low-cost/migrate-production.sh` the first time or when it changed, and
`infra/postgres/production-runtime-grants.sql` when the migration window reports that the
grants differ. An existing file keeps its mode; a new one gets `0755` (scripts) or `0600`.
If SSM rejects the command because of its size, send one file per command.

### 7.3 Migration window

Image: the one in the stopped `publish` summary (6.2). Grants hash, from the local
machine:

```bash
git show <main-sha>:infra/postgres/production-runtime-grants.sql | shasum -a 256
```

Command for the server (7.1):

```bash
/opt/vinnot-prod/migrate-production.sh migrate \
  497675597655.dkr.ecr.us-east-1.amazonaws.com/vinnot-backend-prod@sha256:<digest> <grants-sha256>
```

Send it with an `executionTimeout` well above the backup plus migration time
(for example `3600`). An SSM timeout kills the script without running
its relock trap, which would leave the migrator able to log in; if that happens,
rerun the same command, which relocks it before finishing.

The script prints each step and stops at the first failure:

1. Refuses when a command or file is missing, another production operation holds the
   lock, `/opt/vinnot-prod/production-runtime-grants.sql` does not match the given hash,
   or `flyway_schema_history` has failed rows.
2. Pre-migration backup with `vinnot-prod-backup.service`; it requires the backup marker
   to advance and prints the S3 key. Restore steps are in
   [Backup and disaster recovery](../operations/backup-and-disaster-recovery.md).
3. Registry login (`aws ecr get-login-password | docker login`) and image pull.
4. One-time login for `vinnot_prod_migrator`: a random password that only lives in
   `migration.env`.
5. Flyway migrate with the `migrate` service, showing its full output. The migrator is
   locked again (`NOLOGIN PASSWORD NULL`) and `migration.env` removed even when the
   migration fails, and the lock is checked.
6. Grants from `/opt/vinnot-prod/production-runtime-grants.sql`, never from the
   `release-window-*` copies.
7. Schema hash: replaces only `schema` in `release-state/current.json`, with the same
   query and normalization as `deploy-production.sh`, and keeps the previous copy in
   `release-state/before-schema-hash-<date>/`.

Running it again with nothing pending is safe: it makes a new backup, Flyway applies
nothing and the hash stays the same.

#### Long migrations: V86

`V86__index_filtered_wine_search.sql` builds the filtered search read models from the
whole catalog (#531). Plan for it:

- Duration: about 3 minutes on a copy of the catalog with 1.72 million wines, at the
  production limits (0.65 CPU, 384 MB container, `fsync` on): 18 s for the read model,
  4 s for the grape rows, 2.5 minutes for the multicolumn GIN index. Allow up to
  10 minutes on the production disk; the `executionTimeout` of 3600 s covers it.
- Effect while it runs: wine and winery writes wait until it commits (new wines,
  edits, wine ratings after reviews); searches and every other read keep working with
  the previous backend, but slower while the index builds (a text and country search
  went from about 1 s to about 2.7 s at the production CPU limit). Choose a
  low-traffic moment.
- Memory: about 50 MB of backend memory with its 16 MB `maintenance_work_mem`. With
  64 MB the index build was OOM-killed in a 384 MB container, so do not raise it.
- Disk: the two read models and their indexes take about 1.4 GB more for 1.7 million
  wines, and the build also writes about 1.3 GB of WAL and 0.4 GB of temporary files
  (disk use grew 2.7 GB right after the run). Check that `df -h /` leaves at least
  5 GB free before the window.
- If it fails, the transaction rolls back and nothing remains; fix the cause and run
  the same command again. A manual re-run of the SQL over existing objects is
  different: it locks out reads too, so let Flyway apply it.
- After the window, autovacuum sets the visibility map of the new tables within
  minutes. Until then, grape pages read a few more pages; nothing else is needed.

### 7.4 Registering runtime files

After installing the files (7.2) and, when there are migrations, after 7.3. Command for
the server, with the hash from the `REQUIRES RUNTIME INSTALL` line:

```bash
/opt/vinnot-prod/migrate-production.sh record-runtime <candidate-runtime-hash>
```

It refuses when the installed files do not produce that hash, or when the schema or
`runtime.env` no longer match the journal. Otherwise it replaces only `runtime` in
`release-state/current.json` and keeps the previous copy in
`release-state/before-runtime-<date>/`.

Then the second `publish` (6.2) with `-f host_prepared=true` and verification (6.3).

### 7.5 Changing production configuration

Production configuration and secrets live in the AWS Secrets Manager secret
`vinnot/prod/backend`. On the server, `refresh-runtime-env.sh prod` copies them to
`/opt/vinnot-prod/runtime.env`. `deploy-production.sh` compares the `runtime.env` hash
with the `config` field of `release-state/current.json` and refuses to deploy when they
differ (`Baseline compatibility changed; operator reconciliation required`). So every
configuration change refreshes the file and records the new hash in the same step.

The backend only gets the new values when a `publish` replaces it. When the image does not
change, `publish` answers `Release already active` and does not recreate the backend, so
the change ships with a release that changes the backend.

Order:

1. Change the value in the AWS console (region `us-east-1`): **Secrets Manager ›
   `vinnot/prod/backend` › Retrieve secret value › Edit**. Update every variable that
   `infra/aws-low-cost/compose.production.yml` reads; for example, the monthly AI cap uses
   `PROD_AI_MONTHLY_LIMIT_USD` and `AI_MONTHLY_LIMIT_USD`.
2. `prepare` (6.1) of the release that carries the change.
3. Refresh the file and record its hash with this script, sent through 7.1:

   ```bash
   set -eu
   cd /opt/vinnot-prod
   exec 9> .release.lock
   flock -n 9 || { echo 'REFUSED: another production operation is running'; exit 1; }
   before=$(sha256sum runtime.env | cut -d' ' -f1)
   jq -e --arg c "$before" '.config == $c' release-state/current.json >/dev/null \
     || { echo 'REFUSED: runtime.env does not match the release journal'; exit 1; }
   copy=release-state/before-config-$(date -u +%Y%m%dT%H%M%SZ)
   mkdir -p "$copy"
   cp -p runtime.env release-state/current.json "$copy/"
   /opt/vinnot-prod/refresh-runtime-env.sh prod
   after=$(sha256sum runtime.env | cut -d' ' -f1)
   echo 'Changed variables:'
   cat "$copy/runtime.env" runtime.env | sort | uniq -u | cut -d= -f1 | sort -u
   cp -p release-state/current.json release-state/.current.json.new
   jq --arg c "$after" '.config = $c' release-state/current.json > release-state/.current.json.new
   mv release-state/.current.json.new release-state/current.json
   echo "Journal updated. Previous copy: /opt/vinnot-prod/$copy"
   ```

   The script takes the same lock as the other production scripts and refuses when
   `runtime.env` no longer matched the journal before it started. It prints only the names
   of the variables that changed, never their values. They must be exactly the ones edited
   in step 1; any other name means someone else changed the secret, and it needs a review
   before publishing.
4. `publish` (6.2) and verification (6.3).

To go back before the `publish`, restore the previous value in Secrets Manager and repeat
step 3. The copies of `runtime.env` and `current.json` stay in
`release-state/before-config-<date>/`, with the same permissions as the originals.

## 8. Mobile app

### OTA or native build

`runtimeVersion` follows `version` in `frontend-mobile/app.config.ts`. An OTA only
reaches installs with that same version.

- **OTA**: changes only in `frontend-mobile/src`, `frontend-mobile/app` or
  `frontend-mobile/assets`. It arrives in minutes, without the stores.
- **Native build**: native or Expo dependencies in `package.json`, plugins, permissions
  or other native fields in `app.config.ts`, Expo updates, or native code. It needs a new
  version, builds and store review.

To compare against the last published native version:

```bash
git diff --name-only <last-build-commit> origin/main -- frontend-mobile \
  | grep -vE '^frontend-mobile/(src|app|assets)/'
```

If the list holds anything beyond tests or docs, a native build is needed. The preflight
also warns when it detects native changes.

### 8.A Production OTA

From an up-to-date `main` checkout, with the production API already published:

```bash
cd frontend-mobile
REV=$(curl -s https://api.vinnot.com/api/version | python3 -c 'import json,sys; print(json.load(sys.stdin)["revision"])')
npm run eas:update:production -- --message "What changed (#N)" --api-revision "$REV" --dry-run
npm run eas:update:production -- --message "What changed (#N)" --api-revision "$REV"
```

The script refuses to publish when:

- `frontend-mobile` has uncommitted changes;
- the commit is not on `origin/main`;
- `backend/` changed between the API revision and the commit (the backend still needs
  publishing: step 6);
- `--api-revision` differs from the one `https://api.vinnot.com/api/version` shows.

Without `--platform`, it publishes Android and iOS. The OTA shows in expo.dev › project
`vinnot` › **Over-the-air updates**.

**If the version already went up on `main`** (for a new native build) and the OTA must
reach installs of the previous version, publish from the last commit with the previous
version, in a separate copy:

```bash
git worktree add ../vinnot-ota <commit-with-the-previous-version>
cd ../vinnot-ota/frontend-mobile && npm ci
npm run eas:update:production -- --message "..." --api-revision "$REV" --dry-run
npm run eas:update:production -- --message "..." --api-revision "$REV"
cd ../.. && git worktree remove ../vinnot-ota
```

### 8.B Native build and stores

**1. New version** (on the change branch, before the PR):

- Raise `version` in `frontend-mobile/app.config.ts` (for example `0.2.2` → `0.2.3`).
- Update the expected version in `frontend-mobile/scripts/test/native-runtime-sdk.test.mjs`
  and `frontend-mobile/scripts/test/content-links.test.mjs`, and the version paragraph in
  [Mobile distribution](../../frontend-mobile/guides/distribution.md).
- When Expo is updated (`npx expo install --fix` from `frontend-mobile`): update the
  `blockingPackages` versions in `frontend-mobile/scripts/security-backports/manifest.json`
  and the pinned hash in `frontend-mobile/scripts/apply-security-backports.mjs`, and
  check from `frontend-mobile` with `node scripts/apply-security-backports.mjs --verify`.
  Detail in [Dependency security](dependency-security.md).
- Before the version change, publish by OTA (8.A) anything pending for the previous
  version.

Then steps 3 to 6 as for any change, with the `validate:ios-native` label on the PR.

**2. iOS build** (in the EAS cloud, from an up-to-date `main`):

```bash
cd frontend-mobile
npm run preflight:ios:native
npx eas-cli@25.3.0 build --platform ios --profile production --auto-submit
```

- The free Expo plan allows 15 iOS builds per month; see usage in expo.dev › **Usage**.
- `--auto-submit` sends the build to App Store Connect when it ends. The submission waits
  in Expo's free queue, usually 30 to 45 minutes, and Apple takes another 10 to 15
  minutes to process it. Status in expo.dev › **Submissions**.

**3. Android build** (local, the supported path; Android is not built in the EAS cloud because
that build runs out of memory since `react-native-skia` was added, issue #459):

```bash
cd frontend-mobile
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export ANDROID_HOME=~/Library/Android/sdk
npx eas-cli@25.3.0 build --platform android --profile production --local \
  --output ~/Downloads/vinnot-<version>.aab
```

EAS raises the `versionCode` by itself. The build ends with `Build successful` and the
`.aab` lands in `~/Downloads`.

**4. App Store Connect** (Vinnot app):

1. **TestFlight** tab: wait until the new build shows as finished under **Build uploads**
   (Cargas de compilaciones).
2. **Distribution** tab: in the left menu, **+** next to "iOS App" (App para iOS), type
   the version and **Create**.
3. In **What's New in This Version** (Novedades en esta versión), write the Spanish
   (Mexico) text; switch the language at the top right to English (U.S.) and write the
   English text. **Save**.
4. **Build › Add Build** (Compilación › Añadir compilación): pick the build and
   **Done**. **Save**.
5. **Add for Review › Submit for Review** (Añadir a revisión › Enviar a revisión). Apple
   takes up to 48 hours and sends an email.

**5. Google Play Console** (Vinnot app):

1. In the left menu, **Production** (Producción), or **Closed testing › Alpha** for
   testers › **Create new release** (Crear una versión nueva).
2. Drag the `.aab` into **App bundles** and wait for the upload to finish.
3. In **Release notes**, write:

```text
<es-419>
Texto en español.
</es-419>
<en-US>
Text in English.
</en-US>
```

4. **Next**. The deobfuscation file warning does not block. **Save**.
5. **Publishing overview › Send changes for review › Send changes for review**. With
   managed publishing off, the release goes out on its own once approved.

**6. Minimum version**: once the store has published the build, raise that platform's
minimum on the web, in Administration › "App versions" (Versiones de la app). Doing it
earlier blocks everyone with no way to update. Detail in
[Forcing the update](../../frontend-mobile/guides/distribution.md#forcing-the-update).

## 9. Documentation site

Every merge to `main` publishes the documentation on Cloudflare Pages:

1. In GitHub, the `main` commit has the `Cloudflare Pages: vinnot-docs` check.
2. In Cloudflare: **Workers & Pages › vinnot-docs › Deployments**. The commit's
   deployment must show as successful.
3. If it sat queued for more than 10 minutes or failed cloning the repository: cancel it
   and use **Retry deployment**.

## 10. Closing

```bash
gh issue close <number> -c "Released: PR #<to development>, PR #<to main>, prepare <id>, publish <id>, OTA <group>"
```

Note the published `prepare` ID: it is the next release's `baseline_candidate_run_id`.

## Hotfix

1. Branch `hotfix/<number>-<slug>` from the workflow (it starts from `main`).
2. Preflight against `main`: `node scripts/ci-preflight.mjs origin/main`.
3. PR to `main` (here `Closes #N` works), checks, merge, steps 6 to 10.
4. Bring the fix to `development`: a PR from `main` to `development`.

## Going back

- **Backend or web**: **Production Release** with `operation=rollback`,
  `approved_sha` set to the current `main` tip and `candidate_run_id` set to the previous
  `prepare`. It only returns to a release with the same schema and configuration.
  Migrations are not reverted. See [Production rollback](deployment.md#production-rollback).
- **OTA**: publish an earlier group again, from `frontend-mobile`:

```bash
npx eas-cli@25.3.0 update:list --branch production
npx eas-cli@25.3.0 update:republish --group <previous-group-id>
```

  To go back to what the installed binary ships: `npx eas-cli@25.3.0 update:roll-back-to-embedded`.
- **Store build**: an installed build cannot be withdrawn. It is fixed with an OTA or a
  new build, and the minimum version is not raised until the fix is published.

## Common problems

| Symptom | Cause and fix |
|---|---|
| The preflight sits still for minutes in a backend test | Testcontainers lost its Postgres connection. Stop the preflight (`Ctrl+C`) and run it again. |
| The preflight fails in `expo-doctor` with different expected versions | Expo released new patches. Taking them with `npx expo install --fix` means a native build (8.B). When the delivery must ship by OTA, defer them by adding the package to `expo.install.exclude` in `frontend-mobile/package.json`, and remove it with the next native build. Currently excluded: `react-native` (0.88.1 expected, the project uses 0.88.0) and, since #489, the SDK 58 patches `expo` 58.0.22, `expo-build-properties` 58.0.12, `expo-dev-client` 58.0.18, `expo-router` 58.0.29, `expo-updates` 58.0.20 and `react-native-screens` 4.30.1, plus, since #504, `expo-constants` 58.0.15, `expo-linking` 58.0.16, `expo-notifications` 58.1.8, `expo-splash-screen` 58.0.13, `jest-expo` 58.0.14 and `react-native-safe-area-context` 5.11.1 (the project uses the previous patch or minor of each). |
| `Local preflight requires Node 22` | `nvm use 22` and repeat. |
| The CI iOS validation fails building `ExpoModulesJSI` | The runner has an older Xcode than Expo needs. Check `DEVELOPER_DIR` and `runs-on` in `.github/workflows/ios-native-validation.yml`. |
| `prepare` fails in its first step with `baseline_candidate_run_id ...` | The message says why: not a successful `prepare` on `main`, artifact expired or missing, or not an ancestor of `approved_sha`. Use the last published `prepare`, or leave the field empty to rebuild everything. |
| `publish` ends green with `Production publish stopped before the host` | Expected: the candidate needs host preparation. Step 7, then `publish` with `host_prepared=true`. |
| `publish` fails with `Schema history differs` or `Runtime files differ` | The host was not prepared for that candidate (or it was sealed before the plan existed): step 7. |
| `publish` fails with `Baseline compatibility changed; operator reconciliation required` | The schema, the runtime files or `runtime.env` changed since the last release without being recorded in `release-state/current.json`. After a configuration refresh, step 7.5; after a schema or runtime file change, step 7. |
| `migrate-production.sh` stops with `REFUSED: ...` | Nothing was migrated; the message names the missing prerequisite (file, command, grants hash, failed Flyway rows, backup that did not advance). Fix it and run the same command again. |
| `eas:update:production` refuses to publish | Read the message: commit outside `main`, unpublished backend changes or an `--api-revision` different from production's. |
| The App Store Connect submission stays "Queued" | Expo's free queue, normal up to about 45 minutes. Status in expo.dev › **Submissions**. |
| The `vinnot-docs` deployment stays queued or fails to clone | Cancel and retry in Cloudflare (step 9). |
| Play warns about a missing deobfuscation file | It is a warning; it does not block review. |
