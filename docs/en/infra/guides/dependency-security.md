# Dependency and artifact security

## Scope and ownership

The reusable `security-checks.yml` workflow inspects npm dependencies, the Maven
graph, Android native dependencies, Git history and the backend candidate image. CI runs it once per
pull request or push, scoped to the dependency graphs whose inputs changed (lockfiles, manifests,
`.npmrc`, security backport manifests, `pom.xml`, `Dockerfile` and mobile native configuration);
a source-only change scans nothing, because an advisory depends on the resolved graph, not on the
code. Every pull request into `main` scans every graph, so each promotion to production is checked
against the advisories published since the last change. Development deployments depend on that CI's
complete gate without calling security again. When publishing backend, image
building/scanning and SBOM generation happen only in its adapter, on the exact
image before ECR. PR/main/validation without deployment retain candidate scanning.
It also supports full manual execution and a weekly review on Mondays at 10:23 UTC on the default
branch. Scanner, registry and dependency-resolution failures block the check:
they do not mean that no vulnerabilities exist.

The check receives no deployment secrets. It uses `contents: read`, checkout
without persisted credentials, and scanner versions and SHA-256 checksums pinned
in `scripts/install-security-tools.mjs`. Security, CI and deployment actions are pinned by
commit. Tool updates require reviewing the release, provenance and checksum and
running the policy tests.

## Checks by surface

| Surface | Inspected source | Rule |
|---|---|---|
| Web, mobile and documentation site JavaScript | `package-lock.json`, including development dependencies | `npm audit --audit-level=high`; build and test dependencies are included |
| Declared backend dependencies | `pom.xml` and resolved transitive graph | Trivy, HIGH/CRITICAL severity |
| Packaged backend | Docker image, operating system and embedded JAR | Trivy, HIGH/CRITICAL severity, with a CycloneDX SBOM |
| Native Android | Gradle-resolved `releaseRuntimeClasspath` after Expo prebuild | Trivy scans `gradle.lockfile`, HIGH/CRITICAL severity; unresolved dependencies fail the check |
| Secrets | Complete Git history | Gitleaks with redacted values |
| Mobile compatibility | Expo Doctor, Metro decoder/PostCSS tests, exports and iOS preflight | API and build verification, not a substitute for native analysis |

Backend deployment scans **the exact image it will publish**, loaded locally
with `buildx --load`. Only then does it configure AWS credentials and push the
`dev-SHA` and `dev-latest` tags; it does not rebuild between scanning and pushing.
Web deployment waits for the security check before building and publishing.
This does not configure GitHub branch protection automatically: administrators
must make the check required on protected release branches.

Before the Maven scan, `dependency:resolve` resolves the graph through Maven
and populates its cached local repository. Trivy uses this inventory with
`--offline-scan` to avoid a second burst of POM requests triggering HTTP 429 on
Maven Central. Resolution remains mandatory and fails on errors; offline mode
does not skip vulnerability database updates.

## Compatible maintenance

Dockerfile build/runtime bases are pinned by multi-architecture digest. Updating
those digests requires rebuilding and scanning the image; `--pull` does not
advance a pinned base. The weekly check detects new advisories but does not
automatically change dependencies or approve exceptions.

- Spring Boot is on the 4.1 line (Spring Framework 7.0, Tomcat 11, Jackson 3).
  The BOM manages Spring families, Tomcat, Jackson, Netty and PostgreSQL. Boot
  4.1.2 ships Tomcat 11.0.27, Jackson 3.1.7 and Jackson 2.21.7, so the POM no
  longer overrides them. If a future BOM lags behind a HIGH/CRITICAL patch, add a
  scoped property override within the managed line and remove it once the BOM
  catches up.
- The application uses Jackson 3 (`tools.jackson`) with
  `spring.jackson.use-jackson2-defaults=true`; `JacksonJsonContractTest` pins
  the HTTP JSON wire format. Jackson 2 remains only as a transitive runtime of
  `jjwt-jackson` and springdoc/swagger-core; the BOM's Jackson 2 line (2.21.7)
  keeps that family aligned and fixes CVE-2026-91776 and CVE-2026-91777. Do not pin
  only `jackson-databind`. Verify JSON contracts and scan the image again when
  updating either family.
