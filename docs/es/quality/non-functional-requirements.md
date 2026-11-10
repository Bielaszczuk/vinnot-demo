# Requisitos no funcionales

Consolida en una sola tabla los requisitos no funcionales de Vinnot. Cada fila trae el valor
actual, el archivo donde está definido y cómo se verifica (prueba automática, alarma o
revisión manual). Si un valor cambia en el código, esta página se actualiza en el mismo
cambio.

Los identificadores `RNF-xx` son propios de este capítulo. Los valores marcados como
**objetivo propuesto** todavía no tienen control ni medición sistemática: su estado es
pendiente y su seguimiento está en el [backlog de mejoras](improvement-backlog.md).

Los valores con variable de entorno (por ejemplo `${RATE_LIMIT_GENERAL_CAPACITY:300}`) se
documentan con su valor por defecto; un entorno puede sobrescribirlo sin cambiar el código.

## Seguridad

| ID | Característica | Requisito | Valor actual | Fuente | Verificación |
|---|---|---|---|---|---|
| RNF-01 | Autenticidad | Sesiones de corta duración con renovación rotativa | Token de acceso: 15 min. Renovación: 7 días, rota en cada uso. En la web, cookie `HttpOnly`, `Secure` y `SameSite=Strict` | [`application.yml`](../../../backend/src/main/resources/application.yml) (líneas 98-99); [`BrowserSessionPolicy.java`](../../../backend/src/main/java/com/vinnot/user/infrastructure/web/session/BrowserSessionPolicy.java); [`RefreshTokenCommandHandler.java`](../../../backend/src/main/java/com/vinnot/user/application/command/handler/RefreshTokenCommandHandler.java) | [`BrowserSessionPolicyTest.java`](../../../backend/src/test/java/com/vinnot/user/infrastructure/web/session/BrowserSessionPolicyTest.java); E2E `session-security.spec.ts` |
| RNF-02 | Confidencialidad | Contraseñas almacenadas con hash | BCrypt; nunca se guardan ni se registran en texto plano | [`SecurityConfig.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java) | Pruebas de identidad del [backend](../backend/testing/strategy.md#identidad) |
| RNF-03 | Confidencialidad | Control de acceso por rol en cada ruta | Administración solo para `ADMIN` o `MODERATOR`; gestión de usuarios y monitoreo solo para `ADMIN`. Sin sesión: HTTP 401; rol insuficiente: HTTP 403 | [`SecurityConfig.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java) | [`SecurityConfigAccessTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/config/SecurityConfigAccessTest.java); [CP-NF-02](non-functional-test-cases.md#cp-nf-02-impedir-el-acceso-de-un-usuario-común-a-la-administración) |
| RNF-04 | Integridad | Transporte cifrado y cabeceras de seguridad | API: HSTS de 1 año con `includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, sin cabecera `Server`. Web: TLS 1.2 como mínimo en CloudFront, HSTS de 180 días, `Content-Security-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy` | [`Caddyfile`](../../../infra/aws-low-cost/Caddyfile); [`security-headers.json`](../../../frontend-react/security-headers.json); [`production-web-stack.json`](../../../infra/aws-low-cost/production-web-stack.json) | [`web-session-deployment.test.mjs`](../../../scripts/test/web-session-deployment.test.mjs); [CP-NF-03](non-functional-test-cases.md#cp-nf-03-verificar-https-y-cabeceras-de-seguridad) |
| RNF-05 | Resistencia | Límites de tasa contra abuso y fuerza bruta | Ver [Límites de tasa](#límites-de-tasa). Al superarlos: HTTP 429 con `Retry-After`. Por cuenta: tras 5 contraseñas incorrectas seguidas, HTTP 423 `ACCOUNT_TEMPORARILY_LOCKED` con `Retry-After` durante 15 minutos (implementado el 2026-10-30) | [`application.yml`](../../../backend/src/main/resources/application.yml) (líneas 186-198 y 199-260); [`LoginAttemptGuard.java`](../../../backend/src/main/java/com/vinnot/user/application/service/LoginAttemptGuard.java) | [`RateLimitingFilterTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/security/RateLimitingFilterTest.java), [`RateLimitPolicyResolverTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/security/RateLimitPolicyResolverTest.java), [`LoginAttemptGuardTest.java`](../../../backend/src/test/java/com/vinnot/user/application/service/LoginAttemptGuardTest.java), [`LoginLockoutHttpPostgresIntegrationTest.java`](../../../backend/src/test/java/com/vinnot/user/infrastructure/web/LoginLockoutHttpPostgresIntegrationTest.java); [CP-NF-01](non-functional-test-cases.md#cp-nf-01-limitar-intentos-de-inicio-de-sesión) |
| RNF-06 | Integridad | Notificaciones de pago auténticas | Firma HMAC-SHA256 de Mercado Pago con tolerancia de ±10 minutos | [`MercadoPagoWebhookSignature.java`](../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/MercadoPagoWebhookSignature.java) | [`MercadoPagoWebhookSignatureTest.java`](../../../backend/src/test/java/com/vinnot/payment/infrastructure/security/MercadoPagoWebhookSignatureTest.java) |
| RNF-07 | Confidencialidad | Credenciales de pago del partner cifradas | Sobre AES-GCM versionado y autenticado contra el dueño y el campo | [`PaymentCredentialCipher.java`](../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/PaymentCredentialCipher.java) | [`PaymentCredentialCipherTest.java`](../../../backend/src/test/java/com/vinnot/payment/infrastructure/security/PaymentCredentialCipherTest.java) |
| RNF-08 | Autenticidad | Enlaces de correo con vencimiento | Verificación de correo: 24 h. Cambio de correo: 60 min. Restablecer contraseña: 60 min | [`application.yml`](../../../backend/src/main/resources/application.yml) (líneas 340-342) | Pruebas de identidad del [backend](../backend/testing/strategy.md#identidad) |
| RNF-09 | No repudio | Evidencia de aceptación de términos | Se guardan versión, revisión, idioma, fecha y hash del documento aceptado | [`TermsDocument.java`](../../../backend/src/main/java/com/vinnot/legal/domain/model/TermsDocument.java) | Casos de prueba de [Legal](../modules/legal/testing.md) |
| RNF-10 | Responsabilidad | Cada petición es trazable | Cabecera `X-Request-ID` en cada respuesta y en el registro | [`HttpRequestLoggingFilter.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/HttpRequestLoggingFilter.java) | [`HttpRequestLoggingFilterTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/web/HttpRequestLoggingFilterTest.java) |
| RNF-11 | Confidencialidad e integridad | Sin vulnerabilidades conocidas ni secretos versionados | 0 vulnerabilidades HIGH o CRITICAL en dependencias e imagen (Trivy, `npm audit`), con ejecución semanal; 0 secretos en todo el historial (Gitleaks) | [`security-checks.yml`](../../../.github/workflows/security-checks.yml); [`ci.yml`](../../../.github/workflows/ci.yml) | El pipeline falla; ver [Seguridad de dependencias](../infra/guides/dependency-security.md) |

### Límites de tasa

Cada bucket es un token bucket (Bucket4j): la capacidad se recarga completa en el período.

| Operación | Capacidad | Período |
|---|---|---|
| Credenciales (inicio de sesión) | 10 | 1 minuto |
| Acciones de cuenta | 5 | 15 minutos |
| Registro | 5 | 1 hora |
| Denuncias | 10 | 1 hora |
| Renovación de sesión | 60 | 1 minuto |
| IA (perfiles y comparaciones) | 20 | 1 hora |
| Escaneo de etiquetas | 30 | 1 hora |
| Propuestas de vinos | 10 | 1 día |
| Catálogo autenticado | 60 | 1 minuto |
| Catálogo autenticado, tope diario | 1.500 | 1 día |
| Catálogo público | 180 | 1 minuto |
| Catálogo público, tope diario | 1.500 | 1 día |
| Documentación de la API | 30 | 1 minuto |
| General | 300 | 1 minuto |

Una cuenta autenticada que agota el tope diario del catálogo queda bloqueada.

## Rendimiento y capacidad

| ID | Característica | Requisito | Valor actual | Fuente | Verificación |
|---|---|---|---|---|---|
| RNF-12 | Comportamiento temporal | Respuesta de la API | Peticiones de más de 1000 ms se registran como lentas. Alarma si al menos el 20 % de las peticiones (con 10 o más en la ventana) supera los 5 s. **Objetivo propuesto:** p95 de lecturas ≤ 500 ms en producción (pendiente) | [`application.yml`](../../../backend/src/main/resources/application.yml) (línea 184); [`OperationalTelemetry.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/metrics/OperationalTelemetry.java); [`policy.py`](../../../infra/aws-low-cost/monitoring/policy.py) | Alarma `http_slow_rate`; [CP-NF-04](non-functional-test-cases.md#cp-nf-04-medir-el-tiempo-de-respuesta-bajo-carga) pendiente |
| RNF-13 | Capacidad | Paginación acotada | Máximo 200 por página en general; 100 en bodegas y rutas del vino; 20 en los catálogos públicos de vinos y bodegas, con ventana de 500 resultados | [`PageQuery.java`](../../../backend/src/main/java/com/vinnot/shared/domain/valueobject/PageQuery.java); [`SearchWineriesQueryHandler.java`](../../../backend/src/main/java/com/vinnot/winery/application/query/handler/SearchWineriesQueryHandler.java); [`SearchWineRoutesQueryHandler.java`](../../../backend/src/main/java/com/vinnot/wineroute/application/query/handler/SearchWineRoutesQueryHandler.java); [`PublicWineCatalogAccessPolicy.java`](../../../backend/src/main/java/com/vinnot/wine/infrastructure/web/policy/PublicWineCatalogAccessPolicy.java) | [`PageQueryTest.java`](../../../backend/src/test/java/com/vinnot/shared/domain/valueobject/PageQueryTest.java); [`PublicWineCatalogAccessPolicyTest.java`](../../../backend/src/test/java/com/vinnot/wine/infrastructure/web/policy/PublicWineCatalogAccessPolicyTest.java) |
| RNF-14 | Utilización de recursos | Archivos acotados | 10 MB por archivo y 15 MB por petición; imágenes de hasta 8 MB y 24 megapíxeles | [`application.yml`](../../../backend/src/main/resources/application.yml) (líneas 38-39); [`ImageResourceLimits.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/image/ImageResourceLimits.java) | [`ImageResourceLimitsTest.java`](../../../backend/src/test/java/com/vinnot/shared/infrastructure/image/ImageResourceLimitsTest.java) |
| RNF-15 | Utilización de recursos | Recursos del servidor y gasto de IA acotados | Pool de 20 conexiones con espera máxima de 3 s; hasta 3 llamadas de IA simultáneas; tope de gasto de IA de USD 10 por mes | [`application.yml`](../../../backend/src/main/resources/application.yml) (líneas 13-15 y 384-391) | Alarmas `db_connections_high` (80 %), `pool_connection_timeout` y `ai_budget_near_limit` (80 % del tope) |
| RNF-16 | Tolerancia a fallos | Tiempos máximos para servicios externos | OpenAI: 10 s de conexión y 30 s de lectura. Reconocimiento de etiquetas: 12 s. Google Maps e inicio de sesión social: 3 s y 5 s. APIs de AWS: 15 s por llamada y 12 s por intento | [`application.yml`](../../../backend/src/main/resources/application.yml) (líneas 168, 333-334, 351-357 y 376-377) | Pruebas de clientes externos del [backend](../backend/testing/strategy.md) |
| RNF-17 | Corrección funcional | Límites de inscripción a eventos | Entradas por inscripción configurables por evento: de 1 a 20, 6 por defecto. Duración de la reserva (hold) de cupo: de 5 minutos a 7 días, 24 h por defecto; al vencer, libera el cupo | [`EventRegistrationSettings.java`](../../../backend/src/main/java/com/vinnot/event/domain/valueobject/EventRegistrationSettings.java) | [`EventRegistrationSettingsTest.java`](../../../backend/src/test/java/com/vinnot/event/domain/valueobject/EventRegistrationSettingsTest.java) |

## Fiabilidad

| ID | Característica | Requisito | Valor actual | Fuente | Verificación |
|---|---|---|---|---|---|
| RNF-18 | Disponibilidad | Monitoreo continuo | Sonda externa y colector cada 5 minutos. Alarmas: 3 o más errores 5xx que sean al menos el 5 % de las peticiones; 20 % de peticiones de más de 5 s; memoria libre menor a 256 MiB; disco libre menor a 3 GiB; contenedor por encima del 90 % de memoria; conexiones por encima del 80 % del pool; copia de más de 30 h | [`vinnot-prod-monitor.timer`](../../../infra/aws-low-cost/systemd/vinnot-prod-monitor.timer); [`policy.py`](../../../infra/aws-low-cost/monitoring/policy.py); [`config.example.json`](../../../infra/aws-low-cost/monitoring/config.example.json) | [`test_monitoring.py`](../../../infra/aws-low-cost/monitoring/test_monitoring.py); [Observabilidad](../infra/operations/observability-and-incidents.md#señales-y-umbrales) |
| RNF-19 | Capacidad de recuperación | Copias de seguridad | Copia diaria de la base a las 04:00 UTC fuera del servidor. Objetivos: RPO de 24 h y RTO de 4 h | [`vinnot-backup.timer`](../../../infra/aws-low-cost/systemd/vinnot-backup.timer); [Backup y recuperación](../infra/operations/backup-and-disaster-recovery.md#rporto) | Alarma `backup_overdue` a las 30 h; restauración aislada con [`verify-isolated-restore.mjs`](../../../scripts/verify-isolated-restore.mjs); [CP-NF-05](non-functional-test-cases.md#cp-nf-05-restaurar-una-copia-de-seguridad) |
| RNF-20 | Disponibilidad | Servicio disponible | Control de salud del backend cada 30 s desde Caddy. **Objetivo propuesto:** 99,5 % mensual (pendiente: sin reporte consolidado). Un único servidor por entorno, sin alta disponibilidad | [`Caddyfile`](../../../infra/aws-low-cost/Caddyfile); [Despliegue en AWS](../infra/architecture/aws-deployment.md) | Sonda externa; [M-15](metrics.md#m-15-disponibilidad-mensual) |

## Compatibilidad y usabilidad

| ID | Característica | Requisito | Valor actual | Fuente | Verificación |
|---|---|---|---|---|---|
| RNF-21 | Interoperabilidad | API documentada y errores estándar | Contrato OpenAPI (springdoc) y respuesta de error con código e identificador de petición | [`pom.xml`](../../../backend/pom.xml); [`GlobalExceptionHandler.java`](../../../backend/src/main/java/com/vinnot/shared/infrastructure/web/GlobalExceptionHandler.java) | Pruebas de contrato del [backend](../backend/testing/strategy.md#backend-web-seguridad-y-contratos) |
| RNF-22 | Accesibilidad | Accesibilidad e idiomas | Base WCAG 2.1 nivel AA, VoiceOver, TalkBack y navegación con teclado; interfaz completa en español e inglés | [Layout y accesibilidad](../shared/design/layout-and-accessibility.md) | Revisión manual; [CP-NF-06](non-functional-test-cases.md#cp-nf-06-completar-un-flujo-con-lector-de-pantalla). Prueba automática con axe pendiente |

## Mantenibilidad y portabilidad

| ID | Característica | Requisito | Valor actual | Fuente | Verificación |
|---|---|---|---|---|---|
| RNF-23 | Capacidad para ser probado | Cobertura mínima de pruebas | Backend: 90 % de líneas y 65 % de ramas en total; 100 % de líneas y métodos en `application.service` y `domain.service`; 100 % de líneas en los handlers. Web y app, dentro del alcance incluido: 100 % de sentencias, funciones y líneas, y 60 % de ramas | [`pom.xml`](../../../backend/pom.xml) (líneas 340-347); [`vitest.config.ts`](../../../frontend-react/vitest.config.ts); [`package.json`](../../../frontend-mobile/package.json) | El pipeline falla bajo el umbral |
| RNF-24 | Modularidad | Arquitectura hexagonal | El dominio no depende de frameworks ni de persistencia; cada servicio tiene su prueba; los proveedores externos están detrás de puertos | [`verify-test-architecture.mjs`](../../../scripts/verify-test-architecture.mjs); [Arquitectura](../architecture/README.md) | Job `Repository checks` del CI |
| RNF-25 | Adaptabilidad | Plataformas soportadas | Web: Chromium por defecto; Firefox, WebKit, Pixel 7 e iPhone 13 emulados con `VINNOT_BROWSER_MATRIX=1`. En CI corre `release-retention.spec.ts` en Chromium. App: iOS 16.4 o superior y Android | [`playwright.config.ts`](../../../frontend-react/playwright.config.ts); [`app.config.ts`](../../../frontend-mobile/app.config.ts) (línea 222) | [CP-NF-07](non-functional-test-cases.md#cp-nf-07-ejecutar-los-flujos-críticos-en-la-matriz-de-navegadores) |
| RNF-26 | Analizabilidad | Documentación viva y bilingüe | Toda página en `docs/es` tiene su espejo en `docs/en` y es alcanzable desde el índice; enlaces verificados | [`validate_documentation.py`](../../../scripts/validate_documentation.py) | Job `Repository checks` del CI |

## Requisitos funcionales

Los requisitos funcionales viven en cada módulo, con identificadores `RF-WEB-*` para la web
y `RF-APK-*` para la app, y se vinculan con casos de uso y casos de prueba en la
[matriz de trazabilidad](../modules/traceability.md). Este capítulo no crea identificadores
paralelos.

| Módulo | Requisitos web | Requisitos app | Requisitos |
|---|---|---|---|
| Usuarios y cuenta | 30 | 35 | [requirements.md](../modules/users/requirements.md) |
| Legal | 7 | 7 | [requirements.md](../modules/legal/requirements.md) |
| Vinos | 12 | 23 | [requirements.md](../modules/wines/requirements.md) |
| Bodegas y regiones | 4 | 5 | [requirements.md](../modules/wineries/requirements.md) |
| Reseñas | 10 | 10 | [requirements.md](../modules/reviews/requirements.md) |
| Cava | 7 | 8 | [requirements.md](../modules/cellar/requirements.md) |
| Comunidad | 4 | 4 | [requirements.md](../modules/community/requirements.md) |
| Eventos y entradas | 16 | 15 | [requirements.md](../modules/events/requirements.md) |
| Pagos | 3 | 2 | [requirements.md](../modules/payments/requirements.md) |
| Rutas del vino | 7 | 7 | [requirements.md](../modules/wine-routes/requirements.md) |
| Compartir | 7 | 8 | [requirements.md](../modules/sharing/requirements.md) |
| Notificaciones | 9 | 14 | [requirements.md](../modules/notifications/requirements.md) |
| Perfiles y comparaciones IA | 8 | 10 | [requirements.md](../modules/ai/requirements.md) |
| Soporte e información pública | 5 | 5 | [requirements.md](../modules/support/requirements.md) |
| Partners | 7 | 7 | [requirements.md](../modules/partner/requirements.md) |
| Administración y moderación | 33 | 33 | [requirements.md](../modules/admin/requirements.md) |
| **Total** | **169** | **193** | |

Los conteos provienen de la [matriz de trazabilidad](../modules/traceability.md); si
difieren, manda la matriz.
