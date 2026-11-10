# Plataforma, configuración, idioma y UI mobile

## Configuración y límites de confianza

Expo resuelve `app.config.ts` con `EXPO_ENV`: development, staging o production.
`EXPO_PUBLIC_API_BASE_URL` se valida contra el destino esperado del perfil/canal.
`eas.json` define development, preview, ios-simulator y production; preview utiliza
la API de desarrollo y production exige `https://api.vinnot.com/api`. La política
de configuración rechaza entornos desconocidos y selectores contradictorios;
staging requiere una URL explícita. Metro local conserva su URL configurable.

Los presupuestos de `WINE_OPERATION_TIMEOUTS` son 22000 ms para scan, 90000
para upload y 120000 para IA. HTTP general usa 15000 ms. Son límites del cliente,
no latencias prometidas ni deadlines del proveedor.

OAuth client IDs y URLs públicas no son secretos. Contraseñas, refresh tokens,
claves privadas y credenciales backend no pertenecen a variables públicas de
build. No se incorporan imágenes ni payloads personales a documentación canónica.

## Persistencia y recursos temporales

Auth usa SecureStore mediante `authSession.storage.ts`; la sesión se guarda como
una única instantánea atómica `vinnot.auth.session.v3` con
`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. La instantánea `v2` y las claves separadas
de access, refresh y usuario sólo se leen como legado y se eliminan al migrar. Preferencias usan AsyncStorage mediante
`uiPreferences.storage.ts`. Los servicios de aplicación aíslan estos adapters.

La caché RTK es de memoria; declarar `QUERY_CACHE` no implementa persistencia.
El escáner guarda URI/OCR en estado: limpiar referencias no borra el archivo.
Avatar y selección de imagen tienen servicios separados del transporte multipart.

## Resolución de idioma

La UI admite `es-AR` y `en-US`. `resolveSupportedLocale` elige inglés para prefijo
`en`, español para el resto. El arranque usa idioma del dispositivo, pero la
preferencia persistida prevalece. LanguagePreferenceProvider espera hidratación
antes de sincronizar i18next. Perfil permite persistir una nueva elección.

Para IA, `resolveAiContentLanguage` convierte a `es`/`en` e integra el idioma
en los argumentos RTK.

### Idioma y zona horaria de la cuenta

`AccountLocaleSync` (dentro de `LanguagePreferenceProvider`) ejecuta
`useAccountLocaleSync`. Con sesión y tras la hidratación de la UI llama a
`usersService.syncAccountLocale` después de cada login o sesión restaurada,
cada vez que cambia el idioma persistido y cuando la app vuelve a primer plano
(`applicationLifecycleService`) con otra zona horaria del dispositivo. El servicio convierte el idioma con
`resolveAccountLanguage` (`es`/`en`), lee la zona del dispositivo mediante
`timezoneGateway` (`getCalendars()` de `expo-localization`, con fallback a
`Intl.DateTimeFormat().resolvedOptions().timeZone`) y envía
`PATCH /users/me/preferences`. Un rechazo `INVALID_TIMEZONE` reintenta sólo con
el idioma. Los errores se ignoran: la sincronización nunca bloquea el login ni
el cambio de idioma. Usa APIs JavaScript de un módulo ya instalado, por lo que
se publica por OTA sin build nativo.

Fechas, horas, precios y números pasan por
[`format.ts`](../../../../frontend-mobile/src/shared/i18n/format.ts)
(`formatDate`, `formatTime`, `formatDateTime`, `formatPrice`, `formatNumber`),
que reciben el idioma de la app y lo resuelven con `resolveSupportedLocale`.
Los componentes los leen ligados al idioma actual mediante `useFormatters`.
Las pantallas que todavía llaman a `Intl` o `toLocale*` directamente (sobre todo
admin) también pasan el idioma de la app, nunca un locale fijo.

No existe cabecera HTTP global de idioma. Disponer de diccionarios no certifica
que todo texto de cada componente use i18n. El alcance se verifica por claves
y consumidores; no se traducen automáticamente nombres comerciales o input
del usuario.

### Idioma del panel administrativo

`AdminUserRow` resuelve estado, rol y «Nunca» mediante i18next; bloqueo tiene
prioridad sobre deshabilitación. La fecha de último acceso usa el idioma activo.
Listas de vinos/rutas y formularios muestran etiquetas traducidas para tipos,
alérgenos, estados, duración y tipos de parada. `ChipRow` recibe `optionLabel`
para separar la etiqueta del valor; seleccionar «Tinto» sigue enviando `RED`.
El editor de eventos usa `events.statusLabels`, no el campo de texto `events.status`.
Estadísticas y fechas del detalle de reseñas usan el idioma elegido en la app.

`AdminUserRow.test.tsx` y `AdminOptionLabels.test.tsx` verifican recursos ES/EN
reales, cambio de idioma y conservación de los valores seleccionados. Nombres,
texto de reseñas, motivos escritos y códigos desconocidos se conservan. Estas
pruebas no acreditan la revisión visual de todas las pantallas en un dispositivo.

## Capacidades y permisos

El candidato Android productivo bloquea los permisos heredados `RECORD_AUDIO`
y `SYSTEM_ALERT_WINDOW`: el escáner y el selector usan fotografías, sin audio ni
overlays. Development conserva los permisos de sus herramientas de depuración.
Cámara, ubicación y acceso a galería mantienen su contrato actual; no se bloquea
almacenamiento requerido por el selector en versiones antiguas de Android.
Verificar el manifiesto del AAB y probar cámara/galería/mapas en un dispositivo
físico antes de distribuir. Este cambio requiere un build nativo nuevo.

| Capacidad | Integración |
|---|---|
| Identidad social | Servicio social y adapter nativo Google/Apple/Facebook |
| Ubicación | Gateway Expo Location |
| Geocoding | Cliente/servicio que transforma consulta o coordenadas |
| Mapas | Componentes de plataforma y enlaces a mapas externos |
| Cámara/OCR | Expo Camera, procesamiento y ML Kit |
| Archivos | URI de dispositivo y multipart |

Permiso denegado es distinto de error del proveedor. Ubicación no concede
autorización. OAuth debe corresponder al bundle/origen y callback de plataforma;
el cliente no administra claves privadas del proveedor backend.

## Tema, accesibilidad y animación

ThemeProvider expone `lightTokens` y light; Expo también fija interfaz light.
Preferencias de esquema no implican tema oscuro implementado en todas las screens.

El [sistema visual](../../shared/design/visual-system.md) define jerarquía y
tokens. Revisión de accesibilidad incluye label/rol, foco, texto ampliado,
teclado, modal y safe areas. Son criterios de prueba, no una certificación
automática por usar componentes compartidos.

Las animaciones IA representan etapas de presentación, no porcentajes enviados
por OpenAI. Duración mínima visual y timeout HTTP son mecanismos distintos.

## Build y compatibilidad

EAS usa canales por perfil y `runtimeVersion.policy=appVersion`. Una actualización
JavaScript requiere un binario compatible. Cambiar plugins, permisos, dependencias
nativas o capabilities requiere validar otro binario. El preflight no firma
ni acredita ejecución física.

`ios-simulator` excluye ML Kit mediante plugin: su ejecución no certifica OCR
del binario físico. No hay un workflow EAS automático en el inventario actual
de `.github/workflows`; los scripts EAS del package son entradas manuales.

## Avisos y mensajes de estado

El `ToastProvider` conserva la API `showToast/showSuccess/showError/showInfo` y
renderiza `FeedbackNotice`, también reutilizado por los errores de login y registro.
La superficie usa Poppins y tokens de Vinnot: fondo blanco, borde rosado suave,
acento bordó e iconos vectoriales de línea, sin emojis. El tipo se distingue
por icono y mensaje, no sólo por color. Los textos largos pueden ocupar varias líneas.

Los avisos aparecen debajo del área segura y admiten cierre explícito localizado,
con un objetivo táctil de 44 puntos. Se muestran hasta tres; uno nuevo desplaza
al más antiguo cuando se alcanza ese límite. Éxito/información/advertencia duran
cuatro segundos y error seis. Cada aviso mantiene su propio temporizador: otro
mensaje no reinicia su animación ni su vida útil. Al desmontar se cancelan
temporizadores, animaciones y suscripciones.

La entrada combina opacidad y desplazamiento de ocho puntos durante 240 ms;
la salida dura 180 ms, sin rebotes. Se escucha la preferencia del sistema
`reduceMotionChanged`; con movimiento reducido no hay transición. Con lector
de pantalla activo no hay cierre automático: sigue disponible el cierre manual
y el límite de tres avisos. Errores/advertencias usan anuncio urgente; el resto,
anuncio amable. La consulta fallida de preferencias adopta presentación estática
y sin expiración automática. Los errores inline permanecen mientras el formulario
los mantenga y no se convierten en mensajes temporales.

Las confirmaciones nativas de acciones destructivas conservan sus botones,
cancelación y comportamiento del sistema. El rediseño no modifica autorización,
validación de negocio ni llamadas HTTP.

## Disponibilidad de autenticación social

Facebook usa disponibilidad explícita por entorno: `EXPO_ENV=production` oculta
su botón, rechaza invocaciones al gateway y omite el plugin nativo y el
autolinking de `react-native-fbsdk-next` en ambas plataformas. Omitir sólo el
plugin no excluye los SDK enlazados. En iOS también se excluye el adaptador
Expo mediante `withIosExpoModuleExclusions.cjs`; la exclusión se combina con
ML Kit sólo para simuladores. El preflight verifica `Podfile.lock` después de
instalar los pods y detiene la compilación si queda algún SDK de Facebook
desactivado. Development
conserva el proveedor y puede desactivarlo con
`EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED=false`. La decisión efectiva del build se
incluye en `extra.facebookLoginEnabled`; el runtime mantiene el bloqueo
productivo aunque reciba una configuración contradictoria. Google y Apple
conservan sus flujos y credenciales separados por entorno. Cambiar plugins,
identificadores o URL schemes requiere un nuevo build nativo.

En builds para dispositivos, `withIosMlkitTextQualifier.cjs` califica el tipo `Text`
de ML Kit en `@infinitered/react-native-mlkit-text-recognition` 5.0.1 durante el
prebuild: con SDK 58, ExpoModulesCore hace visible `SwiftUI.Text` en ese módulo y
el nombre sin calificar deja de compilar. El plugin está fijado a esa versión y
falla ante cualquier otra versión o código, para que una actualización se revise
en lugar de publicarse sin el parche.

## Evidencia

- [src/presentation/providers/ToastProvider.tsx](../../../../frontend-mobile/src/presentation/providers/ToastProvider.tsx)
- [src/presentation/components/ui/FeedbackNotice.tsx](../../../../frontend-mobile/src/presentation/components/ui/FeedbackNotice.tsx)
- [app.config.ts](../../../../frontend-mobile/app.config.ts)
- [react-native.config.js](../../../../frontend-mobile/react-native.config.js)
- [plugins/withIosExpoModuleExclusions.cjs](../../../../frontend-mobile/plugins/withIosExpoModuleExclusions.cjs)
- [plugins/withIosMlkitTextQualifier.cjs](../../../../frontend-mobile/plugins/withIosMlkitTextQualifier.cjs)
- [scripts/verify-native-ios-build.mjs](../../../../frontend-mobile/scripts/verify-native-ios-build.mjs)
- [eas.json](../../../../frontend-mobile/eas.json)
- [src/shared/config/constants.ts](../../../../frontend-mobile/src/shared/config/constants.ts)
- [src/shared/i18n/language.ts](../../../../frontend-mobile/src/shared/i18n/language.ts)
- [src/infrastructure/storage/authSession.storage.ts](../../../../frontend-mobile/src/infrastructure/storage/authSession.storage.ts)
- [src/infrastructure/storage/uiPreferences.storage.ts](../../../../frontend-mobile/src/infrastructure/storage/uiPreferences.storage.ts)

## Marca y feedback de capacidades

Los SVG entregados por el titular se conservan en `assets/images/illustrations`.
`assets/brand/mark.png` y `wordmark.png` son derivados transparentes livianos,
compartidos byte por byte con web y coloreados con tokens en `VinnotBrand` y
la marca de carga. `assets/icon.png`, adaptive icon, splash y favicon derivan
del mismo diseño. El fondo de icono/splash es `#e6dacc`. Un cambio de icono o
splash necesita otro binario; una OTA sólo cambia la marca dentro de la UI.

