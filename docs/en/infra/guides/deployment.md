# Deployment

## Browser-session and security-header publication order

Backend `/auth/web/*` must be available before publishing the cookie-based
client. `wait-browser-session-contract.mjs` requires an empty 204 for refresh
without a cookie, Cache-Control: no-store, no Set-Cookie, and credentialed CORS
for the exact origin. The previous 422 backend contract, a 404, outage, or incorrect
CORS blocks publication; it does not fall back to local tokens.

`frontend-react/security-headers.json` is the source for Vite preview and
CloudFront headers: CSP, anti-framing, nosniff, HSTS, referrer policy,
popup-compatible COOP and platform permissions. Scripts allow self and specific
login/map providers, without unsafe-inline/unsafe-eval. Inline styles support
existing components/SDKs; HTTPS images support remote catalog media. New
integrations require explicit origin review, not a script wildcard.

The dev workflow uses `configure-web-security-function.mjs`: CloudFront Functions
is included in the Free plan, which does not support custom response policies.
The function applies versioned headers at viewer-response. At viewer-request,
extensionless SPA routes resolve to `/index.html`, preserving query strings and
assets; direct `/login` navigation therefore does not depend on an S3 error,
for which CloudFront does not run viewer-response. A managed SecurityHeadersPolicy
also protects origin-error responses, without promising CSP for those errors.
An existing CORS policy is preserved. The adapter requires a dedicated S3
distribution with one cache behavior and refuses foreign viewer functions.

Code is validated with TestFunction before publication and association. Bootstrap
the function once with an administrative identity; the deployer needs only
DescribeFunction, GetFunction, UpdateFunction, TestFunction and PublishFunction
on its exact ARN, plus GetDistributionConfig, UpdateDistribution and GetDistribution
on its distribution. CreateFunction cannot be ARN-scoped and is not granted to
the deployer. The script supports bootstrap with a creation-authorized identity,
but never expands IAM or changes billing plans. Publication waits for CloudFront.

`configure-web-security-headers.mjs` retains the alternative adapter for plans
supporting custom policies: distribution-owned policies preserve CORS/custom
headers and never modify foreign shared policies. The Free-plan dev workflow
does not execute this path.

### Automatic Cloudflare beacon

On 2026-10-01, Real User Measurements (RUM) was disabled in Cloudflare Web
Analytics for the configured hostname `vinnot.com`. Automatic injection also
added `static.cloudflareinsights.com/beacon.min.js` to development, but Vinnot's
CSP does not allow this script and the product does not integrate that measurement.
After saving and reloading `dev.vinnot.com/login`, the beacon was absent.
This provider setting affects its configured hostname; it needs no build, DNS,
AWS, or CSP changes. The site and its history are not deleted.

If the warning returns, inspect Web Analytics → Manage site → RUM and the public
HTML, together with any manual integration. Keep injection disabled; enabling
browser metrics requires a prior review of privacy scope, integration, and
explicit CSP origins. Provider reference:
[Cloudflare Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/).

### CloudFront isolation by environment

The script requires `PUBLIC_URL` as an HTTPS origin and checks that it is the
distribution's only alias before creating or changing policies. Combining a
production distribution ID with the development hostname fails before writes.
Owned policy names include the distribution ID and are not shared across
environments. A distribution with multiple aliases requires an explicit
review of this contract before being added to the workflow.

The development identity has write access to distribution `E16RJ3WGUX15VP`
and function `vinnot-web-security-e16rj3wgux15vp` in account 497675597655.
Explicit denies prevent updating, deleting or invalidating other distributions
and updating, publishing or deleting foreign functions. The custom-policy write
permission remains limited to `2119079c-7e73-4d7f-bb79-b615eab4947c`, which is not
associated under the Free plan. Resource or topology changes require a permission
review before deployment.

Production must use a separate deployment identity, its own ARNs, bucket,
secrets and publication approval; development credentials must not be reused.
This CloudFront isolation does not certify isolation across every AWS service.

Backend allowlists must contain the exact web origin. Production uses
https://vinnot.com and https://api.vinnot.com; development uses
https://dev.vinnot.com and https://api-dev.vinnot.com. Secure cookies require
HTTPS; local profile is the only HTTP exception. Validate local/social login,
refresh, logout and sensitive actions for each environment's candidate.


## Development backend

