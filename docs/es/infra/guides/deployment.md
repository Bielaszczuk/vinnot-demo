# Despliegue

## Orden de publicación de sesiones web y cabeceras

El backend con `/auth/web/*` debe estar disponible antes del cliente que usa
cookies. `wait-browser-session-contract.mjs` exige 204 vacío ante refresh sin
cookie, Cache-Control: no-store, ausencia de Set-Cookie y CORS credentialed para
el origin exacto. Un backend con el contrato anterior 422, un 404, una caída o
CORS incorrecto bloquean publicación, no activan fallback a tokens locales.

`frontend-react/security-headers.json` es la fuente de cabeceras para Vite
preview y CloudFront. Incluye CSP, anti-framing, nosniff, HSTS, referrer policy,
COOP compatible con popup y permisos de plataforma. Scripts se restringen a
self y proveedores concretos de login/mapas, sin unsafe-inline/unsafe-eval.
Estilos inline se permiten por los componentes/SDK existentes; imágenes HTTPS
permiten medios remotos del catálogo. Agregar una integración exige revisar
sus orígenes explícitos, no ampliar a wildcard de scripts.

El workflow dev usa `configure-web-security-function.mjs`: CloudFront Functions
está incluido en el plan Free, que no admite políticas de respuesta personalizadas.
La función aplica las cabeceras versionadas en viewer-response. En viewer-request,
las rutas SPA sin extensión se resuelven a `/index.html`, preservando query strings
y assets; así el acceso directo a `/login` no depende de un error de S3, en el cual
CloudFront no ejecuta viewer-response. Una política administrada SecurityHeadersPolicy
protege también respuestas de error del origen, sin prometer CSP en esos errores.
Una política existente de CORS se conserva. El adaptador requiere una distribución
S3 dedicada con un solo comportamiento y rechaza funciones viewer ajenas.

El código se prueba mediante TestFunction antes de publicarlo y asociarlo. La función
se precrea una vez con una identidad administrativa; el deployer necesita únicamente
DescribeFunction, GetFunction, UpdateFunction, TestFunction y PublishFunction sobre
su ARN exacto, además de GetDistributionConfig, UpdateDistribution y GetDistribution
sobre la distribución. CreateFunction no admite restricción por ARN y no se concede
al deployer. El script admite bootstrap con una identidad autorizada para creación,
pero no amplía IAM ni cambia planes de facturación. La publicación espera a CloudFront.

`configure-web-security-headers.mjs` conserva el adaptador alternativo para planes
que admiten políticas personalizadas: crea políticas propias de cada distribución,
preserva CORS/custom headers y nunca modifica políticas compartidas ajenas. No es
el camino ejecutado por el workflow dev en el plan Free.

### Beacon automático de Cloudflare

El 2026-10-01 se desactivó Real User Measurements (RUM) en Cloudflare Web
Analytics para el hostname configurado `vinnot.com`. La inyección automática
agregaba `static.cloudflareinsights.com/beacon.min.js` también a development,
pero la CSP de Vinnot no permite ese script y el producto no integra esa medición.
Tras guardar el ajuste y recargar `dev.vinnot.com/login`, no se encontró el beacon.
El ajuste se realiza en el proveedor y afecta su hostname configurado; no requiere
un build ni cambiar DNS, AWS o la CSP. No se borra el sitio ni su historial.

Si reaparece ese aviso, revisar Web Analytics → Manage site → RUM y el HTML público,
además de cualquier integración manual. Conservar la inyección desactivada;
habilitar métricas de navegador requiere revisar antes el alcance de privacidad,
la integración y los orígenes CSP explícitos. Referencia del proveedor:
[Cloudflare Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/).

### Aislamiento de CloudFront por entorno

El script exige `PUBLIC_URL` como origin HTTPS y comprueba que sea el único
alias de la distribución antes de crear o modificar políticas. Un ID de
producción combinado con el dominio de development falla antes de escribir.
Las políticas propias llevan el ID de distribución en el nombre y no se
comparten entre entornos. Una distribución con múltiples aliases requiere
revisar explícitamente este contrato antes de incorporarla al workflow.

