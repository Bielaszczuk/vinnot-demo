# Mobile navigation and session diagrams

## Access tree

```mermaid
flowchart TB
    ENTRY["Entry, deep link or push tap"] --> BOOT{"session resolved"}
    BOOT -->|anonymous, product| AUTH["Welcome / Login; remember destination"]
    ENTRY -->|public information| PUBLIC["Legal / Help / Contact"]
    ENTRY -.->|URL| SERVICE["Service state: offline, timeout, 403, 429, 500, 503"]
    BOOT -->|authenticated| TERMS{"current terms accepted"}
    TERMS -->|no| ACCEPT["TermsGate: accept or sign out"]
    ACCEPT -->|accepted| PROFILE
    TERMS -->|yes| PROFILE{"profile complete"}
    PROFILE -->|no| COMPLETE["Complete profile"]
    PROFILE -->|yes| TABS["Tabs"]
    TABS --> HOME["Home"]
    TABS --> WINES["Wines root"]
    TABS --> EVENTS["Events"]
    TABS --> ROUTES["Routes list/detail"]
    HOME --> CELLAR["Cellar (Stack)"]
    USER --> CELLAR
    TABS --> USER["Profile"]
    WINES --> DETAIL["Wine detail"]
    WINES --> SCAN["Scan"]
    WINES --> COMPARE["Compare"]
    WINES --> AI["AI profile"]
    DETAIL --> WINERY["Winery detail"]
    EVENTS --> EVENT["Event detail"]
    EVENT --> PAYMENT["Payments return"]
    PAYMENT --> TICKETS["My tickets"]
    USER --> TICKETS
    USER --> COMMUNITY["Community"]
    USER --> ROLE{"role"}
    ROLE -->|PARTNER or ADMIN| PARTNER["Partner events"]
    ROLE -->|ADMIN or MODERATOR| ADMIN["Admin"]
```

[View the full “Access tree” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-navigation-and-session-5e8adc7f5cca.svg)

A tap on a push notification is another entry: while signed out, the target
screen is kept and opens after the login.

## Tab reset versus contextual back

```mermaid
sequenceDiagram
    participant U as User
    participant Tabs as Tabs layout
    participant Scan as Scan flow
    participant Detail as Wine detail
    U->>Scan: opens from Home origin=home
    Scan->>Detail: view result
    U->>Detail: back
    Detail-->>Scan: scan result/context
    U->>Tabs: taps Wines
    Tabs->>Tabs: replace wines/index
    Note over Tabs: detail/scan is not retained as tab root
```

[View the full “Tab reset versus contextual back” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-navigation-and-session-c969f9c76c04.svg)

## Refresh queue

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Refreshing: first eligible 401
    Refreshing --> Refreshing: additional 401 / enqueue
    Refreshing --> Replaying: refresh succeeds
    Replaying --> Idle: queue replayed
    Refreshing --> Clearing: refresh fails
    Clearing --> Anonymous: storage and cache cleared
```

[View the full “Refresh queue” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-navigation-and-session-c9cf1430801e.svg)
