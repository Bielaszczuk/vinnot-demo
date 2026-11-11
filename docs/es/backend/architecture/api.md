# Catálogo completo de API HTTP

## Alcance y fuente de verdad

La API Spring Boot se publica bajo el context path `/api`. En local la base es
`http://localhost:8080/api`; el entorno de desarrollo usa
`https://api-dev.vinnot.com/api` y producción `https://api.vinnot.com/api`. Swagger UI y OpenAPI están disponibles, cuando
el perfil los habilita, en `/swagger-ui.html` y `/api-docs` relativos a esa base.
El navegador pide usuario y contraseña: el email y la contraseña de una cuenta
ADMIN de Vinnot activa y verificada.

Este catálogo se verificó contra los `@RequestMapping`, mappings de método y
`@PreAuthorize` de los controllers. Los records de request y response del código
siguen siendo la fuente de verdad campo por campo.

## Convenciones

Contacto público: `POST /support/requests` recibe una consulta con UUID idempotente y devuelve 202; no expone lecturas ni requiere sesión. Categorías, errores y retención: [support](../../modules/support/architecture.md).

- JSON en operaciones normales; `multipart/form-data` para avatar, escaneo,
  imagen de etiqueta y submission.
- `GET` consulta; `POST` crea o ejecuta una acción; `PATCH` modifica campos/estado;
  `DELETE` elimina o cancela. La semántica de `PUT` se define por cada DTO/handler:
  partner admite campos opcionales y aplica una actualización parcial.
- El JWT se envía como `Authorization: Bearer <access-token>`.
- Los identificadores son UUID salvo catálogos de referencia.
- Fechas de dominio se transportan en ISO-8601 y se almacenan como instantes.
- Listados paginados usan `page` basado en cero y `size`; filtros adicionales se
  describen en cada caso de uso.
- `X-Request-ID` se acepta o genera y se devuelve para correlación.
- Rate limiting expone `X-RateLimit-Limit`, `X-RateLimit-Remaining` y, al
  bloquear, `Retry-After`.

Los límites de paginación, bytes, dimensiones y timeouts de transporte se
describen en [protección de recursos](resource-protection.md). Las consultas
basadas en `PageQuery` rechazan tamaños superiores a 200 y offsets que
desbordan; las políticas públicas más estrictas conservan sus límites.

## Leyenda de acceso

| Marca | Acceso |
|---|---|
| Público | No requiere sesión |
| Usuario | Requiere identidad autenticada |
| Autoridad | Requiere la autoridad indicada o la regla de ownership |
| Admin | Requiere rol `ADMIN` |

La exigencia de sesión de `GET /wines/**`, `/wineries/**`, `/events/**` y
`/wine-routes/**` se define en `SecurityConfig`. Las annotations de método
refuerzan escrituras y ownership. `/wines/submissions/**` se declara antes de la
regla del catálogo; ambos circuitos requieren sesión.

## Autenticación — `/auth`

El adapter de navegador añade POST `/auth/web/login`, `/auth/web/social`,
`/auth/web/refresh` y `/auth/web/logout`: exige Origin autorizado y
`X-Vinnot-Web-Session: 1`; refresh sólo se devuelve como cookie HttpOnly, nunca
en JSON. Logout devuelve 204. Refresh sin cookie ni credencial legacy devuelve
204 sin body ni Set-Cookie (arranque anónimo normal); con sesión válida devuelve
access/tokenType/expiresIn/user y rota la cookie. Una credencial presente inválida
sigue fallando con INVALID_TOKEN; no se considera ausencia ni se revoca otra
cookie desde esa respuesta. Login/social devuelven access/tokenType/expiresIn/user.
POST `/auth/reauthenticate` requiere sesión y una credencial (contraseña o
token reciente de Google/Apple vinculado), devuelve `{proof}` de cinco minutos
para `X-Admin-Reauthentication`. Véase
[contrato de identidad](authentication-and-identity.md).

| Método | Ruta | Acceso | Resultado |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Registra credenciales y dispara verificación |
| `POST` | `/auth/login` | Público | Sesión canónica con access/refresh token y expiración |
| `POST` | `/auth/social` | Público | Verifica Google/Apple/Facebook y vincula o crea identidad |
| `POST` | `/auth/refresh` | Público con refresh token | Rota refresh token y emite sesión nueva |
| `POST` | `/auth/logout` | Público con refresh token | Revoca el refresh presentado; un `pushToken` opcional olvida este dispositivo para la cuenta de la sesión aunque la sesión haya vencido, o solo ese token exacto cuando el refresh token es desconocido |
| `GET` | `/auth/me` | Usuario | Usuario autenticado actual; `hasPassword` indica si la contraseña la eligió su titular |
| `POST` | `/auth/forgot-password` | Público | Solicita email de recuperación sin enumerar cuentas |
| `POST` | `/auth/reset-password/validate` | Público | Valida un token sin consumirlo |
| `POST` | `/auth/reset-password` | Público | Consume token y reemplaza contraseña |
| `POST` | `/auth/verify-email` | Público | Consume token de verificación |
| `POST` | `/auth/resend-verification` | Público | Reenvía verificación con política de cuota |
| `POST` | `/auth/email-change/confirm` | Público | Confirma el cambio de email pendiente |

