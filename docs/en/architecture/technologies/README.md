# Technologies

Everything Vinnot uses, what for and where it is configured. Versions are the ones declared
in the repository; a `^` or `~` shows the range the package manager accepts. Services with
no version of their own show “—”.

## Platform

The base versions of each part of the system.

| Technology | Version | What for | Where |
|---|---|---|---|
| Java (OpenJDK) | 25 | Backend language and runtime | [`pom.xml`](../../../../backend/pom.xml), [`.sdkmanrc`](../../../../.sdkmanrc) |
| Spring Boot | 4.1.2 | Backend framework (Spring Framework 7, Spring Security 7, Hibernate 7) | [`pom.xml`](../../../../backend/pom.xml) |
| Maven | 3.9 | Backend build and tests | [`Dockerfile`](../../../../backend/Dockerfile) |
| Node.js | 22 | Tooling for web, app, docs and scripts | [`.nvmrc`](../../../../frontend-mobile/.nvmrc), [`package.json`](../../../../docs-site/package.json) |
| TypeScript | ~6.0.3 (web, docs, app) | Language of the web, the app and the docs site | [`tsconfig.app.json`](../../../../frontend-react/tsconfig.app.json) |
| React | ^19.3.1 (web) · 19.3.0 (app) | Web and app UI | [`package.json`](../../../../frontend-react/package.json) |
| React Native · Expo SDK | 0.88.0 · 58 (~58.0.21) | iOS and Android app (New Architecture only since SDK 55) | [`package.json`](../../../../frontend-mobile/package.json), [`app.config.ts`](../../../../frontend-mobile/app.config.ts) |
| PostgreSQL | 18 (18.6 on the servers) | Database | [`docker-compose.yml`](../../../../infra/docker-compose.yml), [`compose.postgres.yml`](../../../../infra/aws-low-cost/compose.postgres.yml) |
| Python | 3 (Lambda python3.13) | Docs validation, monitoring and the external probe | [`validate_documentation.py`](../../../../scripts/validate_documentation.py), [`external_probe.py`](../../../../infra/aws-low-cost/monitoring/external_probe.py) |

## Backend

Dependencies in [`pom.xml`](../../../../backend/pom.xml). Versions without their own number come from the Spring Boot BOM.

| Technology | Version | What for | Where |
|---|---|---|---|
| Spring Web MVC (Tomcat) | BOM (Tomcat 11.0.27) | REST API and `RestClient` for outbound calls | [`ExpoPushSenderAdapter.java`](../../../../backend/src/main/java/com/vinnot/notification/infrastructure/push/ExpoPushSenderAdapter.java) |
| Spring Data JPA · Hibernate | BOM (Hibernate 7.4.13) | Persistence in output adapters | — |
| Bean Validation (Hibernate Validator) | BOM | Request validation | — |
| Spring Security · OAuth2 JOSE | BOM | Authorization and Google and Apple token verification | [`SocialIdentityVerifierAdapter.java`](../../../../backend/src/main/java/com/vinnot/user/infrastructure/identity/SocialIdentityVerifierAdapter.java) |
| JJWT | 0.13.0 | Own session tokens and reauthentication proofs | [`JwtTokenService.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/JwtTokenService.java) |
| Bucket4j · Caffeine | 8.21.0 · BOM | Per-client request limits | [`RateLimitingFilter.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/security/RateLimitingFilter.java) |
| Spring Boot Actuator · Micrometer | BOM | Health and operational metrics | [`OperationalTelemetry.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/metrics/OperationalTelemetry.java) |
| Flyway | BOM (12.4.0) | Database migrations | [`db/migration`](../../../../backend/src/main/resources/db/migration/) |
| PostgreSQL JDBC | BOM | Database driver | — |
| AWS SDK v2 (S3, SES v2, SQS) | 2.57.3 | Files on R2 or S3, sending email and email bounces | [`R2StorageConfiguration.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/config/R2StorageConfiguration.java) |
| libphonenumber | 9.0.42 | Phone normalization | [`LibPhoneNumberNormalizer.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/phone/LibPhoneNumberNormalizer.java) |
| TwelveMonkeys ImageIO WebP | 3.15.3 | Reading WebP images | [`ImageResourceLimits.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/image/ImageResourceLimits.java) |
| springdoc-openapi | 3.2.0 | API documentation (Swagger UI) | [`application.yml`](../../../../backend/src/main/resources/application.yml) |
| MapStruct · Lombok | 1.6.3 · 1.18.48 | Model mapping and less boilerplate | — |
| Jackson | BOM: 3.1.7 (and 2.21.7 for JJWT and Swagger) | JSON | [`pom.xml`](../../../../backend/pom.xml) |
| JUnit · Mockito · AssertJ | BOM | Unit tests | — |
| Testcontainers | BOM | Integration tests against a real PostgreSQL 18 | — |
| Checkstyle · Maven Enforcer · JaCoCo | 3.6.0 · 3.6.3 · 0.8.15 | Style, Java version and minimum coverage (90% lines, 65% branches) | [`pom.xml`](../../../../backend/pom.xml), [`checkstyle.xml`](../../../../backend/checkstyle.xml) |

