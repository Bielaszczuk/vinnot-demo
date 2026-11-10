# Vinnot

Vinnot is a wine discovery and management platform for enthusiasts, wineries, partners, moderators and administrators. It includes a wine catalog, wineries, reviews, personal cellar, wine routes, events, role-based administration and AI-assisted experiences such as wine profiles and comparisons.

Vinnot is a global product: the interface is in Spanish and English, and the catalog, reviews and AI do not depend on the country. The first stage is Argentina, where event payments are in Argentine pesos through Mercado Pago; later stages add countries and currencies.

This repository contains the backend API, the React web app, the Expo mobile app, the Docusaurus documentation site, public page content, infrastructure manifests, documentation diagram tooling and import, CI and release scripts.

## Repository Layout

```text
.
├── backend/                  # Spring Boot modular monolith, hexagonal modules, logical CQRS
├── frontend-react/           # React 19 web app, Vite, TypeScript, Tailwind
├── frontend-mobile/          # Expo / React Native app
├── infra/                    # Docker Compose, AWS runtime files and environment templates
├── docs/                     # Bilingual canonical documentation and local datasets
├── docs-site/                # Docusaurus site that renders docs/ as a navigable book
├── content/                  # Bilingual public-page content synced by scripts/sync-public-content.mjs
├── .github/                  # CI/deploy workflows, issue and pull request templates
├── scripts/                  # Import, CI, release, deploy-verification and maintenance scripts
├── tools/                    # Documentation diagram tooling (docs-diagrams)
└── README.md                 # This file
```

## Main Capabilities

| Area | Description |
| --- | --- |
| Wine catalog | Search, filter and inspect wines by type, region, country, winery, grapes and rating. |
| Reviews | Publish new reviews and comments immediately; moderation acts afterwards through reports, blocks and removal. Like, report and delete authorized content. |
| Community | Report content, block accounts and review publication/report queues. |
| Personal cellar | Manage a user's saved wines and personal notes/ratings. |
| Wineries | Browse wineries, details, coordinates and winery wines. |
| Wine routes | Explore curated wine routes, stops and regional hierarchy. |
| Events | Discover, create, publish, cancel and register for wine events. |
| Payments | Paid event registration through Mercado Pago: organizer account connection, checkout, reconciliation, refunds, public receipts and attendee tickets. Vinnot keeps a configurable commission on each ticket (3% by default), versioned on every checkout attempt. |
| AI | Generate bilingual wine profiles and comparisons focused on each wine's style and structure, with caching and spending controls. |
| Administration | Manage users, wines (including AI profiles), wineries, events, routes, reviews, wine submissions, announcements and push notifications, minimum app versions, social media posts and dashboard stats, on web and mobile. |
| Social media marketing | Weekly AI planner (wine-day calendar, content pillars and posting slots), copy written in Spanish and English with fact checking, watercolor illustrations and Instagram/TikTok slides per language, and an approval queue on web and mobile with an ES/EN switch. It does not publish to the networks yet. |
| Notifications | Email and push notifications, announcements, per-category preferences and unsubscribe links. |
| Points and emblems | Points for real activity and a wax-seal emblem that changes with them. |
| Sharing, legal and support | Public share links, versioned terms with acceptance and announcements, and support requests. |
| Mobile scanning | Native capture with guide-aligned crop and on-device OCR, exact-match fast path, multimodal fallback, deterministic catalog matching, manual search and moderated unknown-wine submission. |

## Architecture

The backend is a **single-deployment modular monolith** under `com.vinnot`.
Business-capability modules apply **Hexagonal Architecture (Ports and
Adapters)** internally, and the application layer uses **logical CQRS**: command
and query contracts are separated while both use the same PostgreSQL database.
This does not describe microservices, event sourcing, separate read/write
datastores, or a distributed command bus.

```text
controller -> use case port -> command/query handler -> domain -> output port -> adapter -> persistence
```

The web and mobile apps use the same layered dependency direction:

```text
page/screen -> hook -> service -> API client -> HTTP transport
```

