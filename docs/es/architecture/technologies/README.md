# Tecnologías

Todo lo que usa Vinnot, para qué y dónde se configura. Las versiones son las declaradas en el
repositorio; un `^` o `~` indica el rango que acepta el gestor de paquetes. Los servicios
sin versión propia muestran «—».

## Plataforma

Las versiones base de cada parte del sistema.

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Java (OpenJDK) | 25 | Lenguaje y runtime del backend | [`pom.xml`](../../../../backend/pom.xml), [`.sdkmanrc`](../../../../.sdkmanrc) |
| Spring Boot | 4.1.2 | Framework del backend (Spring Framework 7, Spring Security 7, Hibernate 7) | [`pom.xml`](../../../../backend/pom.xml) |
| Maven | 3.9 | Compilación y pruebas del backend | [`Dockerfile`](../../../../backend/Dockerfile) |
| Node.js | 22 | Herramientas de web, app, documentación y scripts | [`.nvmrc`](../../../../frontend-mobile/.nvmrc), [`package.json`](../../../../docs-site/package.json) |
| TypeScript | ~6.0.3 (web, docs, app) | Lenguaje de la web, la app y el sitio de documentación | [`tsconfig.app.json`](../../../../frontend-react/tsconfig.app.json) |
| React | ^19.3.1 (web) · 19.3.0 (app) | Interfaz de la web y de la app | [`package.json`](../../../../frontend-react/package.json) |
| React Native · Expo SDK | 0.88.0 · 58 (~58.0.21) | App para iOS y Android (sólo nueva arquitectura desde SDK 55) | [`package.json`](../../../../frontend-mobile/package.json), [`app.config.ts`](../../../../frontend-mobile/app.config.ts) |
| PostgreSQL | 18 (18.6 en los servidores) | Base de datos | [`docker-compose.yml`](../../../../infra/docker-compose.yml), [`compose.postgres.yml`](../../../../infra/aws-low-cost/compose.postgres.yml) |
| Python | 3 (Lambda python3.13) | Validación de la documentación, monitoreo y sonda externa | [`validate_documentation.py`](../../../../scripts/validate_documentation.py), [`external_probe.py`](../../../../infra/aws-low-cost/monitoring/external_probe.py) |

## Backend

Dependencias de [`pom.xml`](../../../../backend/pom.xml). Las versiones sin número propio vienen del BOM de Spring Boot.

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Spring Web MVC (Tomcat) | BOM (Tomcat 11.0.27) | API REST y `RestClient` para llamadas salientes | [`ExpoPushSenderAdapter.java`](../../../../backend/src/main/java/com/vinnot/notification/infrastructure/push/ExpoPushSenderAdapter.java) |
| Spring Data JPA · Hibernate | BOM (Hibernate 7.4.13) | Persistencia en los adaptadores de salida | — |
| Bean Validation (Hibernate Validator) | BOM | Validación de las peticiones | — |
| Spring Security · OAuth2 JOSE | BOM | Autorización y verificación de tokens de Google y Apple | [`SocialIdentityVerifierAdapter.java`](../../../../backend/src/main/java/com/vinnot/user/infrastructure/identity/SocialIdentityVerifierAdapter.java) |
| JJWT | 0.13.0 | Tokens de sesión propios y comprobantes de reautenticación | [`JwtTokenService.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/JwtTokenService.java) |
| Bucket4j · Caffeine | 8.21.0 · BOM | Límites de pedidos por cliente | [`RateLimitingFilter.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/RateLimitingFilter.java) |
| Spring Boot Actuator · Micrometer | BOM | Salud y métricas operativas | [`OperationalTelemetry.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/metrics/OperationalTelemetry.java) |
| Flyway | BOM (12.4.0) | Migraciones de la base de datos | [`db/migration`](../../../../backend/src/main/resources/db/migration/) |
| PostgreSQL JDBC | BOM | Driver de la base de datos | — |
| AWS SDK v2 (S3, SES v2, SQS) | 2.57.3 | Archivos en R2 o S3, envío de correos y rebotes de correo | [`R2StorageConfiguration.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/R2StorageConfiguration.java) |
| libphonenumber | 9.0.42 | Normalización de teléfonos | [`LibPhoneNumberNormalizer.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/phone/LibPhoneNumberNormalizer.java) |
| TwelveMonkeys ImageIO WebP | 3.15.3 | Lectura de imágenes WebP | [`ImageResourceLimits.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/image/ImageResourceLimits.java) |
| springdoc-openapi | 3.2.0 | Documentación de la API (Swagger UI) | [`application.yml`](../../../../backend/src/main/resources/application.yml) |
| MapStruct · Lombok | 1.6.3 · 1.18.48 | Mapeo entre modelos y menos código repetido | — |
| Jackson | BOM: 3.1.7 (y 2.21.7 para JJWT y Swagger) | JSON | [`pom.xml`](../../../../backend/pom.xml) |
| JUnit · Mockito · AssertJ | BOM | Pruebas unitarias | — |
| Testcontainers | BOM | Pruebas de integración contra PostgreSQL 18 real | — |
| Checkstyle · Maven Enforcer · JaCoCo | 3.6.0 · 3.6.3 · 0.8.15 | Estilo, versión de Java y cobertura mínima (90 % de líneas, 65 % de ramas) | [`pom.xml`](../../../../backend/pom.xml), [`checkstyle.xml`](../../../../backend/checkstyle.xml) |

