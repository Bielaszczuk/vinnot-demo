# Argentina catalogue images on R2

`scripts/wine-images` is operational tooling, separate from Vinnot processes and
domain/UI dependencies. `infra/cloudflare/catalog-images` serves HTTPS images
from private R2. Applications keep reading `wines.image_url` through the current API.

## Scope and identity

Select active Argentina wines (`countries.code='ar'`) without `created_by`, using
an explicit manifest. Obtain consistent `REPEATABLE READ READ ONLY` snapshots
with ID, name, vintage, winery ID, type, country, both image columns, revision,
updated timestamp, activity and author. UUID equality alone is insufficient: the
manifest requires the same name, vintage, winery, type and country in both databases.
Never copy users, reviews or other development data.

Database names are `vinnot` (dev) and `vinnot_prod` (prod). Use private SSM tunnels
and local credentials, with read-only transactions for snapshots. Do not expose
PostgreSQL to the Internet. Credentials must have mode 0600. Keep snapshots,
SQLite state, CSV and journals outside Git in a mode-0700 directory.

This stage updates only `image_url`. It preserves `bottle_image_url`, winery
backgrounds, filters, counts, reviews and user data. Existing non-null production
images and user-created wines are protected. Private records retain provenance;
changing a domain or metadata does not establish reuse rights.

## Conversion and delivery

The release downloads only from `images.vivino.com`, validates HTTPS and public
addresses at each redirect, and bounds bytes and time. Conversion applies EXIF
orientation, normalizes colour to sRGB and preserves alpha. Final WebP files
contain no EXIF, XMP, IPTC, ICC, comments or copyright/license fields. Inputs are
limited to 4 million pixels, outputs to a 1024 px maximum side without upscaling,
quality 85 and 128 KiB. Failed images are excluded from the applicable CSV.

The empty logo at `thumbs/default_label_{width}x{height}.jpg` means a missing
image: it is never downloaded or uploaded. The CSV leaves `new_url` and
`object_key` empty to apply SQL NULL under the same manifest guards. Its known WebP
digest (`e43d955c611263ee997e199d43c23a052c20d0ad7bd0f3aec12ece6d9501bacd`)
is also excluded when exporting older progress files. Old CSVs still pointing
to it are rejected: regenerate and verify the export before application.
Do not migrate this logo as a catalogue photograph when adding other countries.
Remove existing objects only after reconciling references in both databases and
saving a private backup; never reapply the retired URLs.

Keys are immutable `wines/ar/{UUID}/{SHA256}.webp`; uploads cannot overwrite them.
Public delivery uses `https://images.vinnot.com`; direct public R2 is disabled.
The Worker accepts only GET/HEAD/OPTIONS, without public upload/delete/list routes,
object metadata or credentials. Every CSV URL is checked through both S3 GET and
public HTTPS: identical body, SHA, WebP MIME/dimensions and no embedded metadata.
The body hash in the URL prevents stale caching when an image changes.
The same bucket holds the documentation diagrams (`docs/diagrams/v1/...svg`) and
videos (`docs/videos/v1/...mp4`); videos accept one byte range so they can be
seeked, at the cost of one metadata read plus one ranged read.

## Worker deployment

`infra/cloudflare/catalog-images` holds the Worker (`worker.mjs`), its tests
(`worker.test.mjs`) and two configurations of the same `vinnot-catalog-images`
Worker on the `images.vinnot.com` route. `wrangler.jsonc` only declares
`CATALOG_IMAGES`; `wrangler.uploads.jsonc` also declares `DEV_UPLOADS`
(`vinnot-user-uploads-dev`) and `PROD_UPLOADS` (`vinnot-user-uploads-prod`).
Because both publish the same name, deploying `wrangler.jsonc` would replace the
active version without the upload bindings and avatars and labels would return
404. The deployed configuration is **`wrangler.uploads.jsonc`**.

