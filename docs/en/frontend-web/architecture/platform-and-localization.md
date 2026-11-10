# Web platform, configuration, localization and UI

## Configuration and trust boundaries

Vite resolves aliases, base and variables in `vite.config.ts`. Development uses
port 3000 and an `/api` proxy to local backend. `VITE_BASE_PATH` controls bundle
base and `VITE_GENERATE_SOURCEMAP=true` enables sourcemaps.

`dev:mock` enables MSW/fixtures, not real authorization or persistence checks.
HTTP client configures URL and timeout; methods can declare overrides.

OAuth client IDs and public URLs are not secrets. Passwords, refresh tokens,
private keys and backend credentials do not belong in public build variables.
Images and personal payloads are not canonical documentation content.

## Persistence and temporary resources

Only UI preferences and non-secret coordination markers use localStorage.
Access and identity remain in memory; refresh uses a backend HttpOnly cookie.
`persistence.ts` removes legacy credentials during migration. QueryClient retains responses in memory. Object URLs for
private submission-image blobs are revoked when detail changes or closes.

Browsers provide File/Blob for uploads. Backend validates size, format and
authorization; preview is not file publication.

## Language resolution

i18next starts in the saved language (`vinnot.language.v1` in localStorage) or,
when none is supported, in `es-AR`; it falls back to `es-AR` and registers
`es-AR`/`en-US` resources. Each language change is persisted through
`languagePreference.storage.ts` and mirrored on `<html lang>`; with blocked
storage the change applies to the current view only. This is not automatic
browser-language detection. AI hooks map the
active language's `en` prefix to `en`, otherwise to `es`.

### Account language and time zone

