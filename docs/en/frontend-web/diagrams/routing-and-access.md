# Web routing and access diagrams

## Guard decision

```mermaid
flowchart TD
    NAV["Navigation"] --> RESTORE{"auth restored"}
    RESTORE -->|no| WAIT["neutral fallback"]
    RESTORE -->|yes| PUBLIC{"public route"}
    PUBLIC -->|yes| PAGE["render page"]
    PUBLIC -->|no| AUTH{"authenticated"}
    AUTH -->|no| LOGIN["login + safe return target"]
    AUTH -->|yes| ROLE{"required role"}
    ROLE -->|matches| PAGE
    ROLE -->|does not match| FORBIDDEN["403"]
```

[View the full “Guard decision” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-routing-and-access-952ed0a623d3.svg)

## Partner ownership

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

[View the full “Partner ownership” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-web-diagrams-routing-and-access-aa928fe309b9.svg)

