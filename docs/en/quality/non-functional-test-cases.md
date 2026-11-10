# Non-functional test cases

Test cases for the [non-functional requirements](non-functional-requirements.md). Functional
cases live on each module's testing page and in the
[traceability matrix](../modules/traceability.md).

They run on development, never in production, unless the case says otherwise. The data
are examples.

## Summary

| ID | Goal | Requirement | Priority | Status |
|---|---|---|---|---|
| CP-NF-01 | Limit sign-in attempts | RNF-05 | High | Automated in the filter; manual against the environment |
| CP-NF-02 | Block a regular user from administration | RNF-03 | High | Automated |
| CP-NF-03 | Check HTTPS and security headers | RNF-04 | High | Automated for the web; manual for the API |
| CP-NF-04 | Measure response time under load | RNF-12 | Medium | Pending (k6) |
| CP-NF-05 | Restore a backup | RNF-19 | Medium | Partial: database restore automated; full drill pending |
| CP-NF-06 | Complete a flow with a screen reader | RNF-22 | Medium | Manual; axe pending |
| CP-NF-07 | Run the critical flows on the browser matrix | RNF-25 | Medium | Automated on demand |

## CP-NF-01 Limit sign-in attempts

- **Type:** security, brute force. **Technique:** boundary values.
- **Preconditions:** no previous attempts from the test origin.
- **Data:** 11 attempts with a wrong password in under 1 minute.
- **Steps:**
  1. Send 10 attempts.
  2. Send attempt 11.
  3. Wait for the time given in `Retry-After` and try again.
- **Expected result:** the first 10 answer invalid credentials; attempt 11 gets HTTP 429 with
  `Retry-After`; after the wait, signing in can be tried again.
- **Status:** automated in [`RateLimitingFilterTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/security/RateLimitingFilterTest.java); running it against the environment is manual.

## CP-NF-02 Block a regular user from administration

- **Type:** security, authorisation. **Technique:** decision table by role.
- **Preconditions:** a session for a user with the `USER` role.
- **Data:** requests to `/api/admin/...` and `/api/actuator/...`.
- **Steps:**
  1. Call an administration route.
  2. Call a monitoring route.
  3. Repeat without a session.
- **Expected result:** with the `USER` role, HTTP 403; without a session, HTTP 401; no data
  is ever returned.
- **Status:** automated in [`SecurityConfigAccessTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/config/SecurityConfigAccessTest.java).

## CP-NF-03 Check HTTPS and security headers

- **Type:** security.
- **Preconditions:** a deployed environment.
- **Data:** `http://api-dev.vinnot.com/api/actuator/health` and the development web app.
- **Steps:**
  1. Request the API URL over HTTP.
  2. Inspect the API's HTTPS response.
  3. Inspect the web app's HTTPS response.
- **Expected result:** the HTTP request redirects to HTTPS. The API answers with
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` and
  `X-Content-Type-Options: nosniff`, with no `Server` header. The web app answers with
  `Content-Security-Policy`, `X-Frame-Options: DENY` and HSTS, as set in
  [`security-headers.json`](../../../frontend-react/security-headers.json).
- **Status:** the web header configuration is verified by
  [`web-session-deployment.test.mjs`](../../../scripts/test/web-session-deployment.test.mjs); the API check is manual.

## CP-NF-04 Measure response time under load

- **Type:** performance and load.
- **Preconditions:** production or an equivalent replica, outside peak hours.
- **Data:** 50 virtual users browsing the catalog for 5 minutes.
- **Steps:**
  1. Run the load script with k6.
  2. Record p50, p95 and the error rate.
- **Expected result:** p95 of 500 ms or less (proposed target) and 5xx errors below 1%. 429
  responses from rate limiting are counted separately, not as failures.
- **Status:** pending; there is no k6 script in the repository ([backlog](improvement-backlog.md)).

## CP-NF-05 Restore a backup

- **Type:** reliability, recovery.
- **Preconditions:** last night's backup available; an isolated test server.
- **Data:** the latest daily backup.
- **Steps:**
  1. Create a test server.
  2. Restore the backup.
  3. Start the backend and check health, sign-in and sample data.
  4. Measure the total time.
- **Expected result:** the service is up with the backup's data in under 4 hours (RTO) and
  data loss is under 24 hours (RPO).
- **Status:** partial. [`verify-isolated-restore.mjs`](../../../scripts/verify-isolated-restore.mjs)
  measures the database restore; the full drill with host, image, certificates and DNS is
  pending ([Backup and recovery](../infra/operations/backup-and-disaster-recovery.md)).

## CP-NF-06 Complete a flow with a screen reader

- **Type:** usability, accessibility.
- **Preconditions:** an iPhone with VoiceOver and an Android phone with TalkBack turned on.
- **Data:** the flow "find a wine and add it to the cellar".
- **Steps:**
  1. Turn on the screen reader.
  2. Do the flow without looking at the screen.
- **Expected result:** every button and field has an understandable label, the reading order
  is logical and the flow can be completed.
- **Status:** manual, using the [accessibility checklist](../shared/design/layout-and-accessibility.md#accessibility-checklist); the automatic check with axe is pending.

## CP-NF-07 Run the critical flows on the browser matrix

- **Type:** compatibility and portability.
- **Preconditions:** the development environment.
- **Data:** a matrix of Chromium, Firefox, WebKit, and emulated Pixel 7 and iPhone 13.
- **Steps:**
  1. Run the end-to-end tests with `VINNOT_BROWSER_MATRIX=1`.
- **Expected result:** every test passes on all five platforms, with no layout differences
  that prevent finishing the flows.
- **Status:** automated on demand with [`playwright.config.ts`](../../../frontend-react/playwright.config.ts); CI runs only `release-retention.spec.ts` in Chromium.