While a session is active, `AccountLocaleSync` (mounted inside `AuthProvider`)
runs `useAccountLocaleSync`, which calls `usersService.syncAccountLocale` after
each login, social login or restored session, whenever the interface
language changes, and when the page becomes visible or focused again with a
different browser time zone. The service maps the UI language with `toPreferredLanguage`
(`en-*` to `en`, otherwise `es`), reads the browser zone through
`timezoneGateway` (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and sends
`PATCH /users/me/preferences`. If the server rejects the zone
(`INVALID_TIMEZONE`) it retries with the language only. Failures are swallowed:
the sync never blocks login or the language switch, and the next login retries.
The backend uses these values as the notification locale and time zone.

react-i18next resolves UI resources. Backend selects semantic AI content through
`language`; components do not translate it.

There is no global HTTP language header. Available dictionaries do not certify
that every component string uses i18n. Scope is verified through keys and
consumers; commercial names and user input are not automatically translated.

### Administrative panel language

Review, submission, report and pending-publication dates, statistics and admin
counts use the active language. The route editor translates stops and GPS status.
The event form shared with partners uses ES/EN resources for fields, registration,
geocoding and explicit validations. `createEventFormSchema` accepts a translator;
date/capacity rules remain unchanged. `EventDateTimeField` selects an ES/EN locale
for its calendar and text, preserving the local `YYYY-MM-DDTHH:mm` value without
converting its time zone.

`EventFormLocalization.test.tsx` checks the picker, registration settings and date
rules with real resources. Translated labels retain the original API codes. Names
and user-provided text are not translated automatically; these tests do not
certify the entire product UI.

## Capabilities and permissions

| Capability | Integration |
|---|---|
| Social identity | Social service and web SDK adapter |
| Location | Browser geolocation |
| Geocoding | Client/service transforming queries or coordinates |
| Maps | Platform components and external-map links |
| Camera/OCR | Exclusive to the mobile application |
| Files | File/Blob and multipart |

Denied permission differs from provider error. Location does not authorize
access. OAuth must match platform bundle/origin and callback; frontend does not
manage backend-provider private keys.

## Theme, accessibility and animation

ThemeProvider applies the `dark` class for light/dark/system selection and
observes `prefers-color-scheme` in system mode.

The [visual system](../../shared/design/visual-system.md) defines hierarchy and
tokens. Accessibility review includes label/role, focus, large text, keyboard,
modals and safe areas. These are test criteria, not automatic certification from
shared components.

AI animations convey presentation stages, not OpenAI percentage telemetry.
The web plays the watercolor `AiProcessScene` (see
[imagery](../../shared/design/imagery.md#ai-loading-scenes)) while the request
is pending; the steps advance on a timer, the last one waits for the answer, and
reduced motion shows each scene's final pose. The HTTP timeout is a separate
mechanism.

## Build and compatibility

Build executes TypeScript and Vite; deployment publishes artifacts without EAS.
The scan route invites users to download mobile; it neither captures nor
recognizes images. Web and mobile have independent delivery lifecycles.

## Notices and status messages

The `ToastProvider` owns ephemeral state and retains the `addToast/removeToast` API.
`ToastContainer` manages each notice's presentation and lifecycle.
The shared `AlertBanner` surface serves both toasts and inline messages,
including login, registration and contact. It uses Poppins, the wine palette,
light cards with soft borders and Lucide icons, without emojis or saturated color blocks.

Toasts sit at the top right, respecting safe areas and available width.
Entrance takes 240 ms with opacity and an eight-pixel translation; exit takes
180 ms. `prefers-reduced-motion` disables animations. The close button has an
ES/EN label, visible focus and a 44-pixel target. Errors/warnings use
`role=alert`; information/success use `role=status`. Text wraps without truncation.

Each notice has an independent timer (four seconds by default; six for errors).
The `duration` contract still allows an explicit duration or persistence with
zero or a negative value. Hover and keyboard focus pause the remaining time
without restarting it. Unmount cancels expiration/exit timers.
Inline notices do not expire and preserve consumer titles, content and actions.
Validation, requests, field errors and business confirmations are unchanged.

## Evidence

- [src/presentation/components/feedback/ToastContainer.tsx](../../../../frontend-react/src/presentation/components/feedback/ToastContainer.tsx)
- [src/presentation/components/feedback/AlertBanner.tsx](../../../../frontend-react/src/presentation/components/feedback/AlertBanner.tsx)
- [vite.config.ts](../../../../frontend-react/vite.config.ts)
- [src/shared/i18n/index.ts](../../../../frontend-react/src/shared/i18n/index.ts)
- [src/presentation/stores/persistence.ts](../../../../frontend-react/src/presentation/stores/persistence.ts)
- [src/app/providers/ThemeProvider.tsx](../../../../frontend-react/src/app/providers/ThemeProvider.tsx)
- [src/infrastructure/identity/socialIdentity.gateway.ts](../../../../frontend-react/src/infrastructure/identity/socialIdentity.gateway.ts)

## Shared visual identity with native

`VinnotBrand` uses the grape cluster and Vinnot wordmark from the owner's SVGs
kept in `frontend-mobile/assets/images/illustrations`; transparent PNG
derivatives under 30 KB each are served from `images/brand`. CSS masks apply
theme color without distorting artwork; the accessible name is “Vinnot”. Header,
menu, footer and account screens use this brand. PNG/ICO favicons derive from
the beige-background icon.

Home and `AuthEditorialPanel` use `src/shared/assets/home-hero.webp`, derived
from native artwork, with a burgundy contrast overlay. The four categories use
the WebP glasses in `src/shared/assets/glasses` and preserve the existing `type`
filters. `brandAssets` centralizes hero, glasses and brand (`mark`/`wordmark` in
`public/images/brand`); a test verifies byte equality of glasses and brand
against the mobile originals. Glasses are lazy
loaded; the hero receives high fetch priority.

Poppins 400/500/600/700 is hosted in `public/fonts/poppins`, with
`font-display: swap` and its licence included. No external font provider is
requested. The responsive composition preserves presentation, use-case and
transport contracts: authentication and permissions are unchanged.

## Location, sharing and time-derived states

Location follows browser gateway → application service → shared hook. The gateway
has a ten-second watchdog independent of browser permission waiting and discards
late results. Query cache retains a result or denial for five minutes. Reverse
geocoding uses the existing SDK, with a ten-second bound and no second provider
or REST fallback. No IP lookup is used. Fallback allows manual country selection.

`useShareLink` delegates to application/gateway: cancellation does not report
success, failed clipboard writes report failure, and unavailable capability is
distinct from success. `useCurrentTime` updates every thirty seconds and on
focus/visibility return; dates use the active locale. Zero coordinates are valid;
missing coordinates are null and are not converted to (0,0).

`Modal` manages a stack, initial/trapped/restored focus, top-modal Escape,
inert/aria-hidden background and scroll locking. The cellar, add-to-cellar,
compare-search and admin overlays (forms, AI confirmations, user actions and
submission detail) use `Modal`; `AdminFormDialog` ignores outside clicks so forms
are not discarded. The profile avatar is a keyboard-operable button. Tests do not replace a real
screen-reader review. Admin inputs/actions and event notices use ES/EN keys.

### Grape-cluster loading animation

The loading mark paints grapes upward from the base in a gentle 3.4-second
cycle, holds the full color and fades before repeating; leaves start in the same faint tone and paint at the end of the upward fill.
It is not server completion telemetry and never delays a ready response. Web
uses a CSS mask/keyframes without JavaScript timers; mobile uses one Reanimated
UI value and cancels animation on unmount. Reduced motion shows the complete
static mark (mobile reads the preference at startup). Animation runs only during
loading/initialization; headers, footers, forms and installed icons remain static.
Launcher icons and native splash cannot run this UI animation.