Start from the bilingual [documentation index](docs/README.md). Backend,
frontend and infrastructure documents are kept in mirrored `docs/es` and
`docs/en` trees.
The [module list](docs/en/modules/README.md), the
[local development guide](docs/en/getting-started/local-development.md) and the
[important URLs](docs/en/important-urls/README.md) are good next stops.

## Technology Stack

| Layer | Stack |
| --- | --- |
| Backend | Java 25, Spring Boot 4.1, Spring MVC, Spring Security, JPA/Hibernate, Flyway, PostgreSQL, OpenAPI |
| Web | React 19, TypeScript 6, Vite 8, React Router 7, TanStack Query 5, Redux Toolkit, React Redux, Tailwind CSS 4, MSW, Vitest, Playwright |
| Mobile | Expo SDK 58, React Native 0.88, React 19, Expo Router, Redux Toolkit Query, SecureStore, NativeWind, Reanimated, Expo Notifications, Expo Updates (OTA) |
| Infra | Isolated low-cost EC2 development and production runtimes, Docker Compose, ECR, S3 for web/backups and legacy media, CloudFront, WAF, Cloudflare DNS/R2/Worker, GitHub Actions, SSM and CloudWatch/SNS monitoring |

## Prerequisites

| Tool | Version |
| --- | --- |
| Java | 25 |
| Maven | 3.9+ |
| Node.js | 22 |
| npm | 10+ |
| Docker | 24+ |

The repository includes `.java-version` and `.sdkmanrc` so local Java version managers can select JDK 25. Before building the backend, confirm that both `java --version` and `mvn --version` report Java 25.

## Local Development

### 1. Start PostgreSQL

The safest local path is to start only the database from `infra/` and run the backend manually:

```bash
cd infra
cp .env.example .env
docker compose up -d postgres
```

Default local database values:

| Setting | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `vinnot` |
| User | `vinnot` |

Flyway uses a consolidated development baseline:

| Migration | Purpose |
| --- | --- |
| `V1__baseline_schema.sql` | Consolidated legacy schema baseline. |
| `V2__seed_reference_data.sql` | Required catalogs, roles and permissions. |
| `V3`–`V4` | Wine search and filter indexes. |
| `V5`–`V7` | Social identity, account tokens and onboarding state. |
| `V8`–`V9` | Event registration workflow and normalized country data. |
| `V10`–`V11` | User wine submissions and administrative review lifecycle. |
| `V12` | Canonical AI content language keys (`es`, `en`). |
| `V13` | Canonical comparison cache and distributed AI-generation leases. |
| `V14`–`V16` | Catalog identity/search indexes and planner statistics. |
| `V17`–`V18` | Account session versions and durable external effects. |
| `V19`–`V20` | Catalog revision and public support receipts. |
| `V21`–`V22` | Versioned terms acceptance and event publication history. |
| `V23` | AI spending reservations. |
| `V24`–`V26` | Community reports, account blocks, retention indexes and prior review/comment publication approval. |
| `V27` | Durable image-operation budgets, managed event/route covers and R2 avatar inventory. |
| `V28` | Optional private user phone number. |
| `V29`–`V30` | Mercado Pago sandbox organizer accounts and durable checkout attempts. |
| `V31` | Provider-managed payment flag on event registrations. |
| `V32`–`V34` | Payment settlement and refunds, `LIVE_PILOT` environment, credential renewal and attendee registration index. |
| `V35` | Event registration change versions and notification outbox triggers. |
| `V36`–`V37` | Return-to-app channel for payment connection and checkout attempts. |
| `V38`–`V41` | Payment reconciliation wake-up, user language and time zone, event time zone and registration actor, wine submission catalog references. |
| `V42`–`V51` | Notification preferences and marketing consent, email suppressions, event notices and reminders, push devices and delivery, organizer digests and user event areas. |
| `V52`–`V55` | Taste affinities, review publication reason code and moderation and like digest cursors. |
| `V56`–`V65` | Legal terms announcements, suspension reasons, payment reconnect notice, push switches and channels, announcements, staff wine listing index, password-set flag, refund rejections, review and cellar vintage. |
| `V66`–`V71` | Engagement signals and engine, push device retention, app minimum versions, points and wax-seal emblems, cellar rating with one decimal. |
| `V72`–`V77` | Login lockout, security events, configurable commission policy, terms 2026-10-29, unused roles removed and payment history kept on account deletion. |
| `V78`–`V81` | Social media agent, announcement delivery stats, social post media, and Spanish and English social post content. |

