# Activar enlaces públicos de Vinnot

## Contrato y estado de entrega

La implementación genera vistas previas y navegación; la activación requiere publicar backend/web, configurar el CDN y entregar nuevos builds firmados. No marcar Universal Links/App Links como verificados por una OTA o por pruebas de router. El [caso de uso](../../modules/sharing/architecture.md#backend) describe la superficie anónima mínima.

`frontend-mobile/app.config.ts` declara `applinks:vinnot.com` en producción y `applinks:dev.vinnot.com` en development. AASA y Android incluyen también las rutas exactas `/share` y `/share/` del QR de descarga. Android declara VIEW/DEFAULT/BROWSABLE, HTTPS y autoVerify para esas dos rutas y los prefijos `/share/wines/`, `/share/events/` y `/share/wine-routes/`. Login, callbacks OAuth y documentos legales no se capturan. Versión/runtime 0.1.1 separa estos builds de 0.1.0; no entregar este cambio como OTA al runtime anterior.

Vite genera `/.well-known/apple-app-site-association` y `/.well-known/assetlinks.json` por entorno desde `frontend-react/config/link-associations.mjs`. El prefijo Apple `569A638J8F` se verificó en el binario App Store 0.1.0 (5). Las dos huellas SHA-256 productivas provienen de las claves actual y clásica de firma de Play, no de la clave de carga. Son identidades públicas, no credenciales. Development no anuncia certificados Android desconocidos: `VITE_DEV_ANDROID_SHA256` acepta huellas verificadas del APK dev, separadas por coma; sin ese dato emite `[]` y permanece disponible el botón de apertura por esquema. No reutilizar certificados de producción para un paquete dev.

`publish-web-release.mjs` entrega ambos archivos como `application/json`, sin redirección y con TTL de cinco minutos. La función SPA conserva `/.well-known/` y `/share-assets/`. En los previews, el backend sólo admite imágenes del CDN propio o del origen API configurado mediante `APP_SHARING_API_ORIGIN`; compose declara la URL correcta en ambos ambientes.

## Página orientada a la descarga y QR general

La página presenta primero «Llevá Vinnot con vos», el botón «Descargar Vinnot» y las tiendas. El contenido compartido se conserva debajo cuando existe; la marca genérica no repite un banner dentro de otro recuadro. «Ya tengo la app · Abrir en Vinnot» es secundario y «Continuar en la web» es la última opción, en gris. Las traducciones ES/EN se renderizan en el servidor. Como la CDN no reenvía headers del visitante, `share-assets/landing-language.js` lleva a `?lang=en` a un dispositivo cuyo idioma empieza con `en` (la misma regla que la app mobile). Una elección explícita con `?lang=` o `/en`, incluido el selector de idioma, siempre gana.

Los módulos pequeños `/share-assets/download-platform.js` y `landing-downloads.js` separan la detección del dispositivo, la elección de tienda y la adaptación del DOM. iPhone/iPad —incluido iPad con agente de escritorio— usan App Store; Android usa Google Play cuando está disponible. Los badges habilitados respetan la misma elección. Mientras `APP_SHARING_ANDROID_AVAILABLE=false`, un visitante Android recibe el aviso de próxima publicación y ninguna acción de descarga lo envía a App Store. En computadora o sin JavaScript permanecen los enlaces explícitos a las tiendas. La CSP permite exclusivamente scripts del mismo origen; no hay sondeos de instalación, tracking, redirecciones automáticas por esquema ni nuevas consultas a la API.

`safeNativeIntent` lleva el QR `/share` al inicio de la app y conserva los destinos específicos del contenido. La apertura directa la decide el sistema mediante Universal Links/App Links, no la página. Antes de ampliar AASA, entregar la normalización de `/share` al runtime 0.1.1 de iOS y probarlo; el dominio asociado ya existe en ese binario. El filtro Android forma parte del manifiesto y **requiere un nuevo build firmado**: una OTA no puede ampliarlo. Publicar el backend, los assets y los JSON de asociación del mismo candidato; invalidar `/.well-known/*` al actualizar AASA. Apple puede conservar la asociación en su CDN/dispositivo y la preferencia del usuario por el navegador sigue aplicándose. No acreditar la apertura de una app de tienda sólo con pruebas de router o simulador.

## CDN sin servicios nuevos

`configure-public-sharing.mjs` agrega un origen HTTPS al API existente con `OriginPath=/api`, más los comportamientos `/share` y `/share/*`. Utiliza CachingDisabled administrada, sin política de solicitudes al origen: no reenvía headers del visitante, cookies ni query strings. La función viewer-request existente transforma sólo `?lang=en` en un sufijo interno `/en`; la URL pública no cambia. El backend renderiza esa ruta de idioma explícita. No aplica la reescritura SPA a esos comportamientos. La configuración por defecto no cambia; el adaptador rechaza comportamientos ajenos, un dominio de otro ambiente y cambios concurrentes.

El script muestra un plan en modo lectura por defecto. `--apply` reutiliza la función viewer-request propia y modifica sólo la distribución seleccionada. Primero se publica la función de seguridad actualizada. Las políticas personalizadas de solicitudes al origen requieren el plan Business y no se utilizan; ver [funciones de los planes AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html). Se ejecuta con identidad operadora, después de revisar el plan; no agrega permisos a los roles de publicación. Mantener el plan Free y los límites operativos existentes. No introduce Lambda, CDN nuevo, almacenamiento o proveedor de enlaces externo.

El adaptador retira las reglas globales antiguas que convierten 403/404 en `/index.html` con HTTP 200: también ocultaban los 404 del origen API. La navegación SPA sigue resuelta por la función viewer-request propia; se conservan otros errores personalizados. El plan indica cuántas reglas se retirarían. Incluye los campos obligatorios de behaviors estándar y compara los métodos HTTP sin depender del orden que devuelve AWS para permitir reaplicaciones idempotentes.


Para una aplicación, definí `SHARING_BACKUP_PATH` con un archivo local privado
nuevo antes de `--apply`; el script guarda la configuración/ETag original con
modo 0600 y rechaza sobrescribir un respaldo existente. El plan de lectura no
crea archivos. La plantilla de aceptación CloudFormation productiva es anterior
a estos behaviors gestionados por el operador: no reaplicar esa base a la
distribución activa. Antes de cualquier actualización futura del stack hay que
incorporar el origen API y ambos behaviors de compartir a la plantilla revisada,
igual que se conserva la función de seguridad publicada.

```bash
PUBLIC_URL=https://dev.vinnot.com CLOUDFRONT_DISTRIBUTION_ID=E16RJ3WGUX15VP node scripts/configure-public-sharing.mjs
PUBLIC_URL=https://vinnot.com CLOUDFRONT_DISTRIBUTION_ID=ELFTVWJHW2QAA node scripts/configure-public-sharing.mjs
```

## Orden de activación

1. Ejecutar preflight local y `mvn clean install`, integrar en development y verificar allí backend/web. La vista previa debe responder HTML antes de cambiar el CDN.
2. Publicar la función SPA actualizada y los archivos de asociación en development. Revisar el plan y ejecutar el mismo comando con `--apply` bajo la sesión operadora. Esperar `distribution-deployed` e invalidar `/share*` y `/.well-known/*` si existía una respuesta SPA anterior.
3. Verificar los tres tipos de contenido publicados, 404 para borradores/retirados, HEAD, idioma inglés, Open Graph en el HTML inicial, la foto del contenido como imagen de vista previa (el PNG de marca si no tiene) y destino tras login. Verificar asociación JSON con HTTP 200, Content-Type correcto y ausencia de redirecciones.
4. Promover el candidato validado, publicar backend/web de producción y aplicar la configuración equivalente con la distribución productiva. La función existente se actualiza por la identidad operadora; la publicación productiva normal conserva sus permisos limitados.
5. Generar nuevos builds iOS y Android con la versión vigente de `frontend-mobile/app.config.ts` (hoy 0.2.2), con los perfiles EAS existentes y sólo dentro del gasto autorizado. EAS debe sincronizar el entitlement Apple; comprobar AASA antes de instalar. No generar otra app ni paquete.
6. Verificar apertura en frío y con la app abierta, usuario con/sin sesión, Safari y navegador Android, página sin app instalada y los tres destinos. Android instalado desde Play debe verificar su dominio con la firma de Play; un APK con otra firma no acredita esa comprobación. Probar el esquema con simulador valida routing, no la asociación de tienda.
7. Enviar iOS a revisión y actualizar la prueba cerrada de Android según su proceso. Android ya está publicado en Google Play, así que `APP_SHARING_ANDROID_AVAILABLE` vale `true` en ambos compose; ponerlo en `false` solo para volver a ocultar el botón.

## Reversión

Conservar el JSON y ETag de la distribución antes de aplicar. Revertir a esa configuración con un ETag actual sólo si no hubo cambios de otro operador. Retirar los dos comportamientos y su origen devuelve el estado previo sin cambiar la API de producto; retirar primero los botones/enlaces nuevos evita publicar destinos inexistentes. No borrar asociaciones de otros dominios ni alterar firmas.

La preview directa de `apps.apple.com` utiliza la ficha controlada por Apple. Para compartir una página de Vinnot con marca propia, usar `https://vinnot.com/share` después de activarla.
