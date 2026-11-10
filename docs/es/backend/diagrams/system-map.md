# Mapas del sistema backend

## Cómo leer estos diagramas

Cada vista responde una pregunta diferente. El contexto muestra actores y
sistemas externos; contenedores muestra procesos desplegables; módulos muestra
ownership; capas muestra dirección de dependencias. No deben mezclarse como si
fueran un único nivel de abstracción.

## Contexto del producto

```mermaid
flowchart LR
    VISITOR["Visitante"] --> VINNOT["Plataforma Vinnot"]
    USER["Usuario registrado"] --> VINNOT
    PARTNER["Partner / organizador"] --> VINNOT
    ADMIN["Administrador"] --> VINNOT

    VINNOT --> SOCIAL["Google / Apple / Facebook"]
    VINNOT --> AI["Proveedor de IA visual y textual"]
    VINNOT --> MAPS["Google Maps"]
    VINNOT --> MAIL["Proveedor de correo"]
    VINNOT --> OBJECTS["Object storage"]
    VINNOT --> PAYMENTS["Mercado Pago"]
```

[Ver diagrama de «Contexto del producto» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-system-map-62703e2b80ca.svg)

## Contenedores lógicos

```mermaid
flowchart TB
    WEB["React web<br/>Vite + React Router"]
    MOBILE["React Native mobile<br/>Expo Router"]
    API["Spring Boot API<br/>context path /api"]
    DB[("PostgreSQL<br/>Flyway")]
    STORE["R2, S3 o filesystem"]
    PROVIDERS["IA / Maps / OAuth / Email / Mercado Pago"]

    WEB -->|HTTPS JSON/multipart| API
    MOBILE -->|HTTPS JSON/multipart| API
    API -->|JDBC| DB
    API -->|FileStoragePort| STORE
    API -->|ports/adapters| PROVIDERS
```

[Ver diagrama de «Contenedores lógicos» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-system-map-881104931fc0.svg)

## Bounded contexts y ownership

### Módulos de dominio

```mermaid
flowchart TB
    SHARED["shared<br/>primitivas y adapters transversales"]
    subgraph MODULES["Módulos sobre shared"]
        USER["user<br/>identidad, sesión, perfil"]
        WINE["wine<br/>catálogo, scan, submissions"]
        WINERY["winery<br/>bodegas"]
        REGION["region<br/>países y regiones"]
        REVIEW["review<br/>reseñas, likes, comentarios"]
        CELLAR["cellar<br/>cava personal"]
        EVENT["event<br/>eventos e inscripciones"]
        ROUTE["wineroute<br/>rutas y paradas"]
        AI["ai<br/>perfil y comparación"]
        PAYMENT["payment<br/>checkout y reembolsos Mercado Pago"]
        COMMUNITY["community<br/>denuncias y bloqueos"]
        LEGAL["legal<br/>términos y aceptación"]
        SUPPORT["support<br/>consultas públicas"]
        NOTIFICATION["notification<br/>correo, push, preferencias y anuncios"]
        ACTIVITY["activity<br/>vistas de detalle y aperturas de la app"]
        ENGAGEMENT["engagement<br/>planificación de push de engagement"]
    end

    MODULES --> SHARED

    REVIEW -. "puerto de catálogo" .-> WINE
    CELLAR -. "puerto de vino" .-> WINE
    AI -. "puertos wine/winery" .-> WINE
    ROUTE -. "puerto de bodega/mapas" .-> WINERY
    PAYMENT -. "puertos event/user" .-> EVENT
    PAYMENT -. "puertos event/user" .-> USER
    COMMUNITY -. "casos de uso de borrado" .-> REVIEW
    EVENT -. "puertos de correo y push" .-> NOTIFICATION
    ENGAGEMENT -. "señales de actividad" .-> ACTIVITY
    ENGAGEMENT -. "puertos de push y presupuesto" .-> NOTIFICATION
    NOTIFICATION -. "registro de aperturas de push" .-> ACTIVITY
```

[Ver diagrama de «Módulos de dominio» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-system-map-4e67db85c986.svg)

### Fachadas y adaptadores

