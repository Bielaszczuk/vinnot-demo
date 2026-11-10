# Mobile functional map

## Purpose and scope

This map links to detailed workflows. Each document distinguishes actor, input,
presentation state, application operation and backend authority. A service
method does not imply that every screen exposes it.

## Workflows

- [Public information, policies and support](../../modules/support/architecture.md)

| Area | Document | Content |
|---|---|---|
| Identity | [Authentication and account](../../modules/users/architecture.md) | Login, social, bootstrap, refresh, action links, profile |
| Discovery | [Catalog and detail](../../modules/wines/architecture.md) | Text, filters, pagination, navigation, related queries |
| AI | [Profiles and comparisons](../../modules/ai/architecture.md) | Read/generate, language, selection, cache |
| User | [Cellar](../../modules/cellar/architecture.md#app) and [reviews](../../modules/reviews/architecture.md#app) | Personal entries, reviews, likes, comments |
| Geography | [Events](../../modules/events/architecture.md#app), [wineries](../../modules/wineries/architecture.md#app) and [routes](../../modules/wine-routes/architecture.md#app) | Discovery, registration, Mercado Pago payment, maps, stops |
| Management | [Administration and moderation](../../modules/admin/architecture.md#app) | Roles, catalog and moderation |

## Scanning: platform boundary

Label recognition is exclusive to mobile.
The [scanning use case](../../modules/wines/architecture.md) covers capture, OCR, results,
manual search, forms retaining the image and own submissions.

## Cross-cutting reading

- [Remote state and transport](../architecture/remote-state-and-transport.md)
- [Platform, language and persistence](../architecture/platform-and-localization.md)
- [Product sequences and states](../diagrams/product-processes.md)
- [Testing strategy](../testing/strategy.md)

Loading, empty, failure, success and cancellation are documented per operation.
Testing matrices define verification criteria without asserting nonexistent
coverage. Defects and change proposals remain outside the canonical corpus.

## Community and moderation

Reviews and comments provide contextual reports, author reports and confirmed blocking. Events/routes provide reporting. Profile links to personal cases and unblocking; administration supports review and removal of reviews/comments with a required reason. See the [community contract](../../modules/community/architecture.md).
