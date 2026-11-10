# Web functional map

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
| User | [Cellar](../../modules/cellar/architecture.md#web) and [reviews](../../modules/reviews/architecture.md#web) | Personal entries, reviews, likes, comments |
| Geography | [Events](../../modules/events/architecture.md#web), [wineries](../../modules/wineries/architecture.md#web) and [routes](../../modules/wine-routes/architecture.md#web) | Discovery, registration, Mercado Pago checkout → return/receipt, my tickets, maps, stops |
| Management | [Administration and moderation](../../modules/admin/architecture.md#web) | Roles, catalog and moderation |

## Scanning: platform boundary

Label recognition is exclusive to mobile.
`WineScanPage` invites app download. It neither requests camera access, analyzes
photos nor invokes `/wines/scan`. The web panel can moderate submissions created
from mobile.

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
