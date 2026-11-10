# iOS and Android distribution

## Independent surfaces

Backend/web, native binary, OTA and store listing have separate states. Merging
into `main` runs CI; production requires the manual publisher. A compatible
OTA updates JS/assets without replacing the binary or the store review process.
See [deployment](../../infra/guides/deployment.md) and
[mobile configuration](development.md).

`eas.json` uses `appVersionSource=remote`, a `production` profile with automatic
increment and a production project separate from preview. Record SHA, build ID,
version, native number, platform, channel/runtime and acceptance results privately.
Native changes require a new build; do not reuse the preview APK targeting
development as the Play candidate.

Before distribution, validate the same candidate through CI, production API
configuration and login, terms acceptance, catalogue/cellar, scanning, reviews/
reports/blocking and account deletion. Simulator/emulator tests cover flows;
they do not imply physical acceptance or fulfill a reviewer recording request.

Version `0.1.2` adds the native `expo-clipboard` module for support references.
It uses a new app-version runtime and requires new iOS/Android binaries; do not
publish this bundle to the `0.1.1` runtime.

Version `0.1.3` adds the native `expo-notifications` module (push permission,
token and taps). It needs new binaries and FCM/APNs credentials in EAS. Android
also needs the Firebase client config: upload `google-services.json` as an EAS
file environment variable named `GOOGLE_SERVICES_JSON` (`app.config.ts` passes it
as `android.googleServicesFile`); without it Android cannot get a push token. Before
building it, publish any pending JS-only OTA for `0.1.2` from a commit that does
not import the module; OTAs built from `0.1.3` reach `0.1.3` binaries only.

Version `0.2.0` moves the app to Expo SDK 58 (React Native 0.88, React 19.3,
new architecture only). It needs new iOS/Android binaries; `0.1.x` binaries keep
their own runtime and never receive SDK 58 bundles, so publish any pending
JS-only OTA for `0.1.3` from a commit before the upgrade. The iOS deployment
target is 16.4. Android release builds keep R8 minification off
(`enableMinifyInReleaseBuilds: false`) until a minified build is tested on
devices.

Version `0.2.1` takes the Expo SDK 58 native patch releases (`expo`,
`expo-camera`, `expo-dev-client`, `expo-router`) and pre-installs the native
`@shopify/react-native-skia` module, not used yet, so the animated emblems of the
points system can ship later by OTA. It needs new iOS/Android
binaries; `0.2.0` binaries never receive `0.2.1` bundles, so publish any pending
JS-only OTA for `0.2.0` from a commit before the version bump.

Version `0.2.2` takes the next Expo SDK 58 native patch releases (`expo` 58.0.21,
`expo-camera`, `expo-constants`, `expo-dev-client`, `expo-file-system`,
`expo-font`, `expo-image`, `expo-image-manipulator`, `expo-linking`,
`expo-location`, `expo-notifications`, `expo-router`, `expo-splash-screen`,
`expo-system-ui`, `expo-updates`). It needs new iOS/Android binaries; `0.2.1`
binaries never receive `0.2.2` bundles, so publish any pending JS-only OTA for
`0.2.1` from a commit before the version bump.

Production OTAs use the `production` channel and the `appVersion` runtime
(`0.2.2`): JS/asset changes only, published with
`npm run eas:update:production` (which runs
`eas update --channel production --environment production`) after the production
backend is live. See [production OTA](development.md#production-ota-updates).

## App Store Connect

1. Generate the iOS production build and upload that build to App Store Connect/EAS Submit.
2. Wait for processing, test through TestFlight and select the correct binary
   in the listing version.
3. Complete metadata, actual-app screenshots, privacy, contact/notes and private
   reviewer access.
4. Add the version for review and submit. Observe review status and the configured
   release option before claiming publication.

Reviewer-requested replies/videos belong in App Store Connect. The demo account
must be active, unlocked and minimally privileged; credentials and real-account
videos do not belong in Git. Updating a published version requires preparing a
new version and submitting it for review.
[Apple submission](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
and [new version](https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version).

## Google Play Console

A new personal account requires closed testing with at least 12 opted-in testers
for 14 continuous days before requesting production access. An authorized email
list does not demonstrate opt-in, installation or usage. Gather actual feedback
and use Play Console's counter/status for the requirement; internal testing does
not replace it. Requesting access does not automatically publish.
[Google requirement](https://support.google.com/googleplay/android-developer/answer/14151465).

The store artifact is a production AAB. Register the appropriate Play App Signing
and upload certificates in OAuth/Maps; the upload signature does not establish
the identity of the delivered APK. Public-key configuration is described in the
[mobile guide](development.md). Keep listing, privacy/Data Safety, rating,
reviewer access and countries consistent with candidate behavior. After gaining
access, prepare the production release and check its status and actual availability.

## Forcing the update

The app compares its version with the minimum version the backend serves per platform
(`GET /app-versions/minimum`). If the installed version is lower, it shows the "Update
Vinnot to continue" screen instead of the app, with a single button that opens the store. The
check runs when the app opens and every time it returns to the foreground. If the
request fails, the app works as usual. The minimum is edited in the web admin panel
([UC-ADM-15](../../modules/admin/use-cases/uc-adm-15-minimum-app-version.md)).

When a new native build is published:

1. Wait until the store approves and publishes the build. In App Store Connect the
   version must show "Ready for Distribution". In Google Play the release must be
   available on the track people use.
2. Open that listing on a device and confirm it offers the new version.
3. On the web, go to Administration › "App versions" and raise that platform's minimum
   to the published version. Confirm your identity when asked.
4. Open an older version of the app and check that the update screen appears and that
   its button opens the listing.

- Raising the minimum before the build is published blocks everyone with no way to update.
- Each platform has its own minimum: iOS and Android are published at different times.
- An empty minimum turns the block off for that platform.
- OTA updates do not change the app version, so publishing one never needs a new minimum.
- The check is JavaScript code: it reaches installed apps with the same runtime
  (`0.2.2`) by OTA, without a new native build.

## Verification and retention

Use an eligible account/device to check that the store link delivers the expected
package/version; update through the distributing store. An EAS manifest confirms
channel/runtime/JS, not the installed native number or store approval. Price,
countries, policies and credentials live in the consoles; they are not inferred
from language or catalogue country filters.

Keep QA results and build/OTA mappings in the private archive and procedures in
Git. Never publish tester data, signing keys or tokens. Argentine catalogue
promotion retains its separate authorization after actual iOS approval and
publication; distributing R2 user uploads does not advance it.