```mermaid
flowchart LR
    SHARING["sharing<br/>vistas previas de enlaces públicos"]
    PARTNER["partner<br/>adapter HTTP de eventos propios"]
    EVENT["event<br/>eventos e inscripciones"]
    ADMIN["admin<br/>fachada de lecturas operativas<br/>(query ports)"]
    USER["user<br/>identidad, sesión, perfil"]
    WINE["wine<br/>catálogo, scan, submissions"]
    REVIEW["review<br/>reseñas, likes, comentarios"]
    ROUTE["wineroute<br/>rutas y paradas"]
    NOTIFICATION["notification<br/>correo, push, preferencias y anuncios"]
    PUSHADMIN["PushAdministrationController<br/>AnnouncementController"]
    ENGAGEMENT["engagement<br/>planificación de push de engagement"]
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

[Ver diagrama de «Fachadas y adaptadores» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-system-map-b8a364ee5f17.svg)

Las flechas punteadas representan colaboración mediante contratos, no acceso a
repositorios JPA ajenos. `admin` y `partner` no son dueños de los agregados que
operan. `sharing` lee una proyección JDBC mínima y no importa otros módulos.
`event` representa a los módulos que envían correo o push: `review`,
`community`, `payment`, `user`, `wine`, `legal`, `support` y `admin` usan los
mismos puertos de `notification`. Los endpoints `/admin/notifications/**` no
viven en `admin`: los controllers de push y anuncios son de `notification` y
el de métricas de engagement, de `engagement`; `admin` sólo usa
`NotificationPort` para el resumen de moderación.

## Corte hexagonal de un módulo

Esta vista muestra el recorrido de ejecución, no flechas de imports.

```mermaid
flowchart LR
    HTTP["Controller / scheduler"] --> IN["Input port"]
    IN --> HANDLER["Command/Query handler"]
    HANDLER --> DOMAIN["Aggregate / VO / domain service"]
    HANDLER --> OUT["Output port"]
    OUT --> ADAPTER["JPA / R2 / S3 / OpenAI / Maps adapter"]
    ADAPTER --> TECH["DB o servicio externo"]

    style DOMAIN fill:#fceef2,stroke:#b51f55
    style IN fill:#f7f7f7,stroke:#555
    style OUT fill:#f7f7f7,stroke:#555
```

[Ver diagrama de «Corte hexagonal de un módulo» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-system-map-9c189559d814.svg)

La dependencia de código apunta hacia dominio/aplicación. El flujo de ejecución
puede continuar hacia afuera mediante un puerto, pero el handler sólo conoce la
interfaz.

## Separación CQRS lógica sobre una única base

```mermaid
flowchart TB
    CLIENT["Cliente"] --> CTRL["Web adapter"]
    CTRL --> KIND{"Intención"}
    KIND -->|cambiar estado| CMD["Command + handler"]
    KIND -->|leer/proyectar| QUERY["Query + handler"]
    CMD --> AGG["Agregado"]
    CMD --> REPO["Repository output port"]
    QUERY --> QPORT["Query/read output port"]
    QPORT --> PROJECTION["DTO / PageResult"]
    REPO --> DB[(PostgreSQL)]
    QPORT --> DB
```

[Ver diagrama de «Separación CQRS lógica sobre una única base» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-system-map-966016a0473c.svg)

CQRS aquí no implica dos bases ni event sourcing. Significa que la intención de
escritura y la proyección de lectura poseen contratos diferentes, permitiendo
optimizar read models sin contaminar agregados.

## Pipeline HTTP transversal

```mermaid
sequenceDiagram
    participant C as Cliente
    participant L as HttpRequestLoggingFilter
    participant R as RateLimitingFilter
    participant J as JwtAuthenticationFilter
    participant S as SecurityConfig/Method security
    participant W as Controller
    participant U as Use case
    participant E as GlobalExceptionHandler

    C->>L: request + X-Request-ID opcional
    L->>L: validar/generar requestId y MDC
    L->>J: continuar
    J->>J: validar Bearer y authorities
    J->>R: SecurityContext
    R->>R: resolver política y bucket
    R->>S: continuar con cuota disponible
    S->>W: autorización permitida
    W->>U: command/query
    alt éxito
        U-->>W: response
        W-->>C: status + JSON + X-Request-ID
    else error conocido o inesperado
        U-->>E: exception
        E-->>C: error estable + requestId
    end
    L->>L: status + duration + slow flag
```

[Ver diagrama de «Pipeline HTTP transversal» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-system-map-c28fac5fe997.svg)

## Persistencia y efectos externos

```mermaid
flowchart TD
    UC["Caso de uso transaccional"] --> DOMAIN["validar/mutar dominio"]
    DOMAIN --> SAVE["guardar vía puerto"]
    SAVE --> DB[("commit PostgreSQL")]
    UC --> EXTERNAL{"¿efecto externo?"}
    EXTERNAL -->|almacenamiento| STORAGE["R2/S3/filesystem"]
    EXTERNAL -->|IA antes de persistir cache| AI["provider"]
    EXTERNAL -->|email de acción de cuenta, síncrono| EMAIL["provider"]
    UC --> OUTBOX["external_effects en el mismo commit"]
    OUTBOX --> WORKER["DurableEffectWorker tras el commit"]
    WORKER --> NOTIFY["notificaciones de propuestas, soporte e inscripciones; limpieza de storage"]
```

[Ver diagrama de «Persistencia y efectos externos» completo](https://images.vinnot.com/docs/diagrams/v1/es/backend-diagrams-system-map-d2287295e92d.svg)

PostgreSQL no comparte transacción con S3, email ni IA. El flujo de avatar tiene
compensación específica del objeto nuevo ante fallo de persistencia; esto no es
una garantía general de todos los uploads. Perfiles IA usan cache/lease;
submissions coordinan escrituras mediante un advisory lock por clave de
identidad. El email de acciones de cuenta es síncrono, separado del commit
PostgreSQL; las notificaciones de propuestas, soporte e inscripciones se entregan
mediante el outbox durable `external_effects`.

## Navegación documental

- [Modelo de dominio UML](domain-class-model.md)
- [Ciclo detallado de requests](request-lifecycle.md)
- [Estados de dominio](domain-state-machines.md)
- [Datos, locks y consistencia](data-consistency.md)
- [Límites modulares](../architecture/module-boundaries.md)
- [Errores y transacciones](../architecture/errors-transactions-and-consistency.md)
- [DER y modelo relacional](../data/database-model.md)
- [Seguridad](../architecture/security-and-authorization.md)
