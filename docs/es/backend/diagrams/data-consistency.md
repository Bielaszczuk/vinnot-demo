# Datos, locks y consistencia

## Límites transaccionales

```mermaid
flowchart TB
    HTTP["HTTP request"] --> HANDLER["Handler @Transactional"]
    HANDLER --> LOAD["cargar agregados"]
    LOAD --> RULES["validar reglas/ownership"]
    RULES --> MUTATE["mutar dominio"]
    MUTATE --> SAVE["persistir por puertos"]
    SAVE --> COMMIT["commit PostgreSQL"]
    COMMIT --> RESPONSE["response"]

    HANDLER -. "submit/review: efectos dentro del handler" .-> PROVIDER["IA/email/storage"]
```

[Ver diagrama de «Límites transaccionales» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-data-consistency-bf55c9bd602e.svg)

Los handlers anotados definen la transacción; el proxy realiza commit tras su
retorno normal. Submit/review ejecutan reconocimiento, moderación, storage o
notificación durante esa orquestación. El coordinador IA y la limpieza de avatar
de cuenta tienen límites propios descritos en sus casos de uso.

## Capacidad de eventos bajo concurrencia

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

[Ver diagrama de «Capacidad de eventos bajo concurrencia» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-data-consistency-2cc32188a433.svg)

La secuencia representa dos altas que bloquean el mismo Event. No hay columna @Version involucrada. Las constraints protegen contadores >= 0 y current_attendees + held_attendees <= max_attendees cuando existe máximo. Revisión, confirmación y expiración toman evento antes de inscripción. La expiración usa una transacción corta por hold.

## Single-flight de IA

```mermaid
flowchart TD
    MISS["cache miss"] --> ACQUIRE["INSERT lease / takeover vencido"]
    ACQUIRE --> OWN{"¿owner?"}
    OWN -->|sí| CHECK["doble check cache"]
    CHECK --> GENERATE["provider ES+EN"]
    GENERATE --> SAVE["upsert bundle"]
    SAVE --> RELEASE["release lease"]
    OWN -->|no| POLL["poll cache acotado"]
    POLL --> READY{"¿bundle listo?"}
    READY -->|sí| RETURN["return cache"]
    READY -->|no y lease vencido| ACQUIRE
    READY -->|deadline| ERROR["timeout controlado"]
```

[Ver diagrama de «Single-flight de IA» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-data-consistency-617938c225bc.svg)

El lease expira para recuperarse de crash. La key diferencia perfil por vino y
comparación por par canónico. Una comparación sin bundle reutilizable requiere
respuesta validada del proveedor incluso para pares escasos; no genera una
plantilla de catálogo. Un fallo de generación no publica un bundle parcial.

## Coordinación de identidad de submissions

```mermaid
sequenceDiagram
    participant H as Submission handler
    participant L as Transactional lock port
    participant M as Duplicate matcher
    participant W as Wine repository
    participant S as Submission repository

    H->>L: lock(normalized wine+winery+vintage)
    H->>M: reconsultar catálogo dentro del lock
    alt duplicado
        H->>S: save DUPLICATE + matchedWineId
    else nuevo seguro
        H->>W: create Wine
        H->>S: save APPROVED + createdWineId
    else incierto
        H->>S: save NEEDS_REVIEW
    end
```

[Ver diagrama de «Coordinación de identidad de submissions» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-data-consistency-7e34cac28dce.svg)

El recheck es obligatorio incluso si el scan anterior no encontró match: otro
request pudo crear el vino entre ambas operaciones.

## DB versus storage

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

[Ver diagrama de «DB versus storage» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-data-consistency-60eb895c021d.svg)

Promoción copia la imagen. TransactionalFileStorageAdapter registra reconciliación antes de escribir y encola borrados; el worker verifica referencias y ejecuta cleanup tras commit. Todos los emails, incluidos los de cuenta, pasan por el [módulo de notificaciones](../../modules/notifications/architecture.md), que los escribe en el mismo outbox dentro de la transacción de negocio; ninguna transacción de negocio espera al proveedor de email. PostgreSQL y storage no comparten una transacción distribuida.

## Consistencia de la proyección de búsqueda

Los triggers actualizan `wine_catalog_search` dentro de la misma transacción que
el vino o el nombre de bodega. Por eso el read model es consistente al commit,
sin un consumidor asíncrono que introduzca lag.

## Reglas de revisión

- documentar isolation/locking cuando una regla depende de concurrencia;
- usar unique/check constraints como última barrera;
- no capturar `OptimisticLockException` como “no encontrado”;
- no hacer side effects irreversibles antes de validaciones;
- garantizar idempotencia de retries;
- observar tiempo esperando locks y tasa de conflictos;
- probar con dos transacciones reales, no sólo mocks.

## Sesiones y publicación

Las secuencias de refresh concurrente, publicación atómica y outbox están en [sesiones y efectos externos](../architecture/session-and-data-integrity.md).
