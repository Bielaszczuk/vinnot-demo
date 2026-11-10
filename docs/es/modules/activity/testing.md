# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-ACT-01` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | 1) La persona abre el detalle de un vino, una ruta, un evento o una bodega. 2) La pantalla llama a `useDetailViewTracking` con el tipo y el id del contenido. 3) `activityService.recordView` envía `POST /users/me/activity/views` con `{kind, id}` sin esperar la respuesta. 4) La API valida el tipo y el UUID y `RecordContentViewCommandHandler` suma una vista en la fila de ese día UTC. 5) La API responde 204. | La vista queda sumada en la fila del día y la pantalla no espera nada. |
| `CP-ACT-02` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Flujo principal → 1a. No hay sesión o falta el id del contenido | La app no envía nada. |
| `CP-ACT-03` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Flujo principal → 3a. El pedido falla | La app lo descarta y solo lo registra en desarrollo; la pantalla sigue igual. |
| `CP-ACT-04` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Flujo principal → 4a. El tipo no es `WINE`, `ROUTE`, `EVENT` ni `WINERY`, o el id no es un UUID | La API responde 400 sin llegar al caso de uso. |
| `CP-ACT-05` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Flujo principal → 4b. El pedido llega sin sesión | La API responde 401 y no guarda nada. |
| `CP-ACT-06` | [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | Flujo principal → 4c. La cuenta ya no existe | La señal se ignora sin error. |
| `CP-ACT-07` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | 1) La persona abre la app o la vuelve a traer al frente. 2) `ActivitySync`, montado en `RootNavigator`, usa `useAppOpenTracking`, que avisa en el arranque y en cada regreso al frente. 3) `activityService.recordAppOpen` envía `POST /users/me/activity/app-open` si no informó otra apertura en los últimos 30 minutos. 4) `RecordAppOpenCommandHandler` guarda la apertura y mueve la última actividad con un upsert condicional que deja como mucho una apertura cada 30 minutos (`app.activity.app-open-gap`). 5) La API responde 204. | La apertura queda guardada y la hora habitual de la persona la tiene en cuenta. |
| `CP-ACT-08` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | Flujo principal → 3a. La app ya informó una apertura hace menos de 30 minutos | La app no envía nada. |
| `CP-ACT-09` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | Flujo principal → 4a. Llega otra apertura dentro de los 30 minutos, incluso al mismo tiempo | La API responde 204 sin guardar otra apertura. |
| `CP-ACT-10` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | Flujo principal → 3b. El pedido falla | La próxima apertura se vuelve a informar sin esperar 30 minutos. |
| `CP-ACT-11` | [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | Flujo principal → 1a. La persona cierra sesión | La app deja de escuchar y olvida la última apertura, así el próximo ingreso cuenta enseguida. |
| `CP-ACT-12` | [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | 1) Una vez por día (`app.activity.retention-delay-ms`; la primera corrida a los 10 minutos del arranque), `ActivityRetentionScheduler` llama a `PurgeExpiredActivityUseCase`. 2) `PurgeExpiredActivityCommandHandler` calcula el corte: ahora menos 180 días (`app.activity.retention`). 3) Borra vistas, aperturas y última actividad anteriores al corte en lotes de 5000 (`app.activity.purge-batch-size`), hasta que un lote llega incompleto. 4) Si borró filas, registra la cantidad en el log. | Las señales vencidas se borran por lotes. |
| `CP-ACT-13` | [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | Flujo principal → 3a. No hay señales vencidas | No borra nada ni escribe en el log. |
| `CP-ACT-14` | [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | Flujo principal → 2a. La retención o el tamaño del lote no son positivos | El backend no arranca: la configuración se rechaza al crear el handler. |
| `CP-ACT-15` | [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | Flujo principal → 1a. Se elimina una cuenta | Sus señales se borran en cascada sin esperar la purga. |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-ACT-01`](use-cases/uc-act-01-record-detail-view.md) | RF-APK-ACT-01, RF-APK-ACT-02 | CP-ACT-01, CP-ACT-02, CP-ACT-03, CP-ACT-04, CP-ACT-05, CP-ACT-06 | 4 | n/a | 4 |
| [`UC-ACT-02`](use-cases/uc-act-02-record-app-open.md) | RF-APK-ACT-03, RF-APK-ACT-04 | CP-ACT-07, CP-ACT-08, CP-ACT-09, CP-ACT-10, CP-ACT-11 | 4 | n/a | 4 |
| [`UC-ACT-03`](use-cases/uc-act-03-purge-expired-signals.md) | — | CP-ACT-12, CP-ACT-13, CP-ACT-14, CP-ACT-15 | 3 | n/a | n/a |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso. «n/a» indica que el caso no aplica a esa plataforma.

## Tests por caso de uso

Cada fila nombra la clase o el archivo de test y los métodos o casos que ejercen el caso de uso.

| Caso de uso | Plataforma | Test | Métodos o casos |
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

La lectura de las señales para el planificador (`ReadActivitySignalsQueryHandlerTest`, `OpenHourHistogramTest` y las consultas de `JdbcActivityPostgresIntegrationTest`) y los push abiertos (`JdbcPushOpenStorePostgresIntegrationTest`, `PushOpensControllerTest`) se prueban en [`UC-NOT-07`](../notifications/use-cases/uc-not-07-receive-suggestions.md), del módulo de notificaciones.
