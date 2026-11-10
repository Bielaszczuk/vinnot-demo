# Actividad

Guarda las señales de uso de la app de cada persona con sesión: qué detalles de vinos,
rutas, eventos y bodegas abre, cuándo abre la app y qué notificaciones push abre. No
muestra nada en pantalla: el planificador de sugerencias personalizadas las lee para
elegir qué sugerir, a qué hora enviarlo y cuándo bajar la frecuencia
([`UC-NOT-07`](../notifications/use-cases/uc-not-07-receive-suggestions.md)). La web no
envía señales. No se muestran a otras personas ni se comparten con terceros.

- Código del módulo: `ACT`.
- [Casos de uso](use-cases/README.md) · [Requisitos](requirements.md) ·
  [Arquitectura](architecture.md) · [Pruebas](testing.md)
- Uso de las señales: [`UC-NOT-07` · Recibir sugerencias personalizadas](../notifications/use-cases/uc-not-07-receive-suggestions.md), del módulo de notificaciones, con su [requisito `RF-APK-NOT-13`](../notifications/requirements.md) y sus [casos de prueba](../notifications/testing.md).
- Backend: paquete [`activity`](../../../../backend/src/main/java/com/vinnot/activity/);
  las aperturas de push viven en [`notification`](../notifications/README.md).
- Datos: [señales de actividad (V66)](../../backend/data/database-model.md).

## Endpoints

Los tres exigen sesión, responden `204` y usan el límite general de peticiones.

| Endpoint | Cuerpo | Qué guarda |
|---|---|---|
| `POST /users/me/activity/views` | `{kind: WINE\|ROUTE\|EVENT\|WINERY, id}` | Una vista más del detalle en la fila de ese día UTC |
| `POST /users/me/activity/app-open` | `{}` (opcional) | Una apertura y la última actividad, como mucho una cada 30 minutos |
| `POST /users/me/push-opens` | `{ref, type}` | El push abierto, una vez por `ref`; cuenta también como apertura de la app |

## Reglas de negocio

| Regla | Detalle | Dónde |
|---|---|---|
| Tipos de contenido | `WINE`, `ROUTE`, `EVENT`, `WINERY`; otro valor o un `id` que no es UUID es `400` | [`ActivityController.java`](../../../../backend/src/main/java/com/vinnot/activity/infrastructure/web/ActivityController.java) |
| Contenido inexistente | No se consulta por cada vista: el `id` se guarda y nunca coincide con contenido real | [`RecordContentViewUseCase.java`](../../../../backend/src/main/java/com/vinnot/activity/application/port/in/RecordContentViewUseCase.java) |
| Crecimiento acotado | Una fila por usuario, contenido y día; las vistas repetidas suman `views` | [`JdbcContentViewRepository.java`](../../../../backend/src/main/java/com/vinnot/activity/infrastructure/persistence/JdbcContentViewRepository.java) |
| Aperturas limitadas | Como mucho una apertura registrada cada 30 minutos (`app.activity.app-open-gap`); un upsert condicional lo garantiza aunque lleguen pedidos simultáneos | [`JdbcAppOpenRepository.java`](../../../../backend/src/main/java/com/vinnot/activity/infrastructure/persistence/JdbcAppOpenRepository.java) |
| Hora habitual | La hora del día (en `users.timezone`) con más aperturas de los últimos 30 días; un empate elige la más temprana; sin aperturas no hay hora | [`OpenHourHistogram.java`](../../../../backend/src/main/java/com/vinnot/activity/domain/model/OpenHourHistogram.java) |
| Push abiertos | `ref` de hasta 180 caracteres y un `NotificationType` existente; la primera apertura de cada `ref` es la que queda | [`PushOpenService.java`](../../../../backend/src/main/java/com/vinnot/notification/application/service/PushOpenService.java) |
| Retención | Vistas, aperturas, última actividad y push abiertos se borran en lotes a los 180 días (`app.activity.retention`, `app.activity.push-open-retention`) | [`PurgeExpiredActivityCommandHandler.java`](../../../../backend/src/main/java/com/vinnot/activity/application/command/handler/PurgeExpiredActivityCommandHandler.java), [`JdbcPushOpenRetention.java`](../../../../backend/src/main/java/com/vinnot/notification/infrastructure/persistence/JdbcPushOpenRetention.java) |
| Cuenta eliminada | Las señales se borran en cascada; las de una cuenta que ya no existe se ignoran | [`V66__engagement_signals.sql`](../../../../backend/src/main/resources/db/migration/V66__engagement_signals.sql) |

## Lectura para el planificador

El planificador recibe páginas de usuarios y lee todo con un número fijo de
consultas por página, nunca una por persona:

| Puerto | Devuelve |
|---|---|
| [`ReadActivitySignalsUseCase.rhythms`](../../../../backend/src/main/java/com/vinnot/activity/application/port/in/ReadActivitySignalsUseCase.java) | Última actividad y hora habitual de apertura por usuario |
| `ReadActivitySignalsUseCase.viewsSince` | Contenido de un tipo visto por cada usuario desde un instante, el más visto primero |
| `ReadActivitySignalsUseCase.mostViewed` | El contenido de un tipo más visto por todos desde un instante |
| [`PushOpenUseCase.opensSince`](../../../../backend/src/main/java/com/vinnot/notification/application/port/in/PushOpenUseCase.java) | Push abiertos por usuario y tipo desde un instante, para la fatiga |
| `PushOpenUseCase.openCountsSince` | Push abiertos por tipo, para las métricas |

## Pruebas

| Prueba | Qué cubre |
|---|---|
| `JdbcActivityPostgresIntegrationTest` | Filas por día, lectura por usuario y global, límite de aperturas, hora en la zona del usuario, purga por lotes y borrado en cascada |
| `JdbcPushOpenStorePostgresIntegrationTest` | Una apertura por `ref`, lectura por usuario y tipo, conteo por tipo y retención |
| `EngagementSignalEndpointsSecurityTest` | Los tres endpoints rechazan pedidos sin sesión con `401` |
| `ActivityControllerTest`, `PushOpensControllerTest` | Validación de los cuerpos y `204` |
| `RecordContentViewCommandHandlerTest`, `RecordAppOpenCommandHandlerTest`, `ReadActivitySignalsQueryHandlerTest`, `OpenHourHistogramTest` | Registro de vistas y aperturas, lectura por páginas y hora habitual |
| `PurgeExpiredActivityCommandHandlerTest`, `ActivityRetentionSchedulerTest` | Purga a los 180 días |
| App: `activity.test.ts`, `activity.service.test.ts`, `activity.client.test.ts`, `useAppOpenTracking.test.ts`, `useDetailViewTracking.test.ts` | Una apertura cada 30 minutos, vistas solo con sesión y fallos que no bloquean la pantalla |

Los enlaces a cada archivo y sus métodos están en [Pruebas](testing.md); la lectura para el planificador se prueba en [`UC-NOT-07`](../notifications/use-cases/uc-not-07-receive-suggestions.md).
