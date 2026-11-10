# Complete HTTP API catalog

## Scope and source of truth

The Spring Boot API is published under the `/api` context path. Locally the base
is `http://localhost:8080/api`; development uses
`https://api-dev.vinnot.com/api` and production uses `https://api.vinnot.com/api`. Swagger UI and OpenAPI are available, when the
profile enables them, at `/swagger-ui.html` and `/api-docs` relative to that
base. The browser asks for a username and password: the email and password of
an active, verified Vinnot ADMIN account.

This catalog was checked against controller `@RequestMapping`, method mappings
and `@PreAuthorize` annotations. Request and response records remain the
field-level source of truth.

## Conventions

Public contact: `POST /support/requests` receives an idempotent UUID enquiry and returns 202; no public reads or session requirement. Categories, errors and retention: [support](../../modules/support/architecture.md).

- JSON for normal operations; `multipart/form-data` for avatar, scanning, label
  image and submission.
- `GET` reads; `POST` creates or executes an action; `PATCH` changes fields/state;
  `DELETE` deletes or cancels. `PUT` semantics are defined by each DTO/handler:
  partner accepts optional fields and applies a partial update.
- JWT is sent as `Authorization: Bearer <access-token>`.
- Identifiers are UUIDs except reference catalogs.
- Domain dates use ISO-8601 transport and are stored as instants.
- Paginated lists use zero-based `page` and `size`; additional filters are
  described by each use case.
- `X-Request-ID` is accepted or generated and returned for correlation.
- Rate limiting exposes `X-RateLimit-Limit`, `X-RateLimit-Remaining` and, when
  blocked, `Retry-After`.

Pagination, byte, dimension and transport timeout limits are described in
[resource protection](resource-protection.md). `PageQuery`-based queries reject
sizes above 200 and overflowing offsets; stricter public policies retain
their own limits.

## Access legend

| Mark | Access |
|---|---|
| Public | No session required |
| User | Authenticated identity required |
| Authority | Named authority or ownership rule required |
| Admin | `ADMIN` role required |

The session requirement for `GET /wines/**`, `/wineries/**`, `/events/**` and
`/wine-routes/**` is defined in `SecurityConfig`. Method annotations reinforce
writes and ownership. `/wines/submissions/**` is declared before the
catalog rule; both workflows require a session.

## Authentication — `/auth`

The browser adapter adds POST `/auth/web/login`, `/auth/web/social`,
`/auth/web/refresh` and `/auth/web/logout`, requiring an allowed Origin and
`X-Vinnot-Web-Session: 1`. Refresh is returned only through an HttpOnly cookie,
never JSON. Logout returns 204. Refresh without a cookie or legacy credential
returns 204 with no body or Set-Cookie (normal anonymous startup); a valid session
returns access/tokenType/expiresIn/user and rotates the cookie. A present invalid
credential still fails with INVALID_TOKEN; it is not treated as absence and the
response does not revoke another cookie. Login/social return access/tokenType/expiresIn/user.
POST `/auth/reauthenticate` requires a session and one credential (password or a
fresh linked Google/Apple token), returning a five-minute `{proof}` for
`X-Admin-Reauthentication`. See the
[identity contract](authentication-and-identity.md).

| Method | Path | Access | Result |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Registers credentials and triggers verification |
| `POST` | `/auth/login` | Public | Canonical access/refresh session and expiration |
| `POST` | `/auth/social` | Public | Verifies Google/Apple/Facebook and links/creates identity |
| `POST` | `/auth/refresh` | Public with refresh token | Rotates refresh token and issues a new session |
| `POST` | `/auth/logout` | Public with refresh token | Revokes the presented refresh token; an optional `pushToken` forgets this device for the session's account even when the session expired, or only that exact token when the refresh token is unknown |
| `GET` | `/auth/me` | User | Current authenticated user; `hasPassword` says whether the owner chose the password |
| `POST` | `/auth/forgot-password` | Public | Requests recovery without account enumeration |
| `POST` | `/auth/reset-password/validate` | Public | Validates a token without consuming it |
| `POST` | `/auth/reset-password` | Public | Consumes token and replaces password |
| `POST` | `/auth/verify-email` | Public | Consumes email-verification token |
| `POST` | `/auth/resend-verification` | Public | Resends verification under quota policy |
| `POST` | `/auth/email-change/confirm` | Public | Confirms pending email change |