Recuperar contraseña, restablecerla, verificar el email y reenviar la
verificación responden `{"code", "message"}`. Los clientes muestran su propio
texto según `code` (`PASSWORD_RESET_LINK_SENT`, `PASSWORD_RESET`,
`EMAIL_VERIFIED`, `VERIFICATION_EMAIL_SENT`); `message` es solo un texto de
respaldo en inglés.

`expiresIn` representa milisegundos de vida del access token. Login credential y
social devuelven el mismo `AuthSessionResponse`. Una cuenta desactivada requiere
confirmación explícita de reactivación; logout no invalida retroactivamente un
access JWT ya firmado.

## Usuarios — `/users`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/users` | Admin | Listado paginado legado de usuarios |
| `GET` | `/users/{id}` | Admin | Detalle privado legado |
| `GET` | `/users/{userId}/stats` | Admin | Estadísticas de un usuario |
| `GET` | `/users/me/stats` | Usuario | Estadísticas del usuario actual |
| `GET` | `/users/me/notification-preferences` | Usuario | Preferencias de notificaciones y consentimiento de marketing; cada categoría indica también `emailAvailable` y `pushAvailable` |
| `PUT` | `/users/me/notification-preferences` | Usuario | Cambiar elecciones de notificaciones y consentimiento de marketing |
| `PUT` | `/users/me/push-devices` | Usuario | Registrar o renovar el token Expo push de este dispositivo `{token, platform: IOS\|ANDROID, locale: es\|en, channels?: boolean}` (204). Se llama en cada arranque en frío; los dispositivos sin registrar durante 120 días se eliminan. `channels: true` indica que la app creó los canales de Android por categoría, así los push los usan en lugar de `default` |
| `DELETE` | `/users/me/push-devices` | Usuario | Dar de baja este dispositivo `{token}` (204) |
| `GET` | `/users/me/event-area` | Usuario | Zona de "eventos cerca tuyo" `{kind: REGION\|APPROXIMATE, regionId, regionName}`; nunca una ubicación (204 si no hay) |
| `PUT` | `/users/me/event-area` | Usuario | Definir la zona: `{regionId}` de `/regions`, o `{latitude, longitude}` redondeadas en el servidor a 0,1° (~11 km) (204; 400 si vienen ambas o ninguna, 404 región desconocida) |
| `DELETE` | `/users/me/event-area` | Usuario | Dejar de recibir "eventos cerca tuyo" (204) |
| `POST` | `/users/me/activity/views` | Usuario | Registrar que abrió un detalle `{kind: WINE\|ROUTE\|EVENT\|WINERY, id}` (204; 400 si `kind` o `id` no son válidos; un `id` inexistente se guarda igual y nunca coincide). Ver [actividad](../../modules/activity/README.md) |
| `POST` | `/users/me/activity/app-open` | Usuario | Registrar una apertura de la app, cuerpo `{}` opcional (204; el servidor guarda como mucho una cada 30 minutos por usuario) |
| `POST` | `/users/me/push-opens` | Usuario | Registrar que abrió un push `{ref, type}`: `ref` es la clave del push (máximo 180 caracteres), `type` un `NotificationType` (204; una vez por `ref`; cuenta también como apertura de la app; 400 si falta `ref` o el tipo no existe) |
| `GET` | `/users/me/points` | Usuario | Puntos y sello: `{points, tier, nextTier, nextTierAt, tierFloor, todayEarned, dailyCap, pendingCelebration, showWelcome, recent}`; `recent` son los últimos 20 movimientos `{id, source, points, createdAt, label}` (revocaciones en negativo). Ver [puntos y sellos](../../modules/gamification/README.md) |
| `POST` | `/users/me/points/celebrations` | Usuario | `{tier}` marca ese nivel y los inferiores como celebrados; `{welcome: true}` descarta la tarjeta de bienvenida (204) |
| `POST` | `/notifications/unsubscribe?token=` | Público (token firmado) | Baja de un clic de una categoría promocional |
| `PATCH` | `/users/me` | Usuario | Username, nombre y datos editables de perfil |
| `PATCH` | `/users/me/preferences` | Usuario | Guarda `preferredLanguage` (`es`/`en`) y `timezone` IANA; los campos omitidos se conservan |
| `POST` | `/users/me/onboarding` | Usuario | Completa/omite setup inicial de cuenta social |
| `POST` | `/users/me/avatar` | Usuario, multipart | Valida y guarda avatar |
| `POST` | `/users/me/change-password` | Usuario | Exige contraseña actual válida y una nueva contraseña de 8–100 caracteres |
| `POST` | `/users/me/email-change` | Usuario | Solicita verificación de un nuevo email |
| `GET` | `/users/{id}/profile` | Usuario | Perfil público deliberadamente limitado |
| `DELETE` | `/users/me` | Usuario | Desactivación reversible y revocación de refresh tokens |
| `DELETE` | `/users/me/permanent` | Usuario | Borra la cuenta; si existe identidad Apple vinculada exige `appleAuthorizationCode` y `appleClientId`, revoca Apple y luego elimina |