La identidad de development tiene escritura sobre la distribución
`E16RJ3WGUX15VP` y la función `vinnot-web-security-e16rj3wgux15vp` de la cuenta
497675597655. Denegaciones explícitas impiden actualizar, eliminar o invalidar
otras distribuciones y actualizar, publicar o eliminar funciones ajenas.
El permiso de política personalizada permanece limitado a
`2119079c-7e73-4d7f-bb79-b615eab4947c`, no asociada en el plan Free.
Un cambio de recurso o de topología requiere revisar sus permisos antes de desplegar.

Producción debe usar una identidad de despliegue distinta, sus propios ARNs,
bucket, secretos y aprobación de publicación; no se deben reutilizar las
credenciales de development. Este aislamiento de CloudFront no constituye
una certificación de aislamiento de todos los servicios de AWS.

La allowlist backend debe contener el origin web exacto. Producción usa
https://vinnot.com y https://api.vinnot.com; desarrollo usa
https://dev.vinnot.com y https://api-dev.vinnot.com. Cookies seguras requieren
HTTPS; el perfil local es la única excepción HTTP. Validar el candidato con
login local/social, renovación, logout y acciones sensibles en cada entorno.


## Backend development

El adaptador `.github/workflows/deploy-backend-dev.yml` es llamado por `ci.yml`
después del gate del mismo commit, para cambios relevantes en `development`.
La republicación manual se solicita desde CI con `deploy_development`; no existe
una entrada independiente que omita validaciones:

1. recibe el resultado aprobado de CI;
2. construye y escanea la imagen AMD64 exacta, conservando reporte/SBOM; la etapa
   de build Maven, cuya capa de dependencias sólo cambia con `pom.xml`, sale del
   caché de Actions si existe, y la etapa runtime se reconstruye siempre;
3. publica tags inmutable y `dev-latest` en ECR;
4. inicia EC2 si está detenido;
5. sincroniza `deploy.sh`, `docker-compose.yml`, `compose.postgres.yml` y
   `refresh-runtime-env.sh` con checksum mediante SSM, y deja `Caddyfile` como
   `/opt/vinnot/Caddyfile.next`;
6. ejecuta `/opt/vinnot/deploy.sh <imagen-dev@digest> <SHA>`;
7. espera health local y público;
8. emite logs acotados ante fallo.

El script remoto refresca `runtime.env` desde Secrets Manager, comprueba el
espacio libre en disco, autentica ECR, hace pull, levanta PostgreSQL/backend/proxy,
valida salud y aplica la retención acotada de imágenes. No se imprime el contenido
de secrets.

Un cambio del `Caddyfile` se publica con el despliegue backend, como lo clasifica
`scripts/ci-impact.mjs`. Después del pull, `deploy.sh` valida `Caddyfile.next` con
`caddy validate` en la imagen fijada del proxy, sin red. Un archivo rechazado se
descarta, el despliegue falla y el `Caddyfile` actual sigue en servicio. Con el
backend sano, un archivo distinto reemplaza `/opt/vinnot/Caddyfile` y se recrea el
contenedor `proxy`, porque su bind mount de un solo archivo conserva el anterior;
un archivo sin cambios no reinicia el proxy.

## Web development

`.github/workflows/deploy-frontend-dev.yml` recibe CI aprobado, instala con lockfile, compila
con la URL de API de development, sincroniza assets a S3 con metadata de cache,
crea una invalidación CloudFront sobre `/*`, espera su finalización y verifica la
URL pública.

No repite lint/tests ya aprobados. Si hay cambios backend en la misma ejecución,
espera su despliegue exitoso. Ambos adaptadores rechazan revisiones anteriores a
la punta de development antes de usar credenciales AWS. La selección de componentes,
el baseline y las condiciones del gate se describen en [CI/CD](ci-cd.md).

## Worker de imágenes

