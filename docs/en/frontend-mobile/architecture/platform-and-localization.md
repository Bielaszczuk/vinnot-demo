# Mobile platform, configuration, localization and UI

## Configuration and trust boundaries

Expo resolves `app.config.ts` using `EXPO_ENV`: development, staging or production.
`EXPO_PUBLIC_API_BASE_URL` is checked against the expected profile/channel destination.
`eas.json` defines development, preview, ios-simulator and production; preview uses
the development API and production requires `https://api.vinnot.com/api`. The
configuration policy rejects unknown environments and contradictory selectors;
staging requires an explicit URL. Local Metro retains its configurable URL.

`WINE_OPERATION_TIMEOUTS` budgets are 22000 ms for scan, 90000 for upload and
120000 for AI. General HTTP uses 15000 ms. These are client limits, not promised
latencies or provider deadlines.

OAuth client IDs and public URLs are not secrets. Passwords, refresh tokens,
private keys and backend credentials do not belong in public build variables.
Images and personal payloads are not canonical documentation content.

## Persistence and temporary resources

Auth uses SecureStore through `authSession.storage.ts`; the session is stored as
one atomic `vinnot.auth.session.v3` snapshot with
`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. The `v2` snapshot and separate access,
refresh and user keys are only read as legacy and removed on migration. Preferences use AsyncStorage through `uiPreferences.storage.ts`.
Application services isolate these adapters.

RTK cache is in-memory; declaring `QUERY_CACHE` does not implement persistence.
Scanner URI/OCR is workflow state: clearing references does not delete files.
Avatar/image selection services are separate from multipart transport.
API clients turn backend asset paths (`/api/uploads/...`) into absolute URLs with
`resolveApiAssetUrl`, because React Native cannot load relative URIs: users, auth,
social, wine reviews and comments (`resolveAuthorAssetUrls`), admin users and admin
reviews. Absolute URLs pass through unchanged, so it is idempotent. The `Avatar`
atom shows the initials when the photo fails to load and tries again when the URI
changes. The admin users row and action sheet show the photo through `Avatar`, with
the username's initial as fallback.

## Language resolution

UI supports `es-AR` and `en-US`. `resolveSupportedLocale` selects English for
prefix `en`, otherwise Spanish. Bootstrap uses device language, but persisted
preference wins. LanguagePreferenceProvider waits for hydration before syncing
i18next. Profile allows persisting a new selection.

For AI, `resolveAiContentLanguage` maps to `es`/`en` and includes language in
RTK arguments.

### Account language and time zone

`AccountLocaleSync` (inside `LanguagePreferenceProvider`) runs
`useAccountLocaleSync`. With a session and after UI hydration it calls
`usersService.syncAccountLocale` after each login or restored session,
whenever the persisted language changes, and when the app returns to the
foreground (`applicationLifecycleService`) with a different device time zone. The service maps the language with
`resolveAccountLanguage` (`es`/`en`), reads the device zone through
`timezoneGateway` (`expo-localization` `getCalendars()`, falling back to
`Intl.DateTimeFormat().resolvedOptions().timeZone`) and sends
`PATCH /users/me/preferences`. An `INVALID_TIMEZONE` rejection retries with the
language only. Failures are swallowed: the sync never blocks login or the
language switch. It uses JavaScript APIs of an already-installed module, so it
ships by OTA without a native build.

Dates, times, prices and numbers go through
[`format.ts`](../../../../frontend-mobile/src/shared/i18n/format.ts)
(`formatDate`, `formatTime`, `formatDateTime`, `formatPrice`, `formatNumber`),
which take the app language and resolve it with `resolveSupportedLocale`.
Components read them bound to the current language through `useFormatters`.
Screens that still call `Intl` or `toLocale*` directly (mostly admin) pass the
app language too, never a fixed locale.

There is no global HTTP language header. Available dictionaries do not certify
that every component string uses i18n. Scope is verified through keys and
consumers; commercial names and user input are not automatically translated.

### Country names

The catalogue stores each country with its ISO code and a Spanish name, and the
API returns only that name (`countryName`, `country.name`, regions). Hermes has
no `Intl.DisplayNames`, so
[`countryNames.ts`](../../../../frontend-mobile/src/domain/location/countryNames.ts)
keeps a table of the 116 seeded countries (ISO code to Spanish and English).
`localizeCountryName` matches the stored name ignoring case and accents, also
accepts the ISO code (the `MG` row resolves to Madagascar) and returns the
stored name unchanged when it does not know it. Components read it bound to the
current language through `useCountryName`. It only changes what is shown: wine,
cellar, winery, route, event and event-area screens and the admin pickers keep
sending the stored name or id to the API.

### Error messages

Users never see server or platform text. The transport layer
([`errors.ts`](../../../../frontend-mobile/src/infrastructure/api/errors.ts))
and the social sign-in gateway return translation keys (`authErrors.offline`,
`authErrors.timeout`, `authErrors.unexpected`, `authErrors.googleCancelled` and
so on) and stay free of i18next. `auth.service` maps known backend codes to
their own key and any other code to the operation's translated fallback.
`errorMessageKey` (in `localizeMessage.ts`) and `getMutationErrorMessage` keep
only a message that is a translation key and otherwise return the screen's
fallback; presentation translates the result. The event area search shows a
translated message instead of the geocoder's text.

### Administrative panel language

`AdminUserRow` resolves status, role and “Never” through i18next; locking takes
precedence over disabling. Last-access dates use the active language. Wine/route
lists and forms display translated labels for types, allergens, states, duration
and stop types. `ChipRow` accepts `optionLabel` to separate labels from values;
selecting “Red” still sends `RED`. The event editor uses `events.statusLabels`,
not the text field `events.status`. Statistics and review-detail dates use the
language selected in the app.

`AdminUserRow.test.tsx` and `AdminOptionLabels.test.tsx` verify real ES/EN
resources, language changes and preservation of selected values. Names, review
text, written reasons and unknown codes are preserved. These tests do not
establish visual acceptance of every screen on a physical device.

## Capabilities and permissions

The production Android candidate blocks inherited `RECORD_AUDIO` and
`SYSTEM_ALERT_WINDOW` permissions: scanning and image selection use photos,
without audio or overlays. Development retains its debugging permissions.
Camera, location and gallery access keep their current contract; storage required
by the picker on older Android versions is not blocked. Inspect the AAB manifest
and test camera/gallery/maps on a physical device before distribution. This
change requires a new native build.

| Capability | Integration |
|---|---|
| Social identity | Social service and native Google/Apple/Facebook adapter |
| Location | Expo Location gateway |
| Geocoding | Client/service transforming queries or coordinates |
| Maps | Platform components and external-map links |
| Camera/OCR | Expo Camera, processing and ML Kit |
| Files | Device URI and multipart |

Denied permission differs from provider error. Location does not authorize
access. OAuth must match platform bundle/origin and callback; frontend does not
manage backend-provider private keys.

## Theme, accessibility and animation

ThemeProvider exposes `lightTokens` and light; Expo also selects light UI.
Scheme preferences do not imply dark implementation across screens.

The [visual system](../../shared/design/visual-system.md) defines hierarchy and
tokens. Accessibility review includes label/role, focus, large text, keyboard,
modals and safe areas. These are test criteria, not automatic certification from
shared components.

AI animations convey presentation stages, not OpenAI percentage telemetry.
Minimum visual duration and HTTP timeout are separate mechanisms.

## Build and compatibility

EAS uses per-profile channels and `runtimeVersion.policy=appVersion`.
JavaScript updates require compatible binaries. Plugin, permission, native
dependency or capability changes require another validated binary. Preflight
neither signs distribution nor certifies physical execution.

`ios-simulator` excludes ML Kit through a plugin; it does not certify physical
binary OCR. The current `.github/workflows` inventory has no automatic EAS
workflow; package EAS scripts are manual entry points.

## Notices and status messages

The `ToastProvider` retains the `showToast/showSuccess/showError/showInfo` API and
renders `FeedbackNotice`, also reused by login and registration errors.
The surface uses Poppins and Vinnot tokens: white background, soft rose border,
burgundy accent and vector line icons, without emojis. Icon and message distinguish
the type, not color alone. Long text wraps across lines.

Notices appear below the safe area and offer a localized explicit close button
with a 44-point touch target. Up to three are shown; a new notice displaces the
oldest at that limit. Success/info/warning last four seconds and errors six.
Each notice owns its timer: another message does not restart its animation
or lifetime. Unmount cancels timers, animations and subscriptions.

Entrance combines opacity and an eight-point translation over 240 ms; exit takes
180 ms, without bounce. The system's `reduceMotionChanged` preference is observed;
reduced motion disables transitions. With a screen reader active, notices do not
auto-dismiss: manual dismissal and the three-notice limit still apply.
Errors/warnings use urgent announcements; other notices use polite announcements.
Failed preference reads fall back to static presentation without auto-expiration.
Inline errors remain while held by the form and do not become transient notices.

Native destructive confirmations retain their buttons, cancellation and platform
behavior. This redesign does not change authorization, business validation or HTTP calls.

## Social authentication availability

Facebook has explicit environment availability: `EXPO_ENV=production` hides its
button, rejects gateway calls and omits the native plugin and
`react-native-fbsdk-next` autolinking on both platforms. Omitting only the plugin
does not exclude linked SDKs. On iOS, `withIosExpoModuleExclusions.cjs` also
excludes the Expo adapter and combines that exclusion with simulator-only
ML Kit exclusions. After pod installation, the native preflight checks
`Podfile.lock` and stops compilation if a disabled Facebook SDK remains.
Development retains
the provider and can disable it using `EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED=false`.
The build decision is included in `extra.facebookLoginEnabled`; runtime keeps
the production block even if conflicting configuration is supplied. Google and
Apple retain their flows and separate environment credentials. Changes to plugins,
identifiers or URL schemes require a new native build.

On device builds, `withIosMlkitTextQualifier.cjs` qualifies ML Kit's `Text` type in
`@infinitered/react-native-mlkit-text-recognition` 5.0.1 during prebuild: SDK 58's
ExpoModulesCore makes `SwiftUI.Text` visible there, and the unqualified name no
longer compiles. The plugin is pinned to that version and fails on any other
version or source, so an upgrade is reviewed instead of shipping unpatched.

## Evidence

- [src/presentation/providers/ToastProvider.tsx](../../../../frontend-mobile/src/presentation/providers/ToastProvider.tsx)
- [src/presentation/components/ui/FeedbackNotice.tsx](../../../../frontend-mobile/src/presentation/components/ui/FeedbackNotice.tsx)
- [app.config.ts](../../../../frontend-mobile/app.config.ts)
- [react-native.config.js](../../../../frontend-mobile/react-native.config.js)
- [plugins/withIosExpoModuleExclusions.cjs](../../../../frontend-mobile/plugins/withIosExpoModuleExclusions.cjs)
- [plugins/withIosMlkitTextQualifier.cjs](../../../../frontend-mobile/plugins/withIosMlkitTextQualifier.cjs)
- [scripts/verify-native-ios-build.mjs](../../../../frontend-mobile/scripts/verify-native-ios-build.mjs)
- [eas.json](../../../../frontend-mobile/eas.json)
- [src/shared/config/constants.ts](../../../../frontend-mobile/src/shared/config/constants.ts)
- [src/shared/i18n/language.ts](../../../../frontend-mobile/src/shared/i18n/language.ts)
- [src/shared/i18n/localizeMessage.ts](../../../../frontend-mobile/src/shared/i18n/localizeMessage.ts)
- [src/domain/location/countryNames.ts](../../../../frontend-mobile/src/domain/location/countryNames.ts)
- [src/presentation/hooks/useCountryName.ts](../../../../frontend-mobile/src/presentation/hooks/useCountryName.ts)
- [src/infrastructure/api/errors.ts](../../../../frontend-mobile/src/infrastructure/api/errors.ts)
- [src/infrastructure/storage/authSession.storage.ts](../../../../frontend-mobile/src/infrastructure/storage/authSession.storage.ts)
- [src/infrastructure/storage/uiPreferences.storage.ts](../../../../frontend-mobile/src/infrastructure/storage/uiPreferences.storage.ts)

## Brand and capability feedback

The owner's SVGs remain in `assets/images/illustrations`. Lightweight transparent
`assets/brand/mark.png` and `wordmark.png` derivatives are byte-identical to web
and tinted with tokens in `VinnotBrand` and the loading mark. `assets/icon.png`,
adaptive icon, splash and favicon derive from the same design. Icon/splash
background is `#e6dacc`. Icon or splash changes require another binary; OTA
changes only the brand inside the UI.

