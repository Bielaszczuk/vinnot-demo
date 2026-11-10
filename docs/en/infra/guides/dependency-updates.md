# Dependency updates

## Purpose and boundary

This guide keeps dependencies current. Vulnerabilities are a separate concern,
covered by [Dependency and artifact security](dependency-security.md): a package
can be free of advisories and still block work because it is too old, as when
Expo SDK 54 could not find the Simulator app that Xcode 27 replaced with DeviceHub.

Two mechanisms cover freshness:

| Mechanism | Source | What it does |
|---|---|---|
| Dependabot | [`.github/dependabot.yml`](../../../../.github/dependabot.yml) | Opens grouped update pull requests to `development` |
| Freshness report | [`scripts/dependency-report.mjs`](../../../../scripts/dependency-report.mjs) | Lists outdated packages, Expo SDK alignment and platform end of life, locally |

Neither mechanism merges anything. Every update goes through the normal pull
request, CI and release flow.

## Update tiers

| Tier | Examples | Cadence | Path |
|---|---|---|---|
| Security | HIGH/CRITICAL findings from Trivy or `npm audit` | Immediately | [Dependency and artifact security](dependency-security.md) |
| Routine | Patch and minor updates of libraries | Monthly | One grouped Dependabot pull request per project |
| Platform | Major updates, the Expo SDK family, React Native, Spring Boot, Java, Node.js, PostgreSQL | Quarterly review | A planned work item, with a native build when mobile changes |

Platform rule: stay at most one major release behind the newest one, and move
off a release cycle before its end of life.

## Dependabot configuration

| Ecosystem | Directories | Schedule |
|---|---|---|
| `github-actions` | `/` | Monthly, one grouped pull request; each bump needs one reviewed commit to `infra/security/actions-policy.json` |
| `npm` | `/frontend-mobile`, `/frontend-react`, `/docs-site`, `/tools/docs-diagrams` | Monthly |
| `maven` | `/backend` | Monthly |
| `docker` | `/backend` (`Dockerfile`) | Monthly; the `maven` build image proposes no tag change |
| `docker-compose` | `/infra`, `/infra/aws-low-cost` | Monthly |

Every monthly entry:

- groups all patch and minor updates of the project into one pull request, so
  each project gets at most one version-update pull request per month
  (security updates are separate);
- ignores major updates (`version-update:semver-major`), which belong to the
  platform tier;
- applies a 7-day cooldown, so releases younger than a week are skipped;
- uses the `chore(deps)` commit prefix and targets `development`.

`frontend-mobile` also ignores the packages the Expo SDK pins: `expo`, `expo-*`,
`@expo/*`, `react`, `react-dom`, `react-native`, `react-native-*`,
`@react-native/*`, `@react-native-async-storage/*`, `@react-native-community/*`,
`@react-navigation/*`, `@shopify/flash-list`, `jest-expo`, `babel-preset-expo`,
`typescript` and `@types/react`. They move together with
`npx expo install --fix` inside an SDK upgrade, never one by one.

Python has no Dependabot entry: `scripts/wine-images` pins its versions in
`requirements.lock`, and Dependabot's pip support reads only `.txt` files and
PEP 621 `pyproject.toml`, whose ranges already allow every patch and minor. The
freshness report compares that lock with PyPI instead.

Dockerfile bases stay pinned by digest; Dependabot updates the tag and the
digest together, and CI rebuilds and scans the image.

The `maven` build image tag carries the JDK (`3.9-eclipse-temurin-25`), and
Dependabot reads a JDK jump such as `-25` to `-26` as a patch update. The
`docker` entry therefore ignores every version update of `maven`
(major, minor and patch). The JDK is a platform upgrade: it moves together with
`java.version` in `pom.xml`, the CI Java setup and the `eclipse-temurin` runtime
image, whose major updates the `*` rule already ignores.

## Pinned Actions updates

Workflows pin each Action to a full commit SHA, and
`infra/security/actions-policy.json` records the reviewed SHA, runtime and inputs
of every Action. `scripts/verify-workflow-policy.mjs` rejects any SHA the policy
does not list, so the monthly Dependabot Actions pull request fails its first run
in `Repository checks`. That job fails in about one minute and no component job
starts. The error names the Action, the new SHA and the step to follow.

The policy is the review step and is not approved automatically: a commit SHA can
also resolve to a commit in a fork of the Action's repository, and a new release
can change its runtime or inputs. For each grouped Actions pull request:

