# Non-functional requirements

Consolidates Vinnot's non-functional requirements in one table. Each row gives the current
value, the file that defines it and how it is verified (automatic test, alarm or manual
review). When a value changes in the code, this page is updated in the same change.

The `RNF-xx` ids belong to this chapter. Values marked **proposed target** have no control
or systematic measurement yet: their status is pending and they are tracked in the
[improvement backlog](improvement-backlog.md).

Values backed by an environment variable (for example `${RATE_LIMIT_GENERAL_CAPACITY:300}`)
are documented with their default; an environment can override them without a code change.

## Security

| ID | Characteristic | Requirement | Current value | Source | Verification |
|---|---|---|---|---|---|
| RNF-01 | Authenticity | Short sessions with rotating refresh | Access token: 15 min. Refresh: 7 days, rotated on every use. On the web, an `HttpOnly`, `Secure`, `SameSite=Strict` cookie | [`application.yml`](../../../backend/src/main/resources/application.yml) (lines 98-99); [`BrowserSessionPolicy.java`](../../../backend/src/main/java/com/vinnot/user/infrastructure/web/session/BrowserSessionPolicy.java); [`RefreshTokenCommandHandler.java`](../../../backend/src/main/java/com/vinnot/user/application/command/handler/RefreshTokenCommandHandler.java) | [`BrowserSessionPolicyTest.java`](../../../backend/src/test/java/com/vinnot/user/infrastructure/web/session/BrowserSessionPolicyTest.java); E2E `session-security.spec.ts` |
| RNF-02 | Confidentiality | Passwords stored as hashes | BCrypt; never stored or logged in plain text | [`SecurityConfig.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java) | [Backend](../backend/testing/strategy.md#identity) identity tests |
| RNF-03 | Confidentiality | Role-based access control on every route | Administration only for `ADMIN` or `MODERATOR`; user management and monitoring only for `ADMIN`. No session: HTTP 401; insufficient role: HTTP 403 | [`SecurityConfig.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java) | [`SecurityConfigAccessTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/config/SecurityConfigAccessTest.java); [CP-NF-02](non-functional-test-cases.md#cp-nf-02-block-a-regular-user-from-administration) |
| RNF-04 | Integrity | Encrypted transport and security headers | API: 1-year HSTS with `includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, no `Server` header. Web: TLS 1.2 minimum on CloudFront, 180-day HSTS, `Content-Security-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy` | [`Caddyfile`](../../../infra/aws-low-cost/Caddyfile); [`security-headers.json`](../../../frontend-react/security-headers.json); [`production-web-stack.json`](../../../infra/aws-low-cost/production-web-stack.json) | [`web-session-deployment.test.mjs`](../../../scripts/test/web-session-deployment.test.mjs); [CP-NF-03](non-functional-test-cases.md#cp-nf-03-check-https-and-security-headers) |
| RNF-05 | Resistance | Rate limits against abuse and brute force | See [Rate limits](#rate-limits). Above them: HTTP 429 with `Retry-After`. Per account: after 5 wrong passwords in a row, HTTP 423 `ACCOUNT_TEMPORARILY_LOCKED` with `Retry-After` for 15 minutes (implemented on 2026-10-30) | [`application.yml`](../../../backend/src/main/resources/application.yml) (lines 186-198 and 199-260); [`LoginAttemptGuard.java`](../../../backend/src/main/java/com/vinnot/user/application/service/LoginAttemptGuard.java) | [`RateLimitingFilterTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/security/RateLimitingFilterTest.java), [`RateLimitPolicyResolverTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/security/RateLimitPolicyResolverTest.java), [`LoginAttemptGuardTest.java`](../../../backend/src/test/java/com/vinnot/user/application/service/LoginAttemptGuardTest.java), [`LoginLockoutHttpPostgresIntegrationTest.java`](../../../backend/src/test/java/com/vinnot/user/infrastructure/web/LoginLockoutHttpPostgresIntegrationTest.java); [CP-NF-01](non-functional-test-cases.md#cp-nf-01-limit-sign-in-attempts) |
| RNF-06 | Integrity | Authentic payment notifications | Mercado Pago HMAC-SHA256 signature with a ±10-minute tolerance | [`MercadoPagoWebhookSignature.java`](../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/MercadoPagoWebhookSignature.java) | [`MercadoPagoWebhookSignatureTest.java`](../../../backend/src/test/java/com/vinnot/payment/infrastructure/security/MercadoPagoWebhookSignatureTest.java) |
| RNF-07 | Confidentiality | Partner payment credentials encrypted | Versioned AES-GCM envelope authenticated against the owner and the field | [`PaymentCredentialCipher.java`](../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/PaymentCredentialCipher.java) | [`PaymentCredentialCipherTest.java`](../../../backend/src/test/java/com/vinnot/payment/infrastructure/security/PaymentCredentialCipherTest.java) |
| RNF-08 | Authenticity | Expiring email links | Email verification: 24 h. Email change: 60 min. Password reset: 60 min | [`application.yml`](../../../backend/src/main/resources/application.yml) (lines 340-342) | [Backend](../backend/testing/strategy.md#identity) identity tests |
| RNF-09 | Non-repudiation | Evidence of terms acceptance | Version, revision, locale, date and hash of the accepted document are stored | [`TermsDocument.java`](../../../backend/src/main/java/com/vinnot/legal/domain/model/TermsDocument.java) | [Legal](../modules/legal/testing.md) test cases |
| RNF-10 | Accountability | Every request is traceable | `X-Request-ID` header on every response and in the log | [`HttpRequestLoggingFilter.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/HttpRequestLoggingFilter.java) | [`HttpRequestLoggingFilterTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/web/HttpRequestLoggingFilterTest.java) |
| RNF-11 | Confidentiality and integrity | No known vulnerabilities and no versioned secrets | 0 HIGH or CRITICAL vulnerabilities in dependencies and the image (Trivy, `npm audit`), also run weekly; 0 secrets across the whole history (Gitleaks) | [`security-checks.yml`](../../../.github/workflows/security-checks.yml); [`ci.yml`](../../../.github/workflows/ci.yml) | The pipeline fails; see [Dependency security](../infra/guides/dependency-security.md) |

### Rate limits

Each bucket is a token bucket (Bucket4j): its capacity refills in full over the period.

| Operation | Capacity | Period |
|---|---|---|
| Credentials (sign-in) | 10 | 1 minute |
| Account actions | 5 | 15 minutes |
| Registration | 5 | 1 hour |
| Reports | 10 | 1 hour |
| Session refresh | 60 | 1 minute |
| AI (profiles and comparisons) | 20 | 1 hour |
| Label scanning | 30 | 1 hour |
| Wine submissions | 10 | 1 day |
| Signed-in catalog | 60 | 1 minute |
| Signed-in catalog, daily cap | 1,500 | 1 day |
| Public catalog | 180 | 1 minute |
| Public catalog, daily cap | 1,500 | 1 day |
| API documentation | 30 | 1 minute |
| General | 300 | 1 minute |

A signed-in account that runs out of the daily catalog cap is locked.

## Performance and capacity

| ID | Characteristic | Requirement | Current value | Source | Verification |
|---|---|---|---|---|---|
| RNF-12 | Time behaviour | API response | Requests over 1000 ms are logged as slow. Alarm when at least 20% of requests (with 10 or more in the window) take over 5 s. **Proposed target:** read p95 ≤ 500 ms in production (pending) | [`application.yml`](../../../backend/src/main/resources/application.yml) (line 184); [`OperationalTelemetry.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/metrics/OperationalTelemetry.java); [`policy.py`](../../../infra/aws-low-cost/monitoring/policy.py) | `http_slow_rate` alarm; [CP-NF-04](non-functional-test-cases.md#cp-nf-04-measure-response-time-under-load) pending |
| RNF-13 | Capacity | Bounded pagination | At most 200 per page in general; 100 for wineries and wine routes; 20 in the public wine and winery catalogs, with a 500-result window | [`PageQuery.java`](../../../backend/src/main/java/com/vinnot/shared/domain/valueobject/PageQuery.java); [`SearchWineriesQueryHandler.java`](../../../backend/src/main/java/com/vinnot/winery/application/query/handler/SearchWineriesQueryHandler.java); [`SearchWineRoutesQueryHandler.java`](../../../backend/src/main/java/com/vinnot/wineroute/application/query/handler/SearchWineRoutesQueryHandler.java); [`PublicWineCatalogAccessPolicy.java`](../../../backend/src/main/java/com/vinnot/wine/infrastructure/web/policy/PublicWineCatalogAccessPolicy.java) | [`PageQueryTest.java`](../../../backend/src/test/java/com/vinnot/shared/domain/valueobject/PageQueryTest.java); [`PublicWineCatalogAccessPolicyTest.java`](../../../backend/src/test/java/com/vinnot/wine/infrastructure/web/policy/PublicWineCatalogAccessPolicyTest.java) |
| RNF-14 | Resource utilisation | Bounded files | 10 MB per file and 15 MB per request; images up to 8 MB and 24 megapixels | [`application.yml`](../../../backend/src/main/resources/application.yml) (lines 38-39); [`ImageResourceLimits.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/image/ImageResourceLimits.java) | [`ImageResourceLimitsTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/image/ImageResourceLimitsTest.java) |
| RNF-15 | Resource utilisation | Bounded server resources and AI spending | 20-connection pool with a 3 s maximum wait; at most 3 concurrent AI calls; AI spending cap of USD 10 per month | [`application.yml`](../../../backend/src/main/resources/application.yml) (lines 13-15 and 384-391) | `db_connections_high` (80%), `pool_connection_timeout` and `ai_budget_near_limit` (80% of the cap) alarms |
| RNF-16 | Fault tolerance | Timeouts for external services | OpenAI: 10 s connect and 30 s read. Label recognition: 12 s. Google Maps and social sign-in: 3 s and 5 s. AWS APIs: 15 s per call and 12 s per attempt | [`application.yml`](../../../backend/src/main/resources/application.yml) (lines 168, 333-334, 351-357 and 376-377) | [Backend](../backend/testing/strategy.md) external client tests |
| RNF-17 | Functional correctness | Event registration limits | Tickets per registration configurable per event: 1 to 20, 6 by default. Capacity hold duration: 5 minutes to 7 days, 24 h by default; when it expires, it frees the capacity | [`EventRegistrationSettings.java`](../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationSettings.java) | [`EventRegistrationSettingsTest.java`](../../../backend/src/test/java/com/vinnot/event/domain/valueobject/EventRegistrationSettingsTest.java) |

## Reliability

| ID | Characteristic | Requirement | Current value | Source | Verification |
|---|---|---|---|---|---|
| RNF-18 | Availability | Continuous monitoring | External probe and collector every 5 minutes. Alarms: 3 or more 5xx errors that are at least 5% of requests; 20% of requests over 5 s; free memory under 256 MiB; free disk under 3 GiB; container above 90% memory; connections above 80% of the pool; backup older than 30 h | [`vinnot-prod-monitor.timer`](../../../infra/aws-low-cost/systemd/vinnot-prod-monitor.timer); [`policy.py`](../../../infra/aws-low-cost/monitoring/policy.py); [`config.example.json`](../../../infra/aws-low-cost/monitoring/config.example.json) | [`test_monitoring.py`](../../../infra/aws-low-cost/monitoring/test_monitoring.py); [Observability](../infra/operations/observability-and-incidents.md#signals-and-thresholds) |
| RNF-19 | Recoverability | Backups | Daily off-host database backup at 04:00 UTC. Targets: 24 h RPO and 4 h RTO | [`vinnot-backup.timer`](../../../infra/aws-low-cost/systemd/vinnot-backup.timer); [Backup and recovery](../infra/operations/backup-and-disaster-recovery.md#rporto) | `backup_overdue` alarm at 30 h; isolated restore with [`verify-isolated-restore.mjs`](../../../scripts/verify-isolated-restore.mjs); [CP-NF-05](non-functional-test-cases.md#cp-nf-05-restore-a-backup) |
| RNF-20 | Availability | Service available | Backend health check every 30 s from Caddy. **Proposed target:** 99.5% monthly (pending: no consolidated report). One server per environment, no high availability | [`Caddyfile`](../../../infra/aws-low-cost/Caddyfile); [AWS deployment](../infra/architecture/aws-deployment.md) | External probe; [M-15](metrics.md#m-15-monthly-availability) |

## Compatibility and usability

| ID | Characteristic | Requirement | Current value | Source | Verification |
|---|---|---|---|---|---|
| RNF-21 | Interoperability | Documented API and standard errors | OpenAPI contract (springdoc) and an error response with a code and a request id | [`pom.xml`](../../../backend/pom.xml); [`GlobalExceptionHandler.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/GlobalExceptionHandler.java) | [Backend](../backend/testing/strategy.md#backend-web-security-and-contracts) contract tests |
| RNF-22 | Accessibility | Accessibility and languages | WCAG 2.1 level AA baseline, VoiceOver, TalkBack and keyboard navigation; full interface in Spanish and English | [Layout and accessibility](../shared/design/layout-and-accessibility.md) | Manual review; [CP-NF-06](non-functional-test-cases.md#cp-nf-06-complete-a-flow-with-a-screen-reader). Automatic check with axe pending |

## Maintainability and portability

| ID | Characteristic | Requirement | Current value | Source | Verification |
|---|---|---|---|---|---|
| RNF-23 | Testability | Minimum test coverage | Backend: 90% lines and 65% branches overall; 100% lines and methods in `application.service` and `domain.service`; 100% lines in handlers. Web and app, within the included scope: 100% statements, functions and lines, and 60% branches | [`pom.xml`](../../../backend/pom.xml) (lines 340-347); [`vitest.config.ts`](../../../frontend-react/vitest.config.ts); [`package.json`](../../../frontend-mobile/package.json) | The pipeline fails below the threshold |
| RNF-24 | Modularity | Hexagonal architecture | The domain depends on no framework or persistence; every service has its test; external providers sit behind ports | [`verify-test-architecture.mjs`](../../../scripts/verify-test-architecture.mjs); [Architecture](../architecture/README.md) | CI `Repository checks` job |
| RNF-25 | Adaptability | Supported platforms | Web: Chromium by default; Firefox, WebKit, Pixel 7 and iPhone 13 emulated with `VINNOT_BROWSER_MATRIX=1`. CI runs `release-retention.spec.ts` in Chromium. App: iOS 16.4 or later and Android | [`playwright.config.ts`](../../../frontend-react/playwright.config.ts); [`app.config.ts`](../../../frontend-mobile/app.config.ts) (line 222) | [CP-NF-07](non-functional-test-cases.md#cp-nf-07-run-the-critical-flows-on-the-browser-matrix) |
| RNF-26 | Analysability | Living, bilingual documentation | Every page in `docs/es` has its `docs/en` mirror and is reachable from the index; links are checked | [`validate_documentation.py`](../../../scripts/validate_documentation.py) | CI `Repository checks` job |

## Functional requirements

Functional requirements live in each module, with `RF-WEB-*` ids for the web and `RF-APK-*`
ids for the app, and are linked to use cases and test cases in the
[traceability matrix](../modules/traceability.md). This chapter creates no parallel ids.

| Module | Web requirements | App requirements | Requirements |
|---|---|---|---|
| Users and account | 30 | 35 | [requirements.md](../modules/users/requirements.md) |
| Legal | 7 | 7 | [requirements.md](../modules/legal/requirements.md) |
| Wines | 12 | 23 | [requirements.md](../modules/wines/requirements.md) |
| Wineries and regions | 4 | 5 | [requirements.md](../modules/wineries/requirements.md) |
| Reviews | 10 | 10 | [requirements.md](../modules/reviews/requirements.md) |
| Cellar | 7 | 8 | [requirements.md](../modules/cellar/requirements.md) |
| Community | 4 | 4 | [requirements.md](../modules/community/requirements.md) |
| Events and tickets | 16 | 15 | [requirements.md](../modules/events/requirements.md) |
| Payments | 3 | 2 | [requirements.md](../modules/payments/requirements.md) |
| Wine routes | 7 | 7 | [requirements.md](../modules/wine-routes/requirements.md) |
| Sharing | 7 | 8 | [requirements.md](../modules/sharing/requirements.md) |
| Notifications | 9 | 14 | [requirements.md](../modules/notifications/requirements.md) |
| AI profiles and comparisons | 8 | 10 | [requirements.md](../modules/ai/requirements.md) |
| Support and public information | 5 | 5 | [requirements.md](../modules/support/requirements.md) |
| Partners | 7 | 7 | [requirements.md](../modules/partner/requirements.md) |
| Administration and moderation | 33 | 33 | [requirements.md](../modules/admin/requirements.md) |
| **Total** | **169** | **193** | |

The counts come from the [traceability matrix](../modules/traceability.md); if they differ,
the matrix wins.
