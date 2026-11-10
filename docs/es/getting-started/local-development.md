# Desarrollo local

## Requisitos

- Git, Docker y Docker Compose.
- JDK 25 y Maven.
- Node 22 y npm. Es la versión de `frontend-mobile/.nvmrc`, de los workflows de
  CI y la única que acepta `scripts/ci-preflight.mjs`.
- Xcode/Android Studio sólo para clientes nativos.

Verificar Java:

```bash
java -version
mvn -version
```

Los tests de imágenes/portadas requieren `cwebp` en PATH (paquete `webp`: `brew install webp` en macOS o `apt-get install webp` en Debian/Ubuntu). Docker/CI lo instalan en sus imágenes/jobs; no se obtiene de Maven.

## 1. PostgreSQL

```bash
cd infra
cp .env.example .env
docker compose up -d postgres
docker compose ps
```

La base local por defecto es `vinnot` en `localhost:5432`. Flyway crea y migra el
esquema al iniciar backend y carga los datos de referencia
(`V2__seed_reference_data.sql`): países, regiones, roles, permisos y tipos de
uva, vino y evento. No crea usuarios, bodegas ni vinos: sin otra carga, el
catálogo local empieza vacío y las cuentas se crean registrándose.

Para cargar datos de negocio desde un dump SQL, usar desde la raíz:

```bash
DUMP_FILE=/ruta/a/tu-dump.sql scripts/import_vinnot_dump_data.sh
```

El dump no está versionado en el repositorio: el valor por defecto de
`DUMP_FILE` (`docs/dumpvinnot.sql`) no existe, así que hay que indicar uno que
tengas. El script carga el dump en una base temporal y desde ahí reemplaza en la
base objetivo países, regiones, roles, usuarios, roles de usuario, bodegas y
vinos; luego reconstruye los permisos por rol. La base objetivo ya debe tener el
esquema de Flyway. `scripts/import_vinnot_dump_data.sh --help` lista las demás
variables (`DB_HOST`, `DB_NAME`, `DB_USER`, etc.). Nunca ejecutar el dump
directamente contra la base objetivo.

## 2. Backend

```bash
cd backend
mvn clean verify
mvn spring-boot:run
```

El perfil `local` importa opcionalmente `backend/.env.local` como propiedades
Spring (`CLAVE=valor`). No existe una plantilla `.env.example` en `backend/`;
crear ese archivo ignorado sólo si hacen falta overrides de las variables de
`application-local.yml`. Los defaults corresponden a la base local de `infra/`.

Endpoints:

- API: `http://localhost:8080/api`
- Health: `http://localhost:8080/api/actuator/health`
- Swagger: `http://localhost:8080/api/swagger-ui.html`

El perfil local puede usar proveedores mock. Para IA, mapas, social login o correo
reales, copiar sólo los valores necesarios desde el secret store a un archivo
local ignorado; nunca exportarlos a Git ni a una variable pública frontend.

## 3. Web

```bash
cd frontend-react
npm ci
cp .env.example .env.local
npm run dev
```

Validación: `npm run lint && npm run test && npm run build`.

## 4. Mobile

```bash
cd frontend-mobile
npm ci
cp .env.example .env.local
npm run start:device -- --clear
```

Para un dispositivo físico, backend y teléfono deben compartir red y la base URL
debe usar el hostname/IP de la computadora, no `localhost`. Social login, OCR y
otros módulos nativos requieren development build.

## Variables y secretos

- Backend: DB, JWT, OpenAI, Maps, correo, OAuth y storage.
- Web: sólo configuración pública `VITE_*`.
- Mobile: configuración pública `EXPO_PUBLIC_*` (URL de la API, flags de pagos,
  claves públicas de mapas e identificadores públicos de login social) más
  `EXPO_ENV` (`development`, `staging` o `production`), que `app.config.ts` usa
  para elegir el perfil (bundle ID, URL de la API, nombre de la app) y expone ya
  resuelto en `extra.EXPO_ENV`. Las variables sin prefijo, como
  `FACEBOOK_CLIENT_TOKEN`, sólo se usan al compilar. `frontend-mobile/.env.example`
  documenta cada variable.
- `.env`, `.env.local` y `runtime.env` están ignorados.
- Los ejemplos contienen nombres y defaults seguros, no credenciales.

## Orden diario

1. PostgreSQL.
2. Backend y health check.
3. Web o Metro.
4. Prueba de login y una consulta de catálogo.

## Antes de subir cambios

Correr `node scripts/ci-preflight.mjs` desde la raíz con Node 22: ejecuta las
mismas compuertas que CI, incluida la cobertura. Opcionalmente, una vez por clon,
`git config core.hooksPath .githooks` activa `.githooks/pre-push`, que corre el
preflight antes de cada push. Ver [CI/CD](../infra/guides/ci-cd.md).

## Diagnóstico rápido

- Backend sin DB: revisar container, puerto y datasource.
- Mobile intenta HTTPS sobre `8080`: corregir el esquema a `http` local.
- Mobile usa `localhost`: iniciar con `start:device`.
- `401`: revisar sesión, usuario/estado y bearer token.
- Catálogo vacío: confirmar que backend consulta la DB esperada y que no hay
  filtro persistido en UI.
- IA falla: revisar provider, key, timeout y logs correlacionados por request ID.
