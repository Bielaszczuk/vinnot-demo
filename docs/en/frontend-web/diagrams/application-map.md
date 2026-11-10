# Web application maps

## Layers and dependencies

```mermaid
flowchart LR
    PAGE["Page"] --> VM["ViewModel"]
    VM --> HOOK["Query/mutation hook"]
    HOOK --> APP["Application service"]
    APP --> DOMAIN["Domain mapper/validator"]
    APP --> CLIENT["Infrastructure client"]
    CLIENT --> HTTP["Central transport"]
    HTTP --> API["Backend API"]
```

[View the full “Layers and dependencies” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-application-map-f802780c6735.svg)

## Route tree

```mermaid
flowchart TB
    ROUTES["Routes"] --> BARE["Auth pages / complete-profile"]
    ROUTES --> RETURN["/payments/return (no guard)"]
    ROUTES --> PPAY["/partner/payments + callback (flag)"]
    ROUTES --> ROOT["AppShell"]
    ROOT --> PUBLIC["Home / about / contact / legal / service states"]
    ROOT --> PROTECTED{"ProtectedLayout"}
    PROTECTED --> CATALOG["Wines / events / wineries / wine routes"]
    PROTECTED --> PROFILE["Profile / cellar / community / my-tickets"]
    PROTECTED --> WINEOPS["Compare / scan / AI profile"]
    ROOT --> PARTNER{"PartnerLayout: PARTNER or ADMIN"}
    PARTNER --> PEVENTS["Owned events"]
    ROOT --> ADMIN{"AdminLayout: ADMIN or MODERATOR"}
    ADMIN --> CRUD["Wines / wineries / events / routes / reviews"]
    ADMIN --> MOD["Wine submissions / publications / community"]
    ROOT --> ONLY{"AdminOnlyLayout: ADMIN"}
    ONLY --> USERS["Users / notifications / app versions"]
```

[View the full “Route tree” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-application-map-592dc41f587f.svg)

## Concurrent session

```mermaid
sequenceDiagram
    participant P1 as Query A
    participant P2 as Query B
    participant HTTP as Axios transport
    participant AUTH as Auth callbacks
    participant API as API
    P1->>API: expired token
    P2->>API: expired token
    API-->>HTTP: 401 A
    HTTP->>AUTH: single refresh
    API-->>HTTP: 401 B
    HTTP->>HTTP: B awaits promise
    AUTH-->>HTTP: new token
    HTTP->>API: replay A + B
```

[View the full “Concurrent session” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-application-map-0b8756a3ba3b.svg)

## Mutation and invalidation

```mermaid
sequenceDiagram
    participant UI as Page
    participant M as Mutation hook
    participant S as Service
    participant API as Backend
    participant Q as Query cache
    UI->>M: submit domain input
    M->>S: execute
    S->>API: DTO request
    API-->>S: response
    S-->>M: mapped model
    M->>Q: invalidate bounded keys
    Q-->>UI: refreshed state
```

[View the full “Mutation and invalidation” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-application-map-841e265e2930.svg)

- [Routing and access](routing-and-access.md)
- [Server state and HTTP](server-state-and-http.md)