## Web

Dependencies in [`package.json`](../../../../frontend-react/package.json).

| Technology | Version | What for | Where |
|---|---|---|---|
| Vite | ^8.3.5 | Dev server and build | [`vite.config.ts`](../../../../frontend-react/vite.config.ts) |
| React Router | ^7.18.4 | Routing | [`App.tsx`](../../../../frontend-react/src/app/App.tsx) |
| TanStack Query | ^5.104.5 | Server state and cache | — |
| Redux Toolkit · React Redux | ^2.13.0 · ^9.3.0 | Session state | [`auth.slice.ts`](../../../../frontend-react/src/presentation/stores/auth.slice.ts) |
| Axios | ^1.20.0 | HTTP transport | [`http.ts`](../../../../frontend-react/src/infrastructure/http/http.ts) |
| React Hook Form · Zod | ^7.91.0 · ^4.6.7 | Forms and validation | — |
| i18next · react-i18next | ^26.5.10 · ^17.1.8 | Spanish and English | [`I18nProvider.tsx`](../../../../frontend-react/src/app/providers/I18nProvider.tsx) |
| Tailwind CSS · PostCSS | ^4.3.3 · ^8.5.28 | Styling | [`postcss.config.js`](../../../../frontend-react/postcss.config.js) |
| @react-oauth/google | ^0.13.5 | Google sign-in | — |
| Google Maps JavaScript API | @types/google.maps ^3.66.7 | Maps | [`MapView.tsx`](../../../../frontend-react/src/presentation/components/ui/MapView.tsx) |
| Radix Popover · React Day Picker · date-fns | ^1.3.1 · ^10.0.2 · ^4.4.0 | Date and time picker | — |
| Lucide | ^1.61.0 | Icons | — |
| Vitest · Testing Library · jsdom | 5.0.5 · ^16.3.3 · ^30.1.3 | Unit and component tests, with minimum coverage | [`vitest.config.ts`](../../../../frontend-react/vitest.config.ts) |
| MSW | ^2.15.0 | Mocked API for development and tests | — |
| Playwright | ^1.64.1 | End-to-end tests on Chromium, Firefox, WebKit and mobile | [`playwright.config.ts`](../../../../frontend-react/playwright.config.ts) |
| ESLint · typescript-eslint | ^10.13.0 · ^8.72.0 | Static analysis | [`eslint.config.js`](../../../../frontend-react/eslint.config.js) |

## Mobile app

Dependencies in [`package.json`](../../../../frontend-mobile/package.json).