Forgot password, reset password, verify email and resend verification answer
`{"code", "message"}`. Clients show their own copy for `code`
(`PASSWORD_RESET_LINK_SENT`, `PASSWORD_RESET`, `EMAIL_VERIFIED`,
`VERIFICATION_EMAIL_SENT`); `message` is only an English fallback.

`expiresIn` is the access-token lifetime in milliseconds. Credential and social
login return the same `AuthSessionResponse`. A deactivated account needs an
explicit reactivation confirmation; logout cannot retroactively invalidate an
already signed access JWT.

## Users — `/users`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/users` | Admin | Legacy paginated user list |
| `GET` | `/users/{id}` | Admin | Legacy private detail |
| `GET` | `/users/{userId}/stats` | Admin | User statistics |
| `GET` | `/users/me/stats` | User | Current-user statistics |
| `GET` | `/users/me/notification-preferences` | User | Notification preferences and marketing consent; each category also states `emailAvailable` and `pushAvailable` |
| `PUT` | `/users/me/notification-preferences` | User | Change notification choices and marketing consent |
| `PUT` | `/users/me/push-devices` | User | Register or refresh this device's Expo push token `{token, platform: IOS\|ANDROID, locale: es\|en, channels?: boolean}` (204). Called on every cold start; devices not registered for 120 days are purged. `channels: true` says the app created the per-category Android channels, so pushes use them instead of `default` |
| `DELETE` | `/users/me/push-devices` | User | Unregister this device `{token}` (204) |
| `GET` | `/users/me/event-area` | User | "Events near you" area `{kind: REGION\|APPROXIMATE, regionId, regionName}`; never a location (204 when none) |
| `PUT` | `/users/me/event-area` | User | Set the area: `{regionId}` from `/regions`, or `{latitude, longitude}` rounded server-side to 0.1° (~11 km) (204; 400 for both/neither, 404 unknown region) |
| `DELETE` | `/users/me/event-area` | User | Stop "events near you" (204) |
| `POST` | `/users/me/activity/views` | User | Record that a detail was opened `{kind: WINE\|ROUTE\|EVENT\|WINERY, id}` (204; 400 for an invalid `kind` or `id`; an unknown `id` is stored anyway and never matches). See [activity](../../modules/activity/README.md) |
| `POST` | `/users/me/activity/app-open` | User | Record an app open, optional `{}` body (204; the server keeps at most one per user every 30 minutes) |
| `POST` | `/users/me/push-opens` | User | Record that a push was opened `{ref, type}`: `ref` is the push key (at most 180 characters), `type` a `NotificationType` (204; once per `ref`; also counts as an app open; 400 when `ref` is missing or the type is unknown) |
| `GET` | `/users/me/points` | User | Points and seal: `{points, tier, nextTier, nextTierAt, tierFloor, todayEarned, dailyCap, pendingCelebration, showWelcome, recent}`; `recent` holds the last 20 entries `{id, source, points, createdAt, label}` (revocations as negative entries). See [points and seals](../../modules/gamification/README.md) |
| `POST` | `/users/me/points/celebrations` | User | `{tier}` marks that tier and any lower one as celebrated; `{welcome: true}` dismisses the welcome card (204) |
| `POST` | `/notifications/unsubscribe?token=` | Public (signed token) | One-click unsubscribe from one promotional category |
| `PATCH` | `/users/me` | User | Username, names and editable profile data |
| `PATCH` | `/users/me/preferences` | User | Stores `preferredLanguage` (`es`/`en`) and IANA `timezone`; omitted fields are kept |
| `POST` | `/users/me/onboarding` | User | Completes/skips initial social-account setup |
| `POST` | `/users/me/avatar` | User, multipart | Validates and stores avatar |
| `POST` | `/users/me/change-password` | User | Requires the valid current password and a new 8–100 character password |
| `POST` | `/users/me/email-change` | User | Requests verification of a new email |
| `GET` | `/users/{id}/profile` | User | Deliberately limited public profile |
| `DELETE` | `/users/me` | User | Reversible deactivation and refresh revocation |
| `DELETE` | `/users/me/permanent` | User | Deletes the account; a linked Apple identity requires `appleAuthorizationCode` and `appleClientId`, revokes Apple, then deletes |

