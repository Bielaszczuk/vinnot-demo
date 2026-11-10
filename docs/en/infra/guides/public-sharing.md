# Activating Vinnot public links

## Contract and delivery state

The implementation provides previews and navigation; activation requires backend/web publication, CDN configuration and new signed builds. Do not mark Universal Links/App Links verified based on an OTA or router tests. The [use case](../../modules/sharing/architecture.md#backend) describes the minimal anonymous surface.

`frontend-mobile/app.config.ts` declares production `applinks:vinnot.com` and development `applinks:dev.vinnot.com`. AASA and Android also include the exact `/share` and `/share/` download QR paths. Android declares VIEW/DEFAULT/BROWSABLE, HTTPS and autoVerify for these two paths and the `/share/wines/`, `/share/events/` and `/share/wine-routes/` prefixes. Login, OAuth callbacks and legal documents are not captured. Version/runtime 0.1.1 isolates these builds from 0.1.0; do not deliver this change as an OTA to the previous runtime.

Vite generates `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` per environment through `frontend-react/config/link-associations.mjs`. Apple prefix `569A638J8F` was checked against signed App Store build 0.1.0 (5). Production SHA-256 fingerprints come from the current and classic Play app signing keys, not the upload key. These are public identities, not credentials. Development does not advertise unknown Android certificates: `VITE_DEV_ANDROID_SHA256` accepts verified dev APK fingerprints separated by commas; without them it emits `[]` and scheme-based opening remains available. Never reuse production certificates for a development package.

`publish-web-release.mjs` publishes both files as `application/json`, without redirects and with a five-minute TTL. The SPA function preserves `/.well-known/` and `/share-assets/`. Preview images are restricted to the owned CDN or API origin configured by `APP_SHARING_API_ORIGIN`; compose declares each environment's correct URL.

## Download-first landing and general QR

The page first presents “Take Vinnot with you”, the “Download Vinnot” action and the stores. Shared content follows when present; the generic brand page no longer nests a banner inside another card. “Already have the app? Open in Vinnot” is secondary and the muted grey “Continue on the web” link is the last option. ES/EN strings are server-rendered. Because the CDN forwards no viewer headers, `share-assets/landing-language.js` sends a device whose language starts with `en` from the Spanish default to `?lang=en` (same rule as the mobile app). An explicit `?lang=` or `/en` choice, including the language switch, always wins.

The small `/share-assets/download-platform.js` and `landing-downloads.js` modules separate device detection, store selection and DOM adaptation. iPhone/iPad —including iPad with a desktop user agent— use App Store; Android uses Google Play when publicly available. Enabled badges follow the same selection. With `APP_SHARING_ANDROID_AVAILABLE=false`, Android visitors see the coming-soon message and no download action sends them to App Store. Desktop and no-JavaScript visitors retain explicit store links. CSP permits same-origin scripts only; there are no install probes, tracking, automatic scheme redirects or additional API queries.

`safeNativeIntent` opens the general `/share` QR at the app home while retaining specific shared-content destinations. Universal Links/App Links let the operating system decide direct opening; the page does not infer installation. Deliver and verify `/share` normalization to iOS runtime 0.1.1 before expanding AASA; that binary already has the associated domain. The Android filter is native manifest configuration and **requires a new signed build**; OTA cannot expand it. Publish backend, assets and association JSON from the same candidate and invalidate `/.well-known/*` when updating AASA. Apple may cache the association on its CDN/device, and user preferences to remain in the browser still apply. Router or simulator tests alone do not establish signed store-app verification.

## CDN without new services

`configure-public-sharing.mjs` adds an HTTPS origin targeting the existing API with `OriginPath=/api`, plus `/share` and `/share/*` behaviors. It uses managed CachingDisabled without an origin request policy: no viewer headers, cookies or query strings are forwarded. The existing viewer-request function translates only `?lang=en` into an internal `/en` path suffix; the public URL stays unchanged. The backend renders that explicit language route. SPA rewriting does not apply to these behaviors. Default behavior remains intact; the adapter rejects foreign behaviors, cross-environment domains and concurrent changes.

The script produces a read-only plan by default. `--apply` reuses the owned viewer-request function and updates only the selected distribution. Publish the updated security function first. Custom origin request policies require the Business plan and are deliberately not used; see [AWS plan features](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html). An operator executes it after reviewing the plan; release roles receive no extra permissions. Retain the existing Free plan and operational limits. No Lambda, new CDN, storage or external link provider is introduced.


For an application run, set `SHARING_BACKUP_PATH` to a new private local filename
before `--apply`; the script saves the original configuration/ETag with mode
0600 and refuses to overwrite an existing backup. Read-only plans create no file.
The production CloudFormation acceptance template predates these operator-managed
behaviors: do not reapply that baseline to the active distribution. Any future
stack update must first reconcile the current API origin and both share behaviors
into its reviewed template, just as it preserves the deployed security function.

```bash
PUBLIC_URL=https://dev.vinnot.com CLOUDFRONT_DISTRIBUTION_ID=E16RJ3WGUX15VP node scripts/configure-public-sharing.mjs
PUBLIC_URL=https://vinnot.com CLOUDFRONT_DISTRIBUTION_ID=ELFTVWJHW2QAA node scripts/configure-public-sharing.mjs
```

The adapter removes legacy global rules that convert 403/404 into `/index.html` with HTTP 200: those rules also masked API-origin 404 responses. The owned viewer-request function still handles SPA navigation; other custom errors are preserved. The plan reports how many rules would be removed. Standard behavior fields are explicit, and HTTP methods are compared without depending on AWS response order to keep repeated applications idempotent.

## Activation order

1. Run local preflight and `mvn clean install`, integrate into development and verify backend/web there. The preview must return HTML before CDN changes.
2. Publish the updated SPA function and association files in development. Review the plan and rerun with `--apply` under the operator session. Wait for `distribution-deployed`; invalidate `/share*` and `/.well-known/*` if a previous SPA response existed.
3. Verify all three published resource kinds, draft/withdrawal 404s, HEAD, English, Open Graph in initial HTML, the content photo as the preview image (the brand PNG when there is none) and post-login destination. Check association JSON returns HTTP 200, the correct Content-Type and no redirects.
4. Promote the validated candidate, publish production backend/web and apply the equivalent configuration to the production distribution. The operator updates the existing function; normal production publication retains its limited permissions.
5. Generate new signed iOS/Android builds at the current `frontend-mobile/app.config.ts` version (0.2.2 today) with existing EAS profiles and only within authorized spending. EAS must synchronize Apple's entitlement; check AASA before installation. Do not create a different app/package.
6. Verify cold/warm opening, signed-in/out users, Safari and Android browsers, the no-app landing page and all three destinations. Android installed from Play must verify the domain against the Play signature; a differently signed APK does not prove this. Simulator scheme tests validate routing, not store association.
7. Submit iOS for review and update Android closed testing through its existing process. Android is publicly launched on Google Play, so `APP_SHARING_ANDROID_AVAILABLE` is `true` in both compose files; set it to `false` only to hide the button again.

## Rollback

Retain distribution JSON and ETag before applying. Restore it with a current ETag only if another operator made no changes. Removing the two behaviors and their origin restores previous delivery without changing product APIs; remove new buttons/links first to avoid sharing unavailable destinations. Do not remove other domain associations or alter signing keys.

Direct `apps.apple.com` previews use Apple's controlled listing. Share `https://vinnot.com/share` after activation for a Vinnot-owned branded download page.
