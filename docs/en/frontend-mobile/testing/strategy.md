# Mobile frontend testing strategy

## Scope and levels

| Level | Tested unit | Controlled dependencies |
|---|---|---|
| Domain | Mappers, validators, normalization | DTO fixtures and boundary values |
| Application | Services and input/output transformation | Replaced clients/gateways |
| State/presentation | Hooks, session, interaction and navigation | Store/cache, transport and router |
| Client integration | UI, hooks and contract sequence | Mock native adapters |
| End-to-end | Binary/device interaction | Explicit environment, distinct from unit tests |

Jest uses `jest-expo` and React Native Testing Library. Tests live beside units
under `src/`, not in `app/`, whose files Expo Router interprets as routes.

## How to measure the current state

This page does not pin test counts: they change with every delivery. The
reference runtime is Node 22 (`frontend-mobile/.nvmrc`, the CI workflows and
`scripts/ci-preflight.mjs`). To get the current state:

- `npm --prefix frontend-mobile test` reports mobile suites and tests;
  `npm --prefix frontend-mobile run test:coverage` adds coverage.
- `npm --prefix frontend-mobile run typecheck`, `run lint` and
  `run test:release-config` cover types, lint and release configuration.
- `node scripts/ci-preflight.mjs` runs the same gates as CI, coverage included,
  before pushing.

The dated sections below record the results of that date; they are not the
current state.

Babel transforms dynamic imports only in the `test` environment so Jest's
CommonJS runtime can exercise lazy native adapters. Production Metro behavior
is unchanged. An OCR failure-path test alone is insufficient: test successful
recognition and a native promise that settles after the UI timeout as well.

Scanner regressions cover cancellation during capture, OCR and HTTP; late
responses must not restart analysis. File-ownership tests verify that originals
and rejected derivatives are released, while active OCR/upload leases preserve
their files until the underlying operation settles. Manual search tests check
the minimum length, debounce, inactive-query skip and `currentData` rendering.
Client tests assert the actual HTTP `AbortSignal`, not only a UI cancel method.

## Configured coverage

Measurement includes `src/application/services/*.service.ts`,
`src/domain/**/*.mappers*.ts` and `src/domain/**/*.validators.ts`.
It also includes `src/application/operations/types.ts`, which contains tag policy.
Test files, the `wine.mappers.ts` barrel and `wine.mappers.types.ts` are excluded;
the latter only declares types, with no executable code. Mapper logic is not excluded.
Policy and RTK adapter tests check related projections, bodyless success, failures
without invalidation and focus without repeating comparisons.
Selection also covers public/legal domain, document, acceptance, support and
reauthentication hooks, illustrated feedback and `Retry-After` normalization,
as well as sensory summaries. It includes `nativeIntent` for native navigation.
The exact list is in `package.json` under `jest.collectCoverageFrom`; these groups
do not imply full presentation coverage.

Configured thresholds:

| Metric | Threshold |
|---|---|
| Statements | 100% |
| Lines | 100% |
| Functions | 100% |
| Branches | 60% |

Thresholds apply to the included set. They do not mean 100% of application logic,
hooks, operations, infrastructure or screens. Execution reports and dates belong
in test artifacts, not permanent claims in this document.

## Reproducible commands

```bash
cd frontend-mobile
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:coverage
npm run preflight:ios:native
```

`npm ci` installs lockfile dependencies. Coverage writes local reports;
build/preflight generate artifacts. Mobile preflight consumes no EAS build but
requires Xcode and native dependencies.

Physical interaction checks include permissions, capture, OCR, SecureStore,
social identity, keyboard, background/foreground and scanner return navigation.
Native mocks or simulators do not certify real hardware/OCR behavior.

## Workflow criteria

| Workflow | Cases the test design must distinguish |
|---|---|
| Session | No tokens, valid session, expiration, transient error, logout |
| Search | Empty/short text, changed filters, next page, error |
| AI | Read, generation, language, cached response, failure |
| Cellar/reviews | Validation, correct ID, backend ownership, invalidation |
| Events | Pending registration, Mercado Pago payment and checkout return, confirmation, rejection |
| Admin/partner | Roles, payload, form state, conflict |
| Scanning | Permission, quality, OCR, cancel, retry, submission |

This matrix describes verification responsibilities; it does not claim every
case already has automated coverage. Test files and runner configuration define
implemented coverage.

## Architecture and contract testing

Review import direction in addition to lint. Service tests replace clients at
the infrastructure boundary; mapper tests use representative DTOs with null,
missing and normalized fields. HTTP failures are tested separately from form
rules.

Interaction tests verify observable behavior, not incidental markup/timers.
Animation tests check start/completion/cancellation and reduced motion in units
implementing it. Accessibility combines semantic assertions with real keyboard
and screen-reader traversal.

## Evidence and related procedures

- [Module configuration](../../../../frontend-mobile/package.json)
- [Contracts and persistence](../architecture/platform-and-localization.md)
- [Remote state](../architecture/remote-state-and-transport.md)
- [Development](../guides/development.md)

## Public centre, contact and recovery

