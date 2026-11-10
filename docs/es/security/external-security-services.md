# Servicios externos de seguridad

Esta página lista cada librería, proveedor o servicio externo que Vinnot usa para
autenticar personas o defender la plataforma. Para cada uno indica la versión, el
propósito, dónde se configura (solo el nombre de la clave, nunca su valor) y si es
un punto único de falla. El catálogo general de tecnologías está en
[Tecnologías](../architecture/technologies/README.md).

Columna "Punto único": **sí** indica que, si ese servicio falla, la función que
protege deja de estar disponible y no hay alternativa automática.

## Autenticación e identidad

| Componente | Versión | Propósito | Configuración | Punto único | Fuente |
|---|---|---|---|---|---|
| Spring Security | 7.1.2 (vía Spring Boot 4.1.2) | Cadena de filtros, autorización por URL y por método, `BCryptPasswordEncoder` | `SecurityConfig` | no (librería) | [pom.xml](../../../backend/pom.xml), [SecurityConfig.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/SecurityConfig.java) |
| jjwt | 0.13.0 | Firma y verificación HMAC del access JWT y de la prueba de reautenticación | `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | no (librería) | [pom.xml](../../../backend/pom.xml), [JwtTokenService.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/JwtTokenService.java) |
| Nimbus JOSE + JWT (`spring-security-oauth2-jose`) | 10.9.1 (gestionada por Spring Security 7.1.2) | Verificar ID tokens de Google y Apple contra sus JWKS | `GOOGLE_OAUTH_AUDIENCES`, `APPLE_OAUTH_AUDIENCES` | no (librería) | [SocialIdentityVerifierAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/identity/SocialIdentityVerifierAdapter.java) |
| Google Identity | servicio | Login social y step-up con Google; JWKS `googleapis.com/oauth2/v3/certs` | `GOOGLE_OAUTH_AUDIENCES`; clientes `@react-oauth/google` ^0.13.5 (web) y `@react-native-google-signin/google-signin` ^16.1.5 (app) | sí, para el login con Google; el login con contraseña sigue disponible | [contraseñas y autenticación](passwords-and-authentication.md#inicio-de-sesión-con-google-y-apple) |
| Sign in with Apple | servicio | Login social, step-up y revocación al borrar la cuenta; JWKS `appleid.apple.com/auth/keys` | `APPLE_OAUTH_AUDIENCES`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`; cliente `expo-apple-authentication` ~58.0.2 | sí, para el login con Apple | [application.yml](../../../backend/src/main/resources/application.yml), [AppleAuthorizationRevocationAdapter.java](../../../backend/src/main/java/com/vinnot/user/infrastructure/identity/AppleAuthorizationRevocationAdapter.java) |
| Facebook Login | Graph API v23.0 | Login social solo en desarrollo; deshabilitado en producción | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`; cliente `react-native-fbsdk-next` ^13.4.3 | no aplica en producción | [entornos y secretos](../infra/architecture/environments-and-secrets.md#disponibilidad-de-facebook-por-entorno) |
| expo-secure-store | ~58.0.2 | Guardar la sesión de la app en Keychain (iOS) y Keystore (Android) | `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` | no | [authSession.storage.ts](../../../frontend-mobile/src/infrastructure/storage/authSession.storage.ts) |

## Protección de abuso y del tráfico

| Componente | Versión | Propósito | Configuración | Punto único | Fuente |
|---|---|---|---|---|---|
| Bucket4j | 8.21.0 | Rate limiting por política e identidad | `RATE_LIMIT_*` | no; los contadores viven en memoria de la instancia (decisión aceptada el 2026-10-30: un backend por entorno) | [pom.xml](../../../backend/pom.xml), [RateLimitingFilter.java](../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/RateLimitingFilter.java) |
| Caffeine | 3.2.4 (gestionada por Spring Boot) | Almacenar los buckets con expiración por inactividad | `RATE_LIMIT_MAXIMUM_BUCKETS`, `RATE_LIMIT_BUCKET_IDLE_EXPIRATION` | no | ídem |
| AWS WAF | servicio | Grupos administrados `AWSManagedRulesAmazonIpReputationList`, `AWSManagedRulesCommonRuleSet` y `AWSManagedRulesKnownBadInputsRuleSet` delante de la web | WebACL `vinnot-prod-web` | no; si falla, CloudFront sigue sirviendo | [production-web-stack.json](../../../infra/aws-low-cost/production-web-stack.json) |
| Amazon CloudFront | servicio (plan Free) | TLS 1.2+ con redirección a HTTPS, cabeceras de seguridad por función, acceso a S3 por Origin Access Control | stack web | sí, para la web | ídem |
| AWS Certificate Manager | servicio | Certificado TLS de `vinnot.com` en CloudFront | parámetro `CertificateArn` | sí, para la web | ídem |
| Proxy y WAF de Cloudflare (plan Free) | servicio | Delante de `api.vinnot.com` y `api-dev.vinnot.com`: termina el TLS del cliente, aplica el conjunto de reglas administradas Free, la protección DDoS y una regla de rate limiting sobre `/api/auth/*`, y vuelve a cifrar hacia Caddy en Full (strict). Bot Fight Mode queda apagado para no bloquear los webhooks de Mercado Pago. Estado: mitigado el 2026-10-30, pendiente de que el responsable lo active | panel de Cloudflare, en el orden del [runbook](../infra/architecture/aws-deployment.md#poner-cloudflare-delante-de-la-api); rangos de origen en `trusted_proxies` del [Caddyfile](../../../infra/aws-low-cost/Caddyfile) y en el security group | sí, para la API una vez activo; para volver atrás, primero se reabre el origen y después el registro pasa a DNS-only ([pasos](../infra/architecture/aws-deployment.md#4-volver-atrás)) | [production-stack.json](../../../infra/aws-low-cost/production-stack.json), [Caddyfile](../../../infra/aws-low-cost/Caddyfile) |
| Caddy | 2.11.6-alpine, fijado por digest | Proxy inverso de la API, TLS automático, HSTS y cabeceras; confía solo en los rangos de Cloudflare para leer `CF-Connecting-IP` | [Caddyfile](../../../infra/aws-low-cost/Caddyfile), `VINNOT_API_HOST` | sí, para la API | [docker-compose.yml](../../../infra/aws-low-cost/docker-compose.yml) |
| Autoridad ACME de Caddy | servicio | Emitir y renovar el certificado de la API | El Caddyfile no fija emisor, así que aplican los emisores por defecto de Caddy (Let's Encrypt, con ZeroSSL como alternativa); el emisor efectivo en producción no está verificado | no; Caddy cambia de emisor si uno falla | [Caddyfile](../../../infra/aws-low-cost/Caddyfile) |
| Cloudflare Worker de imágenes | servicio | Sirve solo claves que cumplen patrones estrictos; CSP con `sandbox` para SVG | [wrangler.jsonc](../../../infra/cloudflare/catalog-images/wrangler.jsonc) | sí, para las imágenes del catálogo | [worker.mjs](../../../infra/cloudflare/catalog-images/worker.mjs) |
| Cloudflare Access (Zero Trust Free) | servicio | Restringe quién puede leer el sitio de documentación | panel de Cloudflare (no codificado) | sí, para la documentación | [sitio de documentación](../governance/documentation-site.md) |

## Infraestructura y secretos

| Componente | Versión | Propósito | Configuración | Punto único | Fuente |
|---|---|---|---|---|---|
| AWS Secrets Manager | servicio | Secretos del backend en `vinnot/prod/backend-*` | rol del host | no en caliente: el backend lee `runtime.env` ya escrito; sí para refrescarlo o desplegar | [refresh-runtime-env.sh](../../../infra/aws-low-cost/refresh-runtime-env.sh), [entornos y secretos](../infra/architecture/environments-and-secrets.md) |
| AWS Systems Manager (SSM) | servicio | Acceso administrativo sin SSH y ejecución del release (documento `Vinnot-ProductionRelease`) | rol del host, stack de release | sí, para administrar y desplegar | [production-release-stack.json](../../../infra/aws-low-cost/iam/production-release-stack.json) |
| AWS IAM + OIDC de GitHub | servicio | Credenciales temporales para el release de producción con el rol `vinnot-production-release`; rol del host con mínimo privilegio | stacks de IAM | sí, para publicar un release | [production-release.yml](../../../.github/workflows/production-release.yml) |
| S3 / EBS (cifrado de AWS) | servicio | SSE-AES256, Block Public Access, rechazo de tráfico sin TLS; volumen EBS cifrado | [production-stack.json](../../../infra/aws-low-cost/production-stack.json) | no | ídem |
| Java `javax.crypto` (AES-GCM) | JDK 25 | Cifrar las credenciales de vendedores de Mercado Pago | `EVENT_PAYMENTS_ENCRYPTION_KEY` | sí, para cobrar: sin la clave no se descifran | [PaymentCredentialCipher.java](../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/PaymentCredentialCipher.java) |

## Pagos

| Componente | Versión | Propósito | Configuración | Punto único | Fuente |
|---|---|---|---|---|---|
| Firmas de webhook de Mercado Pago | HMAC-SHA256 | Autenticar las notificaciones de pago | `EVENT_PAYMENTS_WEBHOOK_SECRET` | no; la reconciliación consulta la pasarela | [MercadoPagoWebhookSignature.java](../../../backend/src/main/java/com/vinnot/payment/infrastructure/security/MercadoPagoWebhookSignature.java) |
| OAuth de Mercado Pago | servicio | Vincular la cuenta de cobro del organizador | `EVENT_PAYMENTS_CLIENT_ID`, `EVENT_PAYMENTS_CLIENT_SECRET` | sí, para cobrar entradas | [Pagos](../modules/payments/architecture.md) |

## Cadena de suministro

| Componente | Versión | Propósito | Configuración | Punto único | Fuente |
|---|---|---|---|---|---|
| Dependabot | servicio de GitHub | Actualizaciones de Actions, npm, Maven, Docker y Compose | [dependabot.yml](../../../.github/dependabot.yml) | no | ídem |
| Trivy | 0.74.0, instalación verificada por SHA-256 | Vulnerabilidades HIGH/CRITICAL en Maven, la imagen y el lockfile de Android | [security-checks.yml](../../../.github/workflows/security-checks.yml) | no | [install-security-tools.mjs](../../../scripts/install-security-tools.mjs) |
| gitleaks | 8.28.0, instalación verificada por SHA-256 | Secretos en todo el historial de Git | [ci.yml](../../../.github/workflows/ci.yml) | no | ídem |
| actionlint | 1.7.12, instalación verificada por SHA-256 | Errores en los workflows | [ci.yml](../../../.github/workflows/ci.yml) | no | ídem |
| CycloneDX (por Trivy) | formato SBOM | Inventario de componentes de la imagen del backend | [production-release.yml](../../../.github/workflows/production-release.yml) | no | ídem |
| npm audit | npm de Node 22 | Vulnerabilidades `high` o superiores en web, mobile y docs | [audit-npm-dependencies.mjs](../../../scripts/audit-npm-dependencies.mjs) | no | ídem |
| Amazon ECR scan on push | servicio | Escaneo de la imagen al subirla; tags inmutables | [production-stack.json](../../../infra/aws-low-cost/production-stack.json) | no | ídem |

## Lo que Vinnot no usa

Para evitar supuestos: no hay proveedor de identidad externo (Auth0, Cognito o
similar), ni CAPTCHA, ni Sentry u otro reporte de errores, ni CodeQL. El WAF de
la API ya está en el código (proxy de Cloudflare) y queda pendiente de que el
responsable lo aplique. Las brechas que esto deja están priorizadas en
[Límites conocidos](known-limitations.md).