The `.github/workflows/deploy-backend-dev.yml` adapter is called by `ci.yml` after
the same-commit gate, for relevant changes on `development`. Manual republication
is requested through CI with `deploy_development`; no independent entry point
bypasses validation:

1. receive the successful CI result;
2. build and scan the exact AMD64 image, retaining its report/SBOM; the Maven
   build stage, whose dependency layer only changes with `pom.xml`, comes from
   the Actions cache when available, while the runtime stage is always rebuilt;
3. publish immutable and `dev-latest` tags to ECR;
4. start EC2 when stopped;
5. synchronize `deploy.sh`, `docker-compose.yml`, `compose.postgres.yml` and
   `refresh-runtime-env.sh` with checksums through SSM, and stage `Caddyfile` as
   `/opt/vinnot/Caddyfile.next`;
6. execute `/opt/vinnot/deploy.sh <dev-image@digest> <SHA>`;
7. wait for local and public health;
8. emit bounded diagnostics on failure.

The remote script refreshes `runtime.env` from Secrets Manager, checks free disk
space, authenticates to ECR, pulls, starts PostgreSQL/backend/proxy, validates
health and applies bounded image retention. Secret content is never printed.

A `Caddyfile` change ships with the backend deployment, as `scripts/ci-impact.mjs`
classifies it. After the pull, `deploy.sh` validates `Caddyfile.next` with
`caddy validate` in the pinned proxy image, without network. A rejected file is
discarded, the deployment fails and the current `Caddyfile` keeps serving. Once
the backend is healthy, a changed file replaces `/opt/vinnot/Caddyfile` and the
`proxy` container is recreated, because its single-file bind mount keeps the
previous file; an unchanged file does not restart the proxy.

## Development web

`.github/workflows/deploy-frontend-dev.yml` receives successful CI, installs from the lockfile,
builds with the development API URL, synchronizes assets to S3 with cache
metadata, creates a CloudFront `/*` invalidation, waits for completion, and
verifies the public URL.

It does not repeat approved lint/tests. If backend changes in the same run, web
waits for its successful deployment. Both adapters reject revisions older than
the development tip before using AWS credentials. Component selection, baseline
and gate conditions are described in [CI/CD](ci-cd.md).

## Image Worker

