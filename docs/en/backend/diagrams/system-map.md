# Backend system maps

## How to read these diagrams

Each view answers a different question. Context shows actors and external
systems; containers show deployable processes; modules show ownership; layers
show dependency direction. They should not be mixed as one abstraction level.

## Product context

```mermaid
flowchart LR
    VISITOR["Visitor"] --> VINNOT["Vinnot platform"]
    USER["Registered user"] --> VINNOT
    PARTNER["Partner / organizer"] --> VINNOT
    ADMIN["Administrator"] --> VINNOT

    VINNOT --> SOCIAL["Google / Apple / Facebook"]
    VINNOT --> AI["Visual and textual AI provider"]
    VINNOT --> MAPS["Google Maps"]
    VINNOT --> MAIL["Email provider"]
    VINNOT --> OBJECTS["Object storage"]
    VINNOT --> PAYMENTS["Mercado Pago"]
```

[View the full “Product context” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-system-map-5283bea9fed9.svg)

## Logical containers

```mermaid
flowchart TB
    WEB["React web<br/>Vite + React Router"]
    MOBILE["React Native mobile<br/>Expo Router"]
    API["Spring Boot API<br/>context path /api"]
    DB[("PostgreSQL<br/>Flyway")]
    STORE["R2, S3 or filesystem"]
    PROVIDERS["AI / Maps / OAuth / Email / Mercado Pago"]

    WEB -->|HTTPS JSON/multipart| API
    MOBILE -->|HTTPS JSON/multipart| API
    API -->|JDBC| DB
    API -->|FileStoragePort| STORE
    API -->|ports/adapters| PROVIDERS
```

[View the full “Logical containers” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-system-map-806e67e7556f.svg)

## Bounded contexts and ownership

### Domain modules

```mermaid
flowchart TB
    SHARED["shared<br/>cross-cutting primitives/adapters"]
    subgraph MODULES["Modules built on shared"]
        USER["user<br/>identity, session, profile"]
        WINE["wine<br/>catalog, scan, submissions"]
        WINERY["winery<br/>wineries"]
        REGION["region<br/>countries and regions"]
        REVIEW["review<br/>reviews, likes, comments"]
        CELLAR["cellar<br/>personal cellar"]
        EVENT["event<br/>events and registrations"]
        ROUTE["wineroute<br/>routes and stops"]
        AI["ai<br/>profile and comparison"]
        PAYMENT["payment<br/>Mercado Pago checkout and refunds"]
        COMMUNITY["community<br/>reports and blocks"]
        LEGAL["legal<br/>terms and acceptance"]
        SUPPORT["support<br/>public enquiries"]
        NOTIFICATION["notification<br/>email, push, preferences and announcements"]
        ACTIVITY["activity<br/>detail views and app opens"]
        ENGAGEMENT["engagement<br/>engagement push planning"]
    end

    MODULES --> SHARED

    REVIEW -. "catalog port" .-> WINE
    CELLAR -. "wine port" .-> WINE
    AI -. "wine/winery ports" .-> WINE
    ROUTE -. "winery/maps port" .-> WINERY
    PAYMENT -. "event/user ports" .-> EVENT
    PAYMENT -. "event/user ports" .-> USER
    COMMUNITY -. "deletion use cases" .-> REVIEW
    EVENT -. "email and push ports" .-> NOTIFICATION
    ENGAGEMENT -. "activity signals" .-> ACTIVITY
    ENGAGEMENT -. "push and budget ports" .-> NOTIFICATION
    NOTIFICATION -. "push open recording" .-> ACTIVITY
```

[View the full “Domain modules” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-system-map-a3aaf3f5a200.svg)

### Facades and adapters

```mermaid
flowchart LR
    SHARING["sharing<br/>public link previews"]
    PARTNER["partner<br/>owned-event HTTP adapter"]
    EVENT["event<br/>events and registrations"]
    ADMIN["admin<br/>operational read facade<br/>(query ports)"]
    USER["user<br/>identity, session, profile"]
    WINE["wine<br/>catalog, scan, submissions"]
    REVIEW["review<br/>reviews, likes, comments"]
    ROUTE["wineroute<br/>routes and stops"]
    NOTIFICATION["notification<br/>email, push, preferences and announcements"]
    PUSHADMIN["PushAdministrationController<br/>AnnouncementController"]
    ENGAGEMENT["engagement<br/>engagement push planning"]
    ENGADMIN["EngagementAdministrationController"]

    PARTNER --> EVENT
    PUSHADMIN --> NOTIFICATION
    ENGADMIN --> ENGAGEMENT
    ADMIN -.-> NOTIFICATION
    ADMIN -.-> USER
    ADMIN -.-> WINE
    ADMIN -.-> EVENT
    ADMIN -.-> REVIEW
    ADMIN -.-> ROUTE
```

[View the full “Facades and adapters” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-system-map-2ca720ce7890.svg)