| Key | Binding | Response |
|---|---|---|
| `wines/ar/{UUID}/{SHA256}.webp` | `CATALOG_IMAGES` | `image/webp`, immutable for one year |
| `uploads/{development\|production}/avatars/avatar_{UUID}_{UUID}.r2.webp` | `DEV_UPLOADS` / `PROD_UPLOADS` | `image/webp`, `public, max-age=60, must-revalidate` |
| `uploads/{development\|production}/wine-labels/wine_label_{UUID}.r2.webp` | `DEV_UPLOADS` / `PROD_UPLOADS` | same as the avatar |
| `uploads/{development\|production}/social/<key>.(jpg\|png)` | `DEV_UPLOADS` / `PROD_UPLOADS` | `image/jpeg` or `image/png`, immutable for a year; `<key>` lowercase, up to 160 characters, with a content hash (social slides and illustrations, #492) |
| `docs/diagrams/v1/{es\|en}/{slug}-{hash12}.svg` | `CATALOG_IMAGES` | `image/svg+xml` with a `sandbox` CSP, immutable |
| `docs/videos/v1/{es\|en}/{slug}-{hash12}.mp4` | `CATALOG_IMAGES` | `video/mp4`, `Accept-Ranges: bytes`, immutable |

Any other key, a query string or a missing binding returns 404; a method other
than GET/HEAD/OPTIONS returns 405. A video GET with `Range` first reads the size
and returns 206 with `Content-Range` and only the requested bytes; an
unsatisfiable range returns 416 with `Content-Range: bytes */<size>`. Full
responses are stored in the Worker cache; partial ones are not.

Deployment is manual: CI does not publish the Worker. Wrangler is pinned in
`tools/docs-diagrams` and needs `wrangler login` or a `CLOUDFLARE_API_TOKEN` with
Workers permission on the account. From the repository root:

```bash
node --test infra/cloudflare/catalog-images/worker.test.mjs
npm --prefix tools/docs-diagrams ci
tools/docs-diagrams/node_modules/.bin/wrangler deploy --config infra/cloudflare/catalog-images/wrangler.uploads.jsonc
```

The tests have no dependencies and stub R2 and the cache. After deploying,
check with `curl -I` that a catalogue image, a public avatar, a diagram and a
social slide return 200, that an invented key returns 404 and that
`curl -I -H "Range: bytes=0-1"` on a video returns 206.

Social slides (#492) need the Worker version that accepts
`uploads/{environment}/social/…`. Until it is redeployed by hand with
`wrangler.uploads.jsonc` (never `wrangler.jsonc`), those URLs answer 404 even
though the backend stored them in R2.

## Cost controls

Keep **Workers Free** and R2 Standard. A shared SQLite ledger reserves BEFORE
remote calls at most 100,000 writes, 400,000 S3 reads and 8 GB uploaded bytes,
conservatively including retries. Never reset it between pilot/full/verification
runs. Limits per run are 24 workers, two attempts, 40 S3 calls/s and 12 source
downloads/s (with bounded redirects). Verification uses up to 24 public downloads/s.
The ledger is global across processes; pacing limits apply per run.
Source sessions are per worker, with no ambient proxy
credentials or `.netrc` authentication.

R2 Standard includes 10 GB/month, 1 million Class A and 10 million Class B
operations. Workers Free delivery has an account-wide limit of 100,000 requests/day;
each request performs at most one R2 read, with cache hits avoiding it. Free quota
exhaustion stops delivery. **The USD 5 alert is not a billing hard stop**: R2 bills
overages, so account-wide usage must remain within the budget. Reassess before
paid plans, direct public R2, additional buckets or external upload jobs. This
setup adds no AWS services and uses no GitHub Actions or EAS builds.

Sources: [R2 pricing](https://developers.cloudflare.com/r2/pricing/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).

## Reproducible execution

Use Python 3.14 and a venv. In `scripts/wine-images`:

```sh
python -m pip install -r requirements.lock
python -m pip install --no-deps -e .
python -m pytest tests -q
```

For upload/verification, private `release-env.json` keys are `R2_ENDPOINT_URL`, `R2_BUCKET`,
`R2_PUBLIC_BASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`DATABASE_URL_DEV`, `DATABASE_URL_PROD`. Never print values or pass them in argv.
Use temporary object access scoped to this bucket, not a global token.
Applying or rolling back a previously verified CSV requires only the target's
`DATABASE_URL_DEV` or `DATABASE_URL_PROD`; no R2 access is used.

From a private working directory containing existing consistent snapshots:

```sh
wine-image-release prepare --dev-snapshot dev-snapshot.json --prod-snapshot prod-snapshot.json --manifest argentina.manifest.json
wine-image-release upload --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --state pilot.sqlite --budget budget.sqlite --ids pilot-ids.json
wine-image-release verify --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --state pilot.sqlite --budget budget.sqlite --ids pilot-ids.json
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --environment dev --journal pilot.journal.json
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --environment dev --journal pilot.journal.json --write
```

`pilot-ids.json` is an explicit UUID array within the manifest. Accept web/native
rendering and fallback, and test rollback before the full batch. For the complete
manifest omit `--ids`, use separate state/CSV/journal files, and keep the same
manifest and global budget. Resume the same command: completed images are skipped
and exhausted attempts are not reset. A different manifest/policy/Pillow version
requires new state, preserving the shared budget. Keep a durable private backup of
the manifest, CSV, verification and journals. Back up a running SQLite database
through its `backup` API, rather than copying only the main file while WAL writes
are pending. Exclude credentials from those backups. An interrupted PUT may finish
before state records it; resume reconverts and checks the immutable object rather
than overwriting it. Reconcile successes, failures and mapping before application.

## Application and recovery

Without `--write`, `apply` is a read-only dry run. Verification is bound to manifest
and complete CSV digests; edited files are rejected. `current_database()` pins the
actual target. Batches of 250 use revision and previous-URL guards,
update only `image_url`, and increment `revision`/`updated_at`. A private fsynced
journal precedes each commit. Concurrent edits are preserved. Refresh clients to
reload the current API; no backend wine cache needs invalidation for this change.

```sh
wine-image-release rollback --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --environment dev --journal pilot.journal.json --write
```

Rollback requires the exact post-apply URL and revision, restores the old URL and
increments revision/time again. It does not revert subsequent edits or delete
remote objects/backups. If the full batch skips already matching pilot rows, its
journal excludes them: preserve both journals and roll back the full batch first,
then the pilot, to recover the complete scope.
After rollback, create fresh snapshots and manifest before
reapplying, because revisions changed.

`--environment prod` supports a dry run that protects existing non-null images.
Production writes and rollback require both `--write` and
`--production-manifest` matching the approved manifest's exact SHA-256. Missing
or mismatched approval is rejected before credentials or DB access.
The hash does not replace operational authorization: reconfirm current snapshots,
identity, reconciliation and acceptance of the exact batch before writing.
The first Argentina batch also requires Apple's approval and actual publication.
Reuse the verified CSV and the same objects/URLs as dev; do not upload again or
create per-environment catalogue copies.

```sh
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv argentina.csv --environment prod --journal argentina-prod.journal.json
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv argentina.csv --environment prod --journal pilot-prod.journal.json --ids pilot-ids.json --write --production-manifest MANIFEST_SHA256
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv argentina.csv --environment prod --journal argentina-prod.journal.json --write --production-manifest MANIFEST_SHA256
```

Accept the production pilot before the full batch. Afterwards reconcile all URLs,
revisions and preserved fields against the previous snapshot. For rollback use
the same production guards and an `--ids` array containing only rows saved in the
corresponding journal: protected or unapplied rows have no previous value in that
journal and are reported as conflicts. Keep both journals and roll back the full
batch first, then the pilot.

`test_release_postgres.py` requires `CATALOGUE_TEST_DATABASE_URL` pointing at an
isolated database named `vinnot_prod` with `cluster_name` set to
`vinnot-catalog-promotion-test`; tests create and drop a dedicated schema. They
cover apply/dry-run, idempotence, protected photos, rollback and concurrent edits.
Never run them against development or production.

[Leer en español](../../../es/infra/operations/catalog-images-r2.md)
