# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-SHR-01` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | 1) The person chooses “Share”. 2) The client builds the public link `/share/{kind}/{id}` with the Vinnot domain; the kind is `wines`, `events` or `wine-routes`. 3) The client opens the share sheet: the browser's on the web and the system's on the app. 4) The person chooses where to share the link. | The public link was shared or copied. |
| `CP-SHR-15` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | Main flow → 1a. The event or route has no public page yet (an event in draft or cancelled without ever being published, an unpublished route) | The client does not offer “Share”. |
| `CP-SHR-02` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | Main flow → 3a. The browser cannot share | The web copies the link and says it was copied. |
| `CP-SHR-03` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | Main flow → 4a. The person cancels | No success notice is shown. |
| `CP-SHR-04` | [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | Main flow → 3b. Sharing fails | The client shows an error notice. |
| `CP-SHR-05` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | 1) The person opens the link in the browser, or the messaging app requests it to build its preview. 2) The API receives `GET /share/{kind}/{id}` without a session and validates the kind and the ID format. 3) The API looks up the public content: an active wine, a published route, or an event published at least once that is not a draft. 4) The API returns a page with title, short description, image, Open Graph and Twitter metadata, and the “Open in Vinnot”, “Continue on the web” and download buttons. | The recipient sees a preview of the content without signing in. |
| `CP-SHR-06` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | Main flow → 2a. The kind does not exist or the ID is not a UUID | The API answers 404 without querying the database. |
| `CP-SHR-07` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | Main flow → 3a. The content does not exist or is not public | The API answers 404 with a neutral page saying the link is no longer available. |
| `CP-SHR-08` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | Main flow → 1a. The device is in English or the link ends in `/en` | The page is shown in English. |
| `CP-SHR-09` | [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | Main flow → 1b. The link is just `/share` | The app's general page with its downloads is shown. |
| `CP-SHR-10` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | 1) The person taps the link with the app installed. 2) The system recognizes the associated domain and opens the app. 3) The app translates `/share/{kind}/{id}` to its screen: `/wines/{id}`, `/events/{id}` or `/routes/{id}`. 4) The app shows the content. | The person sees the wine, the event or the route in the app or on the web. |
| `CP-SHR-11` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | Main flow → 2a. There is no app or the system does not recognize the domain | The preview opens, offering “Open in Vinnot” (`vinnot://{kind}/{id}`) and the downloads. |
| `CP-SHR-12` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | Main flow → 2b. The person chooses “Continue on the web” | The web opens `/{kind}/{id}`. |
| `CP-SHR-13` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | Main flow → 4a. There is no session | The app or the web asks to sign in and then returns to the content. |
| `CP-SHR-14` | [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | Main flow → 3a. The link is invalid, too long or from another domain | The app opens Home. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-SHR-01`](use-cases/uc-shr-01-share-content.md) | RF-WEB-SHR-01, RF-WEB-SHR-02, RF-APK-SHR-01, RF-APK-SHR-02 | CP-SHR-01, CP-SHR-15, CP-SHR-02, CP-SHR-03, CP-SHR-04 | 0 | 3 | 4 |
| [`UC-SHR-02`](use-cases/uc-shr-02-open-shared-link.md) | RF-WEB-SHR-03, RF-WEB-SHR-04, RF-WEB-SHR-05, RF-APK-SHR-03, RF-APK-SHR-04, RF-APK-SHR-05 | CP-SHR-05, CP-SHR-06, CP-SHR-07, CP-SHR-08, CP-SHR-09 | 4 | 2 | 0 |
| [`UC-SHR-03`](use-cases/uc-shr-03-open-in-app-or-web.md) | RF-WEB-SHR-06, RF-WEB-SHR-07, RF-APK-SHR-06, RF-APK-SHR-07, RF-APK-SHR-08 | CP-SHR-10, CP-SHR-11, CP-SHR-12, CP-SHR-13, CP-SHR-14 | 0 | 0 | 1 |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.
