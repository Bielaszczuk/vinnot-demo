# Distribución de iOS y Android

## Superficies independientes

Backend/web, binario nativo, OTA y ficha de tienda tienen estados separados.
Un merge a `main` ejecuta CI; producción requiere el publicador manual. Una
OTA compatible actualiza JS/assets, sin sustituir el binario ni el proceso de
revisión de la tienda. Ver [deploy](../../infra/guides/deployment.md) y
[configuración mobile](development.md).

`eas.json` usa `appVersionSource=remote`, perfil `production` con incremento
automático y proyecto productivo separado del preview. Registrar SHA, build ID,
versión, número nativo, plataforma, canal/runtime y resultado de aceptación en
el registro privado. Los cambios nativos requieren nuevo build; no reutilizar
el APK de preview contra development como candidato de Play.

Antes de distribuir, validar el mismo candidato con CI, configuración de API
productiva y login, aceptación legal, catálogo/cava, escaneo, reseñas/reportes/
bloqueo y eliminación de cuenta. Las pruebas de simulador/emulador cubren flujos;
la aceptación física y el requisito de grabación del revisor no se deducen de ellas.

La versión `0.1.2` incorpora el módulo nativo `expo-clipboard` para referencias
de soporte. Usa un runtime por versión nuevo y requiere binarios nuevos para
iOS/Android; no publicar este bundle sobre el runtime `0.1.1`.

La versión `0.1.3` incorpora el módulo nativo `expo-notifications` (permiso,
token y toques de push). Requiere binarios nuevos y credenciales FCM/APNs en EAS.
Android además necesita la configuración cliente de Firebase: subir
`google-services.json` como variable de entorno de tipo archivo en EAS llamada
`GOOGLE_SERVICES_JSON` (`app.config.ts` la pasa como `android.googleServicesFile`);
sin ella Android no puede obtener un token de push.
Antes de compilarla, publicar cualquier OTA pendiente sólo de JS para `0.1.2`
desde un commit que no importe el módulo; las OTA generadas desde `0.1.3` sólo
llegan a binarios `0.1.3`.

La versión `0.2.0` lleva la app a Expo SDK 58 (React Native 0.88, React 19.3,
sólo nueva arquitectura). Requiere binarios nuevos para iOS/Android; los binarios
`0.1.x` conservan su runtime y nunca reciben bundles de SDK 58, así que cualquier
OTA pendiente sólo de JS para `0.1.3` se publica desde un commit anterior a la
actualización. El target mínimo de iOS es 16.4. Los builds release de Android
mantienen R8 desactivado (`enableMinifyInReleaseBuilds: false`) hasta probar un
build minificado en dispositivos.

La versión `0.2.1` incorpora los parches nativos de Expo SDK 58 (`expo`,
`expo-camera`, `expo-dev-client`, `expo-router`) y preinstala el módulo nativo
`@shopify/react-native-skia`, todavía sin uso, para que los emblemas animados del
sistema de puntos lleguen después por OTA. Requiere binarios nuevos para
iOS/Android; los binarios `0.2.0` nunca reciben bundles de `0.2.1`, así que
cualquier OTA pendiente sólo de JS para `0.2.0` se publica desde un commit
anterior al cambio de versión.

La versión `0.2.2` incorpora los parches nativos siguientes de Expo SDK 58 (`expo`
58.0.21, `expo-camera`, `expo-constants`, `expo-dev-client`, `expo-file-system`,
`expo-font`, `expo-image`, `expo-image-manipulator`, `expo-linking`,
`expo-location`, `expo-notifications`, `expo-router`, `expo-splash-screen`,
`expo-system-ui`, `expo-updates`). Requiere binarios nuevos para iOS/Android; los
binarios `0.2.1` nunca reciben bundles de `0.2.2`, así que cualquier OTA pendiente
sólo de JS para `0.2.1` se publica desde un commit anterior al cambio de versión.