| Technology | Version | What for | Where |
|---|---|---|---|
| Expo Router | ~58.0.28 | Routing and screens | [`app/`](../../../../frontend-mobile/app/) |
| Redux Toolkit (RTK Query) | ^2.13.0 | Server and session state | — |
| Axios | ^1.20.0 | HTTP transport | — |
| React Hook Form · Zod | ^7.91.0 · ^4.6.7 | Forms and validation | — |
| i18next · expo-localization | ^26.5.10 · ~58.0.5 | Spanish and English from the device | [`index.ts`](../../../../frontend-mobile/src/shared/i18n/index.ts) |
| NativeWind · Tailwind CSS | ^4.2.7 · 3.4.19 | Styling | [`metro.config.js`](../../../../frontend-mobile/metro.config.js) |
| ML Kit Text Recognition | ^5.0.1 | On-device label reading | [`wineLabelTextRecognizer.ts`](../../../../frontend-mobile/src/infrastructure/device/camera/wineLabelTextRecognizer.ts) |
| expo-camera · expo-image-picker · expo-image-manipulator | ~58.0.14 · ~58.0.10 · ~58.0.16 | Camera, gallery and photo preparation | — |
| Google Sign-In · Apple Authentication · Facebook SDK | ^16.1.5 · ~58.0.2 · ^13.4.3 | Google, Apple and Facebook sign-in | [`socialIdentity.gateway.ts`](../../../../frontend-mobile/src/infrastructure/identity/socialIdentity.gateway.ts) |
| expo-secure-store · AsyncStorage | ~58.0.2 · 2.2.0 | Encrypted session and preferences | — |
| expo-notifications | ~58.1.7 | Push notifications | — |
| react-native-maps · expo-location | 1.29.11 · ~58.0.20 | Maps and location | — |
| Reanimated · Gesture Handler · Bottom Sheet · FlashList | 4.7.1 · ~3.3.0 · ^5.2.14 · 2.3.2 | Animations, gestures, sheets and long lists | — |
| Skia | 2.14.0 | Pre-installed in 0.2.1 for the animated effects of the points-system emblems, so they ship by OTA; draws the wax-seal emblems and the bottle rating control | — |
| expo-updates · expo-dev-client | ~58.0.19 · ~58.0.17 | OTA updates and development build | [`app.config.ts`](../../../../frontend-mobile/app.config.ts) |
| Jest · jest-expo · Testing Library | ~30.5.2 · ~58.0.13 · ^12.9.0 | Tests, with minimum coverage | [`package.json`](../../../../frontend-mobile/package.json) |
| Minimum OS versions | iOS 16.4 · Android: the Expo SDK 58 minimum, not pinned in the repository | Devices the app installs on | [`app.config.ts`](../../../../frontend-mobile/app.config.ts) |
| ESLint · Prettier | ^10.13.0 · ^3.9.10 | Static analysis and formatting | [`eslint.config.mjs`](../../../../frontend-mobile/eslint.config.mjs) |

## Servers and database

Each environment runs on a single server. The full inventory, with limits and settings, is in [Hosting and runtime](../../infra/architecture/hosting-and-runtime.md); operations are in [AWS deployment](../../infra/architecture/aws-deployment.md).

| Technology | Version | What for | Where |
|---|---|---|---|
| Amazon Linux 2023 | kernel 6.18 · x86_64 (verified in the AWS console on 2026-10-29) | Operating system of the `t3a.small` EC2 hosts | [`provision-host.sh`](../../../../infra/aws-low-cost/provision-host.sh), [`production-stack.json`](../../../../infra/aws-low-cost/production-stack.json) |
| Docker Engine · Docker Compose | Amazon Linux 2023 `docker` package, not pinned · v2.39.1 | PostgreSQL, backend and Caddy containers on each server | [`provision-host.sh`](../../../../infra/aws-low-cost/provision-host.sh), [`docker-compose.yml`](../../../../infra/aws-low-cost/docker-compose.yml), [`compose.production.yml`](../../../../infra/aws-low-cost/compose.production.yml) |
| Backend base images | maven:3.9-eclipse-temurin-25 · eclipse-temurin:25-jre | Backend build and runtime, pinned by digest | [`Dockerfile`](../../../../backend/Dockerfile) |
| Caddy | 2.11.6 (Alpine) | Automatic HTTPS, security headers, compression and proxy to the backend | [`Caddyfile`](../../../../infra/aws-low-cost/Caddyfile) |
| JVM options | `-Xms128m -Xmx512m -XX:+UseSerialGC -XX:MaxMetaspaceSize=192m -XX:+ExitOnOutOfMemoryError` | Backend memory inside a 768 MiB container; Hikari from 1 to 6 connections and Tomcat with 30 threads | [`docker-compose.yml`](../../../../infra/aws-low-cost/docker-compose.yml) |
| PostgreSQL settings | `shared_buffers=96MB` · `work_mem=2MB` · `max_connections=20` | Database in a 384 MiB container, with the `unaccent` and `pg_trgm` extensions | [`compose.postgres.yml`](../../../../infra/aws-low-cost/compose.postgres.yml) |
| systemd | — | Daily database backup and monitoring every 5 minutes | [`systemd/`](../../../../infra/aws-low-cost/systemd/) |
| pg_dump | PostgreSQL 18 | Database backups stored in S3 | [`backup-local-db.sh`](../../../../infra/aws-low-cost/backup-local-db.sh) |

## AWS

Amazon Web Services in use, in `us-east-1`.