The `images.vinnot.com` Worker (`infra/cloudflare/catalog-images`) is not
published by CI. It is deployed by hand with `wrangler.uploads.jsonc`, never with
`wrangler.jsonc`, which does not declare the upload buckets. Command, tests and
served keys: [Worker deployment](../operations/catalog-images-r2.md#worker-deployment).

## Mobile

EAS creates binaries from the `frontend-mobile/eas.json` profiles:

| Profile | Use | EAS Update channel |
|---|---|---|
| `development` | Development client, internal distribution | `development` |
| `ios-simulator` | Extends `development` for the iOS simulator | `development` (inherited) |
| `preview` | Internal distribution | `preview` |
| `production` | Stores | `production` |

`runtimeVersion` uses the `appVersion` policy: an update reaches only binaries with
the same app version. Store distribution is described in
[iOS and Android distribution](../../frontend-mobile/guides/distribution.md).

CI workflows and merges do not invoke EAS Build; the operator runs the selected profile build. Native modules, plugins, entitlements,
or native configuration require a new binary. JS-only changes can ship without
a binary only through a compatible EAS Update flow; building with Metro alone
does not publish that change.

## Verification

```bash
# Development
curl --fail https://api-dev.vinnot.com/api/actuator/health
# Production
curl --fail https://api.vinnot.com/api/actuator/health
curl --fail https://api.vinnot.com/api/version
```

In production, `/api/actuator/health` must report `UP` and the `/api/version`
`revision` must equal the published SHA. While API access is restricted, run these
checks from the operator's authorized connection.

After health: login, `GET /wines`, partial search, upload/image, and one critical
authenticated operation. Green health does not prove every provider connection.

## Development rollback

These rules apply to development only. Production rolls back exclusively through
the Production Release `rollback` operation; see [Production rollback](#production-rollback).

- Backend: deploy the previous immutable tag without rolling back migrations.
- Web: restore the previous artifact/build and invalidate CDN again.
- DB: forward fix; restore only from backup in a controlled window.

## Installing and running the production publisher

`infra/aws-low-cost/iam/production-release-stack.json` defines a separate role and
the `Vinnot-ProductionRelease` SSM document; it creates no runtime, databases or
networks. Before applying it, verify the OIDC provider, actual GitHub subject,
permissions and SSM Agent `ENV_VAR` support. Applying it requires authorization.
The document accepts only deploy/rollback, a production repository digest, full
revision, runtime hash and migration inventory; never arbitrary shell. The role
cannot read secrets/backups, delete objects or modify IAM.

The `GitHubSubject` parameter is
`repo:Bielaszczuk@114832447/vinnot@1128603898:ref:refs/heads/main`. Since the
repository was renamed from `Bielaszczuk/rewine`, GitHub sends this form with the
owner and repository IDs instead of the plain names. A mismatch shows up as "Not
authorized to perform sts:AssumeRoleWithWebIdentity"; the subject GitHub actually
sent appears in the failed `AssumeRoleWithWebIdentity` events in CloudTrail. If the
repository is renamed again, update the template and the stack before the next
release. Candidates built under the old name stay valid as baselines and rollback
targets.

As operator, install `deploy-production.sh` beside the five runtime files listed
in `prepare-production-manifest.mjs` under `/opt/vinnot-prod`; root ownership,
script mode 0755, private configuration/state. Preserve existing `runtime.env`
and secrets. The hash concatenates these files in manifest order; runtime changes
block publication until explicit installation/reconciliation
(see [Production release with migrations](#production-release-with-migrations)). Deployment neither
refreshes secrets nor restarts PostgreSQL/Caddy.

Before first publication, review running-binary compatibility and register the
baseline once:

```bash
/opt/vinnot-prod/deploy-production.sh adopt "$IMAGE_DIGEST" "$SOURCE_SHA" "$RUNTIME_HASH" "$SCHEMA_BASE64"
```

All four values come from verified artifacts/baseline evidence; do not use tags
or infer a SHA from an image name. `adopt` requires the actual container image,
health and Flyway inventory to match and replaces no services. For a historical
binary without visible revision, the operator certifies its SHA/digest association
from evidence. This command cannot overwrite an existing baseline. Reconcile schema,
secret or runtime changes in an explicit window, preserving the old journal.

Configure production values for `PROD_GOOGLE_OAUTH_CLIENT_ID` and
`PROD_GOOGLE_MAPS_BROWSER_KEY`. Dispatch `prepare` from `main` with its SHA and CI
run, then review the candidate. Dispatch `publish` with that approved SHA and the
candidate run. For rollback, choose `rollback`, current `main` SHA and the previous
candidate run. Do not invoke migrations through this flow.

To avoid unrelated builds/publications, also provide the last published candidate
run as `baseline_candidate_run_id`; provenance, checksums, ancestry and deployed
revisions are checked before reusing an unchanged component. The candidate remains
complete for rollback. Use `force_rebuild` after build variables or secrets change
outside Git. A mobile-only release does not need this workflow; first inspect the
local plan described in [CI/CD](ci-cd.md).

The host takes a lock and compares the complete candidate migration inventory, filenames
and checksums against actual migration history. It verifies configuration, running
image and new image label before replacing backend alone. It checks the active digest
and health with the expected revision. A failure automatically recovers the compatible
baseline and remains a failed deployment. `pending.json` identifies interruption or
failed recovery: inspect SSM/container state before retrying; never delete the journal
to force approval.

### Release journal

`/opt/vinnot-prod/release-state/` records what is active and what it was validated against:

| File | Content | When it is written |
|---|---|---|
| `current.json` | `{image, revision, schema, config, runtime, legacy}` of the active release | `adopt` (with `legacy: true`) and every successful deploy/rollback (with `legacy: false`); the operator updates `schema` or `config` only during explicit reconciliation |
| `previous.json` | Copy of the prior `current.json` | When a successful deploy/rollback changed the image |
| `pending.json` | `{image, revision}` of the attempt in progress | Before replacing backend; removed after success or successful recovery, kept when recovery fails |

- `image`: production repository digest; `revision`: full SHA.
- `schema`: SHA-256 of successful SQL `flyway_schema_history` rows, serialized as
  JSON ordered by `installed_rank` and normalized with `jq -ceS`.
- `config`: SHA-256 of `runtime.env`.
- `runtime`: SHA-256 of the concatenation of the six files in
  `prepare-production-manifest.mjs`, in this order: `deploy-production.sh`,
  `docker-compose.yml`, `compose.postgres.yml`, `compose.production.yml`,
  `compose.production-data.yml` and `Caddyfile`.
- `legacy`: `true` only for the adopted baseline, whose revision is not checked through `/api/version`.

`deploy` and `rollback` fail when `current.json` `schema`, `config` or `runtime`
differ from the values computed on the host, or when the running image is not the
registered one.

### Production rollback

`rollback` requires `previous.json` to match exactly in `image`, `revision`,
`schema`, `config` and `runtime` with the requested target and live state, and to
have `legacy == false`. Therefore this flow cannot return to the adopted baseline
or to a release registered before a schema or `runtime.env` change: that requires
explicit operator reconciliation. Migrations are never reverted; schema problems
are fixed forward.

### Production release with migrations

`deploy-production.sh` never runs Flyway nor installs files. It fails when actual
`flyway_schema_history` differs from the candidate migration inventory, when the
installed runtime files differ from the candidate runtime hash, and when
`current.json` `schema`, `config` or `runtime` differ from live hashes. The SSM
document accepts only `deploy` and `rollback`.

`prepare` therefore seals a host plan in the candidate (`host-preparation.json`):
the new or changed Flyway migrations and runtime files since the published baseline
(or, without a baseline, since the backend revision running in production). Its
summary shows `REQUIRES MIGRATION: ...` and `REQUIRES RUNTIME INSTALL: ...`. When the
plan requires host preparation, `publish` stages the image in the registry and stops
before any SSM command or web switch, with status `host-preparation-required`, until
the operator dispatches it again with `host_prepared=true`. Candidates without that
requirement, candidates sealed before the plan existed and `rollback` publish as
before.

The host preparation runs on the server with `migrate-production.sh`, installed
beside `deploy-production.sh`; the operator procedure is step 7 of the
[Step-by-step release](release-step-by-step.md#7-production-with-database-migrations-or-runtime-files):

1. **`prepare`** and plan review.
2. **First `publish`**, which stages the image and stops.
3. **Files.** Install the runtime files the plan names (and the script itself when it
   changed) from the approved revision.
4. **Migration window**, `migrate-production.sh migrate <image@digest> <grants-sha256>`:
   it refuses when a prerequisite is missing; then backup through
   `vinnot-prod-backup.service` (the backup marker must advance), registry login,
   one-time `LOGIN` for `vinnot_prod_migrator` with a password delivered only in
   `migration.env`, the `migrate` service with `PROD_BACKEND_IMAGE` set to the staged
   digest, relock (`ALTER ROLE vinnot_prod_migrator NOLOGIN PASSWORD NULL`, checked,
   and `migration.env` removed, even on failure), grants from
   `/opt/vinnot-prod/production-runtime-grants.sql` only, and replacement of `schema`
   alone in `current.json`, with the same query and normalization as
   `deploy-production.sh` and a copy of the previous journal.
   `production-roles.sql` declares the role `NOLOGIN PASSWORD NULL`, so running it
   again never re-enables the login.
5. **Runtime registration**, `migrate-production.sh record-runtime <hash>`: it checks
   that the installed files produce the candidate hash and that schema and
   configuration still match, then replaces `runtime` alone in `current.json`.
6. **Second `publish`** with the same candidate run and `host_prepared=true`.
7. **Public verification:** `https://api.vinnot.com/api/actuator/health` reports
   `UP` and the `https://api.vinnot.com/api/version` `revision` equals the published SHA.

Migrations must be additive and compatible with the running release. Backfills must
scale linearly with production data (about 195,000 wineries): a migration keeps its
table locks until it commits, so a slow statement blocks the running release. Test
them on a large catalog under a statement timeout, as V41's backfill test does.

Until the next publish, `previous.json` still holds the older release and its older
schema hash, so rolling back to it stays blocked. On publish, `deploy-production.sh`
copies the reconciled `current.json` to `previous.json`, so rollback to the
pre-release version remains available on the new schema; this is why migrations must
be additive.

Web publication archives the package, preserves previous chunks, uploads the entrypoint
last, verifies its S3 bytes and invalidates CloudFront. This is not an API/CDN distributed
transaction: if web fails, the new API must remain compatible with previous web;
rerunning the same candidate completes publication. Release does not change WAF/security groups or open the environment automatically.
Production is open to the public: also check the public path and the monitor in
`public` mode. Runners verify
API inside the host; browser, cookie, CORS and terms checks require a real browser
without opening access to runner ranges.
