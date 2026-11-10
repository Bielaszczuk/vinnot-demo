# Secuencias y estados de producto web

## Alcance de los diagramas

Estas vistas describen responsabilidades frontend. El servidor valida permisos,
transiciones y persistencia; los gráficos no definen nuevas reglas de negocio.
Las respuestas de error terminan en el estado de la operación, no en éxito implícito.

## Login social

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as Presentacion
    participant G as Adapter social
    participant S as authService
    participant B as Backend
    participant A as Estado de sesion
    U->>P: Elegir proveedor
    P->>G: Solicitar credencial
    alt Credencial disponible
        G-->>P: Token o codigo
        P->>S: socialLogin
        S->>B: Credencial del proveedor
        B-->>S: Usuario y tokens Vinnot
        S-->>A: Sesion mapeada
        A-->>P: Identidad actualizada
        P->>P: Destino o complete-profile
    else Cancelacion o fallo
        G-->>P: Resultado no autenticado
    end
```

[Ver diagrama de «Login social» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-product-processes-c7d4796f26cd.svg)

La restauración de una sesión guardada es distinta de este intercambio.
Véase [autenticación](../../modules/users/architecture.md).

## Busqueda y paginacion

```mermaid
flowchart TD
    INPUT["Texto y filtros"] --> DEBOUNCE["Debounce 400 ms"]
    DEBOUNCE --> TEXT{"Texto de al menos 2 caracteres"}
    TEXT -->|si| SEARCH["search"]
    TEXT -->|no| BROWSE["Sin search"]
    SEARCH --> ARGS["Filtro y pagina"]
    BROWSE --> ARGS
    ARGS --> KEY["TanStack query key"]
    KEY --> SERVICE["winesService"]
    SERVICE --> API["GET /wines"]
    API --> MAP["Modelos y metadata"]
    MAP --> VIEW["Tarjetas y controles"]
    VIEW --> NEXT{"hasNext"}
    NEXT -->|continuar| ARGS
```

[Ver diagrama de «Busqueda y paginacion» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-product-processes-5e947512f8a8.svg)

La página comienza en cero. La acumulación mobile y la navegación de páginas
web son presentaciones distintas del mismo contrato paginado.

## Perfil IA y representacion localizada

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as Pantalla IA
    participant Q as TanStack Query
    participant B as Backend
    U->>P: Abrir vino e idioma
    P->>Q: profile query
    Q->>B: GET profile
    B-->>Q: Disponibilidad o contenido
    Q-->>P: Estado de lectura
    opt Accion de generar
        U->>P: Generar
        P->>Q: generateAiProfile
        Q->>B: Solicitud de generacion
        B->>B: Resolver cache o proveedor
        B-->>Q: Resultado
        Q->>Q: Invalidar perfil y estado
        Q-->>P: Contenido actualizado
    end
    U->>P: Idioma activo distinto
    P->>Q: Mismo ID y nuevo language
    Q->>B: Leer representacion
```

[Ver diagrama de «Perfil IA y representacion localizada» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-product-processes-6a161f4c84f5.svg)

El gráfico no atribuye cada request al proveedor. La secuencia exacta y el
journey visual difieren por plataforma; ver [IA](../../modules/ai/architecture.md).

## Comparacion

```mermaid
stateDiagram-v2
    [*] --> Selecting
    Selecting --> Ready: A y B seleccionados
    Ready --> Requesting: Query habilitada por IDs
    Requesting --> Result: Respuesta mapeada
    Requesting --> RequestError: Fallo de consulta
    Result --> Selecting: Cambiar seleccion
    RequestError --> Selecting: Cambiar pareja
    Result --> [*]: Salir
```

[Ver diagrama de «Comparacion» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-product-processes-bd4f139fe56a.svg)

Los estados representan la operación; no afirman que todas las pantallas
tengan el mismo componente de error ni el mismo botón de reintento.

## Cava o reseña: escritura y cache

```mermaid
sequenceDiagram
    actor U as Usuario
    participant F as Formulario
    participant M as Mutation hook
    participant S as Servicio
    participant B as Backend
    U->>F: Editar y confirmar
    F->>F: Validar campos
    F->>M: ID del recurso y cambios
    M->>S: Operacion
    S->>B: DTO
    alt Aceptada
        B-->>M: Resultado
        M->>M: Invalidacion configurada
        M-->>F: Actualizar datos
    else Rechazada
        B-->>F: Error sin confirmar guardado
    end
```

[Ver diagrama de «Cava o reseña: escritura y cache» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-product-processes-0ee996948d8d.svg)

## Inscripcion a eventos

```mermaid
flowchart TD
    DETAIL["Detalle del evento"] --> SESSION{"Sesion"}
    SESSION -->|no| LOGIN["Login"]
    SESSION -->|si| FORM["Asistentes y contacto"]
    FORM --> REGISTER["registerForEvent"]
    REGISTER --> BACKEND["Backend valida cupo y reglas"]
    BACKEND --> STATE["Estado devuelto"]
    STATE --> USER["Confirmar asistencia"]
    STATE --> CHECKOUT["Checkout de Mercado Pago"]
    CHECKOUT --> WEBHOOK["El servidor verifica el pago con Mercado Pago"]
    CHECKOUT --> RETURN["/payments/return y recibo"]
    RETURN --> TICKETS["Mis entradas"]
    STATE --> ORGANIZER["Aprobar, esperar o rechazar"]
    USER --> UPDATE["Nueva respuesta del servidor"]
    WEBHOOK --> UPDATE
    ORGANIZER --> UPDATE
    UPDATE --> STATE
```

[Ver diagrama de «Inscripcion a eventos» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-product-processes-8eb0ae9b57b8.svg)

Inscripción y pago mantienen estados separados. Las acciones disponibles se
derivan del estado actual, no de una secuencia universal de pago.

## Envío desde la app y revisión

```mermaid
flowchart LR
    MOBILE["Captura mobile y busqueda"] --> FORM["Formulario y foto"]
    FORM --> API["POST /wines/submissions"]
    API --> DECISION{"Decision backend"}
    DECISION --> CATALOG["APPROVED / DUPLICATE"]
    DECISION --> REVIEW["NEEDS_REVIEW"]
    DECISION --> REJECTED["REJECTED"]
    REVIEW --> WEB["Panel de administración (web o app)"]
    WEB --> ACTION["APPROVE_NEW / MERGE_EXISTING / REJECT / REQUEST_CORRECTIONS"]
    ACTION --> SERVER["Decision persistida"]
    SERVER --> MY["Consulta de envios en mobile"]
```

[Ver diagrama de «Envío desde la app y revisión» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-web-diagrams-product-processes-69e8116b2ce9.svg)

La web no escanea. Su participación en este circuito es moderar envíos ya
recibidos; la app ofrece la misma revisión en su panel de administración.
Pueden revisar los roles ADMIN y MODERATOR. Las decisiones y los timestamps
pertenecen al backend.

## Referencias funcionales

- [Catálogo](../../modules/wines/architecture.md)
- [Cava](../../modules/cellar/architecture.md#web) y [reseñas](../../modules/reviews/architecture.md#web)
- [Eventos](../../modules/events/architecture.md#web), [bodegas](../../modules/wineries/architecture.md#web) y [rutas](../../modules/wine-routes/architecture.md#web)
- [Administración](../../modules/admin/architecture.md)
