# Límites conocidos

Esta es la lista honesta de lo que falta o puede mejorar en la seguridad de
Vinnot. Ninguno de estos puntos es una vulnerabilidad explotable conocida: son
controles ausentes o débiles que conviene resolver a medida que la plataforma
crece. Cada uno indica su riesgo, la mitigación que existe hoy y el siguiente paso
recomendado.

La lista se revisó el 2026-10-30, contra el código de ese día. Cada punto está en
uno de estos estados:

- **pendiente:** el control no existe todavía;
- **mitigado:** el control está en el código y en las plantillas, pero el
  responsable de la infraestructura todavía tiene que aplicarlo a mano en la
  cuenta;
- **decisión aceptada:** se conserva a conciencia, con el disparador que obliga a
  revisarla;
- **implementado:** resuelto en el código; queda en
  [Resueltas](#resueltas) con el commit que lo resolvió.

Los números son identificadores estables: un punto conserva el suyo aunque cambie
de prioridad o de estado.

Prioridad: **alta** conviene resolverla antes de crecer en usuarios; **media**
reduce un riesgo real pero acotado; **baja** es endurecimiento adicional.

## Prioridad alta

Todos estos puntos están **pendientes**.

| # | Límite | Riesgo | Mitigación actual | Siguiente paso |
|---|---|---|---|---|
| 21 | El registro de eventos de seguridad no tiene una vista en la administración ni alertas, y las acciones administrativas (rol, suspensión, borrado) no guardan quién las hizo: no hay columna de actor ([V73__security_events.sql](../../../backend/src/main/resources/db/migration/V73__security_events.sql)) | Analizar un incidente exige consultar la base a mano y no se sabe qué administrador hizo un cambio | `security_events` guarda tipo, cuenta, IP, navegador y fecha durante 180 días ([eventos de seguridad](../modules/users/architecture.md#eventos-de-seguridad)) | Vista de solo lectura para ADMIN, columna `actor_id` en los eventos administrativos y una alarma ante `REFRESH_REUSE_DETECTED` o una racha de `LOGIN_LOCKED` |
| 13 | Sin Sentry ni reporte de errores del cliente web y mobile | Fallos o abusos en el cliente pasan inadvertidos | Monitoreo de host y de borde | Incorporar un servicio de reporte de errores con filtrado de datos personales |
| 12 | Actualizaciones OTA de la app sin firma de código (`codeSigningCertificate` ausente en [app.config.ts](../../../frontend-mobile/app.config.ts)) | Si la cuenta de Expo se compromete, se podría publicar JavaScript no autorizado en todos los dispositivos | Distribución por HTTPS desde Expo; publicación solo con el script productivo | Configurar la firma de código de `expo-updates` |

## Prioridad media

Todos estos puntos están **pendientes**.

| # | Límite | Riesgo | Mitigación actual | Siguiente paso |
|---|---|---|---|---|
| 7 | BCrypt solo usa los primeros 72 bytes y el request acepta hasta 100 caracteres ([ChangePasswordRequest.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/web/request/ChangePasswordRequest.java)) | Dos contraseñas largas con el mismo prefijo de 72 bytes son equivalentes | Pocas personas usan contraseñas tan largas | Limitar a 72 bytes o migrar a Argon2id |
| 8 | Sin comprobación contra contraseñas filtradas o comunes ([Password.java](../../../backend/src/main/java/com/vinnot/user/domain/valueobject/Password.java)) | Contraseñas débiles que cumplen la regla de composición | Regla de 8 caracteres con mayúscula, minúscula y dígito; bloqueo temporal tras 5 fallos seguidos | Comprobar contra una lista de contraseñas comunes o el servicio k-anonymity de Have I Been Pwned |
| 9 | `JWT_SECRET` también deriva la clave de rotación del refresh y la de reautenticación, separadas solo por etiquetas ([JwtTokenService.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/JwtTokenService.java), [SignedReauthenticationProofAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/security/SignedReauthenticationProofAdapter.java)) | Filtrar un secreto compromete los tres usos; rotarlo corta todas las sesiones | El secreto vive en Secrets Manager y no tiene valor por defecto | Secretos independientes por propósito, con rotación documentada |
| 10 | La prueba de reautenticación puede reutilizarse durante sus 5 minutos | Una prueba interceptada habilita varias acciones sensibles en esa ventana | Ligada al usuario y a la cabecera `Authorization` exacta; TLS | Prueba de un solo uso (identificador consumido en la base) |
| 11 | Los despliegues de desarrollo usan claves AWS de larga vida ([deploy-backend-dev.yml](../../../.github/workflows/deploy-backend-dev.yml)) | Una filtración da acceso al entorno de desarrollo | Permission boundary; producción ya usa OIDC | Migrar los despliegues de desarrollo a OIDC |
| 14 | Sin exportación de datos en autoservicio | Atender un pedido de acceso a los datos exige trabajo manual | Soporte por solicitud | Endpoint de exportación con step-up |

## Prioridad baja

Todos estos puntos están **pendientes**.

| # | Límite | Riesgo | Mitigación actual | Siguiente paso |
|---|---|---|---|---|
| 15 | La CSP de la web permite `'unsafe-inline'` en estilos ([security-headers.json](../../../frontend-react/security-headers.json)) | Inyección de estilos si apareciera un XSS | Scripts sin `'unsafe-inline'`; React escapa el contenido | Nonces o hashes para estilos |
| 16 | Sin cifrado de datos personales a nivel de aplicación | Un volcado de la base expone los datos en claro | Volumen EBS cifrado, base sin puerto publicado, backups cifrados | Cifrar por campo los datos más sensibles (por ejemplo, el teléfono) |
| 17 | Contenedores sin `cap_drop` ni sistema de archivos de solo lectura ([docker-compose.yml](../../../infra/aws-low-cost/docker-compose.yml)) | Más superficie si un contenedor se compromete | Usuario no root, imágenes por digest, límites de memoria y CPU | `cap_drop: [ALL]`, `read_only: true` y `no-new-privileges` |
| 18 | Sin certificate pinning ni detección de root / jailbreak en la app | Interceptación en dispositivos comprometidos | TLS y ATS por defecto; sesión en SecureStore ligada al dispositivo | Evaluar pinning con rotación planificada |
| 19 | Sin CodeQL, OWASP dependency-check ni firma de imágenes con cosign | Defectos de código o artefactos alterados detectados más tarde | Trivy, gitleaks, npm audit, digests y checksums en el release | Habilitar CodeQL y firmar la imagen del backend |

## Mitigados, pendientes de aplicar

El código y las plantillas ya tienen el control. Falta que el responsable de la
infraestructura aplique los cambios en la cuenta, en el orden del
[runbook de Cloudflare](../infra/architecture/aws-deployment.md#poner-cloudflare-delante-de-la-api).
Estado al 2026-10-30: **mitigado**.

| # | Límite original | Qué cambió | Qué falta | Commit |
|---|---|---|---|---|
| 2 | La API no tenía WAF delante; `api.vinnot.com` llegaba directo a Caddy | `api.vinnot.com` y `api-dev.vinnot.com` pasan por el proxy de Cloudflare: conjunto de reglas administradas Free, protección DDoS y una regla de rate limiting sobre `/api/auth/*`. Caddy confía solo en los rangos de Cloudflare y toma la IP del cliente de `CF-Connecting-IP` ([Caddyfile](../../../infra/aws-low-cost/Caddyfile)). El security group abre 80 y 443 solo a esos rangos ([production-stack.json](../../../infra/aws-low-cost/production-stack.json)) | Desplegar el Caddyfile, activar el proxy y la regla en el panel de Cloudflare y, después, restringir el security group | `c9038703` |
| 20 | La plantilla de red y producción no coincidían: la plantilla abría el 443 solo a la IP de un operador, mientras que en producción el 443 era público | Las plantillas describen el lanzamiento público: sin parámetro de operador, sin la regla WAF previa al lanzamiento y con la sonda externa en modo público ([alineación con el lanzamiento público](../infra/architecture/hosting-and-runtime.md#alineación-con-el-lanzamiento-público)) | Aplicar los stacks a mano; hasta entonces, la regla 443 heredada del operador sigue en la cuenta | `a1dbb5c7`, `c9038703` |

## Decisiones aceptadas

Son riesgos que se aceptan a conciencia. Cada uno indica cuándo hay que volver a
evaluarlo. Estado al 2026-10-30: **decisión aceptada**.

| # | Decisión | Por qué se acepta | Cuándo revisarla |
|---|---|---|---|
| 3 | Los contadores de rate limit viven en la memoria de cada instancia y se reinician al reiniciar el backend ([RateLimitingFilter.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/RateLimitingFilter.java)) | Hay un solo backend por entorno, así que el contador de la instancia es el global; un reinicio que los pone en cero es aceptable ([decisiones de plataforma](../infra/architecture/hosting-and-runtime.md#decisiones-de-plataforma)) | Al correr un segundo backend en el mismo entorno: los contadores pasan a un almacén compartido o el límite se aplica en el borde |
| 22 | Cualquiera que conozca el correo o el usuario de una cuenta puede pausar su inicio de sesión con contraseña durante 15 minutos con 5 contraseñas incorrectas, y después del quinto fallo el 423 confirma que la cuenta existe ([LoginAttemptGuard.java](../../../backend/src/main/java/com/vinnot/user/application/service/LoginAttemptGuard.java)) | El bloqueo frena la fuerza bruta por cuenta, que es el riesgo mayor. El rate limit de credenciales por IP y la regla de Cloudflare sobre `/api/auth/*` siguen frenando a quien lo provoca; el login con Google o Apple y el restablecimiento de contraseña siguen disponibles | Si `security_events` muestra bloqueos repetidos de una cuenta desde direcciones variadas |
| 23 | Un cliente web que reintenta una renovación más de 30 segundos después de la rotación cierra todas las sesiones de la cuenta: la web no envía `rotationId`, así que ese reintento no entra en la recuperación idempotente ([RefreshTokenReuseResponder.java](../../../backend/src/main/java/com/vinnot/user/application/service/RefreshTokenReuseResponder.java)) | Pasados 30 segundos, un refresh rotado que vuelve a aparecer se trata como robado; cerrar todas las sesiones es la respuesta segura y la persona solo tiene que volver a iniciar sesión | Si `REFRESH_REUSE_DETECTED` aparece en cuentas web sin señales de robo: entonces la web pasa a enviar `rotationId`, como la app |

## Resueltas

Estado al 2026-10-30: **implementado**. Estos puntos ya no son límites; el
control está descrito en [Defensa en profundidad](defense-in-depth.md) y en
[Contraseñas y autenticación](passwords-and-authentication.md).

| # | Límite original | Cómo se resolvió | Commit |
|---|---|---|---|
| 1 | El login no tenía bloqueo automático ni contador de intentos fallidos | Tras 5 contraseñas incorrectas seguidas, el inicio de sesión con contraseña se pausa 15 minutos: 423 `ACCOUNT_TEMPORARILY_LOCKED` con `Retry-After` y aviso de seguridad por correo ([bloqueo temporal](passwords-and-authentication.md#bloqueo-temporal-del-inicio-de-sesión)) | `67df1d2b` |
| 4 | Reusar un refresh rotado se rechazaba, pero no revocaba la cadena de tokens | Un refresh rotado presentado fuera de la recuperación por `rotationId` y después de 30 segundos cierra todas las sesiones de la cuenta, revoca la cadena y olvida los dispositivos push ([detección de robo](passwords-and-authentication.md#detección-de-robo-del-refresh-token)) | `67df1d2b` |
| 5 | No había registro de eventos de seguridad | La tabla `security_events` (V73) registra 12 tipos de evento con IP y navegador, y se purga a los 180 días ([privacidad](privacy-and-data-protection.md#registro-de-eventos-de-seguridad)). La vista y el actor quedan en el punto 21 | `67df1d2b` |
| 6 | Un usuario inexistente respondía antes de ejecutar BCrypt | Una cuenta desconocida compara contra un hash BCrypt ficticio, así que tarda lo mismo que una contraseña incorrecta ([LoginAttemptGuard.java](../../../backend/src/main/java/com/vinnot/user/application/service/LoginAttemptGuard.java)) | `67df1d2b` |

## Cómo se actualiza esta lista

Cuando un punto se resuelve, pasa a [Resueltas](#resueltas) con su commit y se
refleja como **implementado** en [Defensa en profundidad](defense-in-depth.md) y
en el [explorador de capas](security-explorer.mdx). Un hallazgo nuevo entra con
el siguiente número libre, su riesgo, su mitigación y su siguiente paso.