V26 introduced publication states; current application code publishes new
reviews and comments as `APPROVED`. Editing a legacy pending or rejected review
returns it to `PENDING`.

The authoritative model is maintained in the
[English data model](docs/en/backend/data/database-model.md) and
[Spanish data model](docs/es/backend/data/database-model.md). Never edit an already-applied
migration to introduce a runtime change; add the next incremental migration.

If you need to restore local business data from a local, untracked `docs/dumpvinnot.sql`, first let the backend apply Flyway on a clean DB and then run `scripts/import_vinnot_dump_data.sh` with a PostgreSQL user that can create/drop the temporary staging database. Do not run the dump directly against `vinnot`; it contains destructive DDL.

### 2. Start the backend

```bash
cd backend
mvn spring-boot:run
```

The Maven Spring Boot plugin activates the `local` profile for local `spring-boot:run`.

Backend URLs:

| Service | URL |
| --- | --- |
| API base | `http://localhost:8080/api` |
| Health | `http://localhost:8080/api/actuator/health` |
| Swagger UI | `http://localhost:8080/api/swagger-ui.html` |
| OpenAPI JSON | `http://localhost:8080/api/api-docs` |

### 3. Start the web app

```bash
cd frontend-react
cp .env.example .env.local
npm ci
npm run dev
```

The Vite dev server runs on `http://localhost:3000` and proxies `/api` to `http://localhost:8080`.

Mock mode is available when the backend is not running:

```bash
cd frontend-react
npm run dev:mock
```

### 4. Start the mobile app

```bash
cd frontend-mobile
cp .env.example .env.local
npm ci
npm start
```

Social sign-in, ML Kit label recognition and platform-configured Google Maps
require a development build; start Metro for it with `npm run start:dev-client`.
See the [mobile setup guide](docs/en/frontend-mobile/guides/development.md).

API URL notes:

| Runtime | `EXPO_PUBLIC_API_BASE_URL` |
| --- | --- |
| iOS simulator | `http://localhost:8080/api` |
| Android emulator | `http://10.0.2.2:8080/api` |
| Physical device | `http://YOUR_LAN_IP:8080/api` |

## Environment Files

| File | Purpose |
| --- | --- |
| `infra/.env.example` | PostgreSQL, backend, JWT, AI and maps values for local infrastructure. |
| `frontend-react/.env.example` | Vite web app environment variables. |
| `frontend-mobile/.env.example` | Expo runtime and build-time variables. |

Never commit real secrets. Use `.env`, `.env.local`, CI variables or a secret manager.
Reusable import, migration and release tools belong in Git; personal reports,
runtime credentials, database exports and generated output do not. See
[repository hygiene](docs/en/governance/repository-hygiene.md).

## Common Commands

### Backend

```bash
cd backend
mvn test
mvn checkstyle:check
mvn test jacoco:report
mvn clean package -DskipTests
```

### Web

```bash
cd frontend-react
npm run dev
npm run dev:mock
npm run build
npm run lint
npm run test
npm run test:coverage
npm run test:e2e
```

### Mobile

```bash
cd frontend-mobile
npm start
npm run ios
npm run android
npm run typecheck
npm run lint
npm test
```

### Infra

```bash
cd infra
docker compose up -d postgres
docker compose logs -f postgres
docker compose down
```

`docker compose down -v` also deletes local database volumes. Use it only when
deliberately resetting local data, then apply Flyway again.

## Documentation

- [Documentation index](docs/README.md)
- [English documentation](docs/en/README.md)
- [Documentación en español](docs/es/README.md)
- [English documentation coverage](docs/en/governance/documentation-backlog.md)
- [Cobertura documental](docs/es/governance/documentation-backlog.md)

## License

Private repository. All rights reserved.
