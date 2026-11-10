# Request and use-case lifecycle

## Public paginated read

```mermaid
sequenceDiagram
    participant C as WineReadController
    participant P as PublicWineCatalogAccessPolicy
    participant H as SearchWinesQueryHandler
    participant R as WineRepositoryPort
    participant A as WinePersistenceAdapter
    participant SQL as WineSearchNativeRepository
    participant W as WineryQueryPort
    C->>P: resolvePagination
    C->>H: SearchWinesQuery
    H->>R: searchAdvanced + PageQuery
    R->>A: injected implementation
    A->>SQL: native query
    SQL-->>H: PageResult of Wine
    H->>W: findAllByIds
    H-->>C: PageResult of WineSummaryResponse
    C->>P: constrain result window
```

[View the full “Public paginated read” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-request-lifecycle-7ac2b62e5023.svg)

The public edge limits size/window; PageQuery represents application parameters. The SQL read model selects and hydrates entities, the adapter maps domain models and the handler projects DTOs. Page<JpaEntity> is not exposed. Effective filters and totals are detailed in [search](../../modules/wines/architecture.md).

## Transactional command

```mermaid
sequenceDiagram
    actor U as User
    participant C as Controller
    participant H as CommandHandler
    participant R as RepositoryPort
    participant A as Aggregate
    participant DB as PostgreSQL

    U->>C: mutating request + JWT
    C->>H: Command(principal, input)
    H->>R: findById
    R->>DB: SELECT
    DB-->>H: mapped domain
    H->>H: ownership/preconditions
    H->>A: business method
    A->>A: invariants/transition
    H->>R: save(Aggregate)
    R->>DB: INSERT/UPDATE
    DB-->>H: persistence operation result
    H-->>C: application result through transactional proxy
    Note over C,DB: Proxy commits after handler return and before controller resumes
    C-->>U: status + DTO
```

[View the full “Transactional command” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-request-lifecycle-3d15f6ef7577.svg)

## Stable errors

```mermaid
flowchart LR
    FAIL["MVC exception"] --> TYPE{"GlobalExceptionHandler"}
    TYPE --> X404["EntityNotFoundException<br/>NoResourceFoundException"] --> E404["404"]
    TYPE --> X400["MethodArgumentNotValidException<br/>unreadable body / type mismatch<br/>IllegalArgumentException"] --> E400["400"]
    TYPE --> X403["AccessDeniedException"] --> E403["403"]
    TYPE --> X405["HttpRequestMethodNotSupportedException"] --> E405["405"]
    TYPE --> X415["HttpMediaTypeNotSupportedException"] --> E415["415"]
    TYPE --> X409["DataIntegrityViolationException<br/>OptimisticLockingFailureException"] --> E409["409"]
    TYPE --> X503["ExternalServiceUnavailableException"] --> E503["503"]
    TYPE --> X500["Exception"] --> E500["500 INTERNAL_ERROR"]
    TYPE --> XBUSINESS["BusinessRuleViolationException"] --> BUSINESS{"code"}
    BUSINESS -->|FORBIDDEN / REAUTHENTICATION_REQUIRED| B403["403"]
    BUSINESS -->|AUTH_FAILED| E401["401"]
    BUSINESS -->|other| E422["422"]
    TYPE --> XDOMAIN["DomainException"] --> DOMAIN{"duplicate email/username, submission transition or concurrent update"}
    DOMAIN -->|yes| D409["409"]
    DOMAIN -->|no| D400["400"]
```

[View the full “Stable errors” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-request-lifecycle-a994706dc54c.svg)

The advice body contains timestamp, path, status, code, message and details. X-Request-ID belongs to the header/MDC, not that record. Security/rate-limit filters can terminate requests before MVC and write their own responses. The advice does not imply a specific mapper for every framework exception.

## Scan multipart

```mermaid
sequenceDiagram
    participant M as Mobile
    participant C as WineLabelScanController
    participant V as WineLabelUploadValidator
    participant T as WineLabelObservedTextValidator
    participant H as ScanWineLabelCommandHandler
    C->>V: validate(image)
    V-->>C: validated original bytes and MIME
    C->>T: validate(observedText)
    T-->>C: bounded normalized lines
    C->>H: ScanWineLabelCommand
    H->>H: OCR / visual / catalog orchestration
    H-->>C: WineLabelScanResponse
    C-->>M: EXACT_MATCH / POSSIBLE_MATCHES / NO_MATCH
```

[View the full “Scan multipart” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-request-lifecycle-bbcc8227266e.svg)

The full pipeline, errors and distinction between validation and persistence sanitization are documented in [backend scanning](../../modules/wines/architecture.md).

## Distributed cached generation

```mermaid
sequenceDiagram
    actor C as Client A/B
    participant S as AI service
    participant L as Lease port
    participant R as Cache repository
    participant P as Provider

    C->>S: ensure profile/comparison
    S->>R: read complete bundle
    alt cache hit
        R-->>C: requested translation
    else miss
        S->>L: acquire(lockKey, owner, ttl)
        alt lease acquired
            S->>R: double check
            S->>P: one ES+EN generation
            P-->>S: bundle
            S->>R: persist both translations
            S->>L: release
            S-->>C: content
        else another owner
            loop bounded polling
                S->>R: reread cache
            end
            R-->>C: content or controlled timeout
        end
    end
```

[View the full “Distributed cached generation” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-request-lifecycle-ab02478c7639.svg)

## Related documents

- [API](../architecture/api.md)
- [Errors, transactions, and consistency](../architecture/errors-transactions-and-consistency.md)
- [Security](../architecture/security-and-authorization.md)
- [Wine search](../../modules/wines/architecture.md)
- [Mobile scanning](../../modules/wines/architecture.md)
