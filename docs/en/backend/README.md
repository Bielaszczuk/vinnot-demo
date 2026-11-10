# Backend

Spring Boot REST API: a modular monolith with hexagonal architecture and logical CQRS on PostgreSQL.

## Architecture

- [Overview](architecture/overview.md)
- [Module boundaries and dependencies](architecture/module-boundaries.md)
- [API catalog and contracts](architecture/api.md)
- [Authentication and identity](architecture/authentication-and-identity.md)
- [Security and authorization](architecture/security-and-authorization.md)
- [Errors, transactions and consistency](architecture/errors-transactions-and-consistency.md)
- [Sessions, publication and external effects](architecture/session-and-data-integrity.md)
- [Notifications](../modules/notifications/architecture.md#backend) (in the module chapter)
- [Observability](architecture/observability.md)
- [Resource protection and external transports](architecture/resource-protection.md)

## Data and testing

- [Database model](data/database-model.md)
- [Query and index performance](data/query-performance.md)
- [Testing and coverage strategy](testing/strategy.md)

## Use cases

- [Backend label scanning](../modules/wines/architecture.md#label-recognition) (in the module chapter)
- [Wine search and detail](../modules/wines/architecture.md#search-and-detail) (in the module chapter)
- [Wine management from administration](../modules/admin/architecture.md#wine-management) (in the module chapter)
- [AI profiles and comparisons](../modules/ai/architecture.md#backend) (in the module chapter)
- [Submissions and moderation](../modules/wines/submissions.md) (in the module chapter)
- [Cellar](../modules/cellar/architecture.md#backend) (in the module chapter)
- [Reviews, comments and likes](../modules/reviews/architecture.md#backend) (in the module chapter)
- [Community reports, blocking and moderation](../modules/community/architecture.md#backend) (in the module chapter)
- [Events and registrations](../modules/events/architecture.md#backend) (in the module chapter)
- [Payments](../modules/payments/architecture.md#backend) (in the module chapter)
- [Partner operations and event editor](../modules/partner/architecture.md#backend) (in the module chapter)
- [Wineries and regions](../modules/wineries/architecture.md#backend) (in the module chapter)
- [Wine routes](../modules/wine-routes/architecture.md#backend) (in the module chapter)
- [Administration and moderation](../modules/admin/architecture.md#backend) (in the module chapter)
- [Users and account](../modules/users/architecture.md#backend) (in the module chapter)
- [Uploads and reference data](use-cases/uploads-and-reference-data.md)
- [Contract acceptance, versions and evidence](../modules/legal/architecture.md#backend) (in the module chapter)
- [Public enquiries and support delivery](../modules/support/architecture.md#backend) (in the module chapter)
## Diagrams

- [System map](diagrams/system-map.md)
- [UML domain model](diagrams/domain-class-model.md)
- [Detailed ERD by context](diagrams/relational-model.md)
- [ERD and relational model](data/database-model.md)
- [Request lifecycle](diagrams/request-lifecycle.md)
- [State machines](diagrams/domain-state-machines.md)
- [Data consistency](diagrams/data-consistency.md)

## Sharing

- [Sharing wines, events and routes](../modules/sharing/architecture.md#backend) (in the module chapter)
