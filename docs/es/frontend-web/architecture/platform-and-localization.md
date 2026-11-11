# Plataforma, configuración, idioma y UI web

## Configuración y límites de confianza

Vite resuelve alias, base y variables en `vite.config.ts`. Desarrollo usa puerto
3000 y proxy `/api` hacia backend local. `VITE_BASE_PATH` controla la base del
bundle y `VITE_GENERATE_SOURCEMAP=true` habilita sourcemaps.

`dev:mock` activa MSW/fixtures: no valida permisos ni persistencia reales.
El HTTP client configura URL y timeout; los métodos pueden declarar overrides.

OAuth client IDs y URLs públicas no son secretos. Contraseñas, refresh tokens,
claves privadas y credenciales backend no pertenecen a variables públicas de
build. No se incorporan imágenes ni payloads personales a documentación canónica.

## Persistencia y recursos temporales

Sólo preferencias UI y marcadores no secretos se guardan en localStorage.
Access e identidad viven en memoria; refresh usa cookie HttpOnly del backend.
`persistence.ts` retira credenciales legacy durante su migración. QueryClient mantiene respuestas en memoria. La object URL del
blob privado de una submission se revoca al cambiar/cerrar su detalle.

El navegador aporta File/Blob para uploads. El backend valida tamaño, formato
y autorización; preview no significa publicación del archivo.

## Resolución de idioma

i18next inicia en el idioma guardado (`vinnot.language.v1` en localStorage) o,
si no hay uno soportado, en `es-AR`; el fallback es `es-AR` y registra recursos
`es-AR` y `en-US`. Cada cambio de idioma se persiste mediante
`languagePreference.storage.ts` y se refleja en `<html lang>`; con
almacenamiento bloqueado el cambio aplica sólo a la vista actual. Esto no
equivale a detección automática del navegador. Los hooks IA leen
el idioma activo y convierten prefijo `en` a `en`, el resto a `es`.

### Idioma y zona horaria de la cuenta

Con una sesión activa, `AccountLocaleSync` (montado dentro de `AuthProvider`)
ejecuta `useAccountLocaleSync`, que llama a `usersService.syncAccountLocale`
después de cada login, login social o sesión restaurada, cada vez que cambia
el idioma de la interfaz y cuando la página vuelve a estar visible o en foco
con otra zona horaria del navegador. El servicio convierte el idioma con
`toPreferredLanguage` (`en-*` a `en`, el resto a `es`), lee la zona del
navegador mediante `timezoneGateway`
(`Intl.DateTimeFormat().resolvedOptions().timeZone`) y envía
`PATCH /users/me/preferences`. Si el servidor rechaza la zona
(`INVALID_TIMEZONE`) reintenta sólo con el idioma. Los errores se ignoran: la
sincronización nunca bloquea el login ni el cambio de idioma, y el siguiente
login reintenta. El backend usa estos valores como idioma y zona horaria de las
notificaciones.

react-i18next resuelve recursos de UI. El contenido semántico IA se selecciona
en backend por `language`, no se traduce en el componente.

No existe cabecera HTTP global de idioma. Disponer de diccionarios no certifica
que todo texto de cada componente use i18n. El alcance se verifica por claves
y consumidores; no se traducen automáticamente nombres comerciales o input
del usuario.

### Nombres de países

El catálogo guarda un solo nombre por país, en español (`countries.name`, con el
código ISO en minúsculas), y el API devuelve solo ese nombre. `domain/location/countryNames.ts`
tiene la tabla de los 116 países sembrados (código ISO → `{ es, en }`) y
`localizeCountryName(nombre, idioma)`, que reconoce el nombre guardado, el nombre en
inglés o el código sin distinguir mayúsculas ni tildes (también la fila `MG`, que
muestra Madagascar) y devuelve el nombre en el idioma de la interfaz; un nombre
desconocido se muestra tal cual. El hook `useCountryName` toma el idioma de i18next
y se usa solo para el texto mostrado: búsqueda de vinos, bodegas, rutas y su panel
lateral, tarjetas y detalle de vinos, eventos cercanos, zona de eventos y los selectores
y tablas del panel administrativo. Los valores que vuelven al API (filtros, valores de
formulario, ids) conservan el nombre guardado.

### Mensajes de validación de formularios