Email y avatar no se cambian por el `PATCH` genérico. La documentación completa
del ciclo está en [identidad](authentication-and-identity.md).

## Vinos — `/wines`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/wines` | Usuario | Búsqueda principal, criterios efectivos y paginación |
| `GET` | `/wines/search` | Usuario | Alias de búsqueda con el mismo caso de uso |
| `GET` | `/wines/{id}` | Usuario | Detalle enriquecido de vino |
| `GET` | `/wines/highlights` | Usuario | Lista acotada: promedio DESC, reseñas DESC, ID ASC; limit 4 por defecto, máximo 10 |
| `GET` | `/wines/featured` | Usuario | Destacados paginados |
| `GET` | `/wines/top-rated` | Usuario | Mejor puntuados |
| `GET` | `/wines/recent` | Usuario | Incorporaciones recientes |
| `GET` | `/wines/popular` | Usuario | Ranking de popularidad |
| `GET` | `/wines/recommended` | Usuario | Recomendaciones actuales |
| `GET` | `/wines/{id}/similar` | Usuario | Vinos similares al detalle |
| `POST` | `/wines` | `WINE_CREATE` | Crea vino y devuelve ID/mensaje |
| `PATCH` | `/wines/{id}` | `WINE_UPDATE` | Actualización parcial |
| `DELETE` | `/wines/{id}` | `WINE_DELETE` | Borrado físico por `deleteById`; relaciones siguen las foreign keys de Flyway |
| `PATCH` | `/wines/{id}/toggle-featured` | `WINE_UPDATE` | Alterna destacado |
| `POST` | `/wines/scan` | Usuario, multipart | Reconoce etiqueta y rankea catálogo; `barcode` opcional; devuelve `scanId` |
| `POST` | `/wines/scans/{scanId}/feedback` | Usuario, JSON | Guarda el veredicto sobre uno de los escaneos propios; 204 |
| `POST` | `/wines/{id}/label-image` | Usuario, multipart | Completa imagen ausente tras validar identidad/seguridad |

Los criterios efectivos de búsqueda son texto, tipo, país, región, bodega y uva.
El handler pasa esos campos y la página a searchAdvanced; la policy pública
limita size a 20 y ventana a 500. El read model combina vino/bodega y usa
containment primero cuando hay palabras de hasta tres caracteres. Véase
[búsqueda](../../modules/wines/architecture.md) y
[escaneo backend](../../modules/wines/architecture.md).

Contrato del escaneo de etiquetas ([UC-WIN-05](../../modules/wines/use-cases/uc-win-05-scan-label.md)):

| Operación | Contrato | Errores |
|---|---|---|
| `POST /wines/scan` | Partes `image`, `observedText` repetible y `barcode` opcional (8, 12, 13 o 14 dígitos con dígito verificador GS1 válido). Un código confirmado para un vino activo por al menos dos miembros, y por más miembros que cualquier otro vino, responde `EXACT_MATCH` sin IA. La respuesta `{outcome, confidence, wine, suggestions, candidates, extractedData, scanId}` trae `scanId` (`null` si el escaneo no se registró) | 400 `INVALID_LABEL_BARCODE`, `INVALID_LABEL_IMAGE`, `INVALID_LABEL_TEXT`; 429; 503 `IMAGE_PROCESSING_BUSY` (tras esperar hasta 2 s), `AI_CAPACITY_EXCEEDED` (tras esperar hasta 4 s), `LABEL_SCAN_TIMEOUT`, `LABEL_RECOGNITION_UNAVAILABLE` |
| `POST /wines/scans/{scanId}/feedback` | Cuerpo `{"verdict": "CONFIRMED" \| "CORRECTED" \| "NOT_IN_CATALOG", "wineId": "<uuid o null>"}`. `wineId` es obligatorio para `CONFIRMED` y `CORRECTED` y debe ser `null` para `NOT_IN_CATALOG`; `CONFIRMED` debe nombrar la coincidencia exacta del escaneo. Enviarlo de nuevo reemplaza el veredicto anterior. Solo `CONFIRMED` registra la confirmación del código de barras; `CORRECTED` sobre una coincidencia exacta abre una denuncia de calidad de catálogo | 400 `INVALID_SCAN_FEEDBACK`; 404 `SCAN_NOT_FOUND` (escaneo inexistente o de otro miembro), `WINE_NOT_FOUND` (vino inexistente o inactivo) |

## Propuestas de vinos — `/wines/submissions`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/wines/submissions` | Usuario | Lista únicamente propuestas propias |
| `GET` | `/wines/submissions/{id}` | Usuario propietario | Detalle y estado propios |
| `POST` | `/wines/submissions` | Usuario, multipart | Propone vino desconocido con datos y, opcionalmente, la foto de la etiqueta (sin foto queda en revisión) |

El request exige `wineName`, `wineryName` e `image`; acepta tipo, uva, país,
región, vintage y otros datos opcionales. La respuesta puede indicar publicación
automática, duplicado vinculado o revisión humana. Rechazo y solicitud de
correcciones son decisiones posteriores del endpoint administrativo.

