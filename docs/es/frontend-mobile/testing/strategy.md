# Estrategia de pruebas frontend mobile

## Alcance y niveles

| Nivel | Unidad bajo prueba | Dependencias controladas |
|---|---|---|
| Dominio | Mappers, validadores, normalización | Datos DTO y valores límite |
| Aplicación | Servicios y transformación de entrada/salida | Clientes/gateways sustituidos |
| Estado/presentación | Hooks, sesión, interacción y navegación | Store/cache, transporte y router |
| Integración cliente | Secuencia entre UI, hooks y contratos | Adapters nativos mockeados |
| End-to-end | Interacción en binario/dispositivo | Entorno explícito; no confundir con unitarios |

Jest usa `jest-expo` y Testing Library para React Native. Los tests se ubican
junto a las unidades bajo `src/`; no se agregan tests a `app/` porque Expo Router
interpreta sus archivos como rutas.

## Cómo medir el estado actual

Esta página no fija cantidades de pruebas: cambian con cada entrega. El runtime
de referencia es Node 22 (`frontend-mobile/.nvmrc`, los workflows de CI y
`scripts/ci-preflight.mjs`). Para obtener el estado actual:

- `npm --prefix frontend-mobile test` informa suites y pruebas de mobile;
  `npm --prefix frontend-mobile run test:coverage` agrega la cobertura.
- `npm --prefix frontend-mobile run typecheck`, `run lint` y
  `run test:release-config` cubren tipos, lint y configuración de release.
- `node scripts/ci-preflight.mjs` corre las mismas compuertas que CI, incluidas
  las de cobertura, antes de subir cambios.

Las secciones fechadas de abajo registran resultados de esa fecha; no son el
estado actual.

Babel transforma imports dinámicos sólo en el entorno `test` para que el runtime
CommonJS de Jest pueda ejercitar adapters nativos de carga diferida. Metro en
producción conserva su comportamiento. No alcanza con probar el error de OCR:
también se prueba reconocimiento exitoso y una promesa nativa que termina después
del timeout de la interfaz.

Las regresiones de escaneo cubren cancelar durante captura, OCR y HTTP; una
respuesta tardía no debe reiniciar el análisis. Las pruebas de ownership verifican
liberación de originales y derivados rechazados, conservando archivos con leases
de OCR/upload activos hasta que termine la operación subyacente. Búsqueda manual
comprueba longitud mínima, debounce, skip de consultas inactivas y `currentData`.
Los tests de cliente verifican el `AbortSignal` HTTP real, no sólo cancelar en UI.

## Cobertura configurada

La medición incluye `src/application/services/*.service.ts`,
`src/domain/**/*.mappers*.ts` y `src/domain/**/*.validators.ts`.
También incluye `src/application/operations/types.ts`, con la política de tags.
Excluye archivos de test, el barrel `wine.mappers.ts` y `wine.mappers.types.ts`,
que sólo declara tipos sin código ejecutable. No se excluye lógica de mappers.
Las pruebas de política y del adaptador RTK verifican proyecciones relacionadas,
éxitos sin cuerpo, errores sin invalidación y foco sin repetir comparaciones.
La selección también cubre dominio público/legal, hooks de documentos, aceptación,
soporte y reautenticación, feedback ilustrado y normalización de `Retry-After`,
además del resumen sensorial. Incluye `nativeIntent` para navegación
nativa. La lista exacta está en `package.json` bajo `jest.collectCoverageFrom`;
estos grupos no implican cobertura de toda presentación.

Los umbrales configurados son:

| Métrica | Umbral |
|---|---|
| Statements | 100% |
| Lines | 100% |
| Functions | 100% |
| Branches | 60% |

Estos umbrales se aplican al conjunto incluido. No significan 100% de lógica
de toda la aplicación, hooks, operaciones, infraestructura o screens.
El reporte de una ejecución y su fecha son artefactos de prueba, no afirmaciones
permanentes de este documento.

## Comandos reproducibles

```bash
cd frontend-mobile
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:coverage
npm run preflight:ios:native
```

`npm ci` instala dependencias del lockfile. Cobertura genera reportes locales;
build/preflight generan artefactos. El preflight mobile no consume EAS, pero
requiere Xcode y dependencias nativas disponibles.

