# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-SHR-01` | Share a wine, event or route through a public URL. | Produces /share/wines/{uuid}, /share/events/{uuid} or /share/wine-routes/{uuid}; contains no tokens and is not merely descriptive text. | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | `RF-WEB-SHARE-001` |
| `RF-WEB-SHR-02` | Share through browser API or copy URL. | Uses navigator.share when available; fallback copies the URL and reports the result. Cancellation is not announced as success. | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | `RF-WEB-WEBX-003` |
| `RF-WEB-SHR-03` | Show a minimal ES/EN public preview. | HTML contains title, bounded description, allowed image/fallback, brand, app/web actions and stores; private contacts and registrations are not exposed. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-WEB-SHARE-002` |
| `RF-WEB-SHR-04` | Provide messaging metadata. | Server renders Open Graph/Twitter with the photo of the shared wine, event or route, or the brand preview PNG when it has none; direct App Store-link previews belong to Apple and third parties may cache them. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-WEB-SHARE-003` |
| `RF-WEB-SHR-05` | Hide removed or private resources from sharing. | Active wine, PUBLISHED route and previously published/non-DRAFT event are eligible; invalid/non-public resources return a neutral 404. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-WEB-SHARE-004` |
| `RF-WEB-SHR-06` | Open the resource in a compatible installed app. | Native association directs to the exact wine/event/route; absent association/browser support offers Open in Vinnot and download. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-WEB-SHARE-005` |
| `RF-WEB-SHR-07` | Retain destination after installation or authentication. | Login preserves the protected destination; after installation the original link must be opened again, with no deferred-deep-linking promise. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-WEB-SHARE-006` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-SHR-01` | Share a wine, event or route through a public URL. | Produces /share/wines/{uuid}, /share/events/{uuid} or /share/wine-routes/{uuid}; contains no tokens and is not merely descriptive text. | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | `RF-APK-SHARE-001` |
| `RF-APK-SHR-02` | Share through the native Android sheet. | Share supplies the public link as text; selection/cancellation uses the native outcome without requiring a specific channel. | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | `RF-APK-APKX-001` |
| `RF-APK-SHR-03` | Show a minimal ES/EN public preview. | HTML contains title, bounded description, allowed image/fallback, brand, app/web actions and stores; private contacts and registrations are not exposed. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-APK-SHARE-002` |
| `RF-APK-SHR-04` | Provide messaging metadata. | Server renders Open Graph/Twitter with the photo of the shared wine, event or route, or the brand preview PNG when it has none; direct App Store-link previews belong to Apple and third parties may cache them. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-APK-SHARE-003` |
| `RF-APK-SHR-05` | Hide removed or private resources from sharing. | Active wine, PUBLISHED route and previously published/non-DRAFT event are eligible; invalid/non-public resources return a neutral 404. | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | `RF-APK-SHARE-004` |
| `RF-APK-SHR-06` | Open the resource in a compatible installed app. | Native association directs to the exact wine/event/route; absent association/browser support offers Open in Vinnot and download. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-APK-SHARE-005` |
| `RF-APK-SHR-07` | Retain destination after installation or authentication. | Login preserves the protected destination, including `/my-tickets` and `/my-tickets/<id>`; after installation the original link must be opened again, with no deferred-deep-linking promise. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-APK-SHARE-006` |
| `RF-APK-SHR-08` | Recognize signed Android App Links. | HTTPS from the associated domain maps share to /wines, /events or /routes; app/build/domain must be compatible and OTA cannot add a missing native association. | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | `RF-APK-APKX-002` |