## Web

Dependencias de [`package.json`](../../../../frontend-react/package.json).

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Vite | ^8.3.5 | Servidor de desarrollo y compilación | [`vite.config.ts`](../../../../frontend-react/vite.config.ts) |
| React Router | ^7.18.4 | Rutas | [`App.tsx`](../../../../frontend-react/src/app/App.tsx) |
| TanStack Query | ^5.104.5 | Estado del servidor y caché | — |
| Redux Toolkit · React Redux | ^2.13.0 · ^9.3.0 | Estado de la sesión | [`auth.slice.ts`](../../../../frontend-react/src/presentation/stores/auth.slice.ts) |
| Axios | ^1.20.0 | Transporte HTTP | [`http.ts`](../../../../frontend-react/src/infrastructure/http/http.ts) |
| React Hook Form · Zod | ^7.91.0 · ^4.6.7 | Formularios y validación | — |
| i18next · react-i18next | ^26.5.10 · ^17.1.8 | Español e inglés | [`I18nProvider.tsx`](../../../../frontend-react/src/app/providers/I18nProvider.tsx) |
| Tailwind CSS · PostCSS | ^4.3.3 · ^8.5.28 | Estilos | [`postcss.config.js`](../../../../frontend-react/postcss.config.js) |
| @react-oauth/google | ^0.13.5 | Ingreso con Google | — |
| Google Maps JavaScript API | @types/google.maps ^3.66.7 | Mapas | [`MapView.tsx`](../../../../frontend-react/src/presentation/components/ui/MapView.tsx) |
| Radix Popover · React Day Picker · date-fns | ^1.3.1 · ^10.0.2 · ^4.4.0 | Selector de fecha y hora | — |
| Lucide | ^1.61.0 | Íconos | — |
| Vitest · Testing Library · jsdom | 5.0.5 · ^16.3.3 · ^30.1.3 | Pruebas unitarias y de componentes, con cobertura mínima | [`vitest.config.ts`](../../../../frontend-react/vitest.config.ts) |
| MSW | ^2.15.0 | API simulada para desarrollo y pruebas | — |
| Playwright | ^1.64.1 | Pruebas de punta a punta en Chromium, Firefox, WebKit y móviles | [`playwright.config.ts`](../../../../frontend-react/playwright.config.ts) |
| ESLint · typescript-eslint | ^10.13.0 · ^8.72.0 | Análisis estático | [`eslint.config.js`](../../../../frontend-react/eslint.config.js) |

## App móvil

