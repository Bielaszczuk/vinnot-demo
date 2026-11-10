# Diagramas de navegación y sesión mobile

## Árbol de acceso

```mermaid
flowchart TB
    ENTRY["Entrada, deep link o toque en un push"] --> BOOT{"sesión resuelta"}
    BOOT -->|anónimo, producto| AUTH["Welcome / Login; guardar destino"]
    ENTRY -->|información pública| PUBLIC["Legal / Help / Contact"]
    ENTRY -.->|URL| SERVICE["Estado del servicio: offline, timeout, 403, 429, 500, 503"]
    BOOT -->|autenticado| TERMS{"términos vigentes aceptados"}
    TERMS -->|no| ACCEPT["TermsGate: aceptar o cerrar sesión"]
    ACCEPT -->|aceptados| PROFILE
    TERMS -->|sí| PROFILE{"perfil completo"}
    PROFILE -->|no| COMPLETE["Complete profile"]
    PROFILE -->|sí| TABS["Tabs"]
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

[Ver diagrama de «Árbol de acceso» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-navigation-and-session-850d066cfa2b.svg)

Un toque en una notificación push es otra entrada: si no hay sesión, la
pantalla destino queda guardada y se abre después del login.

## Reset de tab versus back contextual

```mermaid
sequenceDiagram
    participant U as Usuario
    participant Tabs as Tabs layout
    participant Scan as Scan flow
    participant Detail as Wine detail
    U->>Scan: abre desde Home origin=home
    Scan->>Detail: ver resultado
    U->>Detail: volver
    Detail-->>Scan: resultado/contexto de scan
    U->>Tabs: toca Vinos
    Tabs->>Tabs: replace wines/index
    Note over Tabs: no conserva detail/scan como raíz de tab
```

[Ver diagrama de «Reset de tab versus back contextual» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-navigation-and-session-06fdc453d428.svg)

## Cola de renovación

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Refreshing: primer 401 elegible
    Refreshing --> Refreshing: 401 adicional / encolar
    Refreshing --> Replaying: refresh exitoso
    Replaying --> Idle: cola reintentada
    Refreshing --> Clearing: refresh fallido
    Clearing --> Anonymous: storage y cache limpios
```

[Ver diagrama de «Cola de renovación» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-navigation-and-session-adaad8f4cb64.svg)
