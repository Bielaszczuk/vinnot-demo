# Web frontend testing strategy

## Scope and levels

| Level | Tested unit | Controlled dependencies |
|---|---|---|
| Domain | Mappers, validators, normalization | DTO fixtures and boundary values |
| Application | Services and input/output transformation | Replaced clients/gateways |
| State/presentation | Hooks, session, interaction and navigation | Store/cache, transport and router |
| Client integration | UI, hooks and contract sequence | MSW and fixtures |
| End-to-end | Browser navigation | Explicit environment, distinct from unit tests |

Vitest uses jsdom, `tests/setup.ts` and discovers tests under `src/` and
`tests/unit/`. Tests run in the `vmThreads` pool, where each file gets a fresh
VM context inside a reused worker; workers are recycled at 512 MB
(`vmMemoryLimit`, read only from the root `test` config). Tests that replace the
whole `window` global with `vi.stubGlobal('window', …)` cannot run in a VM
context and are listed in the `window-stubs` project, which uses the default
pool. Playwright uses `tests/e2e` with a Chromium project and separate
configuration.

## Configured coverage

Measurement includes `src/application/services/*.service.ts`,
`src/domain/**/*.mappers*.ts` and `src/domain/**/*.validators.ts`.
Test files and the `wine.mappers.ts` barrel are excluded.
It also includes `useAdminSubmissionImage`, `usePartnerEventMutations` and
`useWineComparison`. Tests check download/decode recovery, late-response rejection,
success-only invalidation and absence of incidental comparisons on focus,
reconnection or remount.
Selection also covers public/legal domain, document, acceptance, support and
reauthentication hooks, illustrated feedback and `Retry-After` normalization,
as well as sensory summaries (`sensory-bar`) and quick info (`wine.quick-info`).
It includes browser session, safe return navigation and brand/social-button
components and assets. It also includes payment account linking
(`usePaymentAccountConnection`, `paymentAuthorization.browser`), the event editor
and draft (`eventEditor`, `eventDraft`), `contactPhone`,
`useEventRegistrationForm`, `public/share-assets/*.js` and `src/domain/sharing/*.ts`. The exact list is in
`vitest.config.ts`; these groups do not imply full presentation coverage.

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
cd frontend-react
npm ci
npm run lint
npm run test
npm run test:coverage
npm run build
```

`npm ci` installs lockfile dependencies. Coverage writes local reports
and build generates web artifacts.

To execute Playwright locally, start `npm run dev:mock -- --port 5174` in
another terminal, then run `npm run test:e2e`. The server must be available
at `http://localhost:5174`, the `webServer.url` and `use.baseURL` address,
for local reuse. For a real API use `npm run dev -- --port 5174` and prepare
data. MSW scenarios verify interaction against simulated contracts, not
real-provider behavior.

## Workflow criteria

| Workflow | Cases the test design must distinguish |
|---|---|
| Session | No tokens, valid session, expiration, transient error, logout |
| Search | Empty/short text, changed filters, next page, error |
| AI | Read, generation, language, cached response, failure |
| Cellar/reviews | Validation, correct ID, backend ownership, invalidation |
| Events | Pending registration, reported payment, confirmation, rejection |
| Admin/partner | Roles, payload, form state, conflict |
| Scan invitation | Mobile-only content; no recognition request |

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

- [Module configuration](../../../../frontend-react/package.json)
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

## Discovery, access and compatibility

`discovery-access.spec.ts` controls API, location and Maps SDK: no anonymous
product requests, login return with query/hash, automatic country, denial/filter
removal, nearby events at zero axes and footer/anchor scroll. Unit tests cover
watchdog/late SDK results, manual selection, failed/cancelled share, clock/focus,
nested modals and safe onboarding returns.

Playwright runs Chromium by default. Expand the local matrix with:

```bash
npx playwright install chromium firefox webkit
VITE_GOOGLE_MAPS_API_KEY=local-test-key VINNOT_BROWSER_MATRIX=1 npm run test:e2e -- --workers=3
```

This adds Firefox, WebKit, Pixel 7/Chromium and iPhone 13/WebKit. The key is a
fake fixture value; Maps/API calls are intercepted. These are neither real
provider tests nor physical devices. CI retains Chromium to avoid multiplying
minutes or requiring new installations. Also verify the deployed development
candidate, screen readers, large fonts and device network/memory constraints.