Dependencias de [`package.json`](../../../../frontend-mobile/package.json).

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Expo Router | ~58.0.28 | Rutas y pantallas | [`app/`](../../../../frontend-mobile/app/) |
| Redux Toolkit (RTK Query) | ^2.13.0 | Estado del servidor y de la sesión | — |
| Axios | ^1.20.0 | Transporte HTTP | — |
| React Hook Form · Zod | ^7.91.0 · ^4.6.7 | Formularios y validación | — |
| i18next · expo-localization | ^26.5.10 · ~58.0.5 | Español e inglés según el dispositivo | [`index.ts`](../../../../frontend-mobile/src/shared/i18n/index.ts) |
| NativeWind · Tailwind CSS | ^4.2.7 · 3.4.19 | Estilos | [`metro.config.js`](../../../../frontend-mobile/metro.config.js) |
| ML Kit Text Recognition | ^5.0.1 | Lectura de la etiqueta en el dispositivo | [`wineLabelTextRecognizer.ts`](../../../../frontend-mobile/src/infrastructure/device/camera/wineLabelTextRecognizer.ts) |
| expo-camera · expo-image-picker · expo-image-manipulator | ~58.0.14 · ~58.0.10 · ~58.0.16 | Cámara, galería y preparación de fotos | — |
| Google Sign-In · Apple Authentication · Facebook SDK | ^16.1.5 · ~58.0.2 · ^13.4.3 | Ingreso con Google, Apple y Facebook | [`socialIdentity.gateway.ts`](../../../../frontend-mobile/src/infrastructure/identity/socialIdentity.gateway.ts) |
| expo-secure-store · AsyncStorage | ~58.0.2 · 2.2.0 | Sesión cifrada y preferencias | — |
| expo-notifications | ~58.1.7 | Notificaciones push | — |
| react-native-maps · expo-location | 1.29.11 · ~58.0.20 | Mapas y ubicación | — |
| Reanimated · Gesture Handler · Bottom Sheet · FlashList | 4.7.1 · ~3.3.0 · ^5.2.14 · 2.3.2 | Animaciones, gestos, hojas y listas largas | — |
| Skia | 2.14.0 | Preinstalado en 0.2.1 para los efectos animados de los emblemas del sistema de puntos, que así llegan por OTA; dibuja los emblemas de lacre y el control de puntuación con la botella | — |
| expo-updates · expo-dev-client | ~58.0.19 · ~58.0.17 | Actualizaciones OTA y versión de desarrollo | [`app.config.ts`](../../../../frontend-mobile/app.config.ts) |
| Jest · jest-expo · Testing Library | ~30.5.2 · ~58.0.13 · ^12.9.0 | Pruebas, con cobertura mínima | [`package.json`](../../../../frontend-mobile/package.json) |
| Versiones mínimas del sistema | iOS 16.4 · Android: el mínimo de Expo SDK 58, sin fijar en el repositorio | Dispositivos en los que se instala la app | [`app.config.ts`](../../../../frontend-mobile/app.config.ts) |
| ESLint · Prettier | ^10.13.0 · ^3.9.10 | Análisis estático y formato | [`eslint.config.mjs`](../../../../frontend-mobile/eslint.config.mjs) |

## Servidores y base de datos

Cada entorno corre en un solo servidor. El inventario completo, con límites y ajustes, está en [Hosting y runtime](../../infra/architecture/hosting-and-runtime.md); la operación, en [Despliegue en AWS](../../infra/architecture/aws-deployment.md).

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Amazon Linux 2023 | kernel 6.18 · x86_64 (verificado en la consola de AWS el 29-10-2026) | Sistema operativo de los servidores EC2 `t3a.small` | [`provision-host.sh`](../../../../infra/aws-low-cost/provision-host.sh), [`production-stack.json`](../../../../infra/aws-low-cost/production-stack.json) |
| Docker Engine · Docker Compose | paquete `docker` de Amazon Linux 2023, sin fijar · v2.39.1 | Contenedores de PostgreSQL, backend y Caddy en cada servidor | [`provision-host.sh`](../../../../infra/aws-low-cost/provision-host.sh), [`docker-compose.yml`](../../../../infra/aws-low-cost/docker-compose.yml), [`compose.production.yml`](../../../../infra/aws-low-cost/compose.production.yml) |
| Imágenes base del backend | maven:3.9-eclipse-temurin-25 · eclipse-temurin:25-jre | Compilación y ejecución del backend, fijadas por digest | [`Dockerfile`](../../../../backend/Dockerfile) |
| Caddy | 2.11.6 (Alpine) | HTTPS automático, cabeceras de seguridad, compresión y proxy al backend | [`Caddyfile`](../../../../infra/aws-low-cost/Caddyfile) |
| Opciones de la JVM | `-Xms128m -Xmx512m -XX:+UseSerialGC -XX:MaxMetaspaceSize=192m -XX:+ExitOnOutOfMemoryError` | Memoria del backend dentro de un contenedor de 768 MiB; Hikari de 1 a 6 conexiones y Tomcat con 30 hilos | [`docker-compose.yml`](../../../../infra/aws-low-cost/docker-compose.yml) |
| Ajustes de PostgreSQL | `shared_buffers=96MB` · `work_mem=2MB` · `max_connections=20` | Base en un contenedor de 384 MiB, con las extensiones `unaccent` y `pg_trgm` | [`compose.postgres.yml`](../../../../infra/aws-low-cost/compose.postgres.yml) |
| systemd | — | Copia diaria de la base y monitoreo cada 5 minutos | [`systemd/`](../../../../infra/aws-low-cost/systemd/) |
| pg_dump | PostgreSQL 18 | Copias de la base guardadas en S3 | [`backup-local-db.sh`](../../../../infra/aws-low-cost/backup-local-db.sh) |

## AWS

