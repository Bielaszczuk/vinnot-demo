# Diagramas de server state y HTTP web

## Restauración con cookie y aislamiento de pestañas

```mermaid
sequenceDiagram
    participant UI as AuthProvider
    participant Lock as Coordinador / Web Lock
    participant API as BrowserAuthController
    participant Store as Redux en memoria
    UI->>Lock: Restaurar sesión
    Lock->>API: POST /auth/web/refresh + cookie HttpOnly + Origin
    API->>API: Validar origen y rotar refresh
    API-->>Lock: Set-Cookie + access JSON
    Lock->>Store: Access si generación sigue vigente
    UI->>API: GET /auth/me con Bearer
    API-->>Store: Identidad
    Note over Store: No persistir credenciales en localStorage
```

[Ver diagrama de «Restauración con cookie y aislamiento de pestañas» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-server-state-and-http-335011a13cec.svg)

La cookie se envía con credentials y la cabecera X-Vinnot-Web-Session.
Un evento no secreto entre pestañas limpia identidad/caché ante logout y restaura
la identidad nueva ante login. Las operaciones pendientes de otra generación
se descartan. Para reautenticación administrativa, ver la
[secuencia de backend](../../backend/architecture/authentication-and-identity.md).

## Identidad de query

```mermaid
flowchart LR
    INPUT["search + filters + page + locale"] --> KEY["deterministic query key"]
    KEY --> CACHE{"fresh cache"}
    CACHE -->|sí| MODEL["domain model"]
    CACHE -->|no| SERVICE["application service"]
    SERVICE --> CLIENT["DTO client"]
    CLIENT --> API["API"]
    API --> MAP["mapper"]
    MAP --> CACHE
```

[Ver diagrama de «Identidad de query» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-server-state-and-http-481f3e3544c9.svg)

## Cambio de identidad

```mermaid
sequenceDiagram
    participant Auth as Auth provider
    participant Store as Redux/storage
    participant Query as QueryClient
    participant UI as Router
    Auth->>Store: clear/replace identity
    Auth->>Query: queryClient.clear()
    Auth->>UI: route to safe destination
```

[Ver diagrama de «Cambio de identidad» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-server-state-and-http-73622d631157.svg)

## Taxonomía de error

```mermaid
flowchart TD
    E["raw Axios/API error"] --> N["normalize"]
    N --> V["validation"]
    N --> A["auth/forbidden"]
    N --> C["conflict"]
    N --> M["not found"]
    N --> O["offline/timeout"]
    N --> X["unexpected"]
```

[Ver diagrama de «Taxonomía de error» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-server-state-and-http-34952bc170bc.svg)
