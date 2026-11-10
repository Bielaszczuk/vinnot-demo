# Privacidad y protección de datos

Esta página describe qué datos personales guarda Vinnot, a qué terceros llegan,
cómo se desactiva o borra una cuenta, cuánto tiempo sobreviven los datos en los
backups y qué registros quedan de la aceptación de los términos. Las reglas
contractuales están en el módulo [Legal](../modules/legal/README.md).

## Datos personales que se guardan

| Categoría | Datos | Dónde | Fuente |
|---|---|---|---|
| Identidad de la cuenta | Correo, nombre de usuario, nombre y apellido, hash BCrypt de la contraseña, estado (activa, bloqueada, correo verificado), último acceso | tabla `users` | [V1__baseline_schema.sql](../../../backend/src/main/resources/db/migration/V1__baseline_schema.sql) |
| Contacto opcional | Teléfono privado con formato validado | `users.phone_number` | [V28__add_private_user_phone.sql](../../../backend/src/main/resources/db/migration/V28__add_private_user_phone.sql) |
| Imagen de perfil | Avatar optimizado a WebP | almacenamiento de objetos | [cambiar avatar](../modules/users/use-cases/uc-usr-15-change-avatar.md) |
| Identidades sociales | Proveedor y sujeto de Google o Apple | `social_identities` | [identidad](../backend/architecture/authentication-and-identity.md#persistencia-y-secretos) |
| Sesiones y enlaces | Solo hashes SHA-256 de refresh tokens y tokens de acción | `refresh_tokens`, `user_action_tokens` | ídem |
| Dispositivos | Token push de Expo por dispositivo | `push_devices` | [V46__push_devices.sql](../../../backend/src/main/resources/db/migration/V46__push_devices.sql) |
| Actividad | Reseñas, comentarios, cava, puntos, propuestas de vinos, inscripciones a eventos | tablas de cada módulo | [modelo de datos](../backend/data/database-model.md) |
| Eventos de seguridad | Tipo de evento, cuenta, IP, navegador (user agent recortado) y fecha; se purgan a los 180 días | `security_events` | [V73__security_events.sql](../../../backend/src/main/resources/db/migration/V73__security_events.sql) |
| Bloqueo temporal | Contador de contraseñas incorrectas seguidas y fin del bloqueo | `users.failed_login_attempts`, `users.login_locked_until` | [V72__login_lockout.sql](../../../backend/src/main/resources/db/migration/V72__login_lockout.sql) |
| Aceptación legal | Tipo de documento, versión, idioma, revisión, hash del contenido y fecha | `user_legal_acceptances` | [V21__versioned_terms_acceptance.sql](../../../backend/src/main/resources/db/migration/V21__versioned_terms_acceptance.sql) |

Vinnot no guarda datos de tarjeta: el pago ocurre en Mercado Pago. Tampoco cifra
estos datos a nivel de aplicación; la protección en reposo es el volumen EBS
cifrado ([Defensa en profundidad](defense-in-depth.md#datos)).

## Terceros que reciben datos

| Tercero | Qué recibe | Para qué | Fuente |
|---|---|---|---|
| AWS SES | Correo de destino y contenido del mensaje | Verificación, recuperación y avisos | [entornos y secretos](../infra/architecture/environments-and-secrets.md) |
| Expo Push | Token push y texto de la notificación | Notificaciones en la app | [notificaciones](../modules/notifications/architecture.md) |
| Google / Apple | Nada adicional: Vinnot solo verifica el ID token que la persona obtuvo | Login social | [contraseñas y autenticación](passwords-and-authentication.md#inicio-de-sesión-con-google-y-apple) |
| Mercado Pago | Para iniciar el cobro: nombre del evento, cantidad, precio, moneda, comisión de Vinnot y una referencia interna; no recibe el nombre ni el correo de la persona. Los datos de pago, como la tarjeta, se ingresan directamente en Mercado Pago | Cobro de entradas | [Pagos](../modules/payments/architecture.md) |
| OpenAI | Datos del vino, texto y, en el escaneo, la captura de la etiqueta; también contenido a moderar | Perfiles IA, reconocimiento y moderación | [OpenAiClient.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/ai/OpenAiClient.java), [protección de recursos](../backend/architecture/resource-protection.md#admisión-presupuesto-y-transporte-ia) |
| Google Maps | Consultas de lugares y coordenadas | Mapas de rutas y eventos | [entornos y secretos](../infra/architecture/environments-and-secrets.md#google-maps-credenciales-y-consumo) |

## Desactivar y borrar la cuenta

| Acción | Endpoint | Efecto | Fuente |
|---|---|---|---|
| Desactivar | `DELETE /users/me` | Reversible: marca `active=false`, borra los refresh tokens e incrementa `session_version`; el siguiente login pide confirmar la reactivación | [desactivar cuenta](../modules/users/use-cases/uc-usr-18-deactivate-account.md) |
| Borrar definitivamente | `DELETE /users/me/permanent` | Exige reautenticación; borra el agregado y los recursos relacionados por claves foráneas y limpieza; revoca la autorización de Apple si existe; borra el avatar después del commit; envía un aviso por correo | [borrar cuenta](../modules/users/use-cases/uc-usr-19-delete-account.md), [DeleteOwnAccountCommandHandler.java](../../../backend/src/main/java/com/vinnot/user/application/command/handler/DeleteOwnAccountCommandHandler.java) |

Al borrar la cuenta, dos registros se conservan sin el vínculo con la persona:

- los eventos de seguridad quedan con `user_id` vacío (`ON DELETE SET NULL`)
  hasta que la purga de 180 días los elimina, como evidencia de ataques contra el
  servicio;
- los registros de pago se conservan desvinculados de la cuenta eliminada (V77);
  ver [Pagos](../modules/payments/architecture.md).

No existe una exportación de datos en autoservicio; está en
[Límites conocidos](known-limitations.md).

## Registro de eventos de seguridad

Implementado el 2026-10-30 (commit `67df1d2b`). La tabla `security_events`
([V73__security_events.sql](../../../backend/src/main/resources/db/migration/V73__security_events.sql)) guarda lo que le pasa a cada cuenta, para
detectar y analizar ataques.

| Campo | Contenido |
|---|---|
| `user_id` | La cuenta afectada; vacío cuando el intento nombró una cuenta que no existe o cuando la cuenta se borró |
| `event_type` | Uno de 12 tipos ([SecurityEventType.java](../../../backend/src/main/java/com/vinnot/user/domain/valueobject/SecurityEventType.java)): `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, `LOGIN_LOCKED`, `REFRESH_REUSE_DETECTED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `EMAIL_CHANGED`, `ROLE_CHANGED`, `ACCOUNT_BANNED`, `ACCOUNT_UNBANNED`, `ACCOUNT_DELETED` y `ACCOUNT_AUTO_SUSPENDED` |
| `ip_address` | La IP del cliente, con la misma regla que el rate limit: el `X-Forwarded-For` que fija Caddy ([HttpRequestOriginAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/web/HttpRequestOriginAdapter.java)) |
| `user_agent` | El navegador o la app, recortado a 256 caracteres |
| `created_at` | Fecha y hora |

Reglas:

- **Retención:** un job diario borra las filas de más de 180 días
  (`app.security.events.retention`, valor `P180D`;
  [PurgeExpiredSecurityEventsCommandHandler.java](../../../backend/src/main/java/com/vinnot/user/application/command/handler/PurgeExpiredSecurityEventsCommandHandler.java)).
- **Borrado de la cuenta:** `user_id` es `ON DELETE SET NULL`. El vínculo con la
  persona se va en el acto; las filas desvinculadas quedan hasta la purga, también
  la de `ACCOUNT_DELETED`.
- **Escritura:** el evento se guarda después del commit de la acción que lo
  produjo ([JdbcSecurityEventAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/persistence/adapter/JdbcSecurityEventAdapter.java)). Si guardarlo falla, el error se
  registra en el log y la acción no falla ([SecurityEventRecorder.java](../../../backend/src/main/java/com/vinnot/user/application/service/SecurityEventRecorder.java)).
- **Lectura:** todavía no hay una vista en la administración ni una columna de
  actor para las acciones administrativas; ver el
  [límite 21](known-limitations.md#prioridad-alta).

La [política de privacidad](../../../content/public-pages.json) versión
2026-10-29 describe este registro en su sección "Registro de seguridad".

## Backups y retención

| Copia | Retención | Fuente |
|---|---|---|
| `pg_dump` local en el host | 2 días | [backup y recuperación](../infra/operations/backup-and-disaster-recovery.md) |
| Copia remota en S3, producción | 30 días (bucket cifrado y versionado) | [production-stack.json](../../../infra/aws-low-cost/production-stack.json) |
| Copia remota en S3, desarrollo | 8 días | [backup y recuperación](../infra/operations/backup-and-disaster-recovery.md) |

Una cuenta borrada desaparece de la base en el momento, pero puede seguir dentro
de los backups hasta que estos vencen: como máximo 30 días en producción. Los
scripts de backup se ejecutan con `umask 077`
([backup-local-db.sh](../../../infra/aws-low-cost/backup-local-db.sh)).

## Higiene de logs

- El filtro HTTP registra método, ruta, estado, duración y `requestId`; no
  registra cuerpos ni la cabecera `Authorization`
  ([HttpRequestLoggingFilter.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/HttpRequestLoggingFilter.java)).
- El proveedor de correo de desarrollo solo registra que se pidió un mensaje, sin
  destinatario, enlace ni token
  ([datos sensibles y logging](../backend/architecture/security-and-authorization.md#datos-sensibles-y-logging)).
- `Password.toString()` devuelve `[PROTECTED]`.
- Los logs de los contenedores rotan en tres archivos de 10 MB y no se centralizan;
  Caddy escribe logs de acceso en JSON
  ([retención](../infra/operations/observability-and-incidents.md#retención-privacidad-y-costo)).

## Aceptación de términos

Cada versión de los términos se publica con su hash SHA-256 de contenido, y cada
aceptación guarda la revisión, la versión, el idioma, el hash y la fecha, con una
clave foránea al documento exacto aceptado
([V21__versioned_terms_acceptance.sql](../../../backend/src/main/resources/db/migration/V21__versioned_terms_acceptance.sql)).
Así se puede demostrar qué texto aceptó cada persona. El flujo completo está en
[versiones, evidencia e integridad](../modules/legal/architecture.md#versiones-evidencia-e-integridad).

Versiones vigentes desde el commit `493aed21`:

- **Términos** `2026-10-29.1`, revisión de aceptación `terms-2`
  ([V75__terms_2026_10_29.sql](../../../backend/src/main/resources/db/migration/V75__terms_2026_10_29.sql)):
  describen la venta de entradas con cobro por Mercado Pago y la comisión de
  Vinnot. Es un cambio material, así que quien aceptó la versión anterior recibe
  el aviso y el plazo para volver a aceptar.
- **Política de privacidad** `2026-10-29`
  ([public-pages.json](../../../content/public-pages.json)): nombra a Mercado Pago
  y los datos que recibe en el pago de entradas, y el registro de eventos de
  seguridad.
