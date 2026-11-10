# Activity

Stores the app usage signals of each signed-in person: which wine, route, event and
winery details they open, when they open the app and which push notifications they
open. It shows nothing on screen: the personalised-suggestion planner reads them to
choose what to suggest, when to send it and when to lower the frequency
([`UC-NOT-07`](../notifications/use-cases/uc-not-07-receive-suggestions.md)). The web
sends no signals. They are never shown to other people or shared with third parties.

- Module code: `ACT`.
- [Use cases](use-cases/README.md) · [Requirements](requirements.md) ·
  [Architecture](architecture.md) · [Testing](testing.md)
- Use of the signals: [`UC-NOT-07` · Receive personalised suggestions](../notifications/use-cases/uc-not-07-receive-suggestions.md), in the notifications module, with its [requirement `RF-APK-NOT-13`](../notifications/requirements.md) and its [test cases](../notifications/testing.md).
- Backend: package [`activity`](../../../../backend/src/main/java/com/vinnot/activity/);
  push opens live in [`notification`](../notifications/README.md).
- Data: [activity signals (V66)](../../backend/data/database-model.md).

## Endpoints

All three need a session, answer `204` and use the general request limit.

| Endpoint | Body | What it stores |
|---|---|---|
| `POST /users/me/activity/views` | `{kind: WINE\|ROUTE\|EVENT\|WINERY, id}` | One more view of the detail in that UTC day's row |
| `POST /users/me/activity/app-open` | `{}` (optional) | An open and the last activity, at most one every 30 minutes |
| `POST /users/me/push-opens` | `{ref, type}` | The opened push, once per `ref`; it also counts as an app open |

## Business rules

| Rule | Detail | Where |
|---|---|---|
| Content kinds | `WINE`, `ROUTE`, `EVENT`, `WINERY`; any other value or a non-UUID `id` is `400` | [`ActivityController.java`](../../../../backend/src/main/java/com/vinnot/activity/infrastructure/web/ActivityController.java) |
| Unknown content | Views are not looked up one by one: the `id` is stored and never matches real content | [`RecordContentViewUseCase.java`](../../../../backend/src/main/java/com/vinnot/activity/application/port/in/RecordContentViewUseCase.java) |
| Bounded growth | One row per user, content and day; repeated views add to `views` | [`JdbcContentViewRepository.java`](../../../../backend/src/main/java/com/vinnot/activity/infrastructure/persistence/JdbcContentViewRepository.java) |
| Throttled opens | At most one recorded open every 30 minutes (`app.activity.app-open-gap`); a conditional upsert holds it under concurrent requests | [`JdbcAppOpenRepository.java`](../../../../backend/src/main/java/com/vinnot/activity/infrastructure/persistence/JdbcAppOpenRepository.java) |
| Usual hour | The hour of the day (in `users.timezone`) with the most opens in the last 30 days; a tie picks the earliest; no opens means no hour | [`OpenHourHistogram.java`](../../../../backend/src/main/java/com/vinnot/activity/domain/model/OpenHourHistogram.java) |
| Push opens | `ref` of up to 180 characters and an existing `NotificationType`; each `ref` keeps its first open | [`PushOpenService.java`](../../../../backend/src/main/java/com/vinnot/notification/application/service/PushOpenService.java) |
| Retention | Views, opens, last activity and push opens are deleted in batches after 180 days (`app.activity.retention`, `app.activity.push-open-retention`) | [`PurgeExpiredActivityCommandHandler.java`](../../../../backend/src/main/java/com/vinnot/activity/application/command/handler/PurgeExpiredActivityCommandHandler.java), [`JdbcPushOpenRetention.java`](../../../../backend/src/main/java/com/vinnot/notification/infrastructure/persistence/JdbcPushOpenRetention.java) |
| Deleted account | Signals cascade; signals of an account that no longer exists are ignored | [`V66__engagement_signals.sql`](../../../../backend/src/main/resources/db/migration/V66__engagement_signals.sql) |

## Reads for the planner

The planner takes pages of users and reads everything with a fixed number of
queries per page, never one per person:

| Port | Returns |
|---|---|
| [`ReadActivitySignalsUseCase.rhythms`](../../../../backend/src/main/java/com/vinnot/activity/application/port/in/ReadActivitySignalsUseCase.java) | Last activity and usual open hour per user |
| `ReadActivitySignalsUseCase.viewsSince` | Content of one kind each user viewed since an instant, most viewed first |
| `ReadActivitySignalsUseCase.mostViewed` | The content of one kind viewed most by everyone since an instant |
| [`PushOpenUseCase.opensSince`](../../../../backend/src/main/java/com/vinnot/notification/application/port/in/PushOpenUseCase.java) | Opened pushes per user and type since an instant, for fatigue |
| `PushOpenUseCase.openCountsSince` | Opened pushes per type, for metrics |

## Tests

| Test | What it covers |
|---|---|
| `JdbcActivityPostgresIntegrationTest` | Day rows, per-user and global reads, open throttling, hour in the user's time zone, batched purge and cascading deletion |
| `JdbcPushOpenStorePostgresIntegrationTest` | One open per `ref`, per-user and per-type reads, per-type counts and retention |
| `EngagementSignalEndpointsSecurityTest` | All three endpoints reject requests without a session with `401` |
| `ActivityControllerTest`, `PushOpensControllerTest` | Body validation and `204` |
| `RecordContentViewCommandHandlerTest`, `RecordAppOpenCommandHandlerTest`, `ReadActivitySignalsQueryHandlerTest`, `OpenHourHistogramTest` | Recording views and opens, paged reads and the usual hour |
| `PurgeExpiredActivityCommandHandlerTest`, `ActivityRetentionSchedulerTest` | Purge after 180 days |
| App: `activity.test.ts`, `activity.service.test.ts`, `activity.client.test.ts`, `useAppOpenTracking.test.ts`, `useDetailViewTracking.test.ts` | One open every 30 minutes, views only with a session and failures that never block the screen |

The links to each file and its methods are in [Testing](testing.md); the reads for the planner are tested in [`UC-NOT-07`](../notifications/use-cases/uc-not-07-receive-suggestions.md).
