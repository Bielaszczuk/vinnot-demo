# Desarrollo mobile

## Requisitos

- Node 22 (`frontend-mobile/.nvmrc`, la misma versión mayor que usa CI) y npm compatibles con `package.json` y lockfile.
- Expo CLI/EAS mediante `npx`.
- Xcode para iOS y Android Studio para Android cuando se compila nativo.
- Backend accesible desde el dispositivo.

## Instalación y validación

```bash
cd frontend-mobile
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
```

## Ejecución

```bash
# Metro para development build
npm run start:dev-client

# Dispositivo físico contra backend local
npm run start:device -- --clear

# Simulador iOS con módulos nativos
npm run ios:native
```

`start:device` calcula una URL alcanzable por LAN. En un dispositivo real,
`localhost` apunta al teléfono, no a la computadora. El backend local usa HTTP;
no se debe transformar accidentalmente a HTTPS.

### Metro: eventos virtuales de NativeWind

Con Expo SDK 58, Expo CLI y Metro 0.87 comparten el mismo contrato de watcher
(`changes` y `rootDir`), así que los eventos de Metro llegan a Expo sin cambios.
NativeWind 4 todavía emite sus eventos CSS virtuales con la forma anterior
`eventsQueue`. `metro.config.js` instala `config/metro-watcher-compatibility.cjs`
sobre el watcher de ese servidor sólo para convertir esos eventos de NativeWind
al contrato de Metro. No modifica `node_modules`, el lockfile ni los watchers
globales. Retirar el adaptador cuando NativeWind emita el contrato de Metro.

Después de actualizar el checkout, detener Metro y ejecutar desde
`frontend-mobile/`:

```bash
npm run start:dev-client -- --clear
```

Pulsar `i` para abrir el development build instalado en el simulador. Para el
teléfono con backend local, usar `npm run start:device -- --clear`. Un preview
release no es un development client; si falta este último en el simulador,
compilarlo localmente con `npm run ios:native`. `No apps connected` al recargar
antes de abrir un cliente sólo indica que todavía no hay una app conectada.
Cambiar Node o limpiar la caché por sí solos no corrige el contrato incompatible;
el fallo y la corrección se verificaron con Node 22.23.3.

### Estilos de `Pressable` en el dispositivo

NativeWind envuelve `Pressable` con `react-native-css-interop`. En el dispositivo
la interop reconstruye `style` como objeto, así que una función como
`style={({ pressed }) => [...]}` queda en `{}` y el elemento pierde todos sus
estilos: desaparecen fondos, bordes y padding, y los chips seleccionados muestran
texto blanco sobre una tarjeta blanca. Jest no ejecuta ese camino. Pasar un array
de estilos y usar `MotionPressable` para el efecto al presionar.
`pressableStyles.test.ts` falla si aparece una prop `style` función en `src/` o
`app/`.

`Button` envuelve su superficie presionable en una vista animada. Las claves de
layout que recibe en `style` (flex, ancho, alignSelf, márgenes, posición)
dimensionan ese contenedor y el resto estiliza la superficie, así que
`style={{ flex: 1 }}` reparte una fila como se espera.

## Diagnóstico de dependencias antes de EAS

Ejecutar los comandos desde `frontend-mobile/`, con dependencias instaladas por
`npm ci`. Si EAS informa que no encuentra `expo-modules-autolinking`, comprobar
primero el directorio actual y esa instalación: Expo y su árbol nativo deben
resolverse localmente antes de solicitar el build. No agregar ese paquete aislado
ni cambiar el lockfile como solución automática. La ausencia de variables remotas
«Plain text/Sensitive» se diagnostica por separado del error de resolución de módulos.

## Variables

Usar `.env.local` a partir de los ejemplos. Las variables `EXPO_PUBLIC_*` quedan
embebidas en el cliente y no son secrets. Tokens privados no pertenecen a Expo.

### Pagos de eventos

- `EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED`: con `true` habilita el pago online de
  inscripciones (botón de pago y apertura automática del checkout en
  `src/presentation/features/event/useEventDetailViewModel.ts`). Los perfiles development, preview y
  production de `eas.json` lo definen en `true`.
- `EXPO_PUBLIC_EVENT_PAYMENTS_SANDBOX`: con `true` habilita también el pago, pero
  sólo cuando `EXPO_ENV` no es `production`; no está definida en `eas.json`.

Ambas se resuelven en `shared/config/env.ts` (`eventPaymentsEnabled`). Como las
variables `env` de `eas.json` no se heredan en `eas update`, una OTA conserva el
pago habilitado sólo si el entorno remoto EAS las define o si el proceso que
publica inyecta el `env` del perfil, como hace `scripts/publish-preview-update.mjs`.
Antes de publicar, ese script verifica que `<API>/actuator/health` responda HTTP 200
con estado `UP`; las rutas del catálogo como `/wines` piden sesión, así que no
sirven para comprobar que la API de preview responde.