## Bodegas — `/wineries`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/wineries` | Usuario | Busca y pagina bodegas activas |
| `GET` | `/wineries/{id}` | Usuario | Detalle con ubicación y métricas |
| `POST` | `/wineries` | `WINERY_CREATE` | Crea bodega |
| `PUT` | `/wineries/{id}` | `WINERY_UPDATE` | Actualiza datos completos soportados |
| `PATCH` | `/wineries/{id}/coordinates` | `WINERY_UPDATE` | Completa coordenadas faltantes |
| `DELETE` | `/wineries/{id}` | `WINERY_DELETE` | Elimina bodega |

La actualización de coordenadas es una operación focalizada y no reemplaza
coordenadas ya existentes de forma silenciosa.

## Reseñas — `/wines/{wineId}/reviews`

| Método | Sufijo | Acceso | Propósito |
|---|---|---|---|
| `GET` | `` | Usuario | Reseñas aprobadas paginadas; el autor también ve sus pendientes/rechazadas |
| `GET` | `/mine` | Usuario | Devuelve sólo `hasReview` para la identidad autenticada |
| `POST` | `` | `REVIEW_CREATE` | Crea una única reseña por usuario/vino y la publica como `APPROVED`; `vintage` probada opcional |
| `PATCH` | `/{id}` | Autor o Admin | Modifica rating/título/comentario/añada; una reseña aprobada sigue `APPROVED` y una pendiente o rechazada vuelve a `PENDING` |
| `DELETE` | `/{id}` | `REVIEW_DELETE[_OWN]` | Elimina y recalcula métricas |
| `POST` | `/{id}/like` | Usuario | Crea like único |
| `DELETE` | `/{id}/like` | Usuario | Quita like propio |
| `GET` | `/{id}/comments` | Usuario | Lista comentarios aprobados; el autor también ve los propios pendientes/rechazados |
| `POST` | `/{id}/comments` | Usuario | Agrega comentario de 1–2000 caracteres, publicado como `APPROVED` |
| `DELETE` | `/{id}/comments/{commentId}` | Autor o moderador autorizado | Elimina comentario |

La añada probada es opcional en reseñas y entradas de cava. Las solicitudes aceptan
`vintage` (entero, `1800`–`2100`; el dominio además rechaza años posteriores al año
siguiente, `INVALID_VINTAGE`). En `PATCH`, un `vintage` omitido o `null` conserva el valor
guardado, `clearVintage: true` lo elimina (y prevalece sobre un `vintage` enviado) y
cualquier otro `vintage` lo reemplaza. `ReviewResponse` y `CellarWineResponse` exponen la
añada probada como `vintage` de primer nivel; el `wine.vintage` anidado sigue siendo la
añada del catálogo. Una reseña con añada la copia a la entrada de cava del autor junto con
rating y notas; una reseña sin añada no modifica la añada de la cava.

El `rating` de reseñas y de la cava va de `0.1` a `5.0` con un decimal como máximo; otra
escala u otro valor fuera de ese rango se rechaza. La sincronización de una reseña con la
cava conserva el decimal. Cada objeto de autor (`ReviewResponse.ReviewerInfo`, comentarios
y reseñas de administración) suma `badgeTier`, la clave del sello o `null` si la cuenta
está bloqueada o inactiva; se carga en lote por página.

## Comunidad — `/community`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `POST` | `/community/reports` | Usuario | Crea denuncia y devuelve comprobante privado; un objetivo `WINE` o el motivo `CATALOG_QUALITY` responden 422 `REPORT_NOT_ALLOWED` |
| `GET` | `/community/reports/mine` | Usuario | Casos del denunciante sin evidencia privada |
| `GET` | `/community/overview` | Usuario | Resumen de actividad propia |
| `GET` | `/community/blocks` | Usuario | Bloqueos realizados por el usuario |
| `PUT` | `/community/blocks/{userId}` | Usuario | Bloqueo idempotente |
| `DELETE` | `/community/blocks/{userId}` | Usuario | Desbloqueo idempotente |

La publicación de reseñas y comentarios, el bloqueo y la retención se definen en
[comunidad](../../modules/community/architecture.md). Bloquear no oculta eventos/rutas
ni modifica las reglas de eventos/rutas. Las lecturas funcionales requieren sesión. La edición de reseñas no se habilita por ser MODERATOR.

## Cava — `/cellar`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/cellar` | `CELLAR_MANAGE_OWN` | Cava actual con proyección de vinos |
| `GET` | `/cellar/user/{userId}` | Titular con `CELLAR_MANAGE_OWN` o `ADMIN` | Cava correspondiente al UUID indicado |
| `GET` | `/cellar/stats` | `CELLAR_MANAGE_OWN` | Métricas de la cava actual |
| `GET` | `/cellar/user/{userId}/stats` | Titular con `CELLAR_MANAGE_OWN` o `ADMIN` | Métricas correspondientes al UUID indicado |
| `POST` | `/cellar` | `CELLAR_MANAGE_OWN` | Agrega relación única usuario/vino; `vintage` probada opcional |
| `PATCH` | `/cellar/{id}` | Propietario | Rating personal (`0.1`–`5.0`, un decimal), precio, notas y `vintage` probada (`clearVintage` la elimina) |
| `DELETE` | `/cellar/{id}` | Propietario | Quita entrada |

