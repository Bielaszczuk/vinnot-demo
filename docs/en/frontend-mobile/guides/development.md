# Mobile development

## Requirements

- Node 22 (`frontend-mobile/.nvmrc`, the same major version CI uses) and npm compatible with `package.json` and the lockfile.
- Expo CLI/EAS through `npx`.
- Xcode for iOS and Android Studio for Android when building native code.
- A backend reachable from the device.

## Install and validate

```bash
cd frontend-mobile
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
```

## Run

```bash
# Metro for a development build
npm run start:dev-client

# Physical device against a local backend
npm run start:device -- --clear

# iOS simulator with native modules
npm run ios:native
```

`start:device` computes a LAN-reachable URL. On a physical device, `localhost`
points to the phone, not the computer. The local backend uses HTTP; it must not
be accidentally upgraded to HTTPS.

### Metro: NativeWind virtual events

With Expo SDK 58, Expo CLI and Metro 0.87 share the same watcher contract
(`changes` and `rootDir`), so Metro events reach Expo untouched. NativeWind 4
still emits its virtual CSS events with the earlier `eventsQueue` shape.
`metro.config.js` installs `config/metro-watcher-compatibility.cjs` on that
server's watcher only to convert those NativeWind events to Metro's contract. It
does not modify `node_modules`, the lockfile or global watchers. Remove the
adapter when NativeWind emits Metro's contract.

After updating the checkout, stop Metro and run from `frontend-mobile/`:

```bash
npm run start:dev-client -- --clear
```

Press `i` to open the development build installed in the simulator. For a phone
using the local backend, use `npm run start:device -- --clear`. A release preview
is not a development client; if the simulator lacks one, build it locally with
`npm run ios:native`. Reloading before opening a client displays `No apps
connected` because there is no connected app yet. Changing Node or clearing
cache alone does not fix the incompatible contract; both the failure and fix
were verified with Node 22.23.3.

### Pressable styles on a device

NativeWind wraps `Pressable` through `react-native-css-interop`. On a device the
interop rebuilds `style` as an object, so a function such as
`style={({ pressed }) => [...]}` becomes `{}` and the element loses every style:
backgrounds, borders and padding disappear, and selected chips show white text on
a white card. Jest does not run that path. Pass a style array instead, and use
`MotionPressable` for pressed feedback. `pressableStyles.test.ts` fails when a
function `style` prop appears under `src/` or `app/`.

`Button` wraps its pressable surface in an animated view. Layout keys passed in
`style` (flex, width, alignSelf, margins, position) size that wrapper and the
rest styles the surface, so `style={{ flex: 1 }}` shares a row as expected.

## Dependency diagnosis before EAS

Run commands from `frontend-mobile/` after installing dependencies with `npm ci`.
If EAS cannot find `expo-modules-autolinking`, first check the working directory
and installation: Expo and its native dependency tree must resolve locally before
requesting a build. Do not add that package alone or change the lockfile as an
automatic workaround. Missing remote “Plain text/Sensitive” environment variables
are diagnosed separately from module-resolution errors.

## Variables

Use `.env.local` based on the examples. `EXPO_PUBLIC_*` variables are embedded in
the client and are not secrets. Private tokens do not belong in Expo.

### Event payments

- `EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED`: `true` enables online registration
  payment (pay button and automatic checkout opening in
  `src/presentation/features/event/useEventDetailViewModel.ts`). The development, preview and production
  profiles in `eas.json` set it to `true`.
- `EXPO_PUBLIC_EVENT_PAYMENTS_SANDBOX`: `true` also enables payment, but only
  when `EXPO_ENV` is not `production`; it is not set in `eas.json`.

Both resolve in `shared/config/env.ts` (`eventPaymentsEnabled`). Because
`eas.json` `env` variables are not inherited by `eas update`, an OTA keeps payment
enabled only when the remote EAS environment defines them or the publishing
process injects the profile `env`, as `scripts/publish-preview-update.mjs` does.
Before publishing, that script checks that `<API>/actuator/health` answers HTTP 200
with status `UP`; catalog routes such as `/wines` need a session, so they cannot
prove the preview API is reachable.

### Google Maps by platform

- `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`: key restricted to the iOS bundle and the services used. iOS renders Apple Maps, so this key only serves REST geocoding; it is published in `extra`, never as `ios.config.googleMapsApiKey`, because that setting links the `react-native-google-maps` pod, which `react-native-maps` 1.29 no longer ships.
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`: key restricted to the Android package and the distributed binary's signing certificate.
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1`: public SHA-1 fingerprint for that certificate; accepts hexadecimal with or without `:` separators.

