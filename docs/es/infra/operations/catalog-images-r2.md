# Imágenes argentinas del catálogo en R2

El tooling `scripts/wine-images` se ejecuta fuera de los procesos de Vinnot.
No incorpora almacenamiento, credenciales ni URLs originales al dominio o UI.
El Worker de `infra/cloudflare/catalog-images` entrega imágenes por HTTPS desde
R2 privado. La aplicación sigue leyendo `wines.image_url` mediante su API actual.

## Alcance e identidad

La selección explícita contiene vinos activos de Argentina (`countries.code='ar'`),
sin `created_by`, con un origen permitido. Tomar snapshots consistentes mediante
una transacción `REPEATABLE READ READ ONLY`, con país, ID, nombre, vintage,
bodega, tipo, `image_url`, `bottle_image_url`, `revision`, `updated_at`, actividad
y autor. No copiar cuentas ni reseñas. Un UUID coincidente no basta: el manifiesto
exige igualdad de nombre, vintage, bodega, tipo y país entre dev y prod.

Las bases son `vinnot` (dev) y `vinnot_prod` (prod). Usar túneles SSM privados,
credenciales locales y lectura únicamente para snapshots. No exponer PostgreSQL
a Internet. Los archivos de credenciales deben tener permisos 0600; conservar
snapshots, estados, CSV y journals fuera de Git en una carpeta 0700.

La primera etapa modifica sólo `image_url`. No modifica `bottle_image_url`, fondos
de bodegas, filtros, conteos, reseñas ni datos de usuarios. Las imágenes productivas
no nulas y los vinos creados por usuarios quedan protegidos. La procedencia sigue
registrada de forma privada; cambiar dominio o metadata no acredita derechos.

## Conversión y entrega

El release descarga únicamente desde `images.vivino.com`, valida HTTPS y destinos
públicos en cada redirección, limita bytes/tiempo y convierte en memoria. Aplica
orientación antes de quitar EXIF; transforma el color a sRGB y conserva alpha.
El WebP final no lleva EXIF, XMP, IPTC, ICC ni comentarios/copyright/licencia.
Máximo 4 millones de píxeles de entrada, lado final de 1024 px sin upscale,
calidad 85 y 128 KiB por objeto. Fallos quedan fuera del CSV aplicable.

El logo vacío `thumbs/default_label_{ancho}x{alto}.jpg` se trata como ausencia
de imagen: no se descarga ni se sube, y el CSV deja `new_url` y `object_key`
vacíos para aplicar SQL NULL con las mismas guardas del manifiesto. Su WebP conocido
(`e43d955c611263ee997e199d43c23a052c20d0ad7bd0f3aec12ece6d9501bacd`)
también se excluye al exportar estados anteriores. Los CSV antiguos que todavía
lo apuntan se rechazan: regenerar el export y verificarlo antes de aplicar.
No convertir ese logo en una fotografía del catálogo al ampliar a otros países.
Retirar sus objetos existentes sólo después de conciliar referencias en ambas
bases y guardar un respaldo privado; nunca reaplicar las URLs retiradas.

Las claves son `wines/ar/{UUID}/{SHA256}.webp`, inmutables y sin sobrescritura.
El dominio es `https://images.vinnot.com`; R2 no tiene acceso público directo.
El Worker sólo permite GET/HEAD/OPTIONS y no expone metadata del objeto ni
credenciales. Cada URL del CSV se comprueba mediante GET de S3 y HTTPS público:
cuerpo idéntico, SHA, tipo WebP, dimensiones y ausencia de metadata incrustada.
El hash en la ruta evita invalidar cachés al cambiar una imagen.
El mismo bucket guarda los diagramas (`docs/diagrams/v1/...svg`) y los videos
de la documentación (`docs/videos/v1/...mp4`); los videos aceptan un rango de
bytes para poder adelantarlos, con una lectura de metadata y una del rango.

## Despliegue del Worker

`infra/cloudflare/catalog-images` contiene el Worker (`worker.mjs`), sus pruebas
(`worker.test.mjs`) y dos configuraciones del mismo Worker `vinnot-catalog-images`
en la ruta `images.vinnot.com`. `wrangler.jsonc` sólo declara `CATALOG_IMAGES`;
`wrangler.uploads.jsonc` declara además `DEV_UPLOADS` (`vinnot-user-uploads-dev`)
y `PROD_UPLOADS` (`vinnot-user-uploads-prod`). Como ambas publican el mismo
nombre, desplegar `wrangler.jsonc` reemplazaría la versión activa sin los
bindings de uploads y avatares y etiquetas responderían 404. La configuración
desplegada es **`wrangler.uploads.jsonc`**.