## Eventos — `/events`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/events` | Usuario | Catálogo futuro por texto/tipo/ubicación |
| `GET` | `/events/{id}` | Usuario | Detalle; `publiclyVisible` indica si el evento tiene página pública (se publicó alguna vez y no es borrador) |
| `GET` | `/events/upcoming` | Usuario | Próximos eventos |
| `GET` | `/events/nearby` | Usuario | Busca por latitud, longitud y radio |
| `GET` | `/events/discovery` | Usuario | Cercanos o alternativas ordenadas por distancia |
| `GET` | `/events/my-events` | Usuario | Eventos organizados por la identidad actual |
| `POST` | `/events` | `EVENT_CREATE` | Crea evento con organizador del JWT |
| `PATCH` | `/events/{id}` | `EVENT_UPDATE[_OWN]` | Actualiza con ownership; pedir `CANCELLED` responde 400 `USE_CANCEL_ENDPOINT` |
| `PATCH` | `/events/{id}/publish` | `EVENT_UPDATE[_OWN]` | Publica |
| `PATCH` | `/events/{id}/cancel` | `EVENT_UPDATE[_OWN]` | Cancela |
| `DELETE` | `/events/{id}` | `EVENT_DELETE[_OWN]` | Elimina/cancela según dominio |
| `GET` | `/events/{eventId}/registrations` | Organizador/Admin | Revisa solicitudes paginadas |
| `GET` | `/events/{eventId}/registrations/me` | Usuario | Registro activo propio |
| `POST` | `/events/{eventId}/register` | Usuario | Solicita cupo para uno o más asistentes |
| `PATCH` | `/events/{eventId}/registrations/{registrationId}` | Organizador/Admin | Aprueba, rechaza, espera o valida pago |
| `POST` | `/events/registrations/{registrationId}/confirm-attendance` | Propietario | Confirma reserva temporal |
| `POST` | `/events/registrations/{registrationId}/report-payment` | Propietario | Reporta transferencia/QR |
| `DELETE` | `/events/{eventId}/register` | Propietario | Cancela inscripción y libera cupo |
| `GET` | `/me/tickets` | Usuario | Entradas propias paginadas (`page`, `size`, default 20) |
| `GET` | `/me/tickets/{id}` | Usuario | Detalle de una entrada propia |

## Pagos — Mercado Pago

Los controllers existen solo cuando `app.payments.enabled` es true; todos salvo
la conexión de cuenta exigen además `app.payments.settlement-enabled`, y el
checkout también `app.payments.checkout-enabled`. Las respuestas usan
`Cache-Control: no-store`.

| Método | Path | Acceso | Propósito |
|---|---|---|---|
| `POST` | `/events/{eventId}/registrations/{registrationId}/checkout` | Usuario | Body opcional `{returnToApp}`; devuelve `{attemptId, checkoutUrl}`, 202 mientras la URL no está lista |
| `GET` | `/payments/events/{eventId}/registrations` | `PARTNER` o `ADMIN` | Estado de pago/reembolso de 1–50 `registrationIds` de un evento propio (ADMIN: cualquier evento) |
| `GET` | `/payments/mercadopago/account` | `PARTNER` o `ADMIN` | `{connected, environment, commissionBasisPoints, commissionPercent}` |
| `POST` | `/payments/mercadopago/account/connect` | `PARTNER` o `ADMIN` | Body opcional `{returnToApp}`; devuelve `{authorizationUrl}` |
| `POST` | `/payments/mercadopago/account/complete` | `PARTNER` o `ADMIN` | Intercambia `state`/`code` para el organizador autenticado; 204 |
| `POST` | `/payments/mercadopago/connection/callback` | Público | Completa OAuth desde el `state` de un solo uso; devuelve `{returnToApp}` |
| `GET` | `/payments/receipt?token=` | Público | Solo el estado del comprobante, sin importes ni identidades |
| `POST` | `/payments/checkouts/{attemptId}/refund` | `PARTNER` o `ADMIN` | Solicita un reembolso, o vuelve a pedir uno que Mercado Pago rechazó; 202 |
| `POST` | `/payments/mercadopago/webhooks/{attemptId}` | Público, firmado | Despierta la conciliación de ese intento; firma inválida devuelve 401 |
| `POST` | `/payments/mercadopago/webhooks` | Público, firmado | Notificación de aplicación para un pago ya conocido |

## Enlaces compartidos — `/share`

`GET`/`HEAD` `/share`, `/share/en`, `/share/{path}/{id}` y
`/share/{path}/{id}/en` son públicos y devuelven vistas previas HTML `no-store`.
`path` es `wines`, `events` o `wine-routes`; el contenido inexistente devuelve 404.