UI images are WebP; PNG stays only for icons, the adaptive icon, splash,
favicon and the masters that `scripts/optimize-static-artwork.py` reads. Metro
bundles only the files the code imports, and `assetBundlePatterns` filters
that list: a file without an import adds nothing to the binary or the OTA.
#483 deleted 21 unused files from `assets/` (40.6 MB of the repository).

Sharing crosses a native service/gateway and distinguishes cancellation, success
and failure. `useCurrentTime` updates every thirty seconds and on foreground
return through the lifecycle service. Zero is a valid coordinate; missing values
are null. Button retains its accessible name while loading and declares
busy/disabled; TextField exposes help/error. Wine proposals use ES/EN. VoiceOver,
TalkBack, large fonts and acceptance of the new binary require physical checks.

### Grape-cluster loading animation

The loading mark paints grapes upward from the base in a gentle 3.4-second
cycle, holds the full color and fades before repeating; leaves start in the same faint tone and paint at the end of the upward fill.
It is not server completion telemetry and never delays a ready response. Web
uses a CSS mask/keyframes without JavaScript timers; mobile uses one Reanimated
UI value and cancels animation on unmount. Reduced motion shows the complete
static mark (mobile reads the preference at startup). Animation runs only during
loading/initialization; headers, footers, forms and installed icons remain static.
Launcher icons and native splash cannot run this UI animation.