- Web uses Vitest 5 and its coverage package at the same exact version. Node 22
  is the CI runtime; do not use odd-numbered Node releases to validate a release.
  Coverage thresholds remain in the existing configuration.
- Mobile is on Expo SDK 58 and React Native 0.88 (Metro 0.87, which already
  ships the patched image decoder, so the former Metro override is gone).
  Overrides are scoped to PostCSS under `@expo/metro-config` and to `zod` under
  `@expo/cli`, aligned with the app's own patched `zod`. Tests exercise actual
  Expo/Metro calls with buffers and files, dimensions and empty inputs. Do not apply `npm audit fix --force` or global
  overrides without reviewing CommonJS/ESM, SDK, plugins and native code.
- Android applies `plugins/withAndroidSecurityDependencies.cjs` during prebuild.
  It adds app-scoped minimum constraints for Guava 33.7.2-android, Gson 2.8.9, Commons IO 2.14.0 and
  Bouncy Castle `bcutil-jdk15to18`/`bcprov-jdk15to18` 1.86. It does not add absent
  libraries or force versions below another SDK's requirements. Review and remove
  these constraints once upstream SDKs include the patches; keep cryptographic
  modules aligned. Tests verify idempotence, preservation of existing content
  and rejection of malformed generated blocks.
  Guava's Android variant includes the temporary-file and directory permission
  fixes and bounds memory allocation (CVE-2026-102554). Native dependency changes require rebuilding the APK/AAB; an OTA cannot
  replace those classes in an installed binary. Resolve and scan the release
  graph and identify the resulting artifact before accepting the update.

## Local execution

From the repository root, using compatible Node 22 or 24:

```sh
node --test scripts/test/*security*.test.mjs
node scripts/install-security-tools.mjs /tmp/vinnot-security-bin
export PATH="/tmp/vinnot-security-bin:$PATH"
mkdir -p security-reports
(cd frontend-react && npm audit --package-lock-only --include=dev --audit-level=high)
(cd frontend-mobile && npm ci && node scripts/apply-security-backports.mjs --verify)
node scripts/audit-npm-dependencies.mjs frontend-mobile security-reports
(cd docs-site && npm ci && node ../frontend-mobile/scripts/apply-security-backports.mjs --project docs-site --verify)
node scripts/audit-npm-dependencies.mjs docs-site security-reports
gitleaks git --redact --no-banner --log-opts="--all" .
mvn -B -ntp -f backend/pom.xml dependency:resolve
trivy fs --scanners vuln --offline-scan --skip-dirs backend/target --severity HIGH,CRITICAL --exit-code 1 backend
docker build --pull --tag vinnot-security:local backend
trivy image --scanners vuln --severity HIGH,CRITICAL --exit-code 1 vinnot-security:local
trivy image --format cyclonedx --output security-reports/backend.cdx.json vinnot-security:local
```

Use `npm ci` and run suites, lint, typecheck/build and architecture validation
after changing a lockfile. A commit scan does not automatically include
untracked local files; review the diff before publication as well.
`security-reports/` is ignored and is not part of the documentation.

## Findings and exceptions

The gate blocks by default and does not use `--ignore-unfixed`, `--vex` or
suppressions. It recognizes only the hash-verified local mobile repairs described
below. An unpatched high/critical advisory blocks until it is resolved, or until
an explicit exception is approved through review. Such an exception must identify
the advisory, package, version, path/artifact, preconditions, non-applicability or
mitigation evidence, owner, issue and expiration; never exclude a whole dependency
family. Do not add an exception simply to get a green pipeline.