1. Read the release notes and the `action.yml` diff of each bumped Action.
2. Record the new `sha` (and any runtime or input change) in
   `infra/security/actions-policy.json`, in one commit on the Dependabot branch.
3. Run `node scripts/verify-workflow-policy.mjs --online` locally; it checks each
   recorded SHA against the official `action.yml` (Node 24 runtime and inputs).
4. Push the commit; CI then runs normally.

A new Action, one the policy has never listed, follows the same review and is
never accepted without it.

## Expo SDK version drift

Expo publishes SDK patch releases between the app's native builds. expo-doctor's
"Check that packages match versions required by installed Expo SDK" then fails
until the packages are aligned, which would force an update, a version bump and
new store builds at any time. CI and the local preflight run expo-doctor through
[`scripts/expo-doctor-check.mjs`](../../../../scripts/expo-doctor-check.mjs):

- when version drift is the only failed check, the step passes and prints a
  warning (an annotation in GitHub Actions);
- any other failed check, a crash or an output the script does not recognise
  fails the step, as before.

Native dependency updates ship together in the monthly native release train:
`npx expo install --fix`, the security backport manifest, the version bump and
both store builds. Between trains, JavaScript-only fixes ship by OTA, and native
security fixes (npm audit, Android Gradle or CocoaPods findings) still block CI
and ship outside the train.

Mobile npm updates still pass through the reviewed security backports: a bump
of a backported package fails `apply-security-backports.mjs --verify` until
its manifest is reviewed.

[`scripts/test/dependabot-policy.test.mjs`](../../../../scripts/test/dependabot-policy.test.mjs)
fails when a manifest loses its entry, when a `pip` entry appears, when an entry (Actions included) stops
being monthly or grouped, when a monthly entry starts allowing majors, when an Expo SDK package is no
longer ignored, or when the `maven` build image may propose a tag change again.

## Freshness report

Run it from the repository root after `npm ci` in each npm project:

```bash
node scripts/dependency-report.mjs --output outputs/dependency-report.md
```

Without `--output` it prints Markdown to stdout. It runs on the developer
machine, so it uses no GitHub Actions minutes. It needs network access to the
npm registry, Maven Central, PyPI and endoflife.date, plus `npm`, `npx` and `mvn`
on the `PATH`.

| Section | Command or source | Shows |
|---|---|---|
| npm per project | `npm outdated --json` | Current and latest version, with a major/minor/patch jump |
| Expo SDK | `npx expo install --check` | Packages that do not match the installed SDK, and how many SDKs behind it is |
| Maven | `versions-maven-plugin` 2.18.0: parent, declared dependency and version property updates | Pre-releases are ignored; Spring Boot BOM entries are covered by the parent update |
| Python | `requirements.lock` and `pyproject.toml` against PyPI | Locked versions with a newer release, and releases above the declared upper bound |
| Platforms | endoflife.date for Node.js (`frontend-mobile/.nvmrc`), Eclipse Temurin (`java.version`), Spring Boot (parent) and PostgreSQL (`infra/aws-low-cost/compose.postgres.yml`, then `infra/docker-compose.yml`) | End-of-life date, days left, newest and newest LTS cycle |

Under semver, a `0.x` minor release counts as a major jump. A cycle within 180
days of its end of life shows `ends soon`.

A failing tool becomes that section's `Could not check` line; the rest of the
report still runs. A project without `node_modules` reports that `npm ci` is
needed instead of listing every package as missing.

## Review routine

1. **Monthly:** review and merge the grouped Dependabot pull requests once CI
   passes. Confirm on the repository's Dependabot page that every compose file
   with a pinned image, such as `compose.postgres.yml`, is listed.
2. **Quarterly:** run the freshness report, then open one work item per
   platform upgrade that breaks the one-major-behind rule or reaches `ends soon`.
3. **Expo SDK upgrades:** follow the Expo upgrade guide, run
   `npx expo install --fix`, and plan a native build, because a new SDK cannot
   ship by OTA.

## Tests

`node --test scripts/test/dependency-report.test.mjs scripts/test/dependabot-policy.test.mjs`
covers version jump classification, the parsers for each tool, end-of-life
evaluation, section errors, the Markdown output, the command line and the
Dependabot policy. `scripts/test/expo-doctor-check.test.mjs` covers the
expo-doctor classification with 100% coverage, and
`scripts/test/workflow-policy.test.mjs` covers the Action review error.
