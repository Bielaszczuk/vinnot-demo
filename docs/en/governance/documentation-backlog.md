# Documentation coverage audit

## Result

Canonical documentation covers implemented layers and modules: a modular
monolith with per-module Hexagonal Architecture and logical CQRS over one
PostgreSQL database, persistence/search, web, mobile, low-cost infrastructure,
security, testing and operations. This matrix measures documentation scope and
depth only; it is neither a roadmap nor an issue register.

## Backend

| Implemented area | Main document | Coverage |
|---|---|---|
| boundaries, ports and CQRS | [Module boundaries](../backend/architecture/module-boundaries.md) | deep |
| API and errors | [API catalog](../backend/architecture/api.md), [consistency](../backend/architecture/errors-transactions-and-consistency.md) | deep |
| auth, sessions and actions | [Authentication](../backend/architecture/authentication-and-identity.md) | deep |
| RBAC, ownership and rate limits | [Security](../backend/architecture/security-and-authorization.md) | deep |
| pagination limits and external transports | [Resource protection](../backend/architecture/resource-protection.md) | deep |
| sessions, publication and external effects | [Integrity](../backend/architecture/session-and-data-integrity.md) | deep |
| schema/Flyway/relations | [Data model](../backend/data/database-model.md) | deep |
| search/indexes/timeouts | [Performance](../backend/data/query-performance.md) | deep |
| wine search/detail | [Search and detail](../modules/wines/architecture.md) | covered; expand examples if ranking changes |
| scan/submissions | [Submissions](../modules/wines/submissions.md), [mobile scan](../modules/wines/architecture.md) | deep |
| AI profile/compare | [AI](../modules/ai/architecture.md) | deep |
| cellar | [Cellar](../modules/cellar/architecture.md) | deep |
| documents and versioned acceptance | [Legal](../modules/legal/architecture.md) | deep |
| support and durable delivery | [Support](../modules/support/architecture.md) | deep |
| prior approval, reports and blocking | [Community](../modules/community/architecture.md) | deep |
| reviews/comments/likes | [Reviews](../modules/reviews/architecture.md) | deep |
| events/registrations | [Events](../modules/events/README.md) | covered; states detailed in diagrams |
| payments (`payment` module): checkout, webhooks, reconciliation and refunds | [Payments](../modules/payments/README.md) | covered in its module chapter |
| public links (`sharing` module) | [Sharing](../modules/sharing/architecture.md#backend), [activation](../infra/guides/public-sharing.md) | deep |
| wineries/regions | [Wineries and regions](../modules/wineries/architecture.md) | deep |
| wine routes | [Routes](../modules/wine-routes/architecture.md) | deep |
| administration | [Administration and moderation](../modules/admin/architecture.md#backend) | deep |
| admin wine catalog | [Wine management](../modules/admin/architecture.md#wine-management) | deep |
| profile/account | [Profile and account](../modules/users/architecture.md) | deep |
| uploads/reference data | [Uploads and reference data](../backend/use-cases/uploads-and-reference-data.md) | deep |
| logging/metrics/health | [Observability](../backend/architecture/observability.md) | deep |
| tests/coverage | [Testing](../backend/testing/strategy.md) | deep |

## Clients

This inventory separates documentation from automated coverage and does not
certify production acceptance. Each row links platform-specific behavior,
contracts and code evidence.

| Area | Web | Mobile |
|---|---|---|
| Layers and composition | [Web](../frontend-web/architecture/overview.md) | [Mobile](../frontend-mobile/architecture/overview.md) |
| Navigation and access | [Web](../frontend-web/architecture/navigation-and-state.md) | [Mobile](../frontend-mobile/architecture/navigation-and-state.md) |
| Remote state and invalidation | [Web](../frontend-web/architecture/remote-state-and-transport.md) | [Mobile](../frontend-mobile/architecture/remote-state-and-transport.md) |
| Platform, language and persistence | [Web](../frontend-web/architecture/platform-and-localization.md) | [Mobile](../frontend-mobile/architecture/platform-and-localization.md) |
| Authentication and account | [Web](../modules/users/architecture.md) | [Mobile](../modules/users/architecture.md) |
| Catalog and detail | [Web](../modules/wines/architecture.md) | [Mobile](../modules/wines/architecture.md) |
| Profiles and comparisons | [Web](../modules/ai/architecture.md) | [Mobile](../modules/ai/architecture.md) |
| Cellar | [Web](../modules/cellar/architecture.md#web) | [Mobile](../modules/cellar/architecture.md#app) |
| Organizer event management | [Web](../modules/partner/architecture.md#web) | [Mobile](../modules/partner/architecture.md#app) |
| Administration and moderation | [Web](../modules/admin/architecture.md#web) | [Mobile](../modules/admin/architecture.md#app) |
| Product sequences | [Web](../frontend-web/diagrams/product-processes.md) | [Mobile](../frontend-mobile/diagrams/product-processes.md) |
| Testing and coverage scope | [Web](../frontend-web/testing/strategy.md) | [Mobile](../frontend-mobile/testing/strategy.md) |

Scanning is mobile-only:

- [Capture, OCR and result](../modules/wines/architecture.md)
- [Scan diagrams](../frontend-mobile/diagrams/wine-label-scan.md)
- [Lifecycle, cancellation and recovery](../frontend-mobile/diagrams/scan-lifecycle.md)

On web, scan is an app-download invitation; submission moderation has a web
panel. ES/EN indexes enumerate every document and diagram without inferring
coverage from file counts.

## Infrastructure

| Area | Document | Documentation coverage |
|---|---|---|
| low-cost AWS topology | [architecture](../infra/architecture/aws-deployment.md) | deep |
| env/secrets | [environments and secrets](../infra/architecture/environments-and-secrets.md) | deep |
| deployment | [guide](../infra/guides/deployment.md), [CI/CD](../infra/guides/ci-cd.md) | deep |
| public link activation | [public sharing](../infra/guides/public-sharing.md) | deep |
| start/stop/cost | [low cost](../infra/operations/low-cost-dev.md), [pause](../infra/operations/pause-and-recovery.md) | deep |
| backup/restore | [DR](../infra/operations/backup-and-disaster-recovery.md) | deep |
| incidents/signals | [infra observability](../infra/operations/observability-and-incidents.md) | deep |

## Storage and repository content

Coverage includes migration V27 (managed image storage) and managed covers in the data model/API, the
[upload contract](../backend/use-cases/uploads-and-reference-data.md),
[R2 catalogue](../infra/operations/catalog-images-r2.md),
[R2 uploads](../infra/operations/user-images-r2.md) and
[versioned/private content](repository-hygiene.md). This matrix does not certify
that a remote environment matches the Git tip.

## Documentation closure

A documented capability has ES/EN mirrors, code evidence and diagrams only when
they reduce ambiguity. Incidents, technical debt and improvement plans live in
the local Git-ignored plans. `planning/LOCAL_PLANNING.md` is their index and
points to the owning plan for each item; it neither duplicates those records nor
forms part of canonical documentation.
