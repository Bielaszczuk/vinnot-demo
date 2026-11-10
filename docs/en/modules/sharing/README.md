# Sharing

Public links to share wines, events and routes. The recipient sees a preview without
signing in, with the content's title, a short description and its image, and from
there opens the app or continues on the web. With the app installed, the link opens
it directly on that content.

- Module code: `SHR`.
- Backend: package [`sharing`](../../../../backend/src/main/java/com/vinnot/sharing/).
- [Use cases](use-cases/README.md) · [Requirements](requirements.md) ·
  [Architecture](architecture.md) · [Testing](testing.md)

## Actors

| Actor | What they do in this module |
|---|---|
| Signed-in user | Shares a wine, an event or a route from its details |
| Person who receives the link | Sees the preview without a session and opens the content in the app or on the web |
| Messaging app | Reads the page metadata to show the link preview |

## Business rules

| Rule | Detail | Where |
|---|---|---|
| Link format | `/share/{kind}/{id}` with kind `wines`, `events` or `wine-routes` and a UUID ID; no tokens or personal data | [`SharedContentKind.java`](../../../../backend/src/main/java/com/vinnot/sharing/domain/SharedContentKind.java) |
| Public content | Active wines, published routes and events published at least once that are not drafts; anything else shows a neutral page | [`JdbcSharedContentQueryAdapter.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/persistence/JdbcSharedContentQueryAdapter.java) |
| No session | The preview is the only anonymous part; opening the full content requires signing in | [`SecurityConfig.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java) |
| Exposed data | Only title (up to 120 characters), description (up to 240) and image; never contacts or registrations | [`SharedLinkHtmlRenderer.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRenderer.java) |
| Images | Only from the Vinnot image domain or the API uploads; otherwise the brand | [`SharedLinkHtmlRenderer.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkHtmlRenderer.java) |
| Language | Spanish by default; English with `/en` or `?lang=en` | [`SharedLinkController.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkController.java) |
| Privacy | The page is not cached and search engines do not index it | [`SharedLinkController.java`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkController.java) |
| Accepted domains | The app only opens links from `vinnot.com` and `dev.vinnot.com` | [`nativeIntent.ts`](../../../../frontend-mobile/src/domain/navigation/nativeIntent.ts) |

## Where it lives

| Part | Location |
|---|---|
| API | [`SharedLinkController`](../../../../backend/src/main/java/com/vinnot/sharing/infrastructure/web/SharedLinkController.java) under `/share`, with the `backend/src/main/resources/sharing/landing.html` template |
| Web | [`useShareLink`](../../../../frontend-react/src/presentation/hooks/useShareLink.ts) and [`sharing.service.ts`](../../../../frontend-react/src/application/services/sharing.service.ts); page assets in `frontend-react/public/share-assets/` |
| App | [`useShareLink`](../../../../frontend-mobile/src/presentation/hooks/useShareLink.ts) and `frontend-mobile/app/+native-intent.tsx` to open links |

## Data

The module has no tables of its own: it reads `wines`, `events` and `wine_routes`
([Wines](../wines/README.md), [Events](../events/README.md),
[Wine routes](../wine-routes/README.md)).