## Rutas del vino — `/wine-routes`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/wine-routes?search=&country=&region=&difficulty=&page=&size=` | Usuario | Busca rutas publicadas; todos los filtros son opcionales y se combinan. `search` busca parte del nombre sin distinguir mayúsculas, `country` y `region` son exactos y `difficulty` es `SHORT`, `MEDIUM` o `LONG` (cualquier otro valor responde 400 `INVALID_REQUEST`) |
| `GET` | `/wine-routes/{id}` | Usuario | Detalle y paradas ordenadas |
| `GET` | `/wine-routes/hierarchy` | Usuario | Jerarquía país/región/subregión |
| `GET` | `/wine-routes/countries` | Usuario | Países presentes |
| `GET` | `/wine-routes/countries/{country}/regions` | Usuario | Regiones presentes |
| `GET` | `/wine-routes/countries/{country}/regions/{region}/subregions` | Usuario | Subregiones presentes |
| `POST` | `/wine-routes` | `WINE_ROUTE_CREATE` | Crea borrador |
| `POST` | `/wine-routes/{routeId}/stops` | `WINE_ROUTE_UPDATE[_OWN]` | Agrega parada y persiste la ruta |

## IA — perfiles y comparaciones

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/wines/{id}/ai-profile?language=` | Usuario | Lee caché, nunca genera; 404 si no hay perfil o la persona no puede ver el vino |
| `GET` | `/wines/{id}/ai-profile/status?language=` | Usuario | Estado del bundle completo; 404 si la persona no puede ver el vino |
| `POST` | `/wines/{id}/ai-profile` | Usuario | Asegura bundle `es`/`en`; idempotente si está completo; 404 si la persona no puede ver el vino |
| `POST` | `/wines/{id}/ai-profile/generate` | `WINE_UPDATE` | Fuerza regeneración administrativa |
| `PATCH` | `/wines/{id}/ai-profile` | `WINE_UPDATE` | Corrección manual por idioma |
| `POST` | `/wines/compare` | Usuario | Compara vinos distintos y reutiliza caché bilingüe |

Cambiar idioma no debe provocar otra llamada paga: la generación normal persiste
todos los idiomas soportados en una única operación.

## Partner — `/partner/events`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/partner/events?search=&page=&size=` | `EVENT_CREATE` | Eventos propios en cualquier estado, del más nuevo al más viejo; el `search` opcional se recorta y busca en título, lugar, ciudad, región o país sin distinguir mayúsculas, y uno vacío lista todos los eventos propios |
| `POST` | `/partner/events` | `EVENT_CREATE` | Crea reutilizando dominio de eventos |
| `PUT` | `/partner/events/{id}` | `EVENT_UPDATE[_OWN]` | Actualiza evento propio; `clearFields` vacía campos opcionales; pedir `CANCELLED` responde 400 `USE_CANCEL_ENDPOINT` |
| `DELETE` | `/partner/events/{id}` | `EVENT_DELETE[_OWN]` | Cancela evento propio |

## Administración — `/admin`

Los controllers de catálogo, submissions y moderación admiten `ADMIN` o
`MODERATOR`. `/admin/users/**`, `/admin/notifications/**`, `/admin/app-versions/**` y el borrado de vinos, bodegas, eventos y rutas
requieren `ADMIN`. Las publicaciones requieren además `REVIEW_DELETE`; el retiro
de contenido desde una denuncia exige también esa autoridad. Las reglas de
ownership y conflicto de interés siguen aplicándose dentro del caso de uso.