Servicios de Amazon Web Services en uso, en `us-east-1`.

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| CloudFormation | — | Infraestructura de producción, web, correo, permisos del release y monitoreo | [`production-stack.json`](../../../../infra/aws-low-cost/production-stack.json), [`production-web-stack.json`](../../../../infra/aws-low-cost/production-web-stack.json) |
| EC2 · VPC | t3a.small | Un servidor por entorno, sin balanceador ni NAT | [`production-stack.json`](../../../../infra/aws-low-cost/production-stack.json) |
| EventBridge Scheduler | — | Encender y apagar el servidor de desarrollo | [`ec2-start-schedule-target.json`](../../../../infra/aws-low-cost/ec2-start-schedule-target.json) |
| Lambda · EventBridge | python3.13 | Sonda externa de producción cada 5 minutos | [`build-monitoring-stack.mjs`](../../../../scripts/build-monitoring-stack.mjs) |
| ECR | — | Imágenes del backend, desplegadas por digest | [`deploy-backend-dev.yml`](../../../../.github/workflows/deploy-backend-dev.yml) |
| S3 | — | Web publicada, copias de la base y archivos subidos (opcional) | [`production-stack.json`](../../../../infra/aws-low-cost/production-stack.json) |
| CloudFront · CloudFront Functions | — | Distribución de la web y cabeceras de seguridad | [`configure-web-security-function.mjs`](../../../../scripts/configure-web-security-function.mjs) |
| WAF · ACM | — | Firewall de la web de producción y su certificado | [`production-web-stack.json`](../../../../infra/aws-low-cost/production-web-stack.json) |
| SES | — | Correos transaccionales y de novedades | [`application.yml`](../../../../backend/src/main/resources/application.yml) |
| SNS · SQS | — | Rebotes y quejas de correo, y alertas al equipo | [`email-feedback-stack.json`](../../../../infra/aws-low-cost/email-feedback-stack.json) |
| CloudWatch | — | Métricas y alarmas de producción | [`collector.py`](../../../../infra/aws-low-cost/monitoring/collector.py) |
| IAM · STS | — | Roles del servidor y del release, y límites para el despliegue de desarrollo | [`production-release-stack.json`](../../../../infra/aws-low-cost/iam/production-release-stack.json) |
| Systems Manager | — | Despliegue remoto sin SSH | [`deploy-backend-dev.yml`](../../../../.github/workflows/deploy-backend-dev.yml) |
| Secrets Manager | — | Variables secretas de cada entorno | [`refresh-runtime-env.sh`](../../../../infra/aws-low-cost/refresh-runtime-env.sh) |

