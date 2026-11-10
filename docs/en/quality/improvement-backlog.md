# Quality improvement backlog

Gaps found when measuring Vinnot's quality against its [model](quality-model.md) and its
[metrics](metrics.md), with the proposed action, priority and status. When an improvement
is taken on, its issue is created with the **Create Work Branch** workflow
([work item flow](../governance/github-work-items.md)) and linked in this table.

As of 2026-10-29 none of these improvements has an open issue. The closed issues cited are
antecedents that solved part of the problem.

## Priorities

- **High:** affects money, data or availability, or leaves a critical risk unmeasured.
- **Medium:** leaves a prioritised characteristic unmeasured or a manual check unautomated.
- **Low:** improves the quality of the tests themselves or of non-critical data.

## Improvements

| ID | Finding | Characteristic | Proposed action | Priority | Status | Issue |
|---|---|---|---|---|---|---|
| MB-01 | The p95 measured on development (2.9 s) exceeds the 500 ms proposed target ([M-05](metrics.md#m-05-read-response-time-p95)) | Performance efficiency | A k6 load script ([CP-NF-04](non-functional-test-cases.md#cp-nf-04-measure-response-time-under-load)) run in production off-peak, a formal latency target and tuning of the slowest queries ([Query performance](../backend/data/query-performance.md)) | High | Pending | — |
| MB-02 | One server per environment, no high availability and no recorded full drill ([M-17](metrics.md#m-17-rto-and-rpo)) | Reliability | A quarterly restore drill ([CP-NF-05](non-functional-test-cases.md#cp-nf-05-restore-a-backup)) and an assessment of a second production instance | High | Partial: isolated database restore automated | Antecedent: #149 (closed) |
| MB-03 | No crash reporting for the app on devices | Reliability, analysability | Add a crash reporting tool for the app and the web | High | Pending | — |
| MB-04 | CI runs a single E2E spec (`release-retention.spec.ts`); the other 11 and the browser matrix run on demand ([M-24](metrics.md#m-24-platforms-with-passing-e2e)) | Reliability, portability | Run the critical specs (authentication, session, catalog) in CI and the full matrix before each release | Medium | Pending | — |
| MB-05 | No automatic end-to-end tests in the mobile app | Reliability, portability | Assess Maestro or Detox for sign-in, registration and payment | Medium | Pending | — |
| MB-06 | Scanning reaches neither 90% accuracy nor a 10 s p95 ([M-06](metrics.md#m-06-scan-time-p95), [M-07](metrics.md#m-07-scan-accuracy)) | Functional suitability, efficiency | Grow the benchmark label set and measure every model version before switching | Medium | Partial: benchmark with versioned sets in [`scripts/data`](../../../scripts/data) | Antecedent: #127 (closed) |
| MB-07 | No automatic accessibility tests and no user testing ([M-11](metrics.md#m-11-task-completion-rate), [M-12](metrics.md#m-12-sus-score), [M-14](metrics.md#m-14-wcag-criteria-met)) | Usability | Add axe to the end-to-end tests and run a usability test with the SUS questionnaire | Medium | Pending | — |
| MB-08 | Only 16.5% of Argentine wineries have a verified exact location ([M-25](metrics.md#m-25-wineries-with-an-exact-location)) | Data quality | Finish geolocation in monthly cycles and measure M-25 each cycle | Medium | In progress by cycles | — |
| MB-09 | Payments, webhooks and availability have no periodic measurement ([M-03](metrics.md#m-03-accuracy-of-credited-payments), [M-10](metrics.md#m-10-processed-payment-webhooks), [M-15](metrics.md#m-15-monthly-availability)) | Functional suitability, reliability | A monthly reconciliation against Mercado Pago and a monthly availability report from the probe | Medium | Pending | — |
| MB-10 | The 5xx alarm fires at 5%, above the 1% proposed target ([M-16](metrics.md#m-16-5xx-error-rate)) | Reliability | Measure the real rate for a month and decide whether to lower the threshold without false alarms | Low | Pending | — |
| MB-11 | No mutation testing to measure the quality of the tests themselves | Maintainability | Assess PIT on the backend and Stryker on the web and the app for the payment and registration rules | Low | Pending | — |

## How this backlog is used

- Every improvement has a metric that measures it. It is closed when the metric meets its
  threshold or when the product owner documents the accepted deviation.
- Accepted risks stay explicit and reviewable, like scan time for launch.
- Metrics are re-measured on every major release and the [metrics summary](metrics.md#summary)
  is updated with the measurement date.