| Clave | Binding | Respuesta |
|---|---|---|
| `wines/ar/{UUID}/{SHA256}.webp` | `CATALOG_IMAGES` | `image/webp`, inmutable un año |
| `uploads/{development\|production}/avatars/avatar_{UUID}_{UUID}.r2.webp` | `DEV_UPLOADS` / `PROD_UPLOADS` | `image/webp`, `public, max-age=60, must-revalidate` |
| `uploads/{development\|production}/wine-labels/wine_label_{UUID}.r2.webp` | `DEV_UPLOADS` / `PROD_UPLOADS` | igual que el avatar |
| `uploads/{development\|production}/social/<clave>.(jpg\|png)` | `DEV_UPLOADS` / `PROD_UPLOADS` | `image/jpeg` o `image/png`, inmutable un año; `<clave>` en minúsculas, hasta 160 caracteres, con hash del contenido (placas e ilustraciones de redes, #492) |
| `docs/diagrams/v1/{es\|en}/{slug}-{hash12}.svg` | `CATALOG_IMAGES` | `image/svg+xml` con CSP `sandbox`, inmutable |
| `docs/videos/v1/{es\|en}/{slug}-{hash12}.mp4` | `CATALOG_IMAGES` | `video/mp4`, `Accept-Ranges: bytes`, inmutable |

Cualquier otra clave, una query string o un binding ausente responden 404; un
método distinto de GET/HEAD/OPTIONS responde 405. Un GET de video con `Range`
lee primero el tamaño y devuelve 206 con `Content-Range` y sólo los bytes
pedidos; un rango imposible devuelve 416 con `Content-Range: bytes */<tamaño>`.
Las respuestas completas se guardan en la caché del Worker; las parciales no.

El despliegue es manual: CI no publica el Worker. Wrangler está fijado en
`tools/docs-diagrams` y necesita `wrangler login` o `CLOUDFLARE_API_TOKEN` con
permiso sobre Workers de la cuenta. Desde la raíz del repositorio:

```bash
node --test infra/cloudflare/catalog-images/worker.test.mjs
npm --prefix tools/docs-diagrams ci
tools/docs-diagrams/node_modules/.bin/wrangler deploy --config infra/cloudflare/catalog-images/wrangler.uploads.jsonc
```

Las pruebas no tienen dependencias y simulan R2 y la caché. Después de
desplegar, comprobar con `curl -I` que una imagen del catálogo, un avatar
público, una placa social y un diagrama responden 200, que una clave inventada
responde 404 y que `curl -I -H "Range: bytes=0-1"` sobre un video responde 206.

Las placas sociales (#492) necesitan la versión del Worker que acepta
`uploads/{entorno}/social/…`. Hasta volver a desplegarlo a mano con
`wrangler.uploads.jsonc` (nunca `wrangler.jsonc`), esas URLs responden 404 aunque
el backend las haya guardado en R2.

## Límites de gasto

Mantener **Workers Free** y R2 Standard. El ledger SQLite compartido reserva
antes de cada llamada un máximo de 100.000 escrituras, 400.000 lecturas S3 y
8 GB de bytes subidos, incluyendo conservadoramente reintentos. No reiniciar ese
ledger entre piloto, lote y verificación. Se permiten 24 workers, dos intentos,
40 llamadas S3/s y 12 descargas de origen/s por corrida (redirecciones limitadas).
La verificación usa hasta 24 descargas públicas/s. El ledger es global entre
procesos; los límites de ritmo son por corrida.

R2 Standard incluye 10 GB/mes, 1 millón de operaciones clase A y 10 millones
clase B. Workers Free limita la entrega a 100.000 requests/día por cuenta; cada
request hace como máximo una lectura R2, y la caché puede evitarla. Superar la
cuota Free interrumpe la entrega. **La alerta USD 5 no es un corte de facturación**:
R2 factura excedentes y el presupuesto requiere controlar el consumo global de
la cuenta. No activar planes pagos, acceso R2 directo, otros buckets o procesos
sin recalcular el presupuesto. No suma recursos AWS ni usa Actions/EAS.

Fuentes: [precios R2](https://developers.cloudflare.com/r2/pricing/),
[límites Workers](https://developers.cloudflare.com/workers/platform/limits/),
[Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).

## Corrida reproducible

Usar Python 3.14 y un venv. Dentro de `scripts/wine-images`:

```sh
python -m pip install -r requirements.lock
python -m pip install --no-deps -e .
python -m pytest tests -q
```

Para upload/verificación, el JSON privado `release-env.json` contiene `R2_ENDPOINT_URL`, `R2_BUCKET`,
`R2_PUBLIC_BASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`DATABASE_URL_DEV` y `DATABASE_URL_PROD`. No imprimirlos ni pasarlos por argv.
Crear un token temporal limitado a objetos del bucket; nunca usar un token global.
Para aplicar o revertir un CSV ya verificado sólo se necesita la conexión
`DATABASE_URL_DEV` o `DATABASE_URL_PROD` del destino; no se usa acceso R2.

Ejemplo desde una carpeta privada, con snapshots previamente obtenidos:

```sh
wine-image-release prepare --dev-snapshot dev-snapshot.json --prod-snapshot prod-snapshot.json --manifest argentina.manifest.json
wine-image-release upload --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --state pilot.sqlite --budget budget.sqlite --ids pilot-ids.json
wine-image-release verify --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --state pilot.sqlite --budget budget.sqlite --ids pilot-ids.json
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --environment dev --journal pilot.journal.json
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --environment dev --journal pilot.journal.json --write
```

`pilot-ids.json` es un array explícito de UUIDs del manifiesto. Aceptar el piloto
en web y render nativo, verificar fallback y probar rollback antes del lote.
Para el lote completo omitir `--ids`, usar estado/CSV/journal separados y conservar
el mismo manifiesto y budget. Reanudar el mismo comando: los éxitos se omiten;
los intentos agotados no se reinician. Un cambio de manifiesto/política/Pillow
exige un estado nuevo, conservando el ledger global. Conciliar éxitos y fallos.
Guardar una copia durable privada del manifiesto, CSV, verificación y journals.
Para respaldar SQLite mientras corre el proceso, usar su API `backup`, no copiar
sólo el archivo principal mientras existan WAL pendientes. No incluir credenciales
en esos respaldos.
Una interrupción puede completar un PUT aún no registrado; al reanudar se
reconvierte y se verifica el objeto sin sobrescribirlo.

## Aplicación y recuperación

`apply` sin `--write` es dry-run, con transacciones de sólo lectura. La verificación
se vincula al SHA del manifiesto y del CSV completo; un archivo editado no pasa.
La base real se valida por `current_database()`. Cada batch de 250 actualiza
sólo la URL esperada con guardas sobre revisión y valor previo. Incrementa
`revision` y `updated_at`, persiste/fsync el journal antes del commit y preserva
ediciones concurrentes. Refrescar clientes para releer la API; no hay un caché
backend de vinos que invalidar para este cambio.

```sh
wine-image-release rollback --manifest argentina.manifest.json --env-file release-env.json --csv pilot.csv --environment dev --journal pilot.journal.json --write
```

La reversión exige URL y revisión exactas posteriores al apply; restaura el valor
original y avanza nuevamente la revisión/fecha. No revierte ediciones posteriores.
No borra objetos remotos ni respaldos. Si el lote omite pilotos ya coincidentes,
su journal no contiene esas filas: conservar ambos journals y revertir primero
el lote y luego el piloto para recuperar todo el alcance.
Después de rollback, obtener snapshot y
manifiesto nuevos antes de reaplicar: las revisiones ya cambiaron.

`--environment prod` permite un dry-run que protege imágenes no nulas.
La escritura y reversión productivas exigen `--write` y
`--production-manifest` con el SHA-256 exacto del manifiesto autorizado; sin esa
guarda o con otro hash se rechazan antes de leer credenciales o conectar la DB.
El hash no sustituye la aprobación operativa: reconfirmar snapshots, identidad,
conciliación y aceptación del lote concreto antes de escribir. El primer lote
argentino tiene además la condición de aprobación y publicación efectiva de
Apple. Reutilizar el CSV verificado y sus objetos/URLs compartidos con dev, sin
otra carga ni copias por ambiente.

```sh
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv argentina.csv --environment prod --journal argentina-prod.journal.json
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv argentina.csv --environment prod --journal pilot-prod.journal.json --ids pilot-ids.json --write --production-manifest MANIFEST_SHA256
wine-image-release apply --manifest argentina.manifest.json --env-file release-env.json --csv argentina.csv --environment prod --journal argentina-prod.journal.json --write --production-manifest MANIFEST_SHA256
```

Aceptar el piloto productivo antes del lote. Conciliar después todas las URLs,
revisiones y campos preservados contra el snapshot previo. Para revertir, usar
`rollback` con las mismas guardas productivas y un array `--ids` que contenga
únicamente las filas del journal correspondiente: las filas protegidas o no
aplicadas carecen de valor previo en ese journal y se reportan como conflictos.
Conservar ambos journals y revertir primero lote y luego piloto.

Las pruebas `test_release_postgres.py` requieren `CATALOGUE_TEST_DATABASE_URL`
en una DB aislada llamada `vinnot_prod` cuyo `cluster_name` sea
`vinnot-catalog-promotion-test`; crean y eliminan un esquema exclusivo. Cubren
apply/dry-run, idempotencia, fotos protegidas, reversión y ediciones concurrentes.
Nunca ejecutarlas contra development o producción.

[Read in English](../../../en/infra/operations/catalog-images-r2.md)