Los esquemas de `domain/user/user.validators.ts` (inicio de sesión, registro,
recuperación y cambio de contraseña, nombre de usuario) devuelven claves i18n
(`auth.*`) en lugar de texto, sin depender de i18next. Las páginas las traducen al
mostrarlas con `fieldErrorMessage` (`presentation/feedback/fieldErrorMessage.ts`), que
también traduce el error de campo que llega del servidor (`auth.errors.invalidField`).
El indicador de fuerza de contraseña usa `auth.passwordWeak`, `auth.passwordMedium` y
`auth.passwordStrong`. Los mensajes de error del servidor nunca se muestran: los
helpers de `presentation/feedback` eligen una clave a partir del código y el estado.

### Idioma del panel administrativo

Fechas de reseñas, propuestas, reportes y publicaciones pendientes, estadísticas
y conteos administrativos usan el idioma activo. El editor de rutas traduce las
paradas y el estado GPS. El formulario de eventos compartido con partners usa
recursos ES/EN para campos, inscripción, geocoding y validaciones explícitas.
`createEventFormSchema` recibe un traductor; las reglas de fechas/capacidad no
cambian. `EventDateTimeField` selecciona locale ES/EN para el calendario y el texto,
conservando el valor local `YYYY-MM-DDTHH:mm` sin convertir su zona horaria.

`EventFormLocalization.test.tsx` comprueba selector, configuración de inscripción
y reglas de fechas con recursos reales. Las etiquetas traducidas conservan los
códigos originales enviados al API. Nombres y texto aportado por usuarios no se
traducen automáticamente; estas pruebas no certifican toda la UI del producto.

## Capacidades y permisos

| Capacidad | Integración |
|---|---|
| Identidad social | Servicio social y adapter de SDK web |
| Ubicación | Geolocalización del navegador |
| Geocoding | Cliente/servicio que transforma consulta o coordenadas |
| Mapas | Componentes de plataforma y enlaces a mapas externos |
| Cámara/OCR | Exclusivo de la aplicación mobile |
| Archivos | File/Blob y multipart |

Permiso denegado es distinto de error del proveedor. Ubicación no concede
autorización. OAuth debe corresponder al bundle/origen y callback de plataforma;
el cliente no administra claves privadas del proveedor backend.

## Tema, accesibilidad y animación

ThemeProvider aplica clase `dark` según light/dark/system y observa
`prefers-color-scheme` en modo system.

El [sistema visual](../../shared/design/visual-system.md) define jerarquía y
tokens. Revisión de accesibilidad incluye label/rol, foco, texto ampliado,
teclado, modal y safe areas. Son criterios de prueba, no una certificación
automática por usar componentes compartidos.