La matriz de interacción física incluye permisos, captura, OCR, SecureStore,
identidad social, teclado, background/foreground y retorno del scanner. Un mock
nativo o simulador no acredita el mismo comportamiento de hardware/OCR real.

## Criterios por circuito

| Circuito | Casos que el diseño de prueba debe distinguir |
|---|---|
| Sesión | Sin tokens, sesión válida, expiración, error transitorio, logout |
| Búsqueda | Texto vacío/corto, cambio de filtro, página siguiente, error |
| IA | Lectura, generación, idioma, respuesta cacheada y fallo |
| Cava/reseñas | Validación, ID correcto, ownership backend e invalidación |
| Eventos | Inscripción pendiente, pago con Mercado Pago y regreso del checkout, confirmación y rechazo |
| Admin/partner | Roles, payload, estado de formulario y conflicto |
| Escaneo | Permiso, calidad, OCR, cancelación, retry y submission |

Esta matriz describe responsabilidades a verificar; no declara que cada caso
tenga hoy una prueba automatizada. El inventario de archivos de test y el runner
son la evidencia de cobertura implementada.

## Pruebas de arquitectura y contratos

La dirección de imports se inspecciona además de ejecutar lint. Un test de
servicio sustituye el cliente en el límite de infraestructura; uno de mapper
utiliza DTOs representativos con nulos, campos ausentes y valores normalizados.
Los errores HTTP se prueban separados de reglas de formulario.

En interacción, verificar comportamiento observable, no detalles de timers o
markup incidental. Para animaciones, comprobar inicio/finalización/cancelación
y reduced motion en las unidades que lo implementan. Para accesibilidad,
combinar assertions semánticas con recorrido real de teclado/lector de pantalla.

## Evidencia y procedimientos relacionados

- [Configuración del módulo](../../../../frontend-mobile/package.json)
- [Contratos y persistencia](../architecture/platform-and-localization.md)
- [Estado remoto](../architecture/remote-state-and-transport.md)
- [Desarrollo](../guides/development.md)

## Centro público, contacto y recuperación

La medición de cobertura incluye `domain/public/*.ts`,
`presentation/feedback/illustratedState.ts`, `useSupportForm`,
`useRetryDeadline` y el parser de `Retry-After`. Se prueban límites de campos,
paridad ES/EN, búsqueda sin servidor, conservación del UUID/borrador, doble
submit, espera indicada por el servidor y limpieza de timers. Los componentes
verifican imagen real→fallback→superficie estable y recuperación con nueva URI.

Las pruebas controladas de soporte comprueban recepción, no entrega de email.
La entrega externa necesita una prueba explícita del backend/proveedor. El
contrato y los diagramas están en
[Información pública y soporte](../../modules/support/architecture.md).

## Regresiones de acceso y UX

Tests de `AuthGuard` distinguen inicialización, anónimo sin montar hijos y sesión
válida. Login conserva la intención hasta completar perfil; dominio rechaza
retornos externos/escapes/rutas ajenas. Servicios verifican share cancelado/fallido;
hooks verifican reloj, foreground y limpieza. Mappers/componentes distinguen
coordenadas cero de ausentes; propuestas de vino usan las mismas claves ES/EN.

Estas pruebas Jest usan adapters nativos controlados. La prueba de configuración
comprueba recursos/perfiles, pero no demuestra la apariencia del icono/splash
instalado. El candidato de development requiere login/logout, legales, deep link,
retorno, ubicación y aceptación visual/fuente/lector en dispositivo. No se genera
un build EAS ni se publica una OTA al ejecutar estos comandos locales.

## Arranque e ilustraciones — 2026-10-05

`startupRoutes.test.tsx` verifica que los providers comienzan mientras las fuentes
están pendientes, no se remontan al resolverlas y la navegación espera la sesión
sin el anterior timeout de 950 ms. Complementa las regresiones de `authSlice`,
`AuthGuard` y términos; no reemplaza la validación de sesión ni su comprobación en
backend. En esa fecha la suite local, typecheck, lint y guard de arquitectura
pasaron, y `test:release-config` pasó con Node 20.20.2 (el `.nvmrc` de entonces;
hoy fija Node 22, igual que CI) y Node 22.23.3. Node 23.8.0 falló al reproducir
la recursión del paquete sin parche en el test de backports; no se modificó ni
debilitó ese test para aceptar otro runtime.

