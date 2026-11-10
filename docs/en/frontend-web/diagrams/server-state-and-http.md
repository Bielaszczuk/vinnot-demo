# Web server-state and HTTP diagrams

## Cookie restoration and tab isolation

```mermaid
sequenceDiagram
    participant UI as AuthProvider
    participant Lock as Coordinator / Web Lock
    participant API as BrowserAuthController
    participant Store as In-memory Redux
    UI->>Lock: Restore session
    Lock->>API: POST /auth/web/refresh + HttpOnly cookie + Origin
    API->>API: Validate origin and rotate refresh
    API-->>Lock: Set-Cookie + access JSON
    Lock->>Store: Access if generation is current
    UI->>API: GET /auth/me with Bearer
    API-->>Store: Identity
    Note over Store: Do not persist credentials in localStorage
```

[View the full “Cookie restoration and tab isolation” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-server-state-and-http-c15635e94e10.svg)

The cookie uses credentials and X-Vinnot-Web-Session. Non-secret tab events
clear identity/cache on logout and restore new identity on login. Pending work
from older generations is discarded. Administrative reauthentication follows
the [backend sequence](../../backend/architecture/authentication-and-identity.md).

## Query identity

```mermaid
flowchart LR
    INPUT["search + filters + page + locale"] --> KEY["deterministic query key"]
    KEY --> CACHE{"fresh cache"}
    CACHE -->|yes| MODEL["domain model"]
    CACHE -->|no| SERVICE["application service"]
    SERVICE --> CLIENT["DTO client"]
    CLIENT --> API["API"]
    API --> MAP["mapper"]
    MAP --> CACHE
```

[View the full “Query identity” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-server-state-and-http-49b0437be91d.svg)

## Identity change

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

[View the full “Identity change” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-server-state-and-http-73622d631157.svg)

## Error taxonomy

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

[View the full “Error taxonomy” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-server-state-and-http-34952bc170bc.svg)
