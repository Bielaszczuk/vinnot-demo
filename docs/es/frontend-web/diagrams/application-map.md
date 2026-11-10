# Mapas de la aplicación web

## Capas y dependencias

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

[Ver diagrama de «Capas y dependencias» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-application-map-f802780c6735.svg)

## Árbol de rutas

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

[Ver diagrama de «Árbol de rutas» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-application-map-592dc41f587f.svg)

## Sesión concurrente

```mermaid
sequenceDiagram
    participant P1 as Query A
    participant P2 as Query B
    participant HTTP as Axios transport
    participant AUTH as Auth callbacks
    participant API as API
    P1->>API: token vencido
    P2->>API: token vencido
    API-->>HTTP: 401 A
    HTTP->>AUTH: refresh único
    API-->>HTTP: 401 B
    HTTP->>HTTP: B espera promesa
    AUTH-->>HTTP: nuevo token
    HTTP->>API: replay A + B
```

[Ver diagrama de «Sesión concurrente» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-application-map-6e638f01f7ca.svg)

## Mutación e invalidación

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

[Ver diagrama de «Mutación e invalidación» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-application-map-841e265e2930.svg)

- [Routing y acceso](routing-and-access.md)
- [Server state y HTTP](server-state-and-http.md)