| Technology | Version | What for | Where |
|---|---|---|---|
| CloudFormation | — | Production, web, email, release permissions and monitoring infrastructure | [`production-stack.json`](../../../../infra/aws-low-cost/production-stack.json), [`production-web-stack.json`](../../../../infra/aws-low-cost/production-web-stack.json) |
| EC2 · VPC | t3a.small | One server per environment, with no load balancer or NAT | [`production-stack.json`](../../../../infra/aws-low-cost/production-stack.json) |
| EventBridge Scheduler | — | Start and stop the development server | [`ec2-start-schedule-target.json`](../../../../infra/aws-low-cost/ec2-start-schedule-target.json) |
| Lambda · EventBridge | python3.13 | Production external probe every 5 minutes | [`build-monitoring-stack.mjs`](../../../../scripts/build-monitoring-stack.mjs) |
| ECR | — | Backend images, deployed by digest | [`deploy-backend-dev.yml`](../../../../.github/workflows/deploy-backend-dev.yml) |
| S3 | — | Published web, database backups and uploaded files (optional) | [`production-stack.json`](../../../../infra/aws-low-cost/production-stack.json) |
| CloudFront · CloudFront Functions | — | Web delivery and security headers | [`configure-web-security-function.mjs`](../../../../scripts/configure-web-security-function.mjs) |
| WAF · ACM | — | Production web firewall and its certificate | [`production-web-stack.json`](../../../../infra/aws-low-cost/production-web-stack.json) |
| SES | — | Transactional and news email | [`application.yml`](../../../../backend/src/main/resources/application.yml) |
| SNS · SQS | — | Email bounces and complaints, and team alerts | [`email-feedback-stack.json`](../../../../infra/aws-low-cost/email-feedback-stack.json) |
| CloudWatch | — | Production metrics and alarms | [`collector.py`](../../../../infra/aws-low-cost/monitoring/collector.py) |
| IAM · STS | — | Server and release roles, and limits for development deploys | [`production-release-stack.json`](../../../../infra/aws-low-cost/iam/production-release-stack.json) |
| Systems Manager | — | Remote deploy without SSH | [`deploy-backend-dev.yml`](../../../../.github/workflows/deploy-backend-dev.yml) |
| Secrets Manager | — | Secret variables of each environment | [`refresh-runtime-env.sh`](../../../../infra/aws-low-cost/refresh-runtime-env.sh) |

## Cloudflare

