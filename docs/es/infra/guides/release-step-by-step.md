# Release paso a paso

Guía para llevar cualquier cambio de la máquina local a producción sin ayuda: backend,
web, documentación o app móvil, por OTA o con build nativo, con o sin migraciones de base
de datos. Cada paso indica el comando exacto o el lugar de cada consola web donde se hace.

El detalle técnico de cada pieza vive en otras guías y esta las enlaza:
[Guía de deployment](deployment.md), [CI/CD](ci-cd.md),
[Distribución móvil](../../frontend-mobile/guides/distribution.md),
[Desarrollo móvil](../../frontend-mobile/guides/development.md) y
[Issues y ramas](../../governance/github-work-items.md).

## Mapa rápido

| Qué cambió | Pasos |
|---|---|
| Solo documentación | 1 a 5, luego 9 y 10 |
| Backend o web, sin migraciones | 1 a 6, luego 9 y 10 |
| Backend con migraciones nuevas o archivos del servidor (lo indica el plan del `prepare`) | 1 a 5, 6.1, 6.2, 7, luego 9 y 10 |
| App móvil, solo JS o imágenes (`src/`, `app/`, `assets/`) | 1 a 5, luego 8.A y 10 |
| App móvil con cambios nativos o versión de Expo | 1 a 5, luego 8.B y 10 |
| Configuración o secretos de producción (`vinnot/prod/backend`) | Con el release que cambie el backend: 1 a 5, 6.1, 7.5, 6.2 y 6.3, luego 9 y 10 |
| Varias cosas a la vez | Todos los pasos que apliquen, en orden |