El Worker `images.vinnot.com` (`infra/cloudflare/catalog-images`) no se publica
desde CI. Se despliega a mano con `wrangler.uploads.jsonc`, nunca con
`wrangler.jsonc`, que no declara los buckets de uploads. Comando, pruebas y
claves servidas: [Despliegue del Worker](../operations/catalog-images-r2.md#despliegue-del-worker).

## Mobile

EAS genera binarios con los perfiles de `frontend-mobile/eas.json`:

| Perfil | Uso | Canal EAS Update |
|---|---|---|
| `development` | Cliente de desarrollo, distribución interna | `development` |
| `ios-simulator` | Extiende `development` para simulador iOS | `development` (heredado) |
| `preview` | Distribución interna | `preview` |
| `production` | Tiendas | `production` |

`runtimeVersion` usa la política `appVersion`: una actualización sólo llega a
binarios con la misma versión de app. La distribución por tienda se describe en
[Distribución iOS y Android](../../frontend-mobile/guides/distribution.md).

Los workflows de CI y los merges no invocan EAS Build; el operador ejecuta el build del perfil elegido. Cambios en módulos nativos,
plugins, entitlements o configuración nativa requieren un nuevo binario. Cambios
JS sólo pueden distribuirse sin binario mediante un flujo EAS Update compatible;
la mera compilación de Metro no publica ese cambio.

## Verificación

```bash
# Development
curl --fail https://api-dev.vinnot.com/api/actuator/health
# Producción
curl --fail https://api.vinnot.com/api/actuator/health
curl --fail https://api.vinnot.com/api/version
```

En producción, `/api/actuator/health` debe informar `UP` y `revision` de
`/api/version` debe ser el SHA publicado. Mientras el acceso a la API esté
restringido, ejecutar estas comprobaciones desde la conexión autorizada del operador.

Después del health: login, `GET /wines`, búsqueda parcial, upload/imagen y una
operación autenticada crítica. Un health verde no prueba conectividad con todos
los proveedores.

## Rollback de development

Estas reglas aplican sólo a development. Producción revierte exclusivamente con la
operación `rollback` de Production Release; ver [Rollback productivo](#rollback-productivo).

- Backend: desplegar el tag inmutable anterior, sin retroceder migraciones.
- Web: restaurar artifact/build anterior y reinvalidar CDN.
- DB: forward fix; restauración sólo con backup y ventana controlada.

## Instalación y ejecución del publicador productivo

La plantilla `infra/aws-low-cost/iam/production-release-stack.json` prepara un rol
separado y el documento SSM `Vinnot-ProductionRelease`; no crea runtime, bases ni
redes. Antes de aplicarla, comprobar proveedor OIDC, subject real de GitHub,
permisos y soporte `ENV_VAR` del agente SSM. Su aplicación requiere autorización.
El documento sólo admite deploy/rollback, imagen del repositorio prod por digest,
revisión completa, hash del runtime e inventario de migraciones; no shell arbitrario.
El rol no puede leer secretos/backups, borrar objetos ni modificar IAM.

El parámetro `GitHubSubject` es
`repo:Bielaszczuk@114832447/vinnot@1128603898:ref:refs/heads/main`. Desde que el
repositorio se renombró desde `Bielaszczuk/rewine`, GitHub envía esta forma con los
IDs del dueño y del repositorio en lugar de los nombres. Si no coincide, el release
falla con «Not authorized to perform sts:AssumeRoleWithWebIdentity»; el subject que
GitHub envió aparece en los eventos `AssumeRoleWithWebIdentity` fallidos de
CloudTrail. Si el repositorio se renombra otra vez, actualizar la plantilla y el stack
antes del siguiente release. Los candidatos generados con el nombre anterior siguen
siendo válidos como base y para rollback.

Instalar como operador `deploy-production.sh` junto a los cinco archivos de
runtime listados en `prepare-production-manifest.mjs`, en `/opt/vinnot-prod`;
propietario root, script 0755, configuración/estado privados. Mantener `runtime.env`
y los secretos ya existentes. El hash concatena esos archivos en el orden del
manifiesto; un cambio de runtime impide publicar hasta instalación/reconciliación
explícita (ver [Release productivo con migraciones](#release-productivo-con-migraciones)).
El deploy no refresca secretos ni reinicia PostgreSQL/Caddy.

Antes de la primera publicación, el operador revisa compatibilidad del binario
activo y registra una sola vez la base usando:

```bash
/opt/vinnot-prod/deploy-production.sh adopt "$IMAGE_DIGEST" "$SOURCE_SHA" "$RUNTIME_HASH" "$SCHEMA_BASE64"
```

Los cuatro valores provienen del artefacto/base comprobados; no usar tags ni
inferir el SHA del nombre de una imagen. `adopt` exige coincidencia con el contenedor
real, health e inventario Flyway y no reemplaza servicios. Para el binario histórico
sin revisión visible, el operador certifica la asociación SHA/digest por evidencia.
Una base existente no se sobreescribe con este comando. Reconciliar cambios de
esquema, secretos o runtime bajo ventana explícita, conservando el journal anterior.

Configurar `PROD_GOOGLE_OAUTH_CLIENT_ID` y `PROD_GOOGLE_MAPS_BROWSER_KEY` con valores
productivos. Ejecutar `prepare` desde `main` con SHA y CI run; revisar el candidato.
Para publicar, ejecutar `publish` con el mismo SHA aprobado y el run del candidato.
Para rollback, seleccionar `rollback`, SHA actual de `main` y run del candidato
previo. No invocar migraciones desde este flujo.

Para evitar compilaciones/publicaciones ajenas, indicar también el run del último
candidato publicado en `baseline_candidate_run_id`; el flujo verifica procedencia,
checksums, parentesco y revisiones desplegadas antes de reutilizar el componente
sin cambios. El candidato sigue completo para rollback. Si cambiaron variables o
secretos de compilación fuera de Git, usar `force_rebuild`. Una entrega sólo mobile
no necesita este workflow; comprobar primero el plan local descrito en [CI/CD](ci-cd.md).

El host toma un lock y compara el inventario completo de migraciones del candidato, nombres y
checksums con el historial real. Verifica configuración, imagen actual y label de
la nueva imagen antes de reemplazar sólo backend. Comprueba digest activo y health
con revisión esperada. Un fallo recupera automáticamente la base compatible y
mantiene resultado fallido. Un `pending.json` indica operación interrumpida o
recuperación fallida: inspeccionar SSM/contenedor antes de reintentar, sin eliminar
el journal para forzar una aprobación.

### Journal de release

`/opt/vinnot-prod/release-state/` registra qué está activo y contra qué se validó:

| Archivo | Contenido | Cuándo se escribe |
|---|---|---|
| `current.json` | `{image, revision, schema, config, runtime, legacy}` de la versión activa | `adopt` (con `legacy: true`) y cada deploy/rollback exitoso (con `legacy: false`); el operador actualiza `schema` o `config` sólo en una reconciliación explícita |
| `previous.json` | Copia del `current.json` anterior | Al completar un deploy/rollback exitoso que cambió la imagen |
| `pending.json` | `{image, revision}` del intento en curso | Antes de reemplazar backend; se elimina tras éxito o recuperación exitosa y permanece si la recuperación falla |

- `image`: digest del repositorio productivo; `revision`: SHA completo.
- `schema`: SHA-256 del historial `flyway_schema_history` exitoso de tipo SQL,
  serializado como JSON ordenado por `installed_rank` y normalizado con `jq -ceS`.
- `config`: SHA-256 de `runtime.env`.
- `runtime`: SHA-256 de la concatenación de los seis archivos de
  `prepare-production-manifest.mjs`, en este orden: `deploy-production.sh`,
  `docker-compose.yml`, `compose.postgres.yml`, `compose.production.yml`,
  `compose.production-data.yml` y `Caddyfile`.
- `legacy`: `true` sólo para la base adoptada, cuya revisión no se comprueba en `/api/version`.

`deploy` y `rollback` fallan si `schema`, `config` o `runtime` de `current.json`
difieren de los valores calculados en el host, o si la imagen en ejecución no es
la registrada.

### Rollback productivo

`rollback` exige que `previous.json` coincida exactamente en `image`, `revision`,
`schema`, `config` y `runtime` con el destino solicitado y el estado vivo, y que
tenga `legacy == false`. Por lo tanto, no se puede volver por este flujo a la base
adoptada ni a una versión registrada antes de un cambio de esquema o de
`runtime.env`: eso requiere una reconciliación explícita del operador. Las
migraciones nunca se revierten; un problema de esquema se corrige hacia adelante.

### Release productivo con migraciones

`deploy-production.sh` nunca ejecuta Flyway ni instala archivos. Falla si el
historial real de `flyway_schema_history` difiere del inventario de migraciones del
candidato, si los archivos de runtime instalados difieren del hash de runtime del
candidato y si `schema`, `config` o `runtime` de `current.json` no coinciden con los
hashes vivos. El documento SSM sólo admite `deploy` y `rollback`.

Por eso `prepare` sella en el candidato un plan del servidor
(`host-preparation.json`): las migraciones de Flyway y los archivos de runtime nuevos
o cambiados desde la base publicada (o, sin base, desde la revisión del backend que
corre en producción). Su resumen muestra `REQUIRES MIGRATION: ...` y
`REQUIRES RUNTIME INSTALL: ...`. Cuando el plan pide preparar el servidor, `publish`
deja la imagen en el registro y se detiene antes de cualquier comando SSM o cambio de
web, con estado `host-preparation-required`, hasta que el operador lo lanza de nuevo
con `host_prepared=true`. Los candidatos sin ese requisito, los sellados antes de que
existiera el plan y `rollback` publican como antes.

La preparación del servidor se hace en el servidor con `migrate-production.sh`,
instalado junto a `deploy-production.sh`; el procedimiento del operador es el paso 7
del [Release paso a paso](release-step-by-step.md#7-producción-con-migraciones-de-base-de-datos-o-archivos-del-servidor):

1. **`prepare`** y revisión del plan.
2. **Primer `publish`**, que deja la imagen en el registro y se detiene.
3. **Archivos.** Instalar los archivos de runtime que nombra el plan (y el propio
   script cuando cambió) desde la revisión aprobada.
4. **Ventana de migración**, `migrate-production.sh migrate <imagen@digest> <sha256-de-permisos>`:
   se niega si falta un requisito; después backup con `vinnot-prod-backup.service`
   (la marca del backup tiene que avanzar), login en el registro, `LOGIN` de un solo
   uso para `vinnot_prod_migrator` con una contraseña entregada sólo en
   `migration.env`, el servicio `migrate` con `PROD_BACKEND_IMAGE` en el digest
   publicado en el registro, rebloqueo (`ALTER ROLE vinnot_prod_migrator NOLOGIN PASSWORD NULL`,
   verificado, y `migration.env` retirado, aunque falle), grants sólo desde
   `/opt/vinnot-prod/production-runtime-grants.sql` y reemplazo de sólo `schema` en
   `current.json`, con la misma consulta y normalización que `deploy-production.sh` y
   una copia del journal anterior. `production-roles.sql` declara el rol
   `NOLOGIN PASSWORD NULL`, por lo que volver a ejecutarlo nunca reactiva el login.
5. **Registro de runtime**, `migrate-production.sh record-runtime <hash>`: comprueba
   que los archivos instalados dan el hash del candidato y que esquema y configuración
   siguen coincidiendo, y reemplaza sólo `runtime` en `current.json`.
6. **Segundo `publish`** con el mismo run del candidato y `host_prepared=true`.
7. **Verificación pública:** `https://api.vinnot.com/api/actuator/health` en `UP`
   y `revision` de `https://api.vinnot.com/api/version` igual al SHA publicado.

Las migraciones deben ser aditivas y compatibles con la versión en ejecución. Los
backfills deben escalar linealmente con los datos de producción (unas 195.000
bodegas): una migración mantiene sus locks de tabla hasta confirmar, así que una
sentencia lenta bloquea la versión en ejecución. Se prueban con un catálogo grande y
un statement timeout, como el test del backfill de V41.

Hasta el próximo publish, `previous.json` mantiene la versión más antigua con su hash
de esquema anterior, por lo que el rollback a esa versión queda bloqueado. Al
publicar, `deploy-production.sh` copia el `current.json` reconciliado a
`previous.json`, de modo que el rollback a la versión previa al release sigue
disponible sobre el esquema nuevo; por eso las migraciones deben ser aditivas.

La publicación web archiva el paquete, conserva chunks anteriores y carga el
entrypoint al final, verifica sus bytes en S3 e invalida CloudFront. No es una
transacción distribuida entre API/CDN: si falla web, la API nueva debe seguir siendo
compatible con la web anterior; repetir el mismo candidato completa la publicación.
El release no modifica WAF/security groups ni abre el entorno automáticamente.
Producción está abierta al público: se comprueba también el recorrido público y
el monitor en modo `public`. Los runners verifican API dentro del host; navegador,
cookies, CORS y términos requieren comprobación real, sin abrir el acceso a rangos
de runners.