Email and avatar are not changed through generic `PATCH`. See the complete
[identity lifecycle](authentication-and-identity.md).

## Wines — `/wines`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/wines` | User | Main search, effective criteria and pagination |
| `GET` | `/wines/search` | User | Search alias using the same use case |
| `GET` | `/wines/{id}` | User | Enriched wine detail |
| `GET` | `/wines/highlights` | User | Bounded list: average DESC, review count DESC, ID ASC; default limit 4, maximum 10 |
| `GET` | `/wines/featured` | User | Paginated featured wines |
| `GET` | `/wines/top-rated` | User | Highest rated wines |
| `GET` | `/wines/recent` | User | Recent additions |
| `GET` | `/wines/popular` | User | Popularity ranking |
| `GET` | `/wines/recommended` | User | Current recommendations |
| `GET` | `/wines/{id}/similar` | User | Similar wines for detail |
| `POST` | `/wines` | `WINE_CREATE` | Creates wine and returns ID/message |
| `PATCH` | `/wines/{id}` | `WINE_UPDATE` | Partial update |
| `DELETE` | `/wines/{id}` | `WINE_DELETE` | Physical `deleteById`; relations follow Flyway foreign keys |
| `PATCH` | `/wines/{id}/toggle-featured` | `WINE_UPDATE` | Toggles featured state |
| `POST` | `/wines/scan` | User, multipart | Recognizes label and ranks catalog |
| `POST` | `/wines/{id}/label-image` | User, multipart | Completes a missing image after identity/safety validation |

Effective search criteria are text, type, country, region, winery and grape.
The handler passes these fields and pagination to searchAdvanced; public policy
caps size at 20 and the window at 500. The read model combines wine/winery and
uses containment first when any word is up to three characters. See
[search](../../modules/wines/architecture.md) and
[backend scanning](../../modules/wines/architecture.md).

## Wine proposals — `/wines/submissions`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/wines/submissions` | User | Lists only owned proposals |
| `GET` | `/wines/submissions/{id}` | Owner | Own detail and state |
| `POST` | `/wines/submissions` | User, multipart | Proposes an unknown wine with data and, optionally, the label photo (without one it waits for review) |

The request requires `wineName`, `wineryName` and `image`; type, grape, country,
region, vintage and other catalog fields are optional. The response may report
automatic publication, linked duplicate or human review. Rejection and
correction requests are later decisions of the administrative endpoint.

## Wineries — `/wineries`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/wineries` | User | Searches and pages active wineries |
| `GET` | `/wineries/{id}` | User | Detail with location and metrics |
| `POST` | `/wineries` | `WINERY_CREATE` | Creates winery |
| `PUT` | `/wineries/{id}` | `WINERY_UPDATE` | Updates supported full data |
| `PATCH` | `/wineries/{id}/coordinates` | `WINERY_UPDATE` | Completes missing coordinates |
| `DELETE` | `/wineries/{id}` | `WINERY_DELETE` | Deletes winery |

Coordinate update is focused and does not silently replace existing coordinates.

## Reviews — `/wines/{wineId}/reviews`

| Method | Suffix | Access | Purpose |
|---|---|---|---|
| `GET` | `` | User | Paginated approved reviews; authors also see their pending/rejected content |
| `GET` | `/mine` | User | Returns only `hasReview` for the authenticated identity |
| `POST` | `` | `REVIEW_CREATE` | Creates one review per user/wine and publishes it as `APPROVED`; optional tasted `vintage` |
| `PATCH` | `/{id}` | Author or Admin | Changes rating/title/comment/vintage; an approved review stays `APPROVED`, a pending or rejected one returns to `PENDING` |
| `DELETE` | `/{id}` | `REVIEW_DELETE[_OWN]` | Deletes and recalculates metrics |
| `POST` | `/{id}/like` | User | Creates unique like |
| `DELETE` | `/{id}/like` | User | Removes own like |
| `GET` | `/{id}/comments` | User | Lists approved comments; authors also see their own pending/rejected content |
| `POST` | `/{id}/comments` | User | Adds a 1–2000 character comment, published as `APPROVED` |
| `DELETE` | `/{id}/comments/{commentId}` | Author or authorized moderator | Deletes comment |

