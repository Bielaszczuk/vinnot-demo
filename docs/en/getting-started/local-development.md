# Local development

## Requirements

- Git, Docker, and Docker Compose.
- JDK 25 and Maven.
- Node 22 and npm. It is the version in `frontend-mobile/.nvmrc`, in the CI
  workflows, and the only one `scripts/ci-preflight.mjs` accepts.
- Xcode/Android Studio only for native clients.

Verify Java:

```bash
java -version
mvn -version
```

Image/cover tests require `cwebp` in PATH (`webp` package: `brew install webp` on macOS or `apt-get install webp` on Debian/Ubuntu). Docker/CI install it in images/jobs; Maven does not supply it.

## 1. PostgreSQL

```bash
cd infra
cp .env.example .env
docker compose up -d postgres
docker compose ps
```

The default local database is `vinnot` on `localhost:5432`. Flyway creates and
migrates the schema when the backend starts and loads the reference data
(`V2__seed_reference_data.sql`): countries, regions, roles, permissions, and
grape, wine and event types. It creates no users, wineries or wines: without
another load the local catalog starts empty and accounts are created by signing
up.

To load business data from an SQL dump, run from the repository root:

```bash
DUMP_FILE=/path/to/your-dump.sql scripts/import_vinnot_dump_data.sh
```

The dump is not versioned in the repository: the default `DUMP_FILE`
(`docs/dumpvinnot.sql`) does not exist, so point it to a dump you have. The
script loads the dump into a temporary database and from there replaces the
target's countries, regions, roles, users, user roles, wineries and wines; then
it rebuilds the role permissions. The target database must already have the
Flyway schema. `scripts/import_vinnot_dump_data.sh --help` lists the other
variables (`DB_HOST`, `DB_NAME`, `DB_USER`, etc.). Never run the dump directly
against the target database.

## 2. Backend

```bash
cd backend
mvn clean verify
mvn spring-boot:run
```

The `local` profile optionally imports `backend/.env.local` as Spring properties
(`KEY=value`). There is no `.env.example` template in `backend/`; create that
ignored file only when overrides of `application-local.yml` variables are needed.
Defaults match the local database from `infra/`.

Endpoints:

- API: `http://localhost:8080/api`
- Health: `http://localhost:8080/api/actuator/health`
- Swagger: `http://localhost:8080/api/swagger-ui.html`

The local profile may use mock providers. For real AI, maps, social login, or
email, copy only required values from the secret store into an ignored local
file; never commit them or expose them through public frontend variables.

## 3. Web

```bash
cd frontend-react
npm ci
cp .env.example .env.local
npm run dev
```

Validate with `npm run lint && npm run test && npm run build`.

## 4. Mobile

```bash
cd frontend-mobile
npm ci
cp .env.example .env.local
npm run start:device -- --clear
```

For a physical device, backend and phone must share a network and the base URL
must use the computer hostname/IP, not `localhost`. Social login, OCR, and other
native modules require a development build.

## Variables and secrets

- Backend: DB, JWT, OpenAI, Maps, email, OAuth, and storage.
- Web: public `VITE_*` configuration only.
- Mobile: public `EXPO_PUBLIC_*` configuration (API URL, payment flags, public
  map keys and public social login identifiers) plus `EXPO_ENV` (`development`,
  `staging` or `production`), which `app.config.ts` uses to pick the profile
  (bundle ID, API URL, app name) and exposes, resolved, as `extra.EXPO_ENV`.
  Unprefixed variables such as `FACEBOOK_CLIENT_TOKEN` are build-time only.
  `frontend-mobile/.env.example` documents each variable.
- `.env`, `.env.local`, and `runtime.env` are ignored.
- Examples contain names and safe defaults, not credentials.

## Daily order

1. PostgreSQL.
2. Backend and health check.
3. Web or Metro.
4. Login test and one catalog query.

## Before pushing

Run `node scripts/ci-preflight.mjs` from the root with Node 22: it runs the same
gates as CI, coverage included. Optionally, once per clone,
`git config core.hooksPath .githooks` enables `.githooks/pre-push`, which runs the
preflight before every push. See [CI/CD](../infra/guides/ci-cd.md).

## Quick diagnostics

- Backend cannot reach DB: inspect container, port, and datasource.
- Mobile attempts HTTPS on `8080`: use local `http` scheme.
- Mobile uses `localhost`: start through `start:device`.
- `401`: inspect session, user/state, and bearer token.
- Empty catalog: confirm the backend database and persistent UI filters.
- AI failure: inspect provider, key, timeout, and request-ID-correlated logs.
