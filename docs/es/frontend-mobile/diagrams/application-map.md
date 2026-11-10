# Mapas de la aplicación mobile

## Composición del runtime

```mermaid
flowchart TB
    ROOT["app/_layout.tsx"] --> FONTS["Expo Fonts + Splash"]
    ROOT --> PROVIDERS["AppProviders"]
    PROVIDERS --> GESTURE["1. GestureHandler"]
    GESTURE --> SAFE["2. SafeArea"]
    SAFE --> STORE["3. Redux store"]
    STORE -.-> QUERY["RTK Query appApi"]
    STORE --> AUTH["4. AuthProvider"]
    AUTH --> I18N["5. LanguagePreferenceProvider"]
    I18N --> LOCALE["6. AccountLocaleSync"]
    I18N --> THEME["7. Theme"]
    THEME --> TOAST["8. Toast"]
    TOAST --> CAMERA["9. WineLabelCameraProvider"]
    CAMERA --> SHEETS["10. BottomSheetModalProvider"]
    SHEETS --> NAV["RootNavigator"]
    NAV --> PUSH["PushNotificationsSync"]
    NAV --> ACTIVITY["ActivitySync"]
    NAV --> ROUTER["Expo Router Stack"]
```

[Ver diagrama de «Composición del runtime» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-application-map-805e8a462fbb.svg)

El orden de providers es parte del wiring y va de afuera hacia adentro:
`GestureHandler`, `SafeArea`, Redux, `AuthProvider`, `LanguagePreferenceProvider`
(con `AccountLocaleSync` adentro), `Theme`, `Toast`, `WineLabelCameraProvider` y
`BottomSheetModalProvider`. `AuthProvider` necesita el store y configura el
transporte; el idioma se monta debajo de la sesión para sincronizar la preferencia
de la cuenta. `RootNavigator` monta `PushNotificationsSync` y `ActivitySync` junto
al stack de Expo Router; las screens necesitan safe area, query, idioma y sesión.

## Capas y dirección de dependencia

```mermaid
flowchart LR
    ROUTE["app/: route shell"] --> SCREEN["presentation/screens o feature view"]
    SCREEN --> VM["presentation hook / ViewModel"]
    VM --> QH["query/mutation hooks"]
    QH --> SERVICE["application service"]
    SERVICE --> DOMAIN["domain models/mappers/validators"]
    SERVICE --> CLIENT["infrastructure API client"]
    CLIENT --> HTTP["central Axios transport"]
    HTTP --> API["Vinnot backend"]

    VM --> DEVICE_PORT["application device service"]
    DEVICE_PORT --> DEVICE["camera/location/storage/identity adapter"]
```

[Ver diagrama de «Capas y dirección de dependencia» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-application-map-4920df8a6055.svg)

`app/` sólo contiene archivos que Expo Router debe interpretar como rutas o
layouts. Tests, estilos y helpers viven en `src/`.

## Árbol de navegación

```mermaid
flowchart TB
    START["/"] --> DECIDE{"sesión restaurada"}
    DECIDE -->|no auth| ONBOARD["(onboarding)/welcome"]
    DECIDE -->|auth| HOME["(app)/(tabs)/home"]
    ONBOARD --> PUBLIC["Legal / Help / Contact"]
    ONBOARD --> AUTH["(auth): login/register/reset/verify"]
    AUTH --> PROFILE_CHECK{"onboarding completo?"}
    PROFILE_CHECK -->|no| COMPLETE["(app)/complete-profile"]
    PROFILE_CHECK -->|sí| TABS["(app)/(tabs)"]
    TABS --> HOME
    TABS --> WINES["wines stack"]
    TABS --> EVENTS["events stack"]
    TABS --> ROUTES["routes stack"]
    HOME --> CELLAR["(app)/cellar"]
    PROFILE --> CELLAR
    TABS --> PROFILE["profile"]
    WINES --> DETAIL["wines/[id]"]
    WINES --> SCAN["wines/scan"]
    WINES --> COMPARE["wines/compare"]
    WINES --> AI["wines/[id]/ai-profile"]
    WINES --> SUB["wines/submissions"]
    DETAIL --> WINERY["wineries/[id]"]
    WINERY -.->|back| WINERIES["wineries"]
    EVENTS --> EVENT_DETAIL["events/[id]"]
    EVENT_DETAIL --> PAY_RETURN["payments/return"]
    PAY_RETURN --> TICKETS["my-tickets, my-tickets/[id]"]
    PROFILE --> TICKETS
    PROFILE --> MY_SUB["my-submissions"]
    PROFILE --> COMMUNITY["community"]
    ROUTES --> ROUTE_DETAIL["routes/[id]"]
    HOME --> LEGACY_ROUTE["wine-routes/[id]"]
    PROFILE --> PARTNER["partner/events (= partner)"]
    PROFILE --> ADMIN["admin"]
    START -.->|URL| SERVICE["offline, timeout, 403, 429, 500, 503"]
```