Las animaciones IA representan etapas de presentación, no porcentajes enviados
por OpenAI. La web reproduce el `AiProcessScene` en acuarela (ver
[imágenes](../../shared/design/imagery.md#escenas-de-carga-de-ia)) mientras la
solicitud está pendiente; los pasos avanzan con un temporizador, el último
espera la respuesta y el movimiento reducido muestra la pose final de cada
escena. El timeout HTTP es un mecanismo aparte.

## Build y compatibilidad

Build ejecuta TypeScript y Vite; deploy publica sus artefactos sin consumir EAS.
La ruta de escaneo invita a descargar mobile: no captura ni reconoce imágenes.
Web y mobile tienen ciclos de entrega independientes.

## Avisos y mensajes de estado

El `ToastProvider` mantiene el estado efímero y la API `addToast/removeToast`.
`ToastContainer` administra la presentación y el ciclo de vida de cada aviso.
La superficie compartida `AlertBanner` sirve tanto para toasts como para mensajes
inline, incluidos login, registro y contacto. Usa Poppins, la paleta wine,
tarjetas claras con borde suave e iconos Lucide, sin emojis ni bloques de color saturado.

Los toasts se ubican arriba a la derecha, respetando área segura y ancho disponible.
La entrada dura 240 ms, con opacidad y desplazamiento de ocho píxeles; la salida
dura 180 ms. `prefers-reduced-motion` elimina las animaciones. El cierre tiene
etiqueta ES/EN, foco visible y objetivo de 44 píxeles. Errores/advertencias usan
`role=alert`; información/éxito, `role=status`. Los textos se ajustan sin truncarse.

Cada aviso tiene su temporizador independiente (cuatro segundos por defecto;
seis para errores). El contrato `duration` sigue permitiendo duración explícita
y persistencia con cero o valor negativo. Hover y foco de teclado pausan el
tiempo restante, sin reiniciarlo. Desmontar cancela timers de expiración/salida.
Los avisos inline no expiran y conservan títulos, contenido y acciones del consumidor.
No se cambian validaciones, solicitudes, errores de campo ni confirmaciones de negocio.

## Evidencia

- [src/presentation/components/feedback/ToastContainer.tsx](../../../../frontend-react/src/presentation/components/feedback/ToastContainer.tsx)
- [src/presentation/components/feedback/AlertBanner.tsx](../../../../frontend-react/src/presentation/components/feedback/AlertBanner.tsx)
- [vite.config.ts](../../../../frontend-react/vite.config.ts)
- [src/shared/i18n/index.ts](../../../../frontend-react/src/shared/i18n/index.ts)
- [src/presentation/stores/persistence.ts](../../../../frontend-react/src/presentation/stores/persistence.ts)
- [src/app/providers/ThemeProvider.tsx](../../../../frontend-react/src/app/providers/ThemeProvider.tsx)
- [src/infrastructure/identity/socialIdentity.gateway.ts](../../../../frontend-react/src/infrastructure/identity/socialIdentity.gateway.ts)

## Identidad visual compartida con native

`VinnotBrand` usa el racimo y la palabra Vinnot de los SVG entregados por el
titular, que se conservan en `frontend-mobile/assets/images/illustrations`; derivados
PNG transparentes de menos de 30 KB cada uno se sirven desde `images/brand`.
CSS mask aplica el color del tema sin deformar el dibujo; el nombre accesible
es «Vinnot». Cabecera, menú, footer y pantallas de acceso usan esta marca.
Favicon PNG/ICO deriva del icono con fondo beige.

Home y `AuthEditorialPanel` usan `src/shared/assets/home-hero.webp`, derivada
del arte de native, con una capa de contraste bordo. Las cuatro categorías usan
las copas WebP de `src/shared/assets/glasses` y mantienen los filtros `type`
existentes. `brandAssets` centraliza hero, copas y marca (`mark`/`wordmark` en
`public/images/brand`); una prueba verifica igualdad binaria de copas y marca con
los originales mobile. Las copas se cargan de forma diferida; el hero tiene prioridad de carga.

Poppins 400/500/600/700 se sirve desde `public/fonts/poppins`, con
`font-display: swap` y licencia incluida. No se consulta un proveedor externo
de fuentes. La composición es responsive y conserva los contratos de
presentación, casos de uso y transporte: no cambia autenticación ni permisos.

## Ubicación, compartir y estados temporales

Ubicación cruza gateway de navegador → servicio de aplicación → hook compartido.
El gateway tiene un watchdog de diez segundos, independiente de la espera de
permiso del navegador; resultados tardíos se descartan. Query cache conserva
resultado o denegación por cinco minutos. Reverse geocoding usa el SDK existente,
con espera acotada de diez segundos y sin un segundo proveedor/fallback REST.
No hay consulta IP. El fallback permite elegir país manualmente.

`useShareLink` delega en aplicación/gateway: cancelación no muestra éxito,
clipboard fallido informa error y un entorno sin capacidad se distingue de éxito.
`useCurrentTime` actualiza cada treinta segundos y al recuperar foco/visibilidad;
los textos de fechas usan el idioma activo. Coordenadas cero son válidas;
coordenadas ausentes se modelan como null y no se convierten en (0,0).

`Modal` administra pila, foco inicial/trap/restauración, Escape del modal superior,
background inert/aria-hidden y bloqueo de scroll. Los overlays de cava, alta a
cava, búsqueda de comparación y administración (formularios, confirmaciones IA,
acciones de usuarios y detalle de submissions) usan `Modal`; `AdminFormDialog`
ignora el clic exterior para no descartar formularios. El avatar del perfil es un
botón operable por teclado. Las pruebas no sustituyen una
revisión con lector de pantalla real. Inputs/acciones admin y avisos de eventos
usan claves ES/EN compartidas.

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