Seis derivados WebP (portada, bienvenida y cuatro copas) pasan de 6.678.340 a
956.812 bytes: 85,67% menos bytes de assets. Conservan dimensiones y alfa; este
porcentaje no implica una reducción equivalente de memoria decodificada ni de
tiempo total. Los exports Hermes locales de iOS/Android incluyen los seis WebP.
No se modifican filtros, consultas de Inicio ni caché de imágenes privadas.

QA local: bienvenida real en el cliente de desarrollo de iPhone 17 / iOS 26.4;
Inicio real con listas vacías de fixture en Expo Go sobre ese simulador y un
emulador Android API 36. Los seis recursos se decodificaron con `Image.loadAsync`
en ambas plataformas con sus dimensiones originales. El harness no consulta ni
modifica cuentas/datos remotos. Esto comprueba el render/codec, no mide el arranque
de un AAB/IPA productivo ni reproduce el dispositivo del incidente.

Para investigar un cierre en producción se necesita una traza nativa/ANR o un
bugreport del dispositivo. Un UUID y logs del backend no bastan. En la consulta
del 5 de octubre, Android vitals no mostraba clústeres de fallas/ANR en los últimos
28 días y estaba actualizado hasta el domingo a las 21:00 según la consola: no
incluía necesariamente el cierre reportado ese mismo día. La inspección del
backend no mostró ERROR/OutOfMemory ni OOMKilled en la ventana disponible. No se
atribuye el cierre a las imágenes ni se declara corregido sin esa evidencia.

El titular descartó esta investigación el 5 de octubre por considerarlo un incidente
aislado del dispositivo. No queda como bloqueo de publicación ni como bug
corregido; esa decisión no demuestra una causa técnica.

## Navegación, paneles y feedback — issue #242

`RootNavigator.test.tsx` usa Expo Router real para comprobar que autenticar retira
Bienvenida del historial y que el retorno desde un detalle conserva la sesión.
`startupRoutes.test.tsx` cubre inicialización y cambios de estado. No se cambian
TTL, refresh ni permisos para corregir la navegación.

El shell compartido de paneles tiene pruebas de insets, bloqueo de cierre durante
mutaciones, Back Android, registro/limpieza de listeners y revelado del input por
encima del teclado. `TextField` conserva el input ordinario fuera del contexto de
panel. Los tests del escáner cubren captura visible, bloqueo de captura duplicada
y cancelación tardía. Soporte prueba formato corto, copia exitosa/fallida y UUID
íntegro; backend comprueba ambas referencias en el correo.

Inventario revisado: paneles de perfil/cuenta/contraseña/avatar/idioma, bodega,
inscripción y gestión de eventos, partner, admin de usuarios/vinos/bodegas/rutas/
eventos; modales nativos de detalle, reseña, reautenticación y eliminación. Se
conservan los modales nativos y las mutaciones de cada feature. Login, registro,
perfil incompleto, contacto, comunidad y escaneo usan sus shells de teclado/scroll;
este inventario no equivale a una ejecución manual completa de cada flujo.

Resultado local del 12/10/2026 con Node 22.23.3 (registro de esa fecha): las
suites de mobile, web y backend pasaron sin fallos; la cobertura de mobile cumplió
las compuertas configuradas; lint, tipos, release-config y Expo doctor aprobados;
exports Hermes iOS/Android locales aprobados; en backend se omitió la prueba
opt-in de IA real y `mvn clean install` pasó.
No se ejecutaron Actions ni se publicó una actualización.

En iPhone 17e/iOS 26.4 se verificaron componentes reales dentro de un fixture
local sin API: panel sobre stack nativo/tabs, campo inferior visible con teclado,
retorno explícito, diálogo nativo de eliminación visible/cancelable y registro
social antes del formulario. El disparador del escáner se comprobó visible dentro
del visor inicial con cámara/servicios sustituidos. No es una prueba de cámara
física, cuentas ni eliminación real.
El bundle del fixture también arrancó en Android, pero su ventana no quedó
accesible a la herramienta de interacción: no se acredita la matriz interactiva
Android, cámara física, todos los tamaños/fuentes ni todos los deep links.
Registrar esas comprobaciones sobre el binario candidato antes de cerrar su
aceptación. `expo-clipboard` requiere un nuevo binario con el módulo nativo;
un export JS exitoso no demuestra compatibilidad OTA con un binario anterior.