## Cloudflare

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| DNS | — | Dominio `vinnot.com` | [aws-deployment.md](../../infra/architecture/aws-deployment.md) |
| Proxy · WAF | — | Proxy, WAF administrado y rate limiting delante de la API | [aws-deployment.md](../../infra/architecture/aws-deployment.md#poner-cloudflare-delante-de-la-api) |
| Registrar | — | Registro y renovación anual de `vinnot.com` | [Hosting y runtime](../../infra/architecture/hosting-and-runtime.md) |
| R2 | — | Imágenes del catálogo y archivos subidos por usuarios | [catalog-images-r2.md](../../infra/operations/catalog-images-r2.md), [user-images-r2.md](../../infra/operations/user-images-r2.md) |
| Workers · Wrangler | — | Servir las imágenes en `images.vinnot.com` | [`worker.mjs`](../../../../infra/cloudflare/catalog-images/worker.mjs) |
| Pages · Access | — | Sitio de documentación privado | [documentation-site.md](../../governance/documentation-site.md) |

## Servicios externos

Las integraciones se configuran en [`application.yml`](../../../../backend/src/main/resources/application.yml). Claves, planes y comportamiento ante fallas de cada una: [Servicios externos](../../infra/architecture/external-services.md).

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Mercado Pago | — | Cobro de entradas, vinculación de la cuenta del organizador y devoluciones | [Pagos](../../modules/payments/README.md) |
| OpenAI | gpt-6-luna (texto) · gpt-4o-mini (visión) · omni-moderation-latest | Perfiles y comparaciones de vinos, lectura de etiquetas y moderación de imágenes, con tope mensual de gasto | [IA](../../modules/ai/README.md) |
| Google Maps Platform | Directions API · Maps SDK | Distancias de las rutas y mapas en la web y la app | [`GoogleMapsDistanceService.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/maps/GoogleMapsDistanceService.java) |
| Expo Push · FCM · APNs | — | Envío de notificaciones push | [`PushConfiguration.java`](../../../../backend/src/main/java/com/vinnot/notification/infrastructure/push/PushConfiguration.java) |
| Google · Apple · Facebook | — | Ingreso con cuentas externas (Facebook apagado en producción) | [Usuarios](../../modules/users/README.md) |
| EAS Build · Update · Submit | CLI >=16 | Compilación de la app, actualizaciones OTA y envío a las tiendas | [`eas.json`](../../../../frontend-mobile/eas.json) |
| App Store Connect · TestFlight · Google Play Console | — | Distribución de la app | [distribution.md](../../frontend-mobile/guides/distribution.md) |

## CI/CD

GitHub Actions, con todas las acciones fijadas por SHA. El detalle está en [CI/CD](../../infra/guides/ci-cd.md).

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Runners | ubuntu-24.04 · macos-26 | Máquinas alojadas por GitHub; macOS sólo para la compilación de iOS | [`ci.yml`](../../../../.github/workflows/ci.yml), [`ios-native-validation.yml`](../../../../.github/workflows/ios-native-validation.yml) |
| Node.js · Java en CI | 22 · Temurin 25 (21 para el escaneo de Android) | Herramientas de cada job | [`security-checks.yml`](../../../../.github/workflows/security-checks.yml) |
| ci.yml | — | Pruebas, cobertura, compilación y validación de cada parte; despliega desarrollo | [`ci.yml`](../../../../.github/workflows/ci.yml) |
| security-checks.yml | — | Escaneo de dependencias, imagen y secretos, y SBOM; también cada semana | [`security-checks.yml`](../../../../.github/workflows/security-checks.yml) |
| deploy-backend-dev.yml · deploy-frontend-dev.yml | — | Despliegue de desarrollo | [`deploy-backend-dev.yml`](../../../../.github/workflows/deploy-backend-dev.yml) |
| production-release.yml | — | Release manual de producción con un rol propio | [`production-release.yml`](../../../../.github/workflows/production-release.yml) |
| ios-native-validation.yml | macos-26 · Xcode 26.6 | Compilación nativa de iOS sin firmar | [`ios-native-validation.yml`](../../../../.github/workflows/ios-native-validation.yml) |
| ci.yml (Repository checks) · create-work-branch.yml | — | Política de nombres de rama y creación de issue con rama | [`github-work-item-policy.mjs`](../../../../scripts/github-work-item-policy.mjs) |
| Dependabot | — | Actualización semanal de las acciones; actualizaciones mensuales agrupadas patch/minor para npm, Maven y Docker ([política](../../infra/guides/dependency-updates.md)) | [`dependabot.yml`](../../../../.github/dependabot.yml) |

## Calidad y seguridad

El detalle está en [Seguridad de dependencias](../../infra/guides/dependency-security.md).

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Trivy | 0.74.0 | Vulnerabilidades en dependencias e imágenes | [`install-security-tools.mjs`](../../../../scripts/install-security-tools.mjs) |
| gitleaks | 8.28.0 | Secretos en el historial | [`.gitleaksignore`](../../../../.gitleaksignore) |
| actionlint | 1.7.12 | Revisión de los workflows | [`install-security-tools.mjs`](../../../../scripts/install-security-tools.mjs) |
| npm audit | — | Bloquea vulnerabilidades altas y críticas | [`audit-npm-dependencies.mjs`](../../../../scripts/audit-npm-dependencies.mjs) |
| CycloneDX | — | Lista de componentes (SBOM) | [`security-checks.yml`](../../../../.github/workflows/security-checks.yml) |
| expo-doctor | 1.18.19 | Revisión de la configuración de Expo | [`ci.yml`](../../../../.github/workflows/ci.yml) |
| Cobertura mínima | — | Web y app 100 % de líneas y funciones; scripts y documentación 100 %; backend 90 % de líneas | [`vitest.config.ts`](../../../../frontend-react/vitest.config.ts) |

## Documentación y diagramas

| Tecnología | Versión | Para qué | Dónde |
|---|---|---|---|
| Docusaurus | 3.10.2 | Este sitio, en español e inglés | [`docusaurus.config.ts`](../../../../docs-site/docusaurus.config.ts) |
| Mermaid | @docusaurus/theme-mermaid 3.10.2 | Diagramas dentro de las páginas | [`docusaurus.config.ts`](../../../../docs-site/docusaurus.config.ts) |
| docusaurus-search-local | 0.55.3 | Búsqueda sin servicio externo | [`docusaurus.config.ts`](../../../../docs-site/docusaurus.config.ts) |
| Lucidchart | — | Diagramas de componentes por caso de uso y diagramas de casos de uso | [Diagramas](../../diagrams/README.md) |
| validate_documentation.py | — | Espejo es/en, enlaces y páginas alcanzables | [`validate_documentation.py`](../../../../scripts/validate_documentation.py) |