Las imágenes de UI son WebP; PNG queda sólo para iconos, adaptive icon, splash,
favicon y los maestros que lee `scripts/optimize-static-artwork.py`. Metro
empaqueta sólo los archivos que el código importa, y `assetBundlePatterns`
filtra esa lista: un archivo sin import no pesa en el binario ni en la OTA.
#483 borró 21 archivos sin uso de `assets/` (40,6 MB del repositorio).

Share cruza servicio/gateway nativo y distingue cancelación, éxito y fallo.
`useCurrentTime` actualiza cada treinta segundos y al volver a foreground mediante
el servicio de lifecycle. Cero es una coordenada válida; datos ausentes son null.
Button conserva su nombre accesible durante carga y declara busy/disabled;
TextField expone ayuda y error. Propuestas de vino usan ES/EN. VoiceOver/TalkBack,
fuente ampliada y aceptación del nuevo binario requieren verificación física.

### Animación de carga del racimo

La marca de carga pinta las uvas desde la base hacia arriba durante un ciclo
suave de 3,4 segundos, mantiene el color completo y se desvanece para repetir;
las hojas comienzan con el mismo tono tenue y se pintan al final del ascenso. No representa porcentaje del servidor ni demora
una respuesta lista. Web usa máscara CSS y keyframes, sin timers JavaScript;
mobile usa un solo valor Reanimated en UI y cancela la animación al desmontar.
Con movimiento reducido se muestra la marca completa estática (mobile lee la
preferencia al arrancar). Sólo se anima durante carga/inicialización; cabecera,
footer, formularios e icono instalado conservan la marca estática. El icono del
launcher y el splash nativo no pueden tener esta animación de UI.