Las OTA productivas usan el canal `production` y el runtime `appVersion`
(`0.2.2`): sólo cambios de JS/assets, publicados con
`npm run eas:update:production` (que ejecuta
`eas update --channel production --environment production`) después de que el
backend productivo esté desplegado. Ver [OTA de producción](development.md#actualizaciones-ota-de-producción).

## App Store Connect

1. Generar el build iOS production y subir ese build a App Store Connect/EAS Submit.
2. Esperar procesamiento, probarlo con TestFlight y seleccionar el binario correcto
   en la versión de la ficha.
3. Completar metadata, capturas de la app real, privacidad, contacto/notas y acceso
   privado del revisor.
4. Agregar la versión a revisión y enviar la submission. Observar el estado de
   revisión y la modalidad de release configurada antes de afirmar publicación.

Las respuestas y videos solicitados por el revisor se guardan en App Store
Connect. Su cuenta demo debe estar activa, desbloqueada y con el rol mínimo;
credenciales y videos de cuentas reales no se incluyen en Git. Actualizar una
versión publicada implica preparar una nueva versión y enviarla a revisión.
[Envío Apple](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
y [nueva versión](https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version).

## Google Play Console

La cuenta personal nueva requiere una prueba cerrada con al menos 12 testers
inscriptos durante 14 días continuos antes de solicitar acceso a producción.
La lista de correos autorizados no demuestra opt-in, instalación ni uso. Recoger
feedback real y usar el contador/estado de Play Console para el requisito;
la prueba interna no lo reemplaza. Solicitar acceso no publica automáticamente.
[Requisito de Google](https://support.google.com/googleplay/android-developer/answer/14151465).

El artefacto de tienda es AAB production. Registrar las firmas de Play App Signing
y subida según corresponda en OAuth/Maps; la firma de subida no prueba la identidad
del APK entregado. La configuración de claves públicas está en la
[guía mobile](development.md). Mantener ficha, privacidad/Data Safety, clasificación,
acceso de revisión y países acordes al comportamiento del candidato. Tras obtener
acceso, preparar la release productiva y comprobar su estado y disponibilidad real.

## Forzar la actualización

La app compara su versión con la versión mínima que el backend sirve por plataforma
(`GET /app-versions/minimum`). Si la versión instalada es menor, muestra la pantalla
«Actualizá Vinnot para continuar» en lugar de la app, con un solo botón que abre la tienda.
La comprobación se hace al abrir la app y cada vez que vuelve al primer plano. Si la
consulta falla, la app se usa normal. La mínima se edita en el panel de
administración web ([UC-ADM-15](../../modules/admin/use-cases/uc-adm-15-minimum-app-version.md)).

Al publicar un build nativo nuevo:

1. Esperar a que la tienda apruebe y publique el build. En App Store Connect, la
   versión tiene que figurar «Lista para distribución» (*Ready for Distribution*). En
   Google Play, la release tiene que estar disponible en el track que usan las personas.
2. Abrir esa ficha desde un dispositivo y confirmar que ofrece la versión nueva.
3. En la web, ir a Administración › «Versiones de la app» y subir la mínima de esa
   plataforma a la versión publicada. Confirmar la identidad cuando se pida.
4. Abrir una versión anterior de la app y comprobar que aparece la pantalla de
   actualización y que el botón lleva a la ficha.

- Subir la mínima antes de que el build esté publicado bloquea a todas las personas
  sin forma de actualizar.
- Cada plataforma tiene su propia mínima: iOS y Android se publican en momentos distintos.
- Dejar la mínima vacía desactiva el bloqueo en esa plataforma.
- Las actualizaciones OTA no cambian la versión de la app, así que no hace falta tocar
  la mínima al publicarlas.
- La comprobación es código JavaScript: llega por OTA a las apps ya instaladas con
  el mismo runtime (`0.2.2`) sin un build nativo nuevo.

## Verificación y conservación

Comprobar desde una cuenta/dispositivo habilitado que el link de tienda entrega
el paquete y versión esperados; actualizar desde la tienda que lo distribuyó.
El manifiesto EAS confirma canal/runtime/JS, no el número nativo instalado ni
aprobación de tienda. Precio, países, políticas y credenciales se administran en
las consolas; no se infieren del idioma o filtro de país del catálogo.

Conservar resultados de QA y correspondencia de builds/OTA en el archivo privado,
y procedimientos en Git. No publicar datos de testers, claves de firma ni tokens.
La promoción del catálogo argentino sigue su autorización separada después de
la aprobación y publicación efectiva de iOS; distribuir uploads R2 no la adelanta.
