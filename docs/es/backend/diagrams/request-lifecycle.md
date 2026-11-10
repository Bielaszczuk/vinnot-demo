# Ciclo de vida de requests y casos de uso

## Lectura pública paginada

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

[Ver diagrama de «Lectura pública paginada» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-request-lifecycle-7ac2b62e5023.svg)

El borde público limita tamaño/ventana; PageQuery representa parámetros de aplicación. El read model SQL selecciona e hidrata entidades, el adapter las transforma a dominio y el handler proyecta DTOs. No se expone Page<JpaEntity>. Los filtros efectivos y totales se detallan en [búsqueda](../../modules/wines/architecture.md).

## Command transaccional

```mermaid
sequenceDiagram
    actor U as Usuario
    participant C as Controller
    participant H as CommandHandler
    participant R as RepositoryPort
    participant A as Aggregate
    participant DB as PostgreSQL

    U->>C: request mutante + JWT
    C->>H: Command(principal, input)
    H->>R: findById
    R->>DB: SELECT
    DB-->>H: dominio mapeado
    H->>H: ownership/precondiciones
    H->>A: método de negocio
    A->>A: invariantes/transición
    H->>R: save(Aggregate)
    R->>DB: INSERT/UPDATE
    DB-->>H: resultado de persistencia
    H-->>C: resultado mediante proxy transaccional
    Note over C,DB: Commit del proxy al retornar el handler y antes de continuar el controller
    C-->>U: status + DTO
```

[Ver diagrama de «Command transaccional» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-request-lifecycle-93dfe7341238.svg)

## Error estable

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

[Ver diagrama de «Error estable» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-request-lifecycle-a994706dc54c.svg)

El body del advice contiene timestamp, path, status, code, message y details. X-Request-ID pertenece al header/MDC, no a ese record. Filtros de seguridad/rate limiting pueden terminar la solicitud antes de MVC y escriben sus propias respuestas. No se atribuye al advice un mapper específico para cada excepción de framework.

## Multipart de escaneo

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

[Ver diagrama de «Multipart de escaneo» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-request-lifecycle-bbcc8227266e.svg)

El pipeline completo, los errores y la diferencia entre validación y sanitización persistida están en [escaneo backend](../../modules/wines/architecture.md).

## Generación cacheada distribuida

```mermaid
sequenceDiagram
    actor C as Cliente A/B
    participant S as AI service
    participant L as Lease port
    participant R as Cache repository
    participant P as Provider

    C->>S: ensure profile/comparison
    S->>R: leer bundle completo
    alt cache hit
        R-->>C: traducción solicitada
    else miss
        S->>L: acquire(lockKey, owner, ttl)
        alt lease adquirido
            S->>R: doble check
            S->>P: una generación ES+EN
            P-->>S: bundle
            S->>R: persistir ambas traducciones
            S->>L: release
            S-->>C: contenido
        else otro owner
            loop polling acotado
                S->>R: releer cache
            end
            R-->>C: contenido o timeout controlado
        end
    end
```

[Ver diagrama de «Generación cacheada distribuida» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-request-lifecycle-505a4a0a97ac.svg)

## Relaciones con otros documentos

- [API](../architecture/api.md)
- [Errores, transacciones y consistencia](../architecture/errors-transactions-and-consistency.md)
- [Seguridad](../architecture/security-and-authorization.md)
- [Búsqueda de vinos](../../modules/wines/architecture.md)
- [Escaneo mobile](../../modules/wines/architecture.md)
