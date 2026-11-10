# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-ACT-01` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | 1) The person opens a wine, route, event or winery detail. 2) The screen calls `useDetailViewTracking` with the content kind and id. 3) `activityService.recordView` sends `POST /users/me/activity/views` with `{kind, id}` without waiting for the answer. 4) The API validates the kind and the UUID and `RecordContentViewCommandHandler` adds one view to that UTC day's row. 5) The API answers 204. | The view is added to the day's row and the screen waits for nothing. |
| `CP-ACT-02` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Main flow → 1a. There is no session or the content id is missing | The app sends nothing. |
| `CP-ACT-03` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Main flow → 3a. The request fails | The app drops it and only logs it in development; the screen stays the same. |
| `CP-ACT-04` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Main flow → 4a. The kind is not `WINE`, `ROUTE`, `EVENT` or `WINERY`, or the id is not a UUID | The API answers 400 without reaching the use case. |
| `CP-ACT-05` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Main flow → 4b. The request arrives without a session | The API answers 401 and stores nothing. |
| `CP-ACT-06` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Main flow → 4c. The account no longer exists | The signal is ignored without an error. |
| `CP-ACT-07` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | 1) The person opens the app or brings it back to the foreground. 2) `ActivitySync`, mounted in `RootNavigator`, uses `useAppOpenTracking`, which reports the cold start and every return to the foreground. 3) `activityService.recordAppOpen` sends `POST /users/me/activity/app-open` if it reported no other open in the last 30 minutes. 4) `RecordAppOpenCommandHandler` stores the open and moves the last activity with a conditional upsert that keeps at most one open every 30 minutes (`app.activity.app-open-gap`). 5) The API answers 204. | The open is stored and the person's usual hour takes it into account. |
| `CP-ACT-08` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | Main flow → 3a. The app reported an open less than 30 minutes ago | The app sends nothing. |
| `CP-ACT-09` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | Main flow → 4a. Another open arrives within the 30 minutes, even at the same time | The API answers 204 without storing another open. |
| `CP-ACT-10` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | Main flow → 3b. The request fails | The next open is reported again without waiting 30 minutes. |
| `CP-ACT-11` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | Main flow → 1a. The person signs out | The app stops listening and forgets the last open, so the next sign-in counts at once. |
| `CP-ACT-12` | [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | 1) Once a day (`app.activity.retention-delay-ms`; the first run 10 minutes after startup), `ActivityRetentionScheduler` calls `PurgeExpiredActivityUseCase`. 2) `PurgeExpiredActivityCommandHandler` computes the cutoff: now minus 180 days (`app.activity.retention`). 3) It deletes views, opens and last activity older than the cutoff in batches of 5000 (`app.activity.purge-batch-size`) until a batch comes back short. 4) If it deleted rows, it logs the count. | Expired signals are deleted in batches. |
| `CP-ACT-13` | [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | Main flow → 3a. There are no expired signals | It deletes nothing and writes no log. |
| `CP-ACT-14` | [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | Main flow → 2a. The retention or the batch size is not positive | The backend does not start: the configuration is rejected when the handler is created. |
| `CP-ACT-15` | [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | Main flow → 1a. An account is deleted | Its signals are deleted by cascade without waiting for the purge. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | RF-APK-ACT-01, RF-APK-ACT-02 | CP-ACT-01, CP-ACT-02, CP-ACT-03, CP-ACT-04, CP-ACT-05, CP-ACT-06 | 4 | n/a | 4 |
| [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | RF-APK-ACT-03, RF-APK-ACT-04 | CP-ACT-07, CP-ACT-08, CP-ACT-09, CP-ACT-10, CP-ACT-11 | 4 | n/a | 4 |
| [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | — | CP-ACT-12, CP-ACT-13, CP-ACT-14, CP-ACT-15 | 3 | n/a | n/a |

The Backend, Web and App columns count the test files that exercise the case. "n/a" means the case does not apply to that platform.

## Tests per use case

Each row names the test class or file and the methods or cases that exercise the use case.

| Use case | Platform | Test | Methods or cases |
|---|---|---|---|
| `UC-ACT-01` | Backend | [`ActivityControllerTest.java`](../../../../backend/src/test/java/com/vinnot/activity/infrastructure/web/ActivityControllerTest.java) | `recordsAViewOfEachKindOfDetailForTheSignedInUser`; `rejectsAnUnknownKindOrAMissingOrMalformedIdBeforeReachingTheUseCase` |
| `UC-ACT-01` | Backend | [`EngagementSignalEndpointsSecurityTest.java`](../../../../backend/src/test/java/com/vinnot/activity/infrastructure/web/EngagementSignalEndpointsSecurityTest.java) | `rejectsAnonymousRequestsWithoutRecordingAnything`; `acceptsASignedInUser` |
| `UC-ACT-01` | Backend | [`RecordContentViewCommandHandlerTest.java`](../../../../backend/src/test/java/com/vinnot/activity/application/command/handler/RecordContentViewCommandHandlerTest.java) | `recordsOneViewOfTheContentAtTheCurrentTime`; `aViewNeedsItsUserKindAndContent` |
| `UC-ACT-01` | Backend | [`JdbcActivityPostgresIntegrationTest.java`](../../../../backend/src/test/java/com/vinnot/activity/infrastructure/persistence/JdbcActivityPostgresIntegrationTest.java) | `repeatedViewsOfOneDetailOnOneDayShareARowAndAnotherDayAddsOne`; `signalsOfAnAccountThatNoLongerExistsAreIgnored` |
| `UC-ACT-01` | App | [`useDetailViewTracking.test.ts`](../../../../frontend-mobile/src/presentation/hooks/useDetailViewTracking.test.ts) | `records one view per detail screen mount of a signed-in member`; `records nothing without an id or while signed out` |
| `UC-ACT-01` | App | [`activity.service.test.ts`](../../../../frontend-mobile/src/application/services/activity.service.test.ts) | `records a detail view without waiting for the server`; `never records a view without an id`; `swallows a failed view and only logs it in development` |
| `UC-ACT-01` | App | [`activity.client.test.ts`](../../../../frontend-mobile/src/infrastructure/api/clients/activity.client.test.ts) | `records a detail view` |
| `UC-ACT-01` | App | [`activity.test.ts`](../../../../frontend-mobile/src/domain/activity/activity.test.ts) | `knows the detail screens whose views are signals` |
| `UC-ACT-02` | Backend | [`ActivityControllerTest.java`](../../../../backend/src/test/java/com/vinnot/activity/infrastructure/web/ActivityControllerTest.java) | `anAppOpenIsAcceptedWhetherItWasRecordedOrThrottled` |
| `UC-ACT-02` | Backend | [`EngagementSignalEndpointsSecurityTest.java`](../../../../backend/src/test/java/com/vinnot/activity/infrastructure/web/EngagementSignalEndpointsSecurityTest.java) | `rejectsAnonymousRequestsWithoutRecordingAnything` |
| `UC-ACT-02` | Backend | [`RecordAppOpenCommandHandlerTest.java`](../../../../backend/src/test/java/com/vinnot/activity/application/command/handler/RecordAppOpenCommandHandlerTest.java) | `recordsTheOpenUnlessOneWasRecordedWithinTheGap`; `theGapMustBePositive` |
| `UC-ACT-02` | Backend | [`JdbcActivityPostgresIntegrationTest.java`](../../../../backend/src/test/java/com/vinnot/activity/infrastructure/persistence/JdbcActivityPostgresIntegrationTest.java) | `anOpenIsRecordedAtMostOncePerGapAndMovesLastActive`; `openHoursAreCountedInTheUsersTimeZoneSinceAnInstant` |
| `UC-ACT-02` | App | [`useAppOpenTracking.test.ts`](../../../../frontend-mobile/src/presentation/hooks/useAppOpenTracking.test.ts) | `records nothing while signed out`; `records the cold start of a signed-in member and every return to the foreground (the service throttles)`; `stops listening and forgets the last open on sign-out` |
| `UC-ACT-02` | App | [`activity.service.test.ts`](../../../../frontend-mobile/src/application/services/activity.service.test.ts) | `records an app open at most once every 30 minutes`; `a failed app open is retried on the next open instead of waiting 30 minutes`; `forgets the last app open on sign-out, so the next sign-in counts at once` |
| `UC-ACT-02` | App | [`activity.client.test.ts`](../../../../frontend-mobile/src/infrastructure/api/clients/activity.client.test.ts) | `records an app open with an empty body` |
| `UC-ACT-02` | App | [`activity.test.ts`](../../../../frontend-mobile/src/domain/activity/activity.test.ts) | `records an app open at most once every 30 minutes` |
| `UC-ACT-03` | Backend | [`PurgeExpiredActivityCommandHandlerTest.java`](../../../../backend/src/test/java/com/vinnot/activity/application/command/handler/PurgeExpiredActivityCommandHandlerTest.java) | `deletesSignalsOlderThanTheRetentionInBatchesUntilNoneAreLeft`; `theRetentionAndBatchMustBePositive` |
| `UC-ACT-03` | Backend | [`ActivityRetentionSchedulerTest.java`](../../../../backend/src/test/java/com/vinnot/activity/infrastructure/scheduling/ActivityRetentionSchedulerTest.java) | `runsThePurgeOnEveryTick` |
| `UC-ACT-03` | Backend | [`JdbcActivityPostgresIntegrationTest.java`](../../../../backend/src/test/java/com/vinnot/activity/infrastructure/persistence/JdbcActivityPostgresIntegrationTest.java) | `purgesSignalsOlderThanTheCutoffInBatches`; `deletingTheAccountDeletesItsSignals` |

Reading the signals for the planner (`ReadActivitySignalsQueryHandlerTest`, `OpenHourHistogramTest` and the reads in `JdbcActivityPostgresIntegrationTest`) and opened pushes (`JdbcPushOpenStorePostgresIntegrationTest`, `PushOpensControllerTest`) are tested in [`UC-NOT-07`](../notifications/use-cases/uc-not-07-receive-suggestions.md), in the notifications module.