Dashed arrows are contract collaboration, not access to another module's JPA
repository. `admin` and `partner` do not own operated aggregates. `sharing`
reads a minimal JDBC projection and imports no other module. `event` stands
for the modules that send email or push: `review`, `community`, `payment`,
`user`, `wine`, `legal`, `support` and `admin` use the same `notification`
ports. The `/admin/notifications/**` endpoints do not live in `admin`: the push
and announcement controllers belong to `notification` and the engagement
metrics one to `engagement`; `admin` only uses `NotificationPort` for the
moderation digest.

## Hexagonal slice of one module

This view shows runtime execution, not import arrows.

```mermaid
flowchart LR
    HTTP["Controller / scheduler"] --> IN["Input port"]
    IN --> HANDLER["Command/Query handler"]
    HANDLER --> DOMAIN["Aggregate / VO / domain service"]
    HANDLER --> OUT["Output port"]
    OUT --> ADAPTER["JPA / R2 / S3 / OpenAI / Maps adapter"]
    ADAPTER --> TECH["Database or external service"]

    style DOMAIN fill:#fceef2,stroke:#b51f55
    style IN fill:#f7f7f7,stroke:#555
    style OUT fill:#f7f7f7,stroke:#555
```

[View the full “Hexagonal slice of one module” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-system-map-48a93654a7c0.svg)

Code dependencies point inward toward domain/application. Runtime execution may
continue outward through a port, but handlers only know the interface.

## Logical CQRS separation over one database

```mermaid
flowchart TB
    CLIENT["Client"] --> CTRL["Web adapter"]
    CTRL --> KIND{"Intent"}
    KIND -->|change state| CMD["Command + handler"]
    KIND -->|read/project| QUERY["Query + handler"]
    CMD --> AGG["Aggregate"]
    CMD --> REPO["Repository output port"]
    QUERY --> QPORT["Query/read output port"]
    QPORT --> PROJECTION["DTO / PageResult"]
    REPO --> DB[(PostgreSQL)]
    QPORT --> DB
```

[View the full “Logical CQRS separation over one database” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-system-map-db3065d6867e.svg)

CQRS here does not imply two databases or event sourcing. Write intent and read
projection have different contracts, enabling optimized read models without
polluting aggregates.

## Cross-cutting HTTP pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant L as HttpRequestLoggingFilter
    participant R as RateLimitingFilter
    participant J as JwtAuthenticationFilter
    participant S as SecurityConfig/Method security
    participant W as Controller
    participant U as Use case
    participant E as GlobalExceptionHandler

    C->>L: request + optional X-Request-ID
    L->>L: validate/generate requestId and MDC
    L->>J: continue
    J->>J: validate Bearer and authorities
    J->>R: SecurityContext
    R->>R: resolve policy + bucket
    R->>S: continue when quota remains
    S->>W: authorization allowed
    W->>U: command/query
    alt success
        U-->>W: response
        W-->>C: status + JSON + X-Request-ID
    else known or unexpected error
        U-->>E: exception
        E-->>C: stable error + requestId
    end
    L->>L: status + duration + slow flag
```

[View the full “Cross-cutting HTTP pipeline” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-system-map-265852f60e49.svg)

## Persistence and external effects

```mermaid
flowchart TD
    UC["Transactional use case"] --> DOMAIN["validate/mutate domain"]
    DOMAIN --> SAVE["save through port"]
    SAVE --> DB[("PostgreSQL commit")]
    UC --> EXTERNAL{"external effect?"}
    EXTERNAL -->|storage| STORAGE["R2/S3/filesystem"]
    EXTERNAL -->|AI before cache persistence| AI["provider"]
    EXTERNAL -->|account-action email, synchronous| EMAIL["provider"]
    UC --> OUTBOX["external_effects in same commit"]
    OUTBOX --> WORKER["DurableEffectWorker after commit"]
    WORKER --> NOTIFY["submission, support and registration notifications; storage cleanup"]
```

[View the full “Persistence and external effects” diagram](https://images.vinnot.com/docs/diagrams/v1/en/backend-diagrams-system-map-fc755744ee5c.svg)

PostgreSQL shares no transaction with S3, email, or AI. The avatar flow has
specific compensation for a new object when persistence fails; this is not a
general guarantee for all uploads. AI profiles use cache/leases; submissions
coordinate writes through an advisory lock per identity key. Account-action email
is synchronous and separate from the PostgreSQL commit; submission, support and
registration notifications are delivered through the durable `external_effects`
outbox.

## Documentation navigation

- [UML domain model](domain-class-model.md)
- [Detailed request lifecycle](request-lifecycle.md)
- [Domain state machines](domain-state-machines.md)
- [Data, locks, and consistency](data-consistency.md)
- [Module boundaries](../architecture/module-boundaries.md)
- [Errors and transactions](../architecture/errors-transactions-and-consistency.md)
- [ERD and relational model](../data/database-model.md)
- [Security](../architecture/security-and-authorization.md)