Coverage includes `domain/public/*.ts`,
`presentation/feedback/illustratedState.ts`, `useSupportForm`,
`useRetryDeadline` and the `Retry-After` parser. Tests exercise field limits,
ES/EN parity, server-free search, UUID/draft preservation, double submit,
server-supplied waiting periods and timer cleanup. Components verify the real
image→fallback→stable surface sequence and recovery with a new URI.

Controlled support tests verify receipt, not email delivery. External delivery
needs an explicit backend/provider test. The contract and diagrams are in
[Public information and support](../../modules/support/architecture.md).

## Access and UX regressions

`AuthGuard` tests distinguish initialization, anonymous access without mounting
children and a valid session. Login preserves intent through profile completion;
domain tests reject external/escaped/nonproduct returns. Services cover cancelled
or failed share; hooks cover time, foreground and cleanup. Mappers/components
distinguish zero from missing coordinates; wine proposals use ES/EN keys.

These Jest tests use controlled native adapters. Configuration checks validate
assets/profiles but do not demonstrate installed icon/splash appearance. The
development candidate needs device checks for login/logout, legal pages, deep
links, return, location and visual/font/screen-reader acceptance. These local
commands do not generate an EAS build or publish OTA.
## Startup and illustrations — 2026-10-05

`startupRoutes.test.tsx` verifies providers start while fonts are pending, do not
remount when fonts resolve, and navigation waits for the session without the
previous 950 ms timeout. It complements `authSlice`, `AuthGuard`, and agreement
regressions; it does not replace session validation or backend verification.
On that date the local suite, typecheck, lint, and the architecture guard passed,
and `test:release-config` passed with Node 20.20.2 (the `.nvmrc` of that time;
it now pins Node 22, like CI) and Node 22.23.3. Node 23.8.0 failed to reproduce unpatched-package
recursion in the backport test; that test was not changed or weakened to accept
a different runtime.

Six WebP derivatives (cover, welcome, and four glasses) decrease from 6,678,340 to
956,812 bytes: 85.67% fewer asset bytes. Dimensions and alpha are preserved; this
percentage does not imply equivalent decoded-memory or total-startup-time savings.
Local iOS/Android Hermes exports include all six WebP files. Home queries, filters,
and private-image cache policy are unchanged.

Local QA: actual welcome screen in the development client on iPhone 17 / iOS 26.4;
actual Home with empty fixture lists in Expo Go on that simulator and an Android
API 36 emulator. All six assets decoded through `Image.loadAsync` on both platforms
with their original dimensions. The harness does not query or modify remote
accounts/data. This verifies rendering/codecs, not production AAB/IPA startup
timing or reproduction on the incident device.

A production crash requires a native/ANR trace or device bugreport to diagnose.
A UUID and backend logs are insufficient. On October 5, Android vitals showed no
crash/ANR clusters for the previous 28 days and reported data updated through
Sunday at 21:00 in the console: it did not necessarily include that day's reported
crash. Backend inspection showed no ERROR/OutOfMemory or OOMKilled within the
available window. The crash is not attributed to images or marked fixed without
that evidence.

On October 5 the owner withdrew this investigation as an isolated device incident.
It is no longer a publication blocker or a fixed bug; that decision does not
establish a technical cause.

## Navigation, sheets and feedback — issue #242

`RootNavigator.test.tsx` uses real Expo Router to verify that authentication removes
Welcome from history and returning from a detail retains the session.
`startupRoutes.test.tsx` covers initialization and state changes. TTL, refresh and
permissions are not changed to fix navigation.

The shared sheet shell tests insets, closing restrictions during mutations,
Android Back, listener registration/cleanup and revealing the input above the
keyboard. `TextField` retains ordinary input behavior outside sheet context.
Scanner tests cover visible capture, duplicate capture prevention and late
cancellation. Support tests cover short formatting, successful/failed copying and
the complete UUID; backend tests assert both references in the email.

Reviewed inventory: profile/account/password/avatar/language sheets, cellar,
event registration and management, partner, user/wine/winery/route/event admin;
native detail, review, reauthentication and deletion dialogs. Native dialogs and
feature mutations are preserved. Login, registration, incomplete profile, contact,
community and scanning use their keyboard/scroll shells; this inventory does not
mean every flow was manually exercised end to end.

Local result on 2026-10-12 with Node 22.23.3 (record of that date): the mobile,
web and backend suites passed with no failures; mobile coverage met the configured
gates; lint, types, release-config and Expo doctor passed; local iOS/Android Hermes
exports passed; the opt-in real AI backend test was skipped and
`mvn clean install` passed.
No Actions or update publication were performed.

On iPhone 17e/iOS 26.4, real components were verified in a local fixture without API
access: sheet above a native stack/tabs, lower field visible with keyboard,
explicit return, visible/cancelable native deletion dialog, and social registration
before the form. The scanner shutter was visibly inside its initial viewport
with substituted camera/services. This is not a physical camera, real account or
deletion test. The fixture bundle
also started on Android, but its window was not exposed to the interaction tool:
the Android interaction matrix, physical camera, all sizes/font scales and all
deep links are not certified. Record these checks on the candidate binary before
closing acceptance. `expo-clipboard` requires a new binary containing the native
module; a successful JS export does not prove OTA compatibility with an older
binary.