### Google Maps por plataforma

- `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`: clave restringida al bundle iOS y a los servicios utilizados. iOS muestra Apple Maps, así que esta clave sólo sirve para la geocodificación REST; se publica en `extra` y nunca como `ios.config.googleMapsApiKey`, porque ese ajuste enlaza el pod `react-native-google-maps`, que `react-native-maps` 1.29 ya no incluye.
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`: clave restringida al paquete Android y a la firma del binario distribuido.
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1`: huella pública SHA-1 correspondiente a esa firma; admite hexadecimal con o sin separadores `:`.

`app.config.ts` asigna la clave de Android al SDK nativo de Maps y publica la configuración para
que la capa de infraestructura seleccione la plataforma actual. Producción no
hereda `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; esa variable compartida se conserva como
compatibilidad de desarrollo. Las claves del servidor no se incluyen en la app.

La geocodificación REST agrega `X-Ios-Bundle-Identifier` en iOS, o
`X-Android-Package` y `X-Android-Cert` en Android. No transmite el token de sesión
de Vinnot a Google. En producción, una identidad ausente o una huella inválida
se rechaza antes de enviar la solicitud; la capa de aplicación presenta el error.
Antes de distribuir un build, verificar que Google acepte la identidad correcta
y rechace una incorrecta. La firma de Google Play App Signing puede diferir de
la clave de subida: autorizar la firma del artefacto que realmente recibe el usuario.
Cambiar las claves incluidas en la configuración de los SDKs requiere un build
nativo; una OTA por sí sola no actualiza esos valores nativos.

## Build nativo

Google Sign-In, ML Kit OCR, cámara y otros módulos nativos requieren development
build; Expo Go no registra esos TurboModules. Antes de consumir un build remoto:

```bash
npm run preflight:ios:native
```

Android usa el config plugin `withAndroidSecurityDependencies.cjs` para aplicar
versiones mínimas de dependencias transitivas durante prebuild. Sus cambios
requieren **rebuild Android**, no sólo OTA. CI resuelve y analiza el grafo nativo
real; esto no reemplaza compilar y probar el binario que se distribuirá. Consultar
[seguridad de dependencias y artefactos](../../infra/guides/dependency-security.md)
para mantenimiento, inventarios y criterios de bloqueo.

## Actualizaciones OTA de preview

Una OTA actualiza JavaScript y assets compatibles con el runtime instalado;
no compila un binario nativo ni reemplaza un build cuando cambian módulos nativos.
El canal `preview` corresponde a «Vinnot (Dev)» contra la API de AWS development.

```bash
cd frontend-mobile
npm run test:release-config
npm run eas:update:preview -- --message "Descripción del cambio"
```

El comando publica sólo iOS por defecto; `--platform android` o `--platform all`
deben indicarse explícitamente. Selecciona tanto el canal como el entorno EAS
`preview`, desactiva la carga de `.env.local`, limpia la caché de Metro y comprueba
que `/api/actuator/health` de la API de preview responda `UP` antes de publicar. No ejecuta EAS Build.

Las variables `env` de un perfil de build en `eas.json` no se heredan
automáticamente en `eas update`. En el entorno remoto `preview` deben existir
`EXPO_ENV=development` y
`EXPO_PUBLIC_API_BASE_URL=https://api-dev.vinnot.com/api`. El comando carga además
las variables del perfil preview y la configuración final comprueba que su URL
coincida con ese perfil, incluso si el entorno remoto intenta reemplazarla.

`app.config.ts` aplica una política de API durante EAS Build, exportaciones de
producción y el comando de publicación: exige un dominio HTTPS público con ruta
`/api`, sin credenciales, query ni fragmento. Rechaza localhost, direcciones IP y
dominios locales. Metro de desarrollo conserva acceso HTTP al backend local.
CI ejecuta los tests de esta política; el merge por sí solo no publica una OTA.

La resolución de entorno está centralizada en `config/mobile-environment-policy.cjs`.
Rechaza `EXPO_ENV` desconocido en lugar de cambiar silenciosamente a development.
Cuando existe `EAS_BUILD_PROFILE`, resuelve su herencia (incluido ios-simulator)
y exige coherencia con `EXPO_ENV`. `VINNOT_OTA_CHANNEL` selecciona un canal
declarado en `eas.json`; si también hay perfil de build, ambos deben coincidir.
Estos controles validan los selectores recibidos por el proceso de configuración;
no sustituyen la comprobación de la asociación canal/rama en el servicio EAS.

