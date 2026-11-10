# Diagramas de runtime y recuperación

## Orden seguro de arranque en development

```mermaid
flowchart TD
    START["EC2 running"] --> ENV["refresh runtime.env"]
    ENV --> LOGIN["temporary ECR login"]
    LOGIN --> PULL["compose pull"]
    PULL --> DB["up postgres"]
    DB --> API["up backend"]
    API --> FLYWAY["Flyway/startup"]
    FLYWAY --> HEALTH{"container health"}
    HEALTH -->|retry| HEALTH
    HEALTH -->|healthy| PROXY["up proxy"]
    HEALTH -->|deadline| DIAG["ps + bounded logs + failure"]
```

[Ver diagrama de «Orden seguro de arranque en development» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-runtime-and-recovery-7d6544d42a59.svg)

## Recuperación de base

```mermaid
flowchart TD
    INCIDENT["DB incident"] --> SELECT["select verified backup"]
    SELECT --> ISOLATED["isolated PostgreSQL"]
    ISOLATED --> RESTORE["restore dump"]
    RESTORE --> MIGRATE["Flyway validate/migrate"]
    MIGRATE --> CHECK["constraints/counts/smoke"]
    CHECK -->|fail| INVESTIGATE["do not switch traffic"]
    CHECK -->|pass| CONNECT["connect backend"]
    CONNECT --> PUBLIC["public health + critical flows"]
```

[Ver diagrama de «Recuperación de base» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-runtime-and-recovery-00f8af75db7e.svg)


## Production application recovery

```mermaid
flowchart TD
    LOCK["host release lock"] --> CHECK["approved digest + runtime/config + SQL inventory"]
    CHECK --> REPLACE["replace backend only; no migrations"]
    REPLACE --> HEALTH{"digest and expected revision healthy?"}
    HEALTH -->|yes| RECORD["record active and previous release"]
    HEALTH -->|no| RECOVER["restore compatible previous image"]
    RECOVER --> RESULT{"previous health?"}
    RESULT -->|yes| FAILED["deployment failed; service recovered"]
    RESULT -->|no| INCIDENT["preserve pending journal; operator recovery"]
```

[Ver diagrama de «Production application recovery» completo](https://images.vinnot.com/docs/diagrams/v1/es/infra-diagrams-runtime-and-recovery-1d0185551b3c.svg)