[Ver diagrama de «Árbol de navegación» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-application-map-991e7500dfa6.svg)

Las cinco tabs interceptan `tabPress` en `(tabs)/_layout.tsx` y ejecutan
`openTabRoot`, que reinicia sólo el stack anidado de la tab elegida y conserva su
lista raíz y filtros en lugar de un detalle/scan viejo. El back contextual
del scan conserva el origen de navegación.

La ficha de bodega se abre desde el nombre de la bodega en la ficha del vino o
desde un enlace compartido; la lista `wineries` no tiene acceso en la interfaz y
sólo se alcanza con back desde una bodega abierta por enlace. `partner` y
`partner/events` muestran la misma pantalla. Las pantallas de estado del servicio
(sin conexión, tiempo agotado, 403, 429, 500 y 503) son rutas raíz que muestran
`ServiceStateScreen` cuando se abren por URL; dentro de una pantalla, los errores
de carga se muestran en línea con `QueryErrorState`.

## Estado y datos

```mermaid
flowchart TB
    SERVER["Server state"] --> QUERY["RTK Query cache in Redux"]
    SESSION["Auth/session"] --> REDUX["Redux auth slice"]
    UIPREF["Idioma/preferencias"] --> REDUXUI["Redux UI slice"]
    EPHEMERAL["Formulario/modal/animación"] --> LOCAL["useState/reducer local"]
    SECURE["refresh/session"] --> STORAGE["SecureStore adapter"]

    QUERY --> VIEW["ViewModel/screen"]
    REDUX --> VIEW
    REDUXUI --> VIEW
    LOCAL --> VIEW
```

[Ver diagrama de «Estado y datos» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-application-map-9c87488b178e.svg)

El store contiene la caché RTK Query. Sólo las mutaciones exitosas invalidan
tags por recurso/entidad mediante `mutationTags`; las comparaciones quedan fuera
de esta recarga automática. Ver [contrato de caché](../architecture/remote-state-and-transport.md).

## Refresh concurrente

```mermaid
sequenceDiagram
    participant A as Request A
    participant B as Request B
    participant H as http.ts
    participant AUTH as injected auth handlers
    participant API as Backend

    A->>API: request con access vencido
    B->>API: request con access vencido
    API-->>H: 401 A
    H->>AUTH: refreshSession (único)
    API-->>H: 401 B
    H->>H: encolar B
    AUTH-->>H: nuevo access token
    H->>API: retry A
    H->>API: retry B desde cola
```

[Ver diagrama de «Refresh concurrente» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-application-map-4de524c07204.svg)

Los endpoints `/auth/*` y requests ya reintentadas no entran de nuevo al refresh,
evitando loops. Los handlers se inyectan desde `AuthProvider` para que
infraestructura no importe stores.

## Flujos por módulo

```mermaid
flowchart LR
    HOME --> DISCOVERY["descubrimiento"]
    WINES --> SEARCH["búsqueda/filtros"]
    WINES --> REVIEWS["reseñas/comentarios"]
    WINES --> AI_FLOW["perfil/comparación"]
    WINES --> SCAN_FLOW["scan/manual/submission"]
    EVENTS --> EVENT_FLOW["mapa/detalle/registro"]
    CELLAR --> CELLAR_FLOW["inventario/stats"]
    PROFILE --> ACCOUNT["perfil/idioma/cuenta"]
    ADMIN --> CRUD["gestión operativa"]
    PARTNER --> OWN_EVENTS["eventos propios"]
```

[Ver diagrama de «Flujos por módulo» completo](https://images.vinnot.com/docs/diagrams/v1/es/frontend-mobile-diagrams-application-map-fb0e33418bc0.svg)

## Más diagramas

- [Navegación, sesión y acceso](navigation-and-session.md)
- [Pipeline visual de escaneo](wine-label-scan.md)
- [Arquitectura mobile](../architecture/overview.md)
- [Escaneo de etiquetas](../../modules/wines/architecture.md)