Una urgencia en producción sigue el mismo camino como `hotfix` (ver
[Hotfix](#hotfix)).

## 0. Preparación (una sola vez)

Herramientas en la máquina local:

- Node 22 (`nvm install 22 && nvm use 22`). El preflight falla con otra versión.
- Docker en marcha: los tests de backend usan Testcontainers.
- GitHub CLI con sesión: `gh auth login`.
- AWS CLI con el perfil `vinnot-prod-provisioner`, solo para preparar el servidor en el paso 7
  (`aws login --profile vinnot-prod-provisioner`).
- Para la app: Xcode (el preflight compila iOS en macOS), Java 17
  (`/Library/Java/JavaVirtualMachines/temurin-17.jdk`) y el SDK de Android
  (`~/Library/Android/sdk`) para el build local de Android.
- Cuenta de Expo con sesión: `npx eas-cli@25.3.0 login`.

Accesos web: GitHub (repositorio `Bielaszczuk/vinnot`), consola de AWS (cuenta
`497675597655`, región `us-east-1`), Cloudflare (proyecto Pages `vinnot-docs`), Expo
(cuenta `vinnot`), App Store Connect (app `6817992780`) y Google Play Console.

El resto de la configuración local está en
[Desarrollo local](../../getting-started/local-development.md).

## 1. Issue y rama

1. En GitHub: **Actions › Create Work Branch › Run workflow**, rama `main`.
2. Completar `work_type` (`feature`, `bugfix`, `task` o `hotfix`), `title` y
   `description`. Para un issue existente, completar solo `issue_number`.
3. El workflow crea el issue y la rama `<tipo>/<número>-<slug>`. `feature`, `bugfix` y
   `task` salen de `development`; `hotfix` sale de `main`.

Desde la terminal:

```bash
gh workflow run create-work-branch.yml --ref main \
  -f work_type=feature -f title="Título" -f description="Objetivo"
git fetch origin
git switch <tipo>/<número>-<slug>
```

## 2. Trabajo local y preflight

1. Hacer los cambios con sus tests y la documentación en `docs/es` y `docs/en`.
2. Commits con Conventional Commits (`feat:`, `fix:`, `docs:`, `build:`, `ci:`).
3. Antes de cada push, desde la raíz del repositorio:

```bash
node scripts/ci-preflight.mjs origin/development
```

El preflight solo corre los checks de lo que cambió. Si hay cambios nativos de la app,
en macOS también compila iOS con configuración de producción. Tiene que terminar con
`Local preflight passed`. Si falla, corregir y volver a correrlo; ver
[Problemas frecuentes](#problemas-frecuentes).

## 3. Pull request a development

```bash
git push -u origin <rama>
gh pr create --base development --title "feat: ..." --body "Refs #<número>"
gh pr checks <número-del-PR> --watch
```

- En PRs a `development` se usa `Refs #N`: `Closes #N` no cierra el issue en esa rama.
- Si cambió algo nativo de la app (dependencias de Expo, `app.config.ts`, plugins),
  agregar la etiqueta `validate:ios-native` al PR. Corre la compilación de iOS en CI:
  `gh pr edit <número-del-PR> --add-label validate:ios-native`.
- En GitHub: **Pull requests › el PR › Checks**. No hay protección de ramas: el control
  es que todos los checks estén verdes antes de mergear.

## 4. Merge y despliegue en development

```bash
gh pr merge <número-del-PR> --merge
gh run list --workflow ci.yml --branch development --limit 1
gh run watch <id-de-la-corrida>
```

El push a `development` corre el CI y, si cambió backend o web, los jobs
`Deploy backend development` y `Deploy web development`.

Verificar:

- API: `curl -s https://api-dev.vinnot.com/api/version` muestra en `revision` el commit
  del merge (solo si cambió el backend) y
  `curl -s https://api-dev.vinnot.com/api/actuator/health` muestra `UP`.
- Web: abrir `https://dev.vinnot.com` y probar el cambio. La web de development no
  publica su revisión; el job `Deploy web development` en verde es la confirmación.

Para volver a desplegar development sin cambios: **Actions › CI › Run workflow**, rama
`development`, activar `deploy_development`.

### Prueba de la app en preview

Si cambió la app, publicar una OTA en el canal `preview` para las instalaciones de prueba:

```bash
cd frontend-mobile
npm run eas:update:preview -- --message "Qué cambió (#N)" --platform all
```

Sin `--platform`, solo publica iOS. La OTA llega a las instalaciones de preview cuya
versión coincide con `version` de `app.config.ts` (ver
[OTA o build nativo](#8-app-móvil)).

## 5. Pull request de release a main

1. Preflight contra `main`, desde la raíz y con `development` actualizado:

```bash
git switch development && git pull
node scripts/ci-preflight.mjs origin/main
```

2. Crear el PR, esperar los checks y mergear con merge commit:

```bash
gh pr create --base main --head development \
  --title "release: resumen del cambio (#N)" --body "Release de #N"
gh pr checks <número-del-PR> --watch
gh pr merge <número-del-PR> --merge
```

3. Esperar el CI de `main` en verde y anotar su ID; se usa en el paso 6:

```bash
git fetch origin
gh run list --workflow ci.yml --branch main --commit "$(git rev-parse origin/main)" --limit 1
gh run watch <id-del-ci-de-main>
```

Si solo cambió la app por OTA, el paso 6 no hace falta.

## 6. Producción: backend y web

El workflow **Production Release** tiene dos fases: `prepare` arma un candidato
inmutable y `publish` lo despliega. No hay aprobaciones en GitHub: el operador decide
al lanzar cada fase.

### 6.1 Prepare

Datos que pide:

| Campo | De dónde sale |
|---|---|
| `operation` | `prepare` |
| `approved_sha` | SHA completo de `main`: `git fetch origin && git rev-parse origin/main` |
| `ci_run_id` | ID del CI de `main` del paso 5 (la URL termina en `/actions/runs/<id>`) |
| `baseline_candidate_run_id` | ID del último `prepare` que se publicó. Permite reutilizar lo que no cambió. Vacío reconstruye todo (tarda más) |
| `force_rebuild` | Solo si cambió el entorno de build o la configuración de despliegue |

Desde GitHub: **Actions › Production Release › Run workflow**, rama `main`, completar
los campos. Desde la terminal:

```bash
gh workflow run production-release.yml --ref main \
  -f operation=prepare -f approved_sha=<sha-de-main> \
  -f ci_run_id=<id-ci-main> -f baseline_candidate_run_id=<último-prepare-publicado>
gh run list --workflow production-release.yml --limit 1
gh run watch <id-del-prepare>
```

El primer paso revisa `baseline_candidate_run_id` antes de construir nada: tiene que ser
un `prepare` exitoso en `main`, su artefacto `production-candidate-<id>` tiene que seguir
existiendo (los artefactos vencen a los 30 días) y su revisión tiene que ser ancestro de
`approved_sha`. Cada caso falla con su propio mensaje; con una base vencida, dejar el
campo vacío y se reconstruye todo.

En la lista de corridas de Production Release, un `prepare` es la corrida con el job
**Prepare production candidate** en verde y **Publish approved production candidate**
omitido. Anotar el ID del `prepare` publicado al cerrar cada release: es la base del
siguiente.

**Leer el plan.** El resumen del `prepare` (página de la corrida, sección
**Production host preparation**) compara el candidato con la base, o con el backend que
corre en producción cuando no hay base:

- `No host preparation required: ...`: seguir con 6.2.
- `REQUIRES MIGRATION: V85__....sql, ...`: migraciones de Flyway nuevas o cambiadas.
  Paso 7.
- `REQUIRES RUNTIME INSTALL: <archivos> (candidate runtime hash <hash>)`: cambiaron
  archivos del servidor (`deploy-production.sh`, archivos compose, `Caddyfile`). Paso 7.

El plan queda sellado dentro del candidato como `host-preparation.json`.

### 6.2 Publish

```bash
gh workflow run production-release.yml --ref main \
  -f operation=publish -f approved_sha=<sha-de-main> -f candidate_run_id=<id-del-prepare>
gh run watch <id-del-publish>
```

`approved_sha` tiene que seguir siendo la punta de `main`. Si entró otro merge a `main`
entre medio, volver a correr el paso 5.3 y el `prepare`.

Cuando el plan pide preparar el servidor, este `publish` sube la imagen al registro y se
detiene sin tocar producción: la corrida termina en verde con el resumen
**Production publish stopped before the host: preparation required**, la imagen con la
que migrar (`...vinnot-backend-prod@sha256:...`) y el estado
`host-preparation-required` en `deployment-result.json`. Seguir el paso 7 y después
publicar de nuevo con el mismo `candidate_run_id` y `-f host_prepared=true`. Sin
preparación del servidor, `host_prepared` no cambia nada.

### 6.3 Verificación

```bash
curl -s https://api.vinnot.com/api/version
curl -s https://api.vinnot.com/api/actuator/health
curl -s https://vinnot.com/ | grep -o 'vinnot-revision" content="[0-9a-f]*'
```

- La web muestra el SHA de `main` publicado.
- La API muestra ese SHA solo si cambió el backend; si no cambió, conserva la revisión
  anterior y eso es correcto.
- Health tiene que responder `UP`.

Si `publish` falla en el servidor con `Schema history differs` o
`Runtime files differ from the approved candidate`, el servidor no estaba preparado para
ese candidato: paso 7.

## 7. Producción con migraciones de base de datos o archivos del servidor

Aplica cuando el plan del `prepare` (6.1) muestra `REQUIRES MIGRATION` o
`REQUIRES RUNTIME INSTALL`. En producción Flyway está apagado en el arranque y
`deploy-production.sh` nunca migra ni instala archivos: las dos cosas se hacen en el
servidor, con `infra/aws-low-cost/migrate-production.sh`, antes de reemplazar el backend.
Las migraciones son siempre aditivas: el backend anterior tiene que seguir funcionando
con el esquema nuevo. Un error se corrige hacia adelante, nunca revirtiendo la migración.

Orden, sin saltear pasos:

1. `prepare` (6.1) y leer el plan.
2. Primer `publish` (6.2) sin `host_prepared`: deja la imagen en el registro y se
   detiene. Anotar la imagen del resumen.
3. Instalar los archivos que nombra el plan, y `migrate-production.sh` si falta o cambió
   (7.2).
4. Si dice `REQUIRES MIGRATION`: ventana de migración (7.3). Incluye el backup.
5. Si dice `REQUIRES RUNTIME INSTALL`: registrar los archivos del servidor (7.4).
6. Segundo `publish` con el mismo `candidate_run_id` y `-f host_prepared=true`.
7. Verificación (6.3).

### 7.1 Cómo correr comandos en el servidor

El servidor de producción es la instancia EC2 `i-06bff053f7584c6c2` y se maneja por
AWS Systems Manager.

Desde la consola de AWS:

1. Región `us-east-1`. Ir a **Systems Manager › Run Command › Run command**.
2. Documento `AWS-RunShellScript`.
3. Pegar los comandos en **Commands**.
4. En **Targets**, elegir **Choose instances manually** y marcar `i-06bff053f7584c6c2`.
5. **Run**. La salida queda en **Command history** › el comando › la instancia ›
   **Output**.

Desde la terminal, con un archivo `script.sh` que tenga los comandos:

```bash
AWS=(aws --profile vinnot-prod-provisioner --region us-east-1)
PARAMS=$(python3 -c 'import json,sys; print(json.dumps({"commands": open(sys.argv[1]).read().splitlines(), "executionTimeout": ["900"]}))' script.sh)
CMD=$("${AWS[@]}" ssm send-command --instance-ids i-06bff053f7584c6c2 \
  --document-name AWS-RunShellScript --parameters "$PARAMS" \
  --query Command.CommandId --output text)
"${AWS[@]}" ssm get-command-invocation --command-id "$CMD" \
  --instance-id i-06bff053f7584c6c2 \
  --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
```

`get-command-invocation` muestra `InProgress` hasta que termina; repetirlo hasta ver
`Success` o `Failed`.

### 7.2 Instalar archivos en el servidor

Los archivos se copian desde la revisión aprobada, nunca desde una copia de trabajo. Este
comando arma un `script.sh` para 7.1 que instala cada archivo en `/opt/vinnot-prod`,
verifica su SHA-256 y guarda la copia anterior como `<archivo>.before-<fecha>`:

```bash
git fetch origin
python3 - <sha-de-main> infra/aws-low-cost/migrate-production.sh infra/aws-low-cost/docker-compose.yml > script.sh <<'PY'
import base64, hashlib, subprocess, sys
sha, paths = sys.argv[1], sys.argv[2:]
print('set -euo pipefail\ncd /opt/vinnot-prod\nSTAMP=$(date -u +%Y%m%dT%H%M%SZ)')
for path in paths:
    data = subprocess.run(['git', 'show', f'{sha}:{path}'], check=True, capture_output=True).stdout
    name, mode = path.rsplit('/', 1)[-1], '0755' if path.endswith('.sh') else '0600'
    print(f"printf '%s' '{base64.b64encode(data).decode()}' | base64 -d > .install-{name}")
    print(f"echo '{hashlib.sha256(data).hexdigest()}  .install-{name}' | sha256sum -c -")
    print(f"if [ -e {name} ]; then cp -p {name} {name}.before-$STAMP; MODE=$(stat -c %a {name}); else MODE={mode}; fi")
    print(f'install -o root -g root -m "$MODE" .install-{name} {name}; rm .install-{name}; echo "installed {name}"')
PY
```

Pasar las rutas que nombra el plan (`infra/aws-low-cost/<archivo>`), más
`infra/aws-low-cost/migrate-production.sh` la primera vez o cuando cambió, e
`infra/postgres/production-runtime-grants.sql` cuando la ventana de migración avisa que
los permisos difieren. Un archivo existente conserva sus permisos; uno nuevo queda con
`0755` (scripts) o `0600`. Si SSM rechaza el comando por tamaño, mandar un archivo por
comando.

### 7.3 Ventana de migración

Imagen: la del resumen del `publish` detenido (6.2). Hash de los permisos, desde la
máquina local:

```bash
git show <sha-de-main>:infra/postgres/production-runtime-grants.sql | shasum -a 256
```

Comando para el servidor (7.1):

```bash
/opt/vinnot-prod/migrate-production.sh migrate \
  497675597655.dkr.ecr.us-east-1.amazonaws.com/vinnot-backend-prod@sha256:<digest> <sha256-de-permisos>
```

Se envía con un `executionTimeout` muy superior al tiempo de backup más migración
(por ejemplo, `3600`). Un timeout de SSM corta el script sin ejecutar su
trap de rebloqueo y dejaría al migrador con login habilitado; si ocurre, se vuelve a
ejecutar el mismo comando, que lo rebloquea antes de terminar.

El script muestra cada paso y se detiene en el primer error:

1. Se niega si falta un comando o un archivo, si otra operación de producción tiene el
   bloqueo, si `/opt/vinnot-prod/production-runtime-grants.sql` no coincide con el hash
   indicado o si `flyway_schema_history` tiene filas fallidas.
2. Backup previo con `vinnot-prod-backup.service`; exige que la marca del backup avance
   y muestra la clave en S3. La restauración está en
   [Backup y recuperación](../operations/backup-and-disaster-recovery.md).
3. Login en el registro (`aws ecr get-login-password | docker login`) y descarga de la
   imagen.
4. Login de un solo uso para `vinnot_prod_migrator`: una contraseña aleatoria que solo
   vive en `migration.env`.
5. Flyway migrate con el servicio `migrate`, mostrando toda su salida. El migrador vuelve
   a quedar bloqueado (`NOLOGIN PASSWORD NULL`) y `migration.env` se borra aunque la
   migración falle, y se verifica el bloqueo.
6. Permisos desde `/opt/vinnot-prod/production-runtime-grants.sql`, nunca desde las
   copias `release-window-*`.
7. Hash del esquema: reemplaza solo `schema` en `release-state/current.json`, con la
   misma consulta y normalización que `deploy-production.sh`, y guarda la copia anterior
   en `release-state/before-schema-hash-<fecha>/`.

Correrlo de nuevo sin nada pendiente es seguro: hace un backup nuevo, Flyway no aplica
nada y el hash queda igual.

#### Migraciones largas: V86

`V86__index_filtered_wine_search.sql` arma los read models de búsqueda con filtros a
partir de todo el catálogo (#531). Hay que planificarla:

- Duración: unos 3 minutos sobre una copia del catálogo con 1,72 millones de vinos,
  con los límites de producción (0,65 CPU, contenedor de 384 MB, `fsync` activo): 18 s
  para el read model, 4 s para las filas de uvas y 2,5 minutos para el índice GIN
  multicolumna. Conviene prever hasta 10 minutos con el disco de producción; el
  `executionTimeout` de 3600 s alcanza.
- Efecto mientras corre: las escrituras de vinos y bodegas esperan hasta el commit
  (vinos nuevos, ediciones, el rating de un vino después de una reseña); las
  búsquedas y el resto de las lecturas siguen funcionando con el backend anterior,
  pero más lentas mientras se construye el índice (una búsqueda por texto y país pasó
  de cerca de 1 s a cerca de 2,7 s con el límite de CPU de producción). Elegir un
  momento de poco tráfico.
- Memoria: unos 50 MB de memoria del backend con su `maintenance_work_mem` de 16 MB.
  Con 64 MB, la construcción del índice fue terminada por falta de memoria en un
  contenedor de 384 MB, así que no hay que subirlo.
- Disco: los dos read models y sus índices ocupan cerca de 1,4 GB más para 1,7 millones
  de vinos, y la construcción además escribe cerca de 1,3 GB de WAL y 0,4 GB de
  archivos temporales (el disco usado creció 2,7 GB justo después). Verificar que
  `df -h /` deje al menos 5 GB libres antes de la ventana.
- Si falla, la transacción se revierte y no queda nada; corregir la causa y correr el
  mismo comando de nuevo. Correr el SQL a mano sobre objetos ya creados es distinto:
  también bloquea las lecturas, así que hay que dejar que lo aplique Flyway.
- Después de la ventana, autovacuum marca el mapa de visibilidad de las tablas nuevas
  en pocos minutos. Hasta entonces, las páginas por uva leen algunas páginas más; no
  hace falta nada más.

### 7.4 Registrar los archivos del servidor

Después de instalar los archivos (7.2) y, si hay migraciones, después de 7.3. Comando
para el servidor, con el hash de la línea `REQUIRES RUNTIME INSTALL`:

```bash
/opt/vinnot-prod/migrate-production.sh record-runtime <hash-runtime-del-candidato>
```

Se niega si los archivos instalados no dan ese hash, o si el esquema o `runtime.env` ya
no coinciden con el journal. Si no, reemplaza solo `runtime` en
`release-state/current.json` y guarda la copia anterior en
`release-state/before-runtime-<fecha>/`.

Después, segundo `publish` (6.2) con `-f host_prepared=true` y verificación (6.3).

### 7.5 Cambiar la configuración de producción

La configuración y los secretos de producción viven en el secreto
`vinnot/prod/backend` de AWS Secrets Manager. En el servidor se copian a
`/opt/vinnot-prod/runtime.env` con `refresh-runtime-env.sh prod`. `deploy-production.sh`
compara el hash de `runtime.env` con el campo `config` de `release-state/current.json` y
se niega a desplegar si difieren (`Baseline compatibility changed; operator
reconciliation required`). Por eso cada cambio de configuración refresca el archivo y
registra el hash nuevo en el mismo paso.

Los valores nuevos llegan al backend recién cuando un `publish` lo reemplaza. Si la imagen
no cambia, el `publish` responde `Release already active` y no recrea el backend. Por eso
el cambio se aplica junto con un release que cambie el backend.

Orden:

1. Cambiar el valor en la consola de AWS (región `us-east-1`): **Secrets Manager ›
   `vinnot/prod/backend` › Retrieve secret value › Edit**. Hay que actualizar todas las
   variables que lee `infra/aws-low-cost/compose.production.yml`; por ejemplo, el tope
   mensual de IA usa `PROD_AI_MONTHLY_LIMIT_USD` y `AI_MONTHLY_LIMIT_USD`.
2. `prepare` (6.1) del release que acompaña el cambio.
3. Refrescar el archivo y registrar su hash con este script, enviado por 7.1:

   ```bash
   set -eu
   cd /opt/vinnot-prod
   exec 9> .release.lock
   flock -n 9 || { echo 'REFUSED: another production operation is running'; exit 1; }
   before=$(sha256sum runtime.env | cut -d' ' -f1)
   jq -e --arg c "$before" '.config == $c' release-state/current.json >/dev/null \
     || { echo 'REFUSED: runtime.env does not match the release journal'; exit 1; }
   copy=release-state/before-config-$(date -u +%Y%m%dT%H%M%SZ)
   mkdir -p "$copy"
   cp -p runtime.env release-state/current.json "$copy/"
   /opt/vinnot-prod/refresh-runtime-env.sh prod
   after=$(sha256sum runtime.env | cut -d' ' -f1)
   echo 'Changed variables:'
   cat "$copy/runtime.env" runtime.env | sort | uniq -u | cut -d= -f1 | sort -u
   cp -p release-state/current.json release-state/.current.json.new
   jq --arg c "$after" '.config = $c' release-state/current.json > release-state/.current.json.new
   mv release-state/.current.json.new release-state/current.json
   echo "Journal updated. Previous copy: /opt/vinnot-prod/$copy"
   ```

   El script toma el mismo bloqueo que los demás scripts de producción y se niega si
   `runtime.env` ya no coincidía con el journal antes de empezar. Muestra solo los nombres
   de las variables que cambiaron, nunca sus valores. Tienen que ser exactamente las que
   se editaron en el paso 1; si aparece otra, alguien cambió el secreto y hay que
   revisarlo antes de publicar.
4. `publish` (6.2) y verificación (6.3).

Para volver atrás antes del `publish`, restaurar el valor anterior en Secrets Manager y
repetir el paso 3. Las copias de `runtime.env` y `current.json` quedan en
`release-state/before-config-<fecha>/`, con los mismos permisos que los originales.

## 8. App móvil

### OTA o build nativo

`runtimeVersion` sigue a `version` de `frontend-mobile/app.config.ts`. Una OTA solo
llega a las instalaciones con esa misma versión.

- **OTA**: cambios solo en `frontend-mobile/src`, `frontend-mobile/app` o
  `frontend-mobile/assets`. Llega en minutos, sin pasar por las tiendas.
- **Build nativo**: dependencias nativas o de Expo en `package.json`, plugins, permisos u
  otros campos nativos de `app.config.ts`, actualizaciones de Expo, o código nativo. Lleva
  versión nueva, builds y revisión de las tiendas.

Para comparar contra la última versión nativa publicada:

```bash
git diff --name-only <commit-del-último-build> origin/main -- frontend-mobile \
  | grep -vE '^frontend-mobile/(src|app|assets)/'
```

Si la lista tiene algo más que tests o docs, hace falta build nativo. El preflight
también avisa cuando detecta cambios nativos.

### 8.A OTA de producción

Desde un checkout de `main` actualizado, con la API de producción ya publicada:

```bash
cd frontend-mobile
REV=$(curl -s https://api.vinnot.com/api/version | python3 -c 'import json,sys; print(json.load(sys.stdin)["revision"])')
npm run eas:update:production -- --message "Qué cambió (#N)" --api-revision "$REV" --dry-run
npm run eas:update:production -- --message "Qué cambió (#N)" --api-revision "$REV"
```

El script se niega a publicar si:

- hay cambios sin commitear en `frontend-mobile`;
- el commit no está en `origin/main`;
- hay cambios en `backend/` entre la revisión de la API y el commit (falta publicar el
  backend: paso 6);
- `--api-revision` no coincide con la que muestra `https://api.vinnot.com/api/version`.

Sin `--platform`, publica Android e iOS. La OTA aparece en expo.dev › proyecto
`vinnot` › **Over-the-air updates**.

**Si la versión ya subió en `main`** (por un build nativo nuevo) y hay que mandar la OTA a
las instalaciones de la versión anterior, publicar desde el último commit con la versión
anterior, en una copia aparte:

```bash
git worktree add ../vinnot-ota <commit-con-la-versión-anterior>
cd ../vinnot-ota/frontend-mobile && npm ci
npm run eas:update:production -- --message "..." --api-revision "$REV" --dry-run
npm run eas:update:production -- --message "..." --api-revision "$REV"
cd ../.. && git worktree remove ../vinnot-ota
```

### 8.B Build nativo y tiendas

**1. Versión nueva** (en la rama del cambio, antes del PR):

- Subir `version` en `frontend-mobile/app.config.ts` (por ejemplo `0.2.2` → `0.2.3`).
- Actualizar la versión esperada en `frontend-mobile/scripts/test/native-runtime-sdk.test.mjs`
  y `frontend-mobile/scripts/test/content-links.test.mjs`, y el párrafo de la versión en
  [Distribución móvil](../../frontend-mobile/guides/distribution.md).
- Si se actualiza Expo (`npx expo install --fix` desde `frontend-mobile`): actualizar las
  versiones de `blockingPackages` en
  `frontend-mobile/scripts/security-backports/manifest.json` y el hash fijado en
  `frontend-mobile/scripts/apply-security-backports.mjs`, y verificar desde
  `frontend-mobile` con `node scripts/apply-security-backports.mjs --verify`. Detalle en
  [Seguridad de dependencias](dependency-security.md).
- Antes del cambio de versión, publicar en OTA (8.A) lo pendiente para la versión
  anterior.

Después, pasos 3 a 6 como cualquier cambio, con la etiqueta `validate:ios-native` en el PR.

**2. Build de iOS** (en la nube de EAS, desde `main` actualizado):

```bash
cd frontend-mobile
npm run preflight:ios:native
npx eas-cli@25.3.0 build --platform ios --profile production --auto-submit
```

- El plan gratuito de Expo permite 15 builds de iOS por mes; ver el uso en expo.dev ›
  **Usage**.
- `--auto-submit` manda el build a App Store Connect cuando termina. El envío espera en
  la cola gratuita de Expo, normalmente entre 30 y 45 minutos, y Apple tarda otros 10 a
  15 minutos en procesarlo. Estado en expo.dev › **Submissions**.

**3. Build de Android** (local, el camino soportado; Android no se construye en la nube de
EAS porque ese build se queda sin memoria desde que se agregó `react-native-skia`, issue #459):

```bash
cd frontend-mobile
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export ANDROID_HOME=~/Library/Android/sdk
npx eas-cli@25.3.0 build --platform android --profile production --local \
  --output ~/Downloads/vinnot-<versión>.aab
```

EAS sube solo el `versionCode`. El build termina con `Build successful` y el `.aab`
queda en `~/Downloads`.

**4. App Store Connect** (app Vinnot):

1. Pestaña **TestFlight**: esperar que el build nuevo figure en **Cargas de compilaciones** como
   finalizado.
2. Pestaña **Distribution**: en el menú izquierdo, **+** al lado de «App para iOS», escribir la
   versión y **Crear**.
3. En **Novedades en esta versión**, escribir el texto en Español (México); cambiar el
   idioma arriba a la derecha a Inglés (EE. UU.) y escribirlo en inglés. **Guardar**.
4. **Compilación › Añadir compilación**: elegir el build y **Aceptar**. **Guardar**.
5. **Añadir a revisión › Enviar a revisión**. Apple tarda hasta 48 horas y avisa por
   correo.

**5. Google Play Console** (app Vinnot):

1. En el menú izquierdo, **Producción** (o **Prueba cerrada › Alpha** para testers) ›
   **Crear una versión nueva**.
2. Arrastrar el `.aab` a **Paquetes de aplicación** y esperar que termine de subir.
3. En **Notas de la versión**, escribir:

```text
<es-419>
Texto en español.
</es-419>
<en-US>
Text in English.
</en-US>
```

4. **Siguiente**. La advertencia del archivo de desofuscación no bloquea. **Guardar**.
5. **Descripción general de la publicación › Enviar cambios a revisión › Enviar cambios
   a revisión**. Con la publicación administrada apagada, la versión sale sola al
   aprobarse.

**6. Versión mínima**: cuando la tienda ya publicó el build, subir la mínima de esa
plataforma en la web, en Administración › «Versiones de la app». Antes de eso bloquea a
todas las personas sin forma de actualizar. Detalle en
[Forzar la actualización](../../frontend-mobile/guides/distribution.md#forzar-la-actualización).

## 9. Sitio de documentación

Cada merge a `main` publica la documentación en Cloudflare Pages:

1. En GitHub, el commit de `main` tiene el check `Cloudflare Pages: vinnot-docs`.
2. En Cloudflare: **Workers & Pages › vinnot-docs › Deployments**. El despliegue del
   commit tiene que figurar como exitoso.
3. Si quedó en cola más de 10 minutos o falló al clonar el repositorio: cancelarlo y
   usar **Retry deployment**.

## 10. Cierre

```bash
gh issue close <número> -c "Publicado: PR #<a development>, PR #<a main>, prepare <id>, publish <id>, OTA <grupo>"
```

Anotar el ID del `prepare` publicado: es `baseline_candidate_run_id` de la próxima
release.

## Hotfix

1. Rama `hotfix/<número>-<slug>` con el workflow (sale de `main`).
2. Preflight contra `main`: `node scripts/ci-preflight.mjs origin/main`.
3. PR a `main` (acá sí sirve `Closes #N`), checks, merge, pasos 6 a 10.
4. Llevar el arreglo a `development`: PR de `main` a `development`.

## Volver atrás

- **Backend o web**: **Production Release** con `operation=rollback`,
  `approved_sha` igual a la punta actual de `main` y `candidate_run_id` igual al
  `prepare` anterior. Solo vuelve a una release con el mismo esquema y la misma
  configuración. Las migraciones no se revierten. Ver
  [Rollback productivo](deployment.md#rollback-productivo).
- **OTA**: volver a publicar un grupo anterior desde `frontend-mobile`:

```bash
npx eas-cli@25.3.0 update:list --branch production
npx eas-cli@25.3.0 update:republish --group <id-del-grupo-anterior>
```

  Para volver a lo que trae el binario instalado: `npx eas-cli@25.3.0 update:roll-back-to-embedded`.
- **Build de tienda**: no se puede retirar un build ya instalado. Se corrige con una OTA
  o un build nuevo, y la versión mínima no se sube hasta tener el arreglo publicado.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| El preflight se queda quieto varios minutos en un test de backend | Testcontainers perdió la conexión con su Postgres. Cortar el preflight (`Ctrl+C`) y volver a correrlo. |
| El preflight falla en `expo-doctor` con versiones esperadas distintas | Expo publicó parches nuevos. Actualizarlos con `npx expo install --fix` implica build nativo (8.B). Si la entrega tiene que salir por OTA, se puede postergar agregando el paquete a `expo.install.exclude` en `frontend-mobile/package.json` y sacarlo en el próximo build nativo. Hoy están excluidos `react-native` (se espera 0.88.1, el proyecto usa 0.88.0) y, desde #489, los parches de SDK 58 `expo` 58.0.22, `expo-build-properties` 58.0.12, `expo-dev-client` 58.0.18, `expo-router` 58.0.29, `expo-updates` 58.0.20 y `react-native-screens` 4.30.1 y, desde #504, `expo-constants` 58.0.15, `expo-linking` 58.0.16, `expo-notifications` 58.1.8, `expo-splash-screen` 58.0.13, `jest-expo` 58.0.14 y `react-native-safe-area-context` 5.11.1 (el proyecto usa el parche o la versión menor anterior de cada uno). |
| `Local preflight requires Node 22` | `nvm use 22` y repetir. |
| La validación de iOS en CI falla compilando `ExpoModulesJSI` | El runner tiene un Xcode más viejo que el que pide Expo. Revisar `DEVELOPER_DIR` y `runs-on` en `.github/workflows/ios-native-validation.yml`. |
| `prepare` falla en su primer paso con `baseline_candidate_run_id ...` | El mensaje dice por qué: no es un `prepare` exitoso en `main`, el artefacto venció o no existe, o no es ancestro de `approved_sha`. Usar el último `prepare` publicado, o dejar el campo vacío para reconstruir todo. |
| `publish` termina en verde con `Production publish stopped before the host` | Es lo esperado: el candidato necesita preparar el servidor. Paso 7, después `publish` con `host_prepared=true`. |
| `publish` falla con `Schema history differs` o `Runtime files differ` | El servidor no estaba preparado para ese candidato (o el candidato se selló antes de que existiera el plan): paso 7. |
| `publish` falla con `Baseline compatibility changed; operator reconciliation required` | El esquema, los archivos del servidor o `runtime.env` cambiaron desde el último release sin registrarse en `release-state/current.json`. Si se refrescó la configuración, paso 7.5; si cambió el esquema o los archivos, paso 7. |
| `migrate-production.sh` se detiene con `REFUSED: ...` | No se migró nada; el mensaje nombra el requisito que falta (archivo, comando, hash de permisos, filas fallidas de Flyway, backup que no avanzó). Corregirlo y repetir el mismo comando. |
| `eas:update:production` rechaza la publicación | Leer el mensaje: commit fuera de `main`, cambios de backend sin publicar o `--api-revision` distinta de la de producción. |
| El envío a App Store Connect sigue «Queued» | Cola gratuita de Expo, normal hasta unos 45 minutos. Estado en expo.dev › **Submissions**. |
| El despliegue de `vinnot-docs` queda en cola o falla al clonar | Cancelar y reintentar en Cloudflare (paso 9). |
| Play avisa que falta el archivo de desofuscación | Es una advertencia; no bloquea la revisión. |