| Recurso | Operaciones |
|---|---|
| `/admin/stats` | `GET` dashboard agregado |
| `/admin/catalog-images` | `POST` JPEG/PNG en dataUrl; retorna imageUrl; ADMIN o MODERATOR |
| `/admin/wines` | `GET` lista, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}`, `POST /{id}/toggle-featured`, `POST /{id}/toggle-active` |
| `/admin/wineries` | `GET` lista, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}` |
| `/admin/events` | `GET` lista, `GET /{id}`, `POST`, `PATCH /{id}` (pedir `CANCELLED` responde 400 `USE_CANCEL_ENDPOINT`), `DELETE /{id}`, `PATCH /{id}/publish`, `PATCH /{id}/cancel` |
| `/admin/routes` | `GET` lista, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}`, `POST /{routeId}/stops`, `PATCH /{id}/publish`, `PATCH /{id}/archive` |
| `/admin/users` | `GET` lista (cada usuario suma `points` y `badgeTier`), `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `PUT /{id}/role`, `POST /{id}/assign-role`, `/ban`, `/unban` |
| `/admin/notifications/push` | `GET` proveedor, interruptores y cambios recientes, `PUT /types/{type}` `{enabled}`, `GET /metrics?days=1\|7\|30`, `GET /engagement?days=1\|7\|30` (push de engagement enviados, abiertos, con baja y retenidos por tipo; lo sirve `EngagementAdministrationController` del módulo `engagement`) |
| `/admin/notifications/announcements` | `GET` historial (cada envío con su audiencia, `countryId` incluido), `POST` envío (202; un `requestId` UUID opcional en el cuerpo lo vuelve idempotente, una repetición devuelve el primer envío; `audience.countryId` opcional), `POST /preview`, `POST /test`, `GET /reach?kind&email&push[&language&regionId&countryId&role]` |
| `/admin/app-versions` | `GET` la versión mínima de la app para `IOS` y `ANDROID` (siempre las dos, en ese orden: `platform`, `minimumVersion`, `updatedAt`, email en `updatedBy`, cada uno `null` hasta el primer valor) y los 20 `recentChanges` más recientes, del más nuevo al más viejo; `PUT /{platform}` `{minimumVersion}` fija `major.minor.patch` o lo borra con `null`, exige `X-Admin-Reauthentication` y devuelve el mismo cuerpo; una plataforma desconocida responde 400 `NOT_AN_APP_PLATFORM` y una versión inválida 400 `INVALID_APP_VERSION`; guardar el mismo valor no registra cambios |
| `/admin/reviews` | `GET` lista (el autor suma `badgeTier`), `GET /{id}`, `DELETE /{id}` |
| `/admin/community/reports` | `GET` cola (cada caso suma `authorUsername`, `reviewerUsername`, `targetLabel`, `relatedTargetId` y `relatedTargetLabel`, que pueden ser `null`; las denuncias de calidad de catálogo no tienen denunciante y nombran el otro vino en `relatedTargetId`), `GET /overview`, `PATCH /{id}`, `POST /{id}/remove-content` |
| `/admin/review-publications` | `GET` pendientes (cada elemento suma `authorUsername` y `wineName`, que pueden ser `null`), `POST /{type}/{id}` decisión con revisión esperada y, si es un rechazo, un `reasonCode` predefinido |
| `/admin/wine-submissions` | `GET` lista, `GET /{id}`, `GET /{id}/image`, `PATCH /{id}/decision` |
| `/admin/social-posts` | Solo `ADMIN` (#489, #492, #497, #510). `GET ?status=&from=&to=&page=0&size=20` cola de publicaciones sociales ordenada por `scheduledFor` (todos los filtros opcionales), `GET /{id}`, `POST /plan` planifica los próximos 14 días y responde `{created, from, to}`, `POST /{id}/approve`, `POST /{id}/reject` `{reason}` opcional, `PUT /{id}` reemplaza el texto de un idioma `{language: es\|en, hook, slides: [{title, body}], caption, hashtags, altText, cta}` (400 `INVALID_POST_COPY` si rompe un límite, 400 `INVALID_POST_LANGUAGE` sin idioma válido), `POST /{id}/regenerate`, `POST /{id}/illustration` pide una nueva ilustración (202), `POST /{id}/publications/{network}/retry` vuelve a publicar en una red fallida (`network` sin distinguir mayúsculas: `instagram`, `facebook`, `threads`, `tiktok`; 202 con la publicación; 409 `INVALID_PUBLICATION_TRANSITION` si esa red no está `FAILED`, 409 `INVALID_POST_TRANSITION` si las placas no están listas, 409 `SOCIAL_PUBLISHING_OFF` con la publicación o la red apagadas, 400 `INVALID_REQUEST` con una red desconocida, 404 sin publicación en esa red); una acción que no corresponde al estado responde 409 `INVALID_POST_TRANSITION` (también editar, regenerar, rechazar o pedir ilustración en una `SCHEDULED` o `PUBLISHED`). `GET /wine-days?year=` calendario del año con `date` resuelta. `GET /pillars` pilares en orden de rotación `{code, nameEs, nameEn, weight, active, autoApprove, performance: {measuredPosts, views, interactions, factor}}` (`factor` 1.0 es neutro); `PUT /pillars/{code}/auto-approve` y `PUT /pillars/{code}/active` con `{enabled: boolean}` responden 200 con el pilar, 400 sin `enabled`, 404 con un código desconocido y, al apagar el último pilar rotativo activo, 409 `LAST_ROTATING_PILLAR`. Cada publicación: `{id, status, scheduledFor, pillar, wineDay, copies: {es, en}, generation, review, media, publishing, publications, createdAt, updatedAt}`; `review` suma `automatic` (aprobada por su pilar, sin revisor, `reason = AUTO_APPROVED`); `media` es `{status: PENDING\|READY\|FAILED, source: AI\|FALLBACK, error, illustrationReason, heroUrl, slides: {es, en}, updatedAt}` con `{instagram[], tiktok[], renderedFor}` por idioma, o `null`; `publishing` es `{startedAt, finishedAt, error}` o `null` hasta empezar; `publications[]` es `{network, status: QUEUED\|PUBLISHING\|PUBLISHED\|DRAFT_SENT\|FAILED, externalId, permalink, attempts, error, publishedAt, metrics}` con `metrics` `{views, reach, likes, comments, saves, shares, follows}` (un valor nulo es una métrica que la red no da) o `null` antes de la primera lectura |
| `/admin/social-accounts` | Solo `ADMIN` (#510). `GET` una fila por red, siempre las cuatro: `{network, mode: CONFIG\|OAUTH, configured, connected, accountId, displayName, status: CONNECTED\|REFRESH_FAILED\|null, expiresAt, lastError}`, nunca un token; `GET /{network}/connect` devuelve `{authorizeUrl}` para Threads o TikTok (422 `SOCIAL_ACCOUNT_NOT_OAUTH` para Instagram y Facebook, 422 `SOCIAL_ACCOUNT_NOT_CONFIGURED` sin la app de la red, 422 `SOCIAL_ACCOUNT_ENCRYPTION_KEY_MISSING` sin clave de cifrado); `DELETE /{network}` borra la cuenta conectada (204; 404 si no había; 409 `SOCIAL_ACCOUNT_CONFIGURED_BY_SECRETS` para Instagram y Facebook); una red desconocida responde 404 |

La vuelta de OAuth del agente de redes es pública: `GET /public/social-accounts/{network}/callback?code=&state=&error=`
(#510) consume el `state` de un solo uso y siempre responde 302 a `<frontend>/admin/social-posts?account=<red>&result=connected|error`
(o `?result=error` con una red desconocida), con `Cache-Control: no-store` y `Referrer-Policy: no-referrer`, sin código,
`state` ni token. Es la URI de redirección que se registra en Threads y TikTok
([configuración de las redes](../../infra/guides/social-networks-setup.md)).

La decisión de submission acepta aprobar como vino nuevo, fusionar con uno
existente, rechazar o solicitar correcciones. Registra revisor, motivo y fecha.

## Términos y aceptación — `/legal`

`GET /legal/terms/current` y `GET /legal/terms/versions/{version}` son públicos
y reciben `locale=es|en`. `GET /legal/acceptance` y `POST /legal/acceptance`
requieren sesión. La selección contiene versión, idioma, huella y aceptación
afirmativa. `POST /auth/register` admite el mismo objeto en `termsAcceptance`.
No se recibe un usuario destino; se usa el principal autenticado.

Contratos completos y despliegue gradual:
[aceptación contractual](../../modules/legal/architecture.md).


## Política de actualización de la app — `/app-versions`

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/app-versions/minimum` | Público | `{ios, android}`: la versión mínima admitida de la app móvil por plataforma, o `null` cuando no se bloquea ninguna versión |

La app móvil la consulta al abrirse y al volver al primer plano, sin sesión. Los
términos pendientes no la bloquean. El valor se lee de la base en cada pedido, así
que un cambio hecho en `/admin/app-versions` aplica sin desplegar.
## Referencias, archivos y salud

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| `GET` | `/reference/wine-types` | Usuario | Tipos activos de vino |
| `GET` | `/reference/event-types` | Usuario | Tipos de evento |
| `GET` | `/reference/event-statuses` | Usuario | Estados de evento |
| `GET` | `/grape-types` | Usuario | Cepas activas |
| `GET` | `/regions/countries` | Usuario | Países |
| `GET` | `/regions` | Usuario | Regiones |
| `GET` | `/regions/country/{countryId}` | Usuario | Regiones del país |
| `GET` | `/uploads/avatars/{filename}` | Público, validado | Sirve avatar público desde almacenamiento privado |
| `GET` | `/uploads/wine-labels/{filename}` | Público, validado | Sirve etiqueta publicada |
| `POST` | `/uploads/covers` | Permiso de crear/editar evento o ruta según `kind` | Multipart `kind=EVENT\|WINE_ROUTE` y `file`; retorna ID, URL y dimensiones WebP |
| `GET` | `/uploads/covers/{id}.webp` | Visibilidad del recurso/propietario/staff | Portada administrada; `no-store`; borradores privados dan 404 sin acceso |
| `GET` | `/uploads/social/{key}` | Público, validado | Placa o ilustración de una publicación social con almacenamiento local o S3 (#492); `image/jpeg` o `image/png`, caché pública inmutable de un año; clave inválida o ausente da 404. Con R2 las sirve el Worker de `images.vinnot.com` |
| `GET` | `/health` | Público | Health de aplicación |
| `GET` | `/version` | Público | Nombre/versión/timestamp |
| `GET` | `/actuator/health` | Público | Health operativo Spring |

Las imágenes en cuarentena no se sirven por `/uploads`; sólo por el endpoint
admin protegido y con headers de no-cache. Los avatares y etiquetas nuevos en R2
usan URLs de `images.vinnot.com`; el Worker no expone cuarentena ni portadas.
Una portada con Bearer vencido devuelve 401 para renovar sesión; sin credenciales
se evalúa su visibilidad pública. [Contrato de imágenes](../use-cases/uploads-and-reference-data.md).

## Respuesta de error

El body de `GlobalExceptionHandler.ErrorResponse` contiene `timestamp`, `path`, `status`, `code`, `message` y `details`. Bean Validation agrega detalles por campo. `requestId` no es un campo de ese record: la correlación se devuelve en `X-Request-ID` y se utiliza en logs/MDC. Los filtros previos a MVC tienen sus propios writers. Los mapeos exactos se describen en [errores](errors-transactions-and-consistency.md).

## Mantenimiento del catálogo

Al cambiar un controller se debe actualizar:

1. OpenAPI y prueba MVC/seguridad;
2. cliente y DTO de web/mobile si consume la operación;
3. este catálogo en ambos idiomas;
4. caso de uso y modelo de datos afectados;
5. rate limit y permisos si cambia exposición o costo.