Los proyectos EAS también son independientes: `@vinnot/vinnot-dev` para
development/preview y `@vinnot/vinnot` para production. `resolveMobileProjectId`
obtiene el ID esperado de `eas.json` y rechaza un `EAS_PROJECT_ID` de otro entorno;
la misma identidad determina `extra.eas.projectId` y la URL de EAS Update.
Staging requiere un proyecto explícito distinto. Las variables, credenciales de
firma y canales deben configurarse dentro del proyecto seleccionado, no sólo
cambiar el nombre visible de la app. Crear el proyecto no crea un build ni publica
una actualización.

Android debe registrar en Google Login y Maps el SHA-1 del certificado que firma
el binario distribuido. El keystore productivo de EAS permite validar instalaciones
firmadas con esa clave; si Google Play App Signing usa otra clave, registrar además
su huella antes de distribuir desde Play. El certificado de subida no reemplaza al
certificado de firma de Play. No reutilizar firmas de development ni asumir que un
cliente OAuth creado valida por sí solo el login en dispositivo.

| Destino | API |
|---|---|
| Metro local sin perfil de publicación | localhost o URL de desarrollo explícita |
| development / preview / ios-simulator | `https://api-dev.vinnot.com/api` |
| production | `https://api.vinnot.com/api` |
| staging sin perfil EAS declarado | URL HTTPS explícita, sin dominio implícito |

Producción exige su dominio exacto incluso al inspeccionar la configuración,
sin depender de `NODE_ENV`. Una variable remota de dev no puede reemplazarlo.
El perfil production declara también la URL explícitamente. La configuración no
crea DNS, credenciales sociales ni recursos AWS, y no publica builds o actualizaciones.

Tras publicar, verificar el manifiesto para plataforma, canal y runtime correctos:
la URL dentro de `extra.expoClient.extra.apiBaseUrl` debe ser la URL remota, no
localhost. En un dispositivo instalado, abrir la app con conexión permite
descargar la actualización; puede requerir cerrar y volver a abrir para aplicarla.

## Actualizaciones OTA de producción

El perfil `production` usa el canal `production` y `app.config.ts` declara
`runtimeVersion` con la política `appVersion`, de modo que el runtime coincide con
`version` (actualmente `0.2.2`). Sólo los cambios de JavaScript y assets son
compatibles con los builds instalados de esa versión; un cambio nativo exige un
build nuevo. Con el backend productivo ya desplegado, se publica desde un checkout
limpio de `main`:

```bash
cd frontend-mobile
npm run test:release-config
npm run eas:update:production -- --api-revision <commit de /api/version> --message "Descripción del cambio"
```

`--api-revision` es el commit completo que informa `https://api.vinnot.com/api/version`.
El comando publica iOS y Android por defecto (`--platform ios|android` lo acota).
Antes de ejecutar `eas update --channel production --environment production`,
se niega a publicar cuando:

- la carpeta mobile tiene cambios sin commitear, porque la OTA empaqueta el árbol de trabajo;
- `HEAD` todavía no está en `origin/main`;
- `HEAD` cambió algún archivo de `backend/` desde que se separó de esa revisión,
  porque la app llamaría a código de API que no está desplegado (un cambio sólo
  mobile conserva la revisión anterior). Los commits de backend que la API ya
  ejecuta nunca lo bloquean, aunque la API sea más nueva que `HEAD`;
- `/api/version` no responde HTTP 200 con esa misma revisión.

`--dry-run` ejecuta todos los chequeos y se detiene antes de publicar. El entorno
remoto `production` debe aportar los valores productivos (por ejemplo `EXPO_ENV` y
`EXPO_PUBLIC_API_BASE_URL`), ya que la política de entorno rechaza combinaciones
incoherentes. Igual que el comando de preview, inyecta el `env` del perfil
`production` de `eas.json`, de modo que conserva `EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED`,
desactiva la carga de `.env.local` y limpia la caché de Metro. No ejecuta EAS Build.

## Diagnóstico de conexión

- `TurboModule ... could not be found`: binario sin el módulo nativo.
- `ERR_NETWORK` a `localhost`: URL de API incorrecta para dispositivo físico.
- TLS contra puerto HTTP: revisar esquema de la base URL.
- `401` después del login: revisar persistencia y header bearer.
- error de entitlement en SecureStore: verificar capabilities del binario;
  el adapter actual usa SecureStore y no implementa fallback a AsyncStorage.

## Contratos y verificación

- [Pruebas y cobertura real](../testing/strategy.md)
- [Configuración, idioma y compatibilidad](../architecture/platform-and-localization.md)
