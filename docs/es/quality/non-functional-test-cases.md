# Casos de prueba no funcionales

Casos de prueba de los [requisitos no funcionales](non-functional-requirements.md). Los
casos funcionales viven en la página de pruebas de cada módulo y en la
[matriz de trazabilidad](../modules/traceability.md).

Se ejecutan en desarrollo, nunca en producción, salvo indicación expresa del caso. Los
datos son de ejemplo.

## Resumen

| ID | Objetivo | Requisito | Prioridad | Estado |
|---|---|---|---|---|
| CP-NF-01 | Limitar intentos de inicio de sesión | RNF-05 | Alta | Automatizado en el filtro; manual contra el entorno |
| CP-NF-02 | Impedir el acceso de un usuario común a la administración | RNF-03 | Alta | Automatizado |
| CP-NF-03 | Verificar HTTPS y cabeceras de seguridad | RNF-04 | Alta | Automatizado para la web; manual para la API |
| CP-NF-04 | Medir el tiempo de respuesta bajo carga | RNF-12 | Media | Pendiente (k6) |
| CP-NF-05 | Restaurar una copia de seguridad | RNF-19 | Media | Parcial: restauración de base automatizada; simulacro integral pendiente |
| CP-NF-06 | Completar un flujo con lector de pantalla | RNF-22 | Media | Manual; axe pendiente |
| CP-NF-07 | Ejecutar los flujos críticos en la matriz de navegadores | RNF-25 | Media | Automatizado a pedido |

## CP-NF-01 Limitar intentos de inicio de sesión

- **Tipo:** seguridad, fuerza bruta. **Técnica:** valores límite.
- **Precondiciones:** ningún intento previo desde el origen de prueba.
- **Datos:** 11 intentos con contraseña incorrecta en menos de 1 minuto.
- **Pasos:**
  1. Enviar 10 intentos.
  2. Enviar el intento 11.
  3. Esperar el tiempo indicado en `Retry-After` y volver a intentar.
- **Resultado esperado:** los 10 primeros responden credenciales inválidas; el 11 recibe
  HTTP 429 con `Retry-After`; después de la espera se puede volver a intentar.
- **Estado:** automatizado en [`RateLimitingFilterTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/security/RateLimitingFilterTest.java); la ejecución contra el entorno es manual.

## CP-NF-02 Impedir el acceso de un usuario común a la administración

- **Tipo:** seguridad, autorización. **Técnica:** tabla de decisión por rol.
- **Precondiciones:** sesión de un usuario con rol `USER`.
- **Datos:** peticiones a `/api/admin/...` y `/api/actuator/...`.
- **Pasos:**
  1. Llamar a una ruta de administración.
  2. Llamar a una ruta de monitoreo.
  3. Repetir sin sesión.
- **Resultado esperado:** con rol `USER`, HTTP 403; sin sesión, HTTP 401; en ningún caso se
  devuelven datos.
- **Estado:** automatizado en [`SecurityConfigAccessTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/config/SecurityConfigAccessTest.java).

## CP-NF-03 Verificar HTTPS y cabeceras de seguridad

- **Tipo:** seguridad.
- **Precondiciones:** entorno desplegado.
- **Datos:** `http://api-dev.vinnot.com/api/actuator/health` y la web de desarrollo.
- **Pasos:**
  1. Pedir la URL de la API por HTTP.
  2. Inspeccionar la respuesta HTTPS de la API.
  3. Inspeccionar la respuesta HTTPS de la web.
- **Resultado esperado:** la petición HTTP se redirige a HTTPS. La API responde con
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` y
  `X-Content-Type-Options: nosniff`, sin cabecera `Server`. La web responde con
  `Content-Security-Policy`, `X-Frame-Options: DENY` y HSTS, según
  [`security-headers.json`](../../../frontend-react/security-headers.json).
- **Estado:** la configuración de cabeceras de la web se verifica con
  [`web-session-deployment.test.mjs`](../../../scripts/test/web-session-deployment.test.mjs); la comprobación de la API es manual.

## CP-NF-04 Medir el tiempo de respuesta bajo carga

- **Tipo:** rendimiento y carga.
- **Precondiciones:** producción o réplica equivalente, fuera del horario pico.
- **Datos:** 50 usuarios virtuales consultando el catálogo durante 5 minutos.
- **Pasos:**
  1. Ejecutar el script de carga con k6.
  2. Registrar p50, p95 y tasa de errores.
- **Resultado esperado:** p95 de 500 ms o menos (objetivo propuesto) y errores 5xx por debajo
  del 1 %. Las respuestas 429 por límite de tasa se cuentan aparte, no como fallas.
- **Estado:** pendiente; no hay script de k6 en el repositorio ([backlog](improvement-backlog.md)).

## CP-NF-05 Restaurar una copia de seguridad

- **Tipo:** fiabilidad, recuperación.
- **Precondiciones:** copia de la noche anterior disponible; servidor de prueba aislado.
- **Datos:** la última copia diaria.
- **Pasos:**
  1. Crear un servidor de prueba.
  2. Restaurar la copia.
  3. Levantar el backend y verificar salud, inicio de sesión y datos de muestra.
  4. Medir el tiempo total.
- **Resultado esperado:** el servicio queda operativo con los datos de la copia en menos de
  4 horas (RTO) y la pérdida de datos es menor a 24 horas (RPO).
- **Estado:** parcial. [`verify-isolated-restore.mjs`](../../../scripts/verify-isolated-restore.mjs)
  mide la restauración de la base; el simulacro integral con host, imagen, certificados y
  DNS está pendiente ([Backup y recuperación](../infra/operations/backup-and-disaster-recovery.md)).

## CP-NF-06 Completar un flujo con lector de pantalla

- **Tipo:** usabilidad, accesibilidad.
- **Precondiciones:** iPhone con VoiceOver y Android con TalkBack activados.
- **Datos:** flujo "buscar un vino y agregarlo a la cava".
- **Pasos:**
  1. Activar el lector de pantalla.
  2. Realizar el flujo sin mirar la pantalla.
- **Resultado esperado:** todos los botones y campos tienen una etiqueta comprensible, el
  orden de lectura es lógico y el flujo se completa.
- **Estado:** manual, con el [checklist de accesibilidad](../shared/design/layout-and-accessibility.md#checklist-de-accesibilidad); la verificación automática con axe está pendiente.

## CP-NF-07 Ejecutar los flujos críticos en la matriz de navegadores

- **Tipo:** compatibilidad y portabilidad.
- **Precondiciones:** entorno de desarrollo.
- **Datos:** matriz Chromium, Firefox, WebKit, Pixel 7 e iPhone 13 emulados.
- **Pasos:**
  1. Ejecutar las pruebas extremo a extremo con `VINNOT_BROWSER_MATRIX=1`.
- **Resultado esperado:** todas las pruebas pasan en las cinco plataformas, sin diferencias de
  diseño que impidan completar los flujos.
- **Estado:** automatizado a pedido con [`playwright.config.ts`](../../../frontend-react/playwright.config.ts); el CI ejecuta solo `release-retention.spec.ts` en Chromium.