The tasted vintage is optional on both reviews and cellar entries. Requests accept
`vintage` (integer, `1800`–`2100`; the domain also rejects years after next year,
`INVALID_VINTAGE`). On `PATCH`, an omitted or `null` `vintage` keeps the stored value,
`clearVintage: true` removes it (and wins over a supplied `vintage`), and any other
`vintage` replaces it. `ReviewResponse` and `CellarWineResponse` expose the tasted
vintage as top-level `vintage`; the nested `wine.vintage` stays the catalog vintage.
A review with a vintage copies it to the author's cellar entry together with rating
and notes; a review without one leaves the cellar vintage unchanged.

Review and cellar `rating` goes from `0.1` to `5.0` with at most one decimal; any other
scale or a value outside that range is rejected. Syncing a review to the cellar keeps the
decimal. Every author object (`ReviewResponse.ReviewerInfo`, comments and admin reviews)
adds `badgeTier`, the seal key or `null` when the account is locked or inactive; it is
loaded in batch per page.

## Community — `/community`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/community/reports` | User | Creates report and returns a private receipt |
| `GET` | `/community/reports/mine` | User | Reporter cases without private evidence |
| `GET` | `/community/overview` | User | Own activity overview |
| `GET` | `/community/blocks` | User | Blocks created by the user |
| `PUT` | `/community/blocks/{userId}` | User | Idempotent block |
| `DELETE` | `/community/blocks/{userId}` | User | Idempotent unblock |

Review and comment publication, blocking and retention are defined in
[community](../../modules/community/architecture.md). Blocking does not hide events/routes
and does not replace authorization: product reads require a session. Being MODERATOR does not grant review editing.

## Cellar — `/cellar`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/cellar` | `CELLAR_MANAGE_OWN` | Current cellar with wine projection |
| `GET` | `/cellar/user/{userId}` | Owner with `CELLAR_MANAGE_OWN` or `ADMIN` | Cellar corresponding to the supplied UUID |
| `GET` | `/cellar/stats` | `CELLAR_MANAGE_OWN` | Current cellar metrics |
| `GET` | `/cellar/user/{userId}/stats` | Owner with `CELLAR_MANAGE_OWN` or `ADMIN` | Metrics corresponding to the supplied UUID |
| `POST` | `/cellar` | `CELLAR_MANAGE_OWN` | Adds unique user/wine relation; optional tasted `vintage` |
| `PATCH` | `/cellar/{id}` | Owner | Personal rating (`0.1`–`5.0`, one decimal), price, notes and tasted `vintage` (`clearVintage` removes it) |
| `DELETE` | `/cellar/{id}` | Owner | Removes entry |

## Events — `/events`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/events` | User | Future catalog by text/type/location |
| `GET` | `/events/{id}` | User | Detail; `publiclyVisible` says whether the event has a public page (published at least once and not a draft) |
| `GET` | `/events/upcoming` | User | Upcoming events |
| `GET` | `/events/nearby` | User | Latitude/longitude/radius search |
| `GET` | `/events/discovery` | User | Nearby or distance-ordered alternatives |
| `GET` | `/events/my-events` | User | Events organized by current identity |
| `POST` | `/events` | `EVENT_CREATE` | Creates with organizer from JWT |
| `PATCH` | `/events/{id}` | `EVENT_UPDATE[_OWN]` | Updates with ownership; asking for `CANCELLED` answers 400 `USE_CANCEL_ENDPOINT` |
| `PATCH` | `/events/{id}/publish` | `EVENT_UPDATE[_OWN]` | Publishes |
| `PATCH` | `/events/{id}/cancel` | `EVENT_UPDATE[_OWN]` | Cancels |
| `DELETE` | `/events/{id}` | `EVENT_DELETE[_OWN]` | Deletes/cancels under domain rules |
| `GET` | `/events/{eventId}/registrations` | Organizer/Admin | Reviews paginated requests |
| `GET` | `/events/{eventId}/registrations/me` | User | Own active registration |
| `POST` | `/events/{eventId}/register` | User | Requests capacity for a party |
| `PATCH` | `/events/{eventId}/registrations/{registrationId}` | Organizer/Admin | Approves, rejects, waitlists or validates payment |
| `POST` | `/events/registrations/{registrationId}/confirm-attendance` | Owner | Confirms temporary hold |
| `POST` | `/events/registrations/{registrationId}/report-payment` | Owner | Reports transfer/QR payment |
| `DELETE` | `/events/{eventId}/register` | Owner | Cancels registration and releases capacity |
| `GET` | `/me/tickets` | User | Paginated own tickets (`page`, `size`, default 20) |
| `GET` | `/me/tickets/{id}` | User | Own ticket detail |