The former `spring-webmvc@6.2.19` non-applicability scopes for CVE-2026-47884
(XSLT) and CVE-2026-47890 (SSE), and their generator, were removed when the
backend moved to Spring Boot 4.1 with the patched Spring Framework 7.0.9
(issue #283). Backend scans now run without any applicability exception.

Moderate findings remain in the npm report and are evaluated by exposure; the
blocking threshold does not declare them harmless. `.gitleaksignore` contains
only exact historical fingerprints of reviewed incomplete examples, test
fixtures and documentation prose that triggered false positives. It does not exclude entire files or rules. Do not use it for a real
credential: contain, coordinate rotation and review the exposure before proceeding.

Workflow reports are retained for 14 days, associated with the run and attempt.
Gitleaks redacts both console and JSON values. SBOMs and reports describe an
artifact and a dated advisory database, not a permanent guarantee.

The npm locks use `source-map-js@1.2.2` and, on mobile, `compression@1.8.2` to fix
GHSA-68fv-2mgg-jv7q and GHSA-vc2v-76pw-4v95 respectively with compatible patches.
Mobile backport exceptions are not broadened.

### Verified local security backports — #177 / PR #178

The development exception for #175/PR176 was retired in #177. The owner asked to
repair these dependencies without breaking functionality before production promotion.
The published upstream versions remain node-forge 1.4.0 and braces 3.0.3; their
names/versions are not relabeled to hide scanner findings. Local backports apply
proposed fixes from the original projects, which are not official releases yet:

- [Forge PR1152](https://github.com/digitalbazaar/forge/pull/1152), commit
  `ceba34402e329f0365134f23fe19898756527d65`: validates nested DigestAlgorithm element
  counts, repairing GHSA-86w9-cpqp-85rv in the installed source.
- [Braces PR72](https://github.com/micromatch/braces/pull/72), commit
  `d0d575e55e74a4e0218e5248fafb79efc3e54ebb`: caps parser and walker depth at 100,
  including direct AST inputs, repairing GHSA-vfj7-8cjw-p6xm.

`frontend-mobile/scripts/security-backports/manifest.json` pins versions, original
and repaired hashes, replacements, and the known propagation packages and paths
(six under Expo SDK 58; braces only since #489, see below).
Original licenses are included. `apply-security-backports.mjs` runs in npm ci's
postinstall, validates all inputs before writing and is idempotent. Changed versions,
source, manifest or incomplete patches fail; updates require reviewing and retiring
or adjusting the backport. No runtime dependency or service is introduced.

The gate retains the untouched npm report and recognizes only these roots after
verifying installed source hashes. Its separate decision records local remediation,
`exception: false`; it does not claim npm stopped reporting published versions.
Any other high/critical, new path/version, scanner error or malformed data blocks.
Expo/Metro propagation cycles are visited once per node and must reach a repaired
root; they never justify ignoring another advisory.

CI installs/verifies the backports in the security job and runs regressions for
attacks, valid signatures, Expo certificates/CSRs, ordinary globs, idempotence and
altered-code rejection. Expo SDK 58/RN 0.88, Metro 0.87 and existing gates remain intact.
Neither root appears in the inspected production iOS export sourcemap. This does
not replace native validation or physical-device QA. Retire backports and special
audit handling together after compatible official releases, tests, export and
native preflight. Follow-up: #177.

### node-forge backport retired — 1.4.2 (#489)

node-forge 1.4.2 publishes the upstream fix: `rsa.js` re-encodes the DigestInfo as
canonical DER and compares bytes, which is stricter than the PR1152 backport. It
also fixes the eleven advisories published on October 27, 2026 for `<=1.4.0`
(among them GHSA-5x38-2vff-x55p, GHSA-5cwg-6vw7-rj6p and GHSA-jc66-7q78-782g). The
mobile lock now resolves `node-forge@1.4.2`; both dependents accept `^1.4.0`.

The node-forge entry, its license copy and its four propagation packages left the
mobile manifest, which now holds braces only, and the gate no longer recognizes
the node-forge root. The upstream low-exponent forgery vector stays as a regression
test against the installed package. The same batch moves `follow-redirects` to
1.16.2 in the three locks (GHSA-mrwp-f3q8-3g9p) and `joi` to 17.13.9 in docs-site
(GHSA-4528-x5fx-h6hg). After these patch upgrades, npm reports no high or critical
finding in web, mobile or docs-site.

### Documentation site — #339

`docs-site/` (Docusaurus) goes through the same npm gate as web and mobile. Its
`overrides` pin `serialize-javascript@7.1.2` and `tinypool@2.2.0`, fixed versions
of transitive dependencies with critical advisories in the versions Docusaurus
3.10.2 declares. The only remaining high root is braces 3.0.3, which receives the
same [Braces PR72](https://github.com/micromatch/braces/pull/72) backport as
mobile, byte for byte.

`docs-site/scripts/security-backports/manifest.json` holds braces only and the 31
paths of the 30 propagation packages in the docs-site lock. Its hash is pinned separately, in
`backportManifestHashes` of `frontend-mobile/scripts/apply-security-backports.mjs`.
The docs-site postinstall runs that script with `--project docs-site`. The gate
accepts a high finding in docs-site only with that manifest's proof: the mobile
proof, the node-forge root or any other root block, and a project without a
reviewed manifest never passes a high finding. Upgrading Docusaurus includes
reviewing the `overrides`, and the backport is retired once braces publishes a
fixed release.

### History: temporary development exception — #175 / PR #176 (retired)

The following describes the former policy; its scope, expiration and production block no longer apply after the verified repairs above.

On October 1, 2026, the owner requested resolving the blocker and merging after
reviewing the proposed development scope. Residual tooling risk is accepted;
this is neither a false-positive declaration nor a patched dependency.

- Advisory: [GHSA-86w9-cpqp-85rv / CVE-2026-85393](https://github.com/advisories/GHSA-86w9-cpqp-85rv), high, `node-forge@1.4.0`, no official patched release at review time.
- Artifact: `frontend-mobile`, Git tree `0bee6731d9de50c23f4c0f3912144245c5345555`; lock SHA-256 `89b0758e53f392d29483052eae91257d505cff73a0fb075ea22e7e075146beb7`.
- Exact propagation: `@expo/code-signing-certificates@0.0.6`, `@expo/cli@54.0.27`, `expo@54.0.37`, `expo-updates@29.0.20`; one known node per package. These dependency families are not excluded from other advisories.
- Environment: repository CI workflow only, PR #176 from `bugfix/175-fix-mobile-catalog-pagination-and-refresh-coordination` into development or CI push/dispatch publishing development. Other PRs, forks, standalone sweeps, main and production block.
- Owner: Vinnot account owner; current follow-up and removal before promotion tracked in issue #175. Expires `2026-10-08T23:59:59Z`, inclusive. Any mobile tree, lock, version, advisory, severity or expiration mismatch invalidates the exception.

The initial review was integrated in PR #166. On October 1, 2026, following
the owner's request to commit/push/merge the follow-up, PR #168's new tree was
reviewed: only mobile profile refresh, terms presentation, animation and tests
change; the lock, signing tools and certificate configuration do not change.
The product has no node-forge imports. The authorized tree/PR is replaced by
these new exact values, without broadening versions, advisories, environments
or expiry. The previous tree and PR no longer qualify under this policy;
a subsequent change requires another review.

On October 1, 2026, the owner authorized committing/pushing/merging the local
Metro fix and took over CI follow-up. PR #169's exact mobile tree was reviewed:
only the watcher event adapter, its configuration and tests change; dependencies,
lock and certificates do not change. The current values above replace PR #168's
values without widening the advisory, versions, environments or expiry. This
review retains Metro 0.83.8 and its image decoder security patch.

On October 2, 2026, the owner authorized commit/push and PR merge into development for issue #170, including review of this continuing temporary exception. PR #171's exact mobile tree was reviewed: changes cover admin presentation, keyboard handling, review publication messages, query state and cache invalidation, plus tests. Dependencies, lock, Metro adapter, signing tools and certificate configuration are unchanged; no node-forge imports are added. The current artifact/PR replaces PR #169 without changing advisory, versions, environments or expiration. Main and production remain blocked.

The owner authorized commit/push and development merge of the email/i18n batch (#173). Review of PR #174's exact mobile tree confirms presentation, labels, formatting and test changes; the lock, dependencies, watcher/Metro, certificates and Expo configuration are unchanged. No node-forge imports are added. The current values replace PR #171's artifact/scope without widening the advisory, versions, environments or expiration. The dependency remains vulnerable and main/production remain blocked.

The vulnerability permits forged RSA PKCS#1 v1.5 verification using low-exponent
keys (e=3). The package exists in Expo tooling for certificate/CSR generation and
validation and signing. No imports of that package were found in `src/` and no
`updates.codeSigningCertificate`/`codeSigningMetadata` configuration was found in
`app.config.ts`; CI exports JavaScript without OTA certificate signing. This
limits observed exposure but does not establish immunity across the toolchain.
Do not accept untrusted external certificates, CSRs or signatures or use
low-exponent keys; use only trusted owner-controlled material. This exception
does not authorize production binary/OTA publication.

`scripts/audit-npm-dependencies.mjs` preserves npm's full JSON and a separate
decision JSON with an explicit warning. It traverses transitive causes: any other
high/critical root, new entry, malformed data, scanner error or unapproved context
fails. Tests cover these rejections and expiration; the original failure in run
#198 is retained. When an official compatible patch becomes available, remove
the exception, update the lock and validate Expo, configuration, bundle and
functional flows before production promotion.

## Mobile binaries and release acceptance

`npm audit` alone does not analyze CocoaPods, Gradle, native libraries or a signed
IPA/APK/AAB. For a native candidate, preserve `Podfile.lock`, the
`releaseRuntimeClasspath` graph, plugin versions, SHA, EAS profile and runtime
fingerprint. Associate that inventory with the distributed binary and review
native vendor advisories. The iOS preflight builds unsigned in an isolated
directory; it consumes no EAS quota and does not certify store publication.

The Android job uses Ubuntu 24.04, Node 22, JDK 21 and the runner's SDK. It generates the native
project without distribution credentials and runs `vinnotLockReleaseDependencies`
from `frontend-mobile/scripts/lock-android-dependencies.gradle`, with
`--write-locks`. The task resolves the complete graph and rejects unresolved
results instead of treating a partial inventory as safe. The lock and report
are retained as artifacts. Neither the generated native project nor the lock
is committed to the repository. This job does not build or sign an APK/AAB:
binary acceptance still requires a native build and functional tests.

`ios-native-validation.yml` validates iOS on a clean macOS 26 runner with Xcode
26.6 (Expo SDK 58 needs 26.4 or later). It can be dispatched manually once the workflow exists on the default
branch, or started on a PR by adding the `validate:ios-native` label: only that
event starts a run, so other pull request events and other labels never produce a
skipped macOS run. To validate a later commit, remove and add the label again or
dispatch the workflow; a new run cancels an earlier one for that PR.
It consumes GitHub macOS minutes, not EAS quota. No distribution credentials are
provided. It retains `Podfile.lock`, the CocoaPods report, the build log and the
SHA-256 of the iphoneos Release executable built with `CODE_SIGNING_ALLOWED=NO`.
It neither publishes the app nor replaces device testing.

Native dependency/config-plugin changes require a new build. Metro/PostCSS
patches affect the bundler; they do not by themselves establish that an installed
binary is updated. Check runtime compatibility before choosing EAS Update or a
rebuild. Run the security checks before manual publication too: the workflow
does not intercept EAS commands executed outside GitHub.

The owner authorized commit/push and development merge of the mobile pagination batch (#175). Review of PR #176’s exact tree confirms page coordination, refresh/retry, session and test changes; filters, backend, dependencies, lock, watcher/Metro, certificates and Expo configuration are unchanged. Audit retains the same unpatched advisory and exact propagation. Current values replace PR #174 without widening advisory, versions, environments or expiration. Main/production remain blocked; tests reject the previous PR and tree.
