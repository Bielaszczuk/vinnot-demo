# Estrategia de pruebas frontend web

## Alcance y niveles

| Nivel | Unidad bajo prueba | Dependencias controladas |
|---|---|---|
| Dominio | Mappers, validadores, normalización | Datos DTO y valores límite |
| Aplicación | Servicios y transformación de entrada/salida | Clientes/gateways sustituidos |
| Estado/presentación | Hooks, sesión, interacción y navegación | Store/cache, transporte y router |
| Integración cliente | Secuencia entre UI, hooks y contratos | MSW y fixtures |
| End-to-end | Navegación de navegador | Entorno explícito; no confundir con unitarios |

Vitest usa jsdom, setup en `tests/setup.ts` y descubre tests bajo `src/` y
`tests/unit/`. Los tests corren en el pool `vmThreads`, donde cada archivo obtiene
un contexto VM nuevo dentro de un worker reutilizado; los workers se reciclan al
superar 512 MB (`vmMemoryLimit`, que solo se lee desde la configuración `test`
raíz). Los tests que reemplazan el global `window` completo con
`vi.stubGlobal('window', …)` no pueden correr en un contexto VM y se listan en el
proyecto `window-stubs`, que usa el pool por defecto. Playwright usa `tests/e2e`
con proyecto Chromium; su configuración es independiente del runner unitario.

## Cobertura configurada

La medición incluye `src/application/services/*.service.ts`,
`src/domain/**/*.mappers*.ts` y `src/domain/**/*.validators.ts`.
Excluye archivos de test y el barrel `wine.mappers.ts`.
También incluye los hooks `useAdminSubmissionImage`, `usePartnerEventMutations`
y `useWineComparison`. Sus pruebas verifican recuperación de descarga/decodificación,
descarte de respuestas tardías, invalidación sólo tras éxito y ausencia de
comparaciones incidentales al recuperar foco, conexión o montar de nuevo.
La selección también cubre dominio público/legal, hooks de documentos, aceptación,
soporte y reautenticación, feedback ilustrado y normalización de `Retry-After`,
además del resumen sensorial (`sensory-bar`) y la ficha rápida (`wine.quick-info`).
Incluye sesión de navegador, retorno seguro de navegación y componentes/assets de
marca y botones sociales. También incluye la vinculación de cuenta de cobro
(`usePaymentAccountConnection`, `paymentAuthorization.browser`), el editor y
borrador de eventos (`eventEditor`, `eventDraft`), `contactPhone`,
`useEventRegistrationForm`, `public/share-assets/*.js` y `src/domain/sharing/*.ts`. La lista exacta está en
`vitest.config.ts`; estos grupos no implican cobertura de toda presentación.

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
cd frontend-react
npm ci
npm run lint
npm run test
npm run test:coverage
npm run build
```

`npm ci` instala dependencias del lockfile. Cobertura genera reportes locales
y build genera los artefactos web.

Para ejecutar Playwright localmente, iniciar en otra terminal
`npm run dev:mock -- --port 5174` y luego ejecutar `npm run test:e2e`.
El servidor debe estar disponible en `http://localhost:5174`, dirección de
`webServer.url` y `use.baseURL`, para su reutilización local. Para API real usar
`npm run dev -- --port 5174` y preparar sus datos. Un escenario MSW verifica
interacción contra contratos simulados, no el comportamiento del proveedor real.

## Criterios por circuito

| Circuito | Casos que el diseño de prueba debe distinguir |
|---|---|
| Sesión | Sin tokens, sesión válida, expiración, error transitorio, logout |
| Búsqueda | Texto vacío/corto, cambio de filtro, página siguiente, error |
| IA | Lectura, generación, idioma, respuesta cacheada y fallo |
| Cava/reseñas | Validación, ID correcto, ownership backend e invalidación |
| Eventos | Inscripción pendiente, pago reportado, confirmación y rechazo |
| Admin/partner | Roles, payload, estado de formulario y conflicto |
| Invitación al escaneo | Contenido exclusivo mobile; no request de reconocimiento |

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

- [Configuración del módulo](../../../../frontend-react/package.json)
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

## Descubrimiento, acceso y compatibilidad

`discovery-access.spec.ts` controla API, ubicación y Maps SDK: ausencia de
requests funcionales anónimos, retorno de login con query/hash, país automático,
denegación/quitar filtro, eventos cercanos con ejes cero y scroll desde footer/anclas.
Unitarios cubren watchdog/SDK tardío, selección manual, share fallido/cancelado,
reloj/foco, modales anidados y retornos seguros a través de onboarding.

Por defecto Playwright ejecuta Chromium. Para ampliar la matriz local:

```bash
npx playwright install chromium firefox webkit
VITE_GOOGLE_MAPS_API_KEY=local-test-key VINNOT_BROWSER_MATRIX=1 npm run test:e2e -- --workers=3
```

Agrega Firefox, WebKit, Pixel 7/Chromium e iPhone 13/WebKit. La clave es un valor
falso para fixtures; todas las llamadas Maps/API están interceptadas. No son
pruebas de proveedor real ni dispositivos físicos. CI conserva Chromium para no
multiplicar minutos ni exigir instalaciones nuevas. Confirmar también el candidato
desplegado en development, lector, fuentes grandes y red/memoria de dispositivos.