## Payments — Mercado Pago

Controllers exist only when `app.payments.enabled` is true; all except account
connection also require `app.payments.settlement-enabled`, and checkout also
requires `app.payments.checkout-enabled`. Responses use `Cache-Control: no-store`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/events/{eventId}/registrations/{registrationId}/checkout` | User | Optional body `{returnToApp}`; returns `{attemptId, checkoutUrl}`, 202 while the URL is not ready |
| `GET` | `/payments/events/{eventId}/registrations` | `PARTNER` or `ADMIN` | Payment/refund status for 1–50 `registrationIds` of an owned event (ADMIN: any event) |
| `GET` | `/payments/mercadopago/account` | `PARTNER` or `ADMIN` | `{connected, environment, commissionBasisPoints, commissionPercent}` |
| `POST` | `/payments/mercadopago/account/connect` | `PARTNER` or `ADMIN` | Optional body `{returnToApp}`; returns `{authorizationUrl}` |
| `POST` | `/payments/mercadopago/account/complete` | `PARTNER` or `ADMIN` | Exchanges `state`/`code` for the authenticated organizer; 204 |
| `POST` | `/payments/mercadopago/connection/callback` | Public | Completes OAuth from the single-use `state`; returns `{returnToApp}` |
| `GET` | `/payments/receipt?token=` | Public | Receipt status only, without amounts or identities |
| `POST` | `/payments/checkouts/{attemptId}/refund` | `PARTNER` or `ADMIN` | Requests a refund, or requests again one Mercado Pago rejected; 202 |
| `POST` | `/payments/mercadopago/webhooks/{attemptId}` | Public, signed | Wakes reconciliation for that attempt; invalid signature returns 401 |
| `POST` | `/payments/mercadopago/webhooks` | Public, signed | Application notification for an already known payment |

## Shared links — `/share`

`GET`/`HEAD` `/share`, `/share/en`, `/share/{path}/{id}` and
`/share/{path}/{id}/en` are public and return `no-store` HTML previews.
`path` is `wines`, `events` or `wine-routes`; unknown content returns 404.

## Wine routes — `/wine-routes`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/wine-routes?search=&country=&region=&difficulty=&page=&size=` | User | Searches published routes; every filter is optional and they combine. `search` matches part of the name ignoring case, `country` and `region` are exact, and `difficulty` is `SHORT`, `MEDIUM` or `LONG` (any other value answers 400 `INVALID_REQUEST`) |
| `GET` | `/wine-routes/{id}` | User | Detail and ordered stops |
| `GET` | `/wine-routes/hierarchy` | User | Country/region/subregion hierarchy |
| `GET` | `/wine-routes/countries` | User | Countries present |
| `GET` | `/wine-routes/countries/{country}/regions` | User | Regions present |
| `GET` | `/wine-routes/countries/{country}/regions/{region}/subregions` | User | Subregions present |
| `POST` | `/wine-routes` | `WINE_ROUTE_CREATE` | Creates draft |
| `POST` | `/wine-routes/{routeId}/stops` | `WINE_ROUTE_UPDATE[_OWN]` | Adds a stop and persists the route |