| Technology | Version | What for | Where |
|---|---|---|---|
| DNS | — | The `vinnot.com` domain | [aws-deployment.md](../../infra/architecture/aws-deployment.md) |
| Proxy · WAF | — | Proxy, managed WAF and rate limiting in front of the API | [aws-deployment.md](../../infra/architecture/aws-deployment.md#put-cloudflare-in-front-of-the-api) |
| Registrar | — | Registration and yearly renewal of `vinnot.com` | [Hosting and runtime](../../infra/architecture/hosting-and-runtime.md) |
| R2 | — | Catalog images and user uploads | [catalog-images-r2.md](../../infra/operations/catalog-images-r2.md), [user-images-r2.md](../../infra/operations/user-images-r2.md) |
| Workers · Wrangler | — | Serve images at `images.vinnot.com` | [`worker.mjs`](../../../../infra/cloudflare/catalog-images/worker.mjs) |
| Pages · Access | — | Private documentation site | [documentation-site.md](../../governance/documentation-site.md) |

## External services

Integrations are configured in [`application.yml`](../../../../backend/src/main/resources/application.yml). Keys, plans and failure behaviour for each one: [External services](../../infra/architecture/external-services.md).

| Technology | Version | What for | Where |
|---|---|---|---|
| Mercado Pago | — | Ticket payments, organizer account linking and refunds | [Payments](../../modules/payments/README.md) |
| OpenAI | gpt-6-luna (text) · gpt-4o-mini (vision) · omni-moderation-latest | Wine profiles and comparisons, label reading and image moderation, with a monthly spending cap | [AI](../../modules/ai/README.md) |
| Google Maps Platform | Directions API · Maps SDK | Route distances and maps on the web and app | [`GoogleMapsDistanceService.java`](../../../../backend/src/main/java/com/vinnot/shared/infrastructure/maps/GoogleMapsDistanceService.java) |
| Expo Push · FCM · APNs | — | Sending push notifications | [`PushConfiguration.java`](../../../../backend/src/main/java/com/vinnot/notification/infrastructure/push/PushConfiguration.java) |
| Google · Apple · Facebook | — | Sign-in with external accounts (Facebook off in production) | [Users](../../modules/users/README.md) |
| EAS Build · Update · Submit | CLI >=16 | App builds, OTA updates and store submission | [`eas.json`](../../../../frontend-mobile/eas.json) |
| App Store Connect · TestFlight · Google Play Console | — | App distribution | [distribution.md](../../frontend-mobile/guides/distribution.md) |

## CI/CD

GitHub Actions, with every action pinned by SHA. Details are in [CI/CD](../../infra/guides/ci-cd.md).

| Technology | Version | What for | Where |
|---|---|---|---|
| Runners | ubuntu-24.04 · macos-26 | GitHub-hosted machines; macOS only for the iOS build | [`ci.yml`](../../../../.github/workflows/ci.yml), [`ios-native-validation.yml`](../../../../.github/workflows/ios-native-validation.yml) |
| Node.js · Java in CI | 22 · Temurin 25 (21 for the Android scan) | Tooling for each job | [`security-checks.yml`](../../../../.github/workflows/security-checks.yml) |
| ci.yml | — | Tests, coverage, build and validation of each part; deploys development | [`ci.yml`](../../../../.github/workflows/ci.yml) |
| security-checks.yml | — | Dependency, image and secret scanning, and SBOM; also weekly | [`security-checks.yml`](../../../../.github/workflows/security-checks.yml) |
| deploy-backend-dev.yml · deploy-frontend-dev.yml | — | Development deploy | [`deploy-backend-dev.yml`](../../../../.github/workflows/deploy-backend-dev.yml) |
| production-release.yml | — | Manual production release with its own role | [`production-release.yml`](../../../../.github/workflows/production-release.yml) |
| ios-native-validation.yml | macos-26 · Xcode 26.6 | Unsigned native iOS build | [`ios-native-validation.yml`](../../../../.github/workflows/ios-native-validation.yml) |
| ci.yml (Repository checks) · create-work-branch.yml | — | Branch naming policy and issue-with-branch creation | [`github-work-item-policy.mjs`](../../../../scripts/github-work-item-policy.mjs) |
| Dependabot | — | Weekly Action updates; monthly grouped patch/minor updates for npm, Maven and Docker ([policy](../../infra/guides/dependency-updates.md)) | [`dependabot.yml`](../../../../.github/dependabot.yml) |

## Quality and security

Details are in [Dependency security](../../infra/guides/dependency-security.md).

| Technology | Version | What for | Where |
|---|---|---|---|
| Trivy | 0.74.0 | Vulnerabilities in dependencies and images | [`install-security-tools.mjs`](../../../../scripts/install-security-tools.mjs) |
| gitleaks | 8.28.0 | Secrets in history | [`.gitleaksignore`](../../../../.gitleaksignore) |
| actionlint | 1.7.12 | Workflow checks | [`install-security-tools.mjs`](../../../../scripts/install-security-tools.mjs) |
| npm audit | — | Blocks high and critical vulnerabilities | [`audit-npm-dependencies.mjs`](../../../../scripts/audit-npm-dependencies.mjs) |
| CycloneDX | — | Component list (SBOM) | [`security-checks.yml`](../../../../.github/workflows/security-checks.yml) |
| expo-doctor | 1.18.19 | Expo configuration check | [`ci.yml`](../../../../.github/workflows/ci.yml) |
| Minimum coverage | — | Web and app 100% lines and functions; scripts and docs 100%; backend 90% lines | [`vitest.config.ts`](../../../../frontend-react/vitest.config.ts) |

## Documentation and diagrams

| Technology | Version | What for | Where |
|---|---|---|---|
| Docusaurus | 3.10.2 | This site, in Spanish and English | [`docusaurus.config.ts`](../../../../docs-site/docusaurus.config.ts) |
| Mermaid | @docusaurus/theme-mermaid 3.10.2 | Diagrams inside the pages | [`docusaurus.config.ts`](../../../../docs-site/docusaurus.config.ts) |
| docusaurus-search-local | 0.55.3 | Search without an external service | [`docusaurus.config.ts`](../../../../docs-site/docusaurus.config.ts) |
| Lucidchart | — | Component diagrams per use case and use case diagrams | [Diagrams](../../diagrams/README.md) |
| validate_documentation.py | — | es/en mirror, links and reachable pages | [`validate_documentation.py`](../../../../scripts/validate_documentation.py) |
