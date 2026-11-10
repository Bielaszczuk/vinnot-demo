# Mobile application maps

## Runtime composition

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

[View the full “Runtime composition” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-application-map-805e8a462fbb.svg)

Provider order is wiring, from outside in: `GestureHandler`, `SafeArea`, Redux,
`AuthProvider`, `LanguagePreferenceProvider` (with `AccountLocaleSync` inside),
`Theme`, `Toast`, `WineLabelCameraProvider` and `BottomSheetModalProvider`.
`AuthProvider` needs the store and configures transport; the language provider
sits under the session so it can sync the account preference. `RootNavigator`
mounts `PushNotificationsSync` and `ActivitySync` next to the Expo Router stack;
screens need safe area, query, locale, and session.

## Layers and dependency direction

```mermaid
flowchart LR
    ROUTE["app/: route shell"] --> SCREEN["presentation/screens or feature view"]
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

[View the full “Layers and dependency direction” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-application-map-ab22e3625624.svg)

`app/` only contains files Expo Router must interpret as routes or layouts.
Tests, styles, and helpers live under `src/`.

## Navigation tree

```mermaid
flowchart TB
    START["/"] --> DECIDE{"restored session"}
    DECIDE -->|unauthenticated| ONBOARD["(onboarding)/welcome"]
    DECIDE -->|authenticated| HOME["(app)/(tabs)/home"]
    ONBOARD --> PUBLIC["Legal / Help / Contact"]
    ONBOARD --> AUTH["(auth): login/register/reset/verify"]
    AUTH --> PROFILE_CHECK{"onboarding complete?"}
    PROFILE_CHECK -->|no| COMPLETE["(app)/complete-profile"]
    PROFILE_CHECK -->|yes| TABS["(app)/(tabs)"]
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

[View the full “Navigation tree” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-application-map-20733fc81e92.svg)

All five tabs intercept `tabPress` in `(tabs)/_layout.tsx` and call
`openTabRoot`, which resets only the selected tab's nested stack and keeps its
root list and filters instead of a stale detail/scan. Scan back navigation
retains its originating route.

The winery page opens from the winery name on the wine page or from a shared
link; the `wineries` list has no entry in the interface and is only reached with
back from a winery opened by link. `partner` and `partner/events` show the same
screen. The service-state screens (offline, timeout, 403, 429, 500 and 503) are
root routes that render `ServiceStateScreen` when opened by URL; inside a screen,
load errors are shown inline with `QueryErrorState`.

## State and data

```mermaid
flowchart TB
    SERVER["Server state"] --> QUERY["RTK Query cache in Redux"]
    SESSION["Auth/session"] --> REDUX["Redux auth slice"]
    UIPREF["Locale/preferences"] --> REDUXUI["Redux UI slice"]
    EPHEMERAL["Form/modal/animation"] --> LOCAL["local useState/reducer"]
    SECURE["refresh/session"] --> STORAGE["SecureStore adapter"]

    QUERY --> VIEW["ViewModel/screen"]
    REDUX --> VIEW
    REDUXUI --> VIEW
    LOCAL --> VIEW
```

[View the full “State and data” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-application-map-0918471dd1c5.svg)

RTK Query cache is part of Redux. Only successful mutations invalidate
resource/entity tags through `mutationTags`; comparisons are excluded from
automatic refresh. See [remote state](../architecture/remote-state-and-transport.md).

## Concurrent refresh

```mermaid
sequenceDiagram
    participant A as Request A
    participant B as Request B
    participant H as http.ts
    participant AUTH as injected auth handlers
    participant API as Backend

    A->>API: request with expired access
    B->>API: request with expired access
    API-->>H: 401 A
    H->>AUTH: refreshSession (single)
    API-->>H: 401 B
    H->>H: enqueue B
    AUTH-->>H: new access token
    H->>API: retry A
    H->>API: retry B from queue
```

[View the full “Concurrent refresh” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-application-map-8ebba53b04ed.svg)

`/auth/*` endpoints and retried requests do not enter refresh again, preventing
loops. Handlers are injected by `AuthProvider`, so infrastructure does not import
stores.

## Per-module flows

```mermaid
flowchart LR
    HOME --> DISCOVERY["discovery"]
    WINES --> SEARCH["search/filters"]
    WINES --> REVIEWS["reviews/comments"]
    WINES --> AI_FLOW["profile/comparison"]
    WINES --> SCAN_FLOW["scan/manual/submission"]
    EVENTS --> EVENT_FLOW["map/detail/registration"]
    CELLAR --> CELLAR_FLOW["inventory/stats"]
    PROFILE --> ACCOUNT["profile/locale/account"]
    ADMIN --> CRUD["operational management"]
    PARTNER --> OWN_EVENTS["owned events"]
```

[View the full “Per-module flows” diagram](https://images.vinnot.com/docs/diagrams/v1/en/frontend-mobile-diagrams-application-map-2f1fdfe1581f.svg)

## More diagrams

- [Navigation, session, and access](navigation-and-session.md)
- [Visual scan pipeline](wine-label-scan.md)
- [Mobile architecture](../architecture/overview.md)
- [Wine-label scanning](../../modules/wines/architecture.md)