## AI — profiles and comparisons

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/wines/{id}/ai-profile?language=` | User | Reads cache, never generates; 404 when there is no profile or the person cannot see the wine |
| `GET` | `/wines/{id}/ai-profile/status?language=` | User | Complete-bundle status; 404 when the person cannot see the wine |
| `POST` | `/wines/{id}/ai-profile` | User | Ensures `es`/`en` bundle; idempotent when complete; 404 when the person cannot see the wine |
| `POST` | `/wines/{id}/ai-profile/generate` | `WINE_UPDATE` | Forces administrative regeneration |
| `PATCH` | `/wines/{id}/ai-profile` | `WINE_UPDATE` | Manual correction by language |
| `POST` | `/wines/compare` | User | Compares distinct wines and reuses bilingual cache |

Changing language must not trigger another paid call: normal generation persists
all supported languages in one operation.

## Partner — `/partner/events`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/partner/events?search=&page=&size=` | `EVENT_CREATE` | Owned events in any state, newest first; the optional `search` is trimmed and matches the title, venue, city, region or country ignoring case, and a blank one lists every owned event |
| `POST` | `/partner/events` | `EVENT_CREATE` | Creates through event domain |
| `PUT` | `/partner/events/{id}` | `EVENT_UPDATE[_OWN]` | Updates owned event; `clearFields` empties optional fields; asking for `CANCELLED` answers 400 `USE_CANCEL_ENDPOINT` |
| `DELETE` | `/partner/events/{id}` | `EVENT_DELETE[_OWN]` | Cancels owned event |

## Administration — `/admin`

Catalog, submission and moderation controllers accept `ADMIN` or `MODERATOR`.
`/admin/users/**`, `/admin/notifications/**`, `/admin/app-versions/**` and wine, winery, event and route deletion require `ADMIN`.
Publication decisions also require `REVIEW_DELETE`; removal through a report
requires that authority as well. Ownership and conflict-of-interest rules still
apply within the use case.

