# Diagramas de routing y acceso web

## Decisión de guard

```mermaid
flowchart TD
    NAV["Navegación"] --> RESTORE{"auth restaurada"}
    RESTORE -->|no| WAIT["fallback neutral"]
    RESTORE -->|sí| PUBLIC{"ruta pública"}
    PUBLIC -->|sí| PAGE["render page"]
    PUBLIC -->|no| AUTH{"autenticado"}
    AUTH -->|no| LOGIN["login + return target seguro"]
    AUTH -->|sí| ROLE{"rol requerido"}
    ROLE -->|cumple| PAGE
    ROLE -->|no cumple| FORBIDDEN["403"]
```

[Ver diagrama de «Decisión de guard» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-routing-and-access-063f41121df0.svg)

## Ownership partner

```mermaid
sequenceDiagram
    participant Page as Partner page
    participant Guard as PartnerLayout
    participant API as Partner API
    participant UseCase as Event use case
    Page->>Guard: route
    Guard-->>Page: role allows UI
    Page->>API: update event
    API->>UseCase: principal + event id
    UseCase->>UseCase: verify organizer ownership
    alt owned
        UseCase-->>Page: success
    else not owned
        UseCase-->>Page: 403
    end
```

[Ver diagrama de «Ownership partner» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-routing-and-access-aa928fe309b9.svg)