`app.config.ts` assigns the Android key to the native Maps SDK and publishes configuration
so the infrastructure layer selects the current platform. Production does not
inherit `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; that shared variable remains available
for development compatibility. Server keys are not included in the app.

REST geocoding adds `X-Ios-Bundle-Identifier` on iOS, or `X-Android-Package` and
`X-Android-Cert` on Android. It does not send Vinnot session tokens to Google.
In production, missing identity or an invalid fingerprint is rejected before
sending a request; the application layer presents the error. Before distributing
a build, verify that Google accepts the correct identity and rejects an incorrect
one. Google Play App Signing can differ from the upload key: authorize the signing
certificate of the artifact users actually receive. Changing keys embedded in
native SDK configuration requires a native build; an OTA alone does not update
those native values.

## Native build

Google Sign-In, ML Kit OCR, camera, and other native modules require a development
build; Expo Go does not register those TurboModules. Before consuming a remote
build:

```bash
npm run preflight:ios:native
```

Android uses the `withAndroidSecurityDependencies.cjs` config plugin to apply
minimum transitive dependency versions during prebuild. Changes to it require
an **Android rebuild**, not just an OTA. CI resolves and scans the actual native
graph; this does not replace building and testing the distributed binary. See
[dependency and artifact security](../../infra/guides/dependency-security.md)
for maintenance, inventories and blocking criteria.

## Preview OTA updates

An OTA updates JavaScript and assets compatible with the installed runtime;
it does not compile a native binary or replace a build when native modules change.
The `preview` channel corresponds to “Vinnot (Dev)” using the AWS development API.

```bash
cd frontend-mobile
npm run test:release-config
npm run eas:update:preview -- --message "Description of the change"
```

The command publishes iOS only by default; `--platform android` or `--platform all`
must be explicit. It selects both the `preview` EAS channel and environment,
disables `.env.local` loading, clears Metro's cache, and checks that the preview API
`/api/actuator/health` reports `UP` before publishing. It does not run EAS Build.

Build profile `env` variables in `eas.json` are not automatically inherited by
`eas update`. The remote `preview` environment must contain
`EXPO_ENV=development` and
`EXPO_PUBLIC_API_BASE_URL=https://api-dev.vinnot.com/api`. The command also loads
preview profile variables, and final configuration checks that the API matches
that profile even if the remote environment attempts to replace it.

`app.config.ts` applies an API policy during EAS Build, production exports, and
the publishing command: it requires a public HTTPS domain with the `/api` path,
without credentials, query, or fragment. It rejects localhost, IP addresses, and
local domains. Development Metro retains HTTP access to local backends.
CI runs the policy tests; merging alone does not publish an OTA.

Environment resolution is centralized in `config/mobile-environment-policy.cjs`.
Unknown `EXPO_ENV` values are rejected instead of silently selecting development.
When `EAS_BUILD_PROFILE` is present, inheritance is resolved (including ios-simulator)
and must agree with `EXPO_ENV`. `VINNOT_OTA_CHANNEL` selects a channel declared
in `eas.json`; if a build profile is also present, both must match. These checks
validate selectors received by the configuration process; they do not replace
verification of the channel/branch association in the EAS service.

EAS projects are independent too: `@vinnot/vinnot-dev` for development/preview and
`@vinnot/vinnot` for production. `resolveMobileProjectId` obtains the expected ID
from `eas.json` and rejects an `EAS_PROJECT_ID` belonging to another environment;
the same identity determines `extra.eas.projectId` and the EAS Update URL. Staging
requires a distinct explicit project. Configure variables, signing credentials and
channels inside the selected project, rather than only changing the app display
name. Creating a project neither builds the app nor publishes an update.

Android must register the SHA-1 of the certificate signing the distributed binary
with Google Login and Maps. The production EAS keystore supports testing installs
signed with that key; if Google Play App Signing uses a different key, also register
its fingerprint before Play distribution. The upload certificate does not replace
the Play signing certificate. Do not reuse development signing identities or treat
OAuth client creation alone as evidence of successful device login.

| Destination | API |
|---|---|
| Local Metro without a publication profile | localhost or an explicit development URL |
| development / preview / ios-simulator | `https://api-dev.vinnot.com/api` |
| production | `https://api.vinnot.com/api` |
| Staging without a declared EAS profile | explicit HTTPS URL, no implicit domain |

Production requires its exact domain even during configuration inspection,
independently of `NODE_ENV`. A remote development value cannot replace it.
The production profile also declares the URL explicitly. Configuration does not
create DNS, social credentials or AWS resources, nor publish builds or updates.

After publishing, check the manifest for the correct platform, channel, and runtime:
`extra.expoClient.extra.apiBaseUrl` must contain the remote URL, not localhost.
Opening an installed app while connected allows it to download the update;
closing and reopening may be required to apply it.

## Production OTA updates

The `production` profile uses the `production` channel and `app.config.ts`
declares `runtimeVersion` with the `appVersion` policy, so the runtime matches
`version` (currently `0.2.2`). Only JavaScript and asset changes are compatible
with installed builds of that version; a native change requires a new build.
Publish once the production backend is live, from a clean checkout of `main`:

```bash
cd frontend-mobile
npm run test:release-config
npm run eas:update:production -- --api-revision <commit from /api/version> --message "Description of the change"
```

`--api-revision` is the full commit `https://api.vinnot.com/api/version` reports.
The command publishes iOS and Android by default (`--platform ios|android` narrows
it). Before running `eas update --channel production --environment production`,
it refuses to publish when:

- the mobile folder has uncommitted changes, because the OTA bundles the working tree;
- `HEAD` is not already on `origin/main`;
- `HEAD` changed any `backend/` file since it split from that revision, because
  the app would call API code that is not deployed (a mobile-only change keeps the
  older revision). Backend commits the API already runs never block it, even when
  the API is newer than `HEAD`;
- `/api/version` does not answer HTTP 200 with that same revision.

`--dry-run` runs every check and stops before publishing. The remote `production`
environment must provide production values (for example `EXPO_ENV` and
`EXPO_PUBLIC_API_BASE_URL`), because the environment policy rejects inconsistent
combinations. Like the preview command, it injects the `production` profile `env`
from `eas.json`, so `EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED` is kept, disables
`.env.local` loading and clears Metro's cache. It does not run EAS Build.

## Connection diagnostics

- `TurboModule ... could not be found`: binary lacks the native module.
- `ERR_NETWORK` to `localhost`: wrong API URL for a physical device.
- TLS against an HTTP port: inspect the base URL scheme.
- `401` after login: inspect persistence and bearer header.
- SecureStore entitlement error: verify binary capabilities;
  the current adapter uses SecureStore without AsyncStorage fallback.

## Contracts and verification

- [Testing and actual coverage scope](../testing/strategy.md)
- [Configuration, language and compatibility](../architecture/platform-and-localization.md)