| Resource | Operations |
|---|---|
| `/admin/stats` | `GET` aggregate dashboard |
| `/admin/catalog-images` | `POST` JPEG/PNG dataUrl; returns imageUrl; ADMIN or MODERATOR |
| `/admin/wines` | `GET` list, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/toggle-featured`, `POST /{id}/toggle-active` |
| `/admin/wineries` | `GET` list, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}` |
| `/admin/events` | `GET` list, `GET /{id}`, `POST`, `PATCH /{id}` (asking for `CANCELLED` answers 400 `USE_CANCEL_ENDPOINT`), `DELETE /{id}`, `PATCH /{id}/publish`, `PATCH /{id}/cancel` |
| `/admin/routes` | `GET` list, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}`, `POST /{routeId}/stops`, `PATCH /{id}/publish`, `PATCH /{id}/archive` |
| `/admin/users` | `GET` list (each user adds `points` and `badgeTier`), `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `PUT /{id}/role`, `POST /{id}/assign-role`, `/ban`, `/unban` |
| `/admin/notifications/push` | `GET` provider, switches and recent changes, `PUT /types/{type}` `{enabled}`, `GET /metrics?days=1\|7\|30`, `GET /engagement?days=1\|7\|30` (engagement pushes sent, opened, opted out and held out per type; served by `EngagementAdministrationController` in the `engagement` module) |
| `/admin/notifications/announcements` | `GET` history (each send with its audience, `countryId` included), `POST` send (202; optional body `requestId` UUID makes it idempotent, a repeat returns the first send; `audience.countryId` optional), `POST /preview`, `POST /test`, `GET /reach?kind&email&push[&language&regionId&countryId&role]` |
| `/admin/app-versions` | `GET` the minimum app version of `IOS` and `ANDROID` (always both, in that order: `platform`, `minimumVersion`, `updatedAt`, `updatedBy` email, each `null` until first set) and the 20 latest `recentChanges`, newest first; `PUT /{platform}` `{minimumVersion}` sets `major.minor.patch` or clears it with `null`, needs `X-Admin-Reauthentication` and returns the same body; an unknown platform answers 400 `NOT_AN_APP_PLATFORM`, an invalid version 400 `INVALID_APP_VERSION`; saving the same value records no change |
| `/admin/reviews` | `GET` list (the author adds `badgeTier`), `GET /{id}`, `DELETE /{id}` |
| `/admin/community/reports` | `GET` queue (each case adds nullable `authorUsername`, `reviewerUsername` and `targetLabel`), `GET /overview`, `PATCH /{id}`, `POST /{id}/remove-content` |
| `/admin/review-publications` | `GET` pending content (each item adds nullable `authorUsername` and `wineName`), `POST /{type}/{id}` decision with expected revision and, for a rejection, a preset `reasonCode` |
| `/admin/wine-submissions` | `GET` list, `GET /{id}`, `GET /{id}/image`, `PATCH /{id}/decision` |
| `/admin/social-posts` | `ADMIN` only (#489, #492, #497, #510). `GET ?status=&from=&to=&page=0&size=20` social post queue ordered by `scheduledFor` (all filters optional), `GET /{id}`, `POST /plan` plans the next 14 days and answers `{created, from, to}`, `POST /{id}/approve`, `POST /{id}/reject` optional `{reason}`, `PUT /{id}` replaces one language's copy `{language: es\|en, hook, slides: [{title, body}], caption, hashtags, altText, cta}` (400 `INVALID_POST_COPY` when a limit breaks, 400 `INVALID_POST_LANGUAGE` without a valid language), `POST /{id}/regenerate`, `POST /{id}/illustration` requests a new illustration (202), `POST /{id}/publications/{network}/retry` publishes again on a failed network (`network` case-insensitive: `instagram`, `facebook`, `threads`, `tiktok`; 202 with the post; 409 `INVALID_PUBLICATION_TRANSITION` when that network is not `FAILED`, 409 `INVALID_POST_TRANSITION` when the slides are not ready, 409 `SOCIAL_PUBLISHING_OFF` with publishing or the network off, 400 `INVALID_REQUEST` for an unknown network, 404 without a publication on that network); an action that does not fit the status answers 409 `INVALID_POST_TRANSITION` (also editing, regenerating, rejecting or requesting an illustration on a `SCHEDULED` or `PUBLISHED` post). `GET /wine-days?year=` the year's calendar with resolved `date`. `GET /pillars` pillars in rotation order `{code, nameEs, nameEn, weight, active, autoApprove, performance: {measuredPosts, views, interactions, factor}}` (`factor` 1.0 is neutral); `PUT /pillars/{code}/auto-approve` and `PUT /pillars/{code}/active` with `{enabled: boolean}` answer 200 with the pillar, 400 without `enabled`, 404 for an unknown code and, when switching off the last active rotating pillar, 409 `LAST_ROTATING_PILLAR`. Each post: `{id, status, scheduledFor, pillar, wineDay, copies: {es, en}, generation, review, media, publishing, publications, createdAt, updatedAt}`; `review` adds `automatic` (approved by its pillar, no reviewer, `reason = AUTO_APPROVED`); `media` is `{status: PENDING\|READY\|FAILED, source: AI\|FALLBACK, error, illustrationReason, heroUrl, slides: {es, en}, updatedAt}` with `{instagram[], tiktok[], renderedFor}` per language, or `null`; `publishing` is `{startedAt, finishedAt, error}` or `null` until it starts; `publications[]` is `{network, status: QUEUED\|PUBLISHING\|PUBLISHED\|DRAFT_SENT\|FAILED, externalId, permalink, attempts, error, publishedAt, metrics}` with `metrics` `{views, reach, likes, comments, saves, shares, follows}` (a null value is a metric the network does not give) or `null` before the first reading |
| `/admin/social-accounts` | `ADMIN` only (#510). `GET` one row per network, always the four: `{network, mode: CONFIG\|OAUTH, configured, connected, accountId, displayName, status: CONNECTED\|REFRESH_FAILED\|null, expiresAt, lastError}`, never a token; `GET /{network}/connect` returns `{authorizeUrl}` for Threads or TikTok (422 `SOCIAL_ACCOUNT_NOT_OAUTH` for Instagram and Facebook, 422 `SOCIAL_ACCOUNT_NOT_CONFIGURED` without the network's app, 422 `SOCIAL_ACCOUNT_ENCRYPTION_KEY_MISSING` without an encryption key); `DELETE /{network}` removes the connected account (204; 404 when there was none; 409 `SOCIAL_ACCOUNT_CONFIGURED_BY_SECRETS` for Instagram and Facebook); an unknown network answers 404 |

The social media agent's OAuth redirect is public: `GET /public/social-accounts/{network}/callback?code=&state=&error=`
(#510) consumes the single-use `state` and always answers 302 to `<frontend>/admin/social-posts?account=<network>&result=connected|error`
(or `?result=error` for an unknown network), with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, without the code,
the `state` or a token. It is the redirect URI registered in Threads and TikTok
([social networks setup](../../infra/guides/social-networks-setup.md)).

Submission decisions can approve as new wine, merge with existing, reject or
request corrections. Reviewer, reason and timestamp are audited.

## Terms and acceptance — `/legal`

`GET /legal/terms/current` and `GET /legal/terms/versions/{version}` are public
and accept `locale=es|en`. `GET /legal/acceptance` and
`POST /legal/acceptance` require a session. Selection contains version,
language, hash and affirmative acceptance. `POST /auth/register` accepts the
same object in `termsAcceptance`. No target account is accepted from the
client; identity comes from the authenticated principal.

Full contracts and gradual rollout:
[contract acceptance](../../modules/legal/architecture.md).

## App update policy — `/app-versions`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/app-versions/minimum` | Public | `{ios, android}`: the minimum supported mobile app version per platform, or `null` when no build is blocked |

The mobile app calls it on launch and on returning to the foreground, without a
session. Pending terms do not block it. The value is read from the database on
every request, so a change made in `/admin/app-versions` applies without a deploy.

## Reference data, files and health

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/reference/wine-types` | User | Active wine types |
| `GET` | `/reference/event-types` | User | Event types |
| `GET` | `/reference/event-statuses` | User | Event statuses |
| `GET` | `/grape-types` | User | Active grapes |
| `GET` | `/regions/countries` | User | Countries |
| `GET` | `/regions` | User | Regions |
| `GET` | `/regions/country/{countryId}` | User | Country regions |
| `GET` | `/uploads/avatars/{filename}` | Public, validated | Serves a public avatar from private storage |
| `GET` | `/uploads/wine-labels/{filename}` | Public, validated | Serves published label |
| `POST` | `/uploads/covers` | Event or route create/update permission according to `kind` | Multipart `kind=EVENT\|WINE_ROUTE` and `file`; returns ID, URL and WebP dimensions |
| `GET` | `/uploads/covers/{id}.webp` | Resource visibility/owner/staff | Managed cover; `no-store`; private drafts return 404 without access |
| `GET` | `/uploads/social/{key}` | Public, validated | Social post slide or illustration with local or S3 storage (#492); `image/jpeg` or `image/png`, public immutable one-year cache; an invalid or missing key returns 404. With R2 the `images.vinnot.com` Worker serves them |
| `GET` | `/health` | Public | Application health |
| `GET` | `/version` | Public | Name/version/timestamp |
| `GET` | `/actuator/health` | Public | Spring operational health |

Quarantined images are not served from `/uploads`; only the protected admin
endpoint can retrieve them and it sets no-cache headers. New R2 avatars and labels use
`images.vinnot.com` URLs; the Worker exposes neither quarantine nor covers.
An expired cover Bearer returns 401 to refresh the session; requests without
credentials use public-visibility checks. [Image contract](../use-cases/uploads-and-reference-data.md).

## Error response

The `GlobalExceptionHandler.ErrorResponse` body contains `timestamp`, `path`, `status`, `code`, `message` and `details`. Bean Validation adds field details. `requestId` is not a field of this record: correlation is returned in `X-Request-ID` and used in logs/MDC. Pre-MVC filters have their own writers. Exact mappings are described in [errors](errors-transactions-and-consistency.md).

## Catalog maintenance

When a controller changes, update:

1. OpenAPI and MVC/security test;
2. web/mobile client and DTO when it consumes the operation;
3. this catalog in both languages;
4. affected use-case and data model documentation;
5. rate limit and permissions if exposure or cost changes.
