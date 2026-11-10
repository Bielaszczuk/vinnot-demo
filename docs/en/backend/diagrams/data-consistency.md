# Data, locks, and consistency

## Transaction boundaries

```mermaid
flowchart TB
    HTTP["HTTP request"] --> HANDLER["@Transactional handler"]
    HANDLER --> LOAD["load aggregates"]
    LOAD --> RULES["validate rules/ownership"]
    RULES --> MUTATE["mutate domain"]
    MUTATE --> SAVE["persist through ports"]
    SAVE --> COMMIT["PostgreSQL commit"]
    COMMIT --> RESPONSE["response"]

    HANDLER -. "submit/review: effects inside handler" .-> PROVIDER["AI/storage + outbox"]
```

[View the full “Transaction boundaries” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-data-consistency-f8d379869e8d.svg)

Annotated handlers define transactions; the proxy commits after normal return.
Submit/review perform recognition, moderation, storage, or notification within
that orchestration. AI coordination and account-avatar cleanup have their own
boundaries described in the corresponding use cases.

## Event capacity under concurrency

```mermaid
sequenceDiagram
    participant A as Transaction A
    participant B as Transaction B
    participant DB as PostgreSQL event row
    A->>DB: findByIdForUpdate - PESSIMISTIC_WRITE
    DB-->>A: locked Event
    B->>DB: findByIdForUpdate - waits
    A->>A: validate capacity and build registration
    A->>DB: save registration and event
    A->>DB: COMMIT
    DB-->>B: Event after A commit
    B->>B: evaluate current capacity
    B->>DB: save decision and COMMIT
```

[View the full “Event capacity under concurrency” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-data-consistency-2cc32188a433.svg)

This sequence represents two registrations locking the same Event. No @Version column is involved. Constraints protect counters >= 0 and current_attendees + held_attendees <= max_attendees when a maximum exists. Review, confirmation and expiry lock event before registration. Expiry uses one short transaction per hold.

## AI single-flight

```mermaid
flowchart TD
    MISS["cache miss"] --> ACQUIRE["INSERT lease / stale takeover"]
    ACQUIRE --> OWN{"owner?"}
    OWN -->|yes| CHECK["double-check cache"]
    CHECK --> GENERATE["provider ES+EN"]
    GENERATE --> SAVE["upsert bundle"]
    SAVE --> RELEASE["release lease"]
    OWN -->|no| POLL["bounded cache polling"]
    POLL --> READY{"bundle ready?"}
    READY -->|yes| RETURN["return cache"]
    READY -->|no, lease stale| ACQUIRE
    READY -->|deadline| ERROR["controlled timeout"]
```

[View the full “AI single-flight” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-data-consistency-1dcb1e42f4d9.svg)

Leases expire for crash recovery. Keys distinguish profiles by wine and
comparisons by canonical pair. A comparison without a reusable bundle requires
a validated provider response even for sparse pairs; it does not create a catalog
template. Generation failure never publishes a partial bundle.

## Submission identity coordination

```mermaid
sequenceDiagram
    participant H as Submission handler
    participant L as Transactional lock port
    participant M as Duplicate matcher
    participant W as Wine repository
    participant S as Submission repository

    H->>L: lock(normalized wine+winery+vintage)
    H->>M: query catalog inside lock
    H->>H: evaluate safety and wine relevance
    alt safe exact duplicate
        H->>S: save DUPLICATE + matchedWineId
    else safe new wine
        H->>W: create Wine
        H->>S: save APPROVED + createdWineId
    else uncertain
        H->>S: save NEEDS_REVIEW
    end
```

[View the full “Submission identity coordination” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-data-consistency-c420b39ced00.svg)

The recheck is mandatory even if scanning found no match: another request may
have created the wine between both operations.

## Database versus storage

```mermaid
sequenceDiagram
    participant H as ReviewWineSubmissionCommandHandler
    participant S as FileStoragePort
    participant W as WineRepositoryPort
    participant R as WineSubmissionRepositoryPort
    participant N as WineSubmissionNotificationPort
    H->>S: promote quarantined image
    S-->>H: public URL
    H->>W: save wine
    H->>R: save reviewed submission
    H->>N: enqueue committed notification
    Note over H,N: External effects are separate from PostgreSQL commit
```

[View the full “Database versus storage” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-data-consistency-60eb895c021d.svg)

Promotion copies the image. TransactionalFileStorageAdapter records reconciliation before writing and enqueues deletions; the worker checks references and cleans up after commit. Every email, account emails included, goes through the [notification module](../../modules/notifications/architecture.md), which writes it to the same outbox inside the business transaction; no business transaction waits on the email provider. PostgreSQL and storage do not share a distributed transaction.

## Search projection consistency

Triggers update `wine_catalog_search` inside the same transaction as wine or
winery-name changes. The read model is therefore commit-consistent without
asynchronous consumer lag.

## Review rules

- document isolation/locking when a rule depends on concurrency;
- use unique/check constraints as the final barrier;
- never map `OptimisticLockException` to “not found”;
- avoid irreversible effects before validation;
- make retries idempotent;
- observe lock wait and conflict rates;
- test two real transactions, not only mocks.

## Sessions and publication

Concurrent refresh, atomic publication and outbox sequences are documented in [sessions and external effects](../architecture/session-and-data-integrity.md).
