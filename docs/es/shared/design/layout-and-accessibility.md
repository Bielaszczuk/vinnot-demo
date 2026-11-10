# Layout y accesibilidad

Cómo se distribuyen las pantallas en la web y en la app, y las reglas de
accesibilidad que cumple cada pantalla.

Parte del [sistema visual](visual-system.md).

## Layout web

| Regla | Valor | Fuente |
|---|---|---|
| Shell | `AppHeader` fijo, drawer `AppSidebar`, el único `main` de la página, `AppFooter`, sobre el `canvas` cálido | [`AppShell.tsx`](../../../../frontend-react/src/presentation/components/layout/AppShell.tsx) |
| Ancho de contenido | `max-w-7xl` (1280 px), centrado; la home (`/`, `/home`) ocupa todo el ancho | `AppShell` |
| Margen lateral | `px-3` → `sm:px-6` → `lg:px-8` | `AppShell` |
| Ritmo vertical | `py-5 sm:py-8` | `AppShell` |
| Header | 56 px (`h-14`); las anclas conservan `scroll-margin-top: 4.5rem` | [`globals.css`](../../../../frontend-react/src/shared/assets/styles/globals.css) |
| Breakpoints | los predeterminados de Tailwind CSS 4: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 px; ninguno está personalizado | [`tailwind.css`](../../../../frontend-react/src/shared/assets/styles/tailwind.css) |
| Cambio de navegación | navegación de escritorio desde `lg`; drawer debajo | [`AppHeader.tsx`](../../../../frontend-react/src/presentation/components/layout/AppHeader.tsx) |
| Columnas de lectura | de `max-w-2xl` a `max-w-5xl` dentro del shell para formularios, detalle y estados | páginas |
| Grillas | una columna en teléfonos; `sm:grid-cols-2`, `lg:grid-cols-3` / `lg:grid-cols-4` para cards | páginas |
| Tablas anchas | scroll horizontal dentro de `overflow-x-auto`; no se ocultan columnas esenciales | páginas de admin |
| Cambio de ruta | `RouteScroll` lleva una página nueva arriba y restaura la posición con atrás/adelante; los cambios de query y filtros conservan el scroll | [`RouteScroll.tsx`](../../../../frontend-react/src/presentation/components/layout/RouteScroll.tsx) |

Cada página abre con un solo `PageBanner`: la banda oscura cálida
(`from-gray-900 via-wine-950 to-wine-900`) con texto blanco, el `h1` de la
página, y dentro la búsqueda y los filtros de las páginas de listas. Las páginas
que se muestran dentro de `AppShell` nunca agregan su propio `<main>`; las que
quedan fuera (vuelta del pago, completar perfil, acciones de cuenta) tienen el
suyo.

## Layout de la app

| Regla | Valor | Fuente |
|---|---|---|
| Orientación y tema | solo vertical, solo claro | [`app.config.ts`](../../../../frontend-mobile/app.config.ts) |
| Ruteo | Expo Router; `app/` solo contiene shells de ruta, el comportamiento vive en `src/presentation` | [`app/`](../../../../frontend-mobile/app) |
| Margen lateral | 20 pt (`layout.screenHorizontalPadding`) | [`tokens.ts`](../../../../frontend-mobile/src/shared/theme/tokens.ts) |
| Safe areas | `useSafeAreaInsets` en headers (arriba + 8), barra de tabs (abajo), sheets (arriba + 8; la superficie llega al borde inferior y su contenido suma el inset inferior) y toasts (arriba + 12); el contenido con scroll termina con el inset inferior + 24 | componentes de layout |
| Barra de tabs | 66 pt + inset inferior, ítems de 56 pt, radio superior 24 (`radii["3xl"]`); las etiquetas crecen hasta 1,3× con el tamaño de fuente del sistema (`TabBarLabel`) | `frontend-mobile/app/(app)/(tabs)/_layout.tsx` |
| Header | `AppHeader` mínimo 56 pt (`layout.headerHeight`); su control para volver es el `BackButton` compartido, que vuelve atrás o, sin historial, va a `backFallback` | [`layout/index.tsx`](../../../../frontend-mobile/src/presentation/components/layout/index.tsx) |
| Columna de contenido en tablets | estados y formularios limitan su ancho (por ejemplo `IllustratedState` 640 pt) | componentes |
| Barra de estado | oscura en todas las pantallas (`StatusBar style="dark"` en la raíz); el inicio está sobre su hero fotográfico y muestra una clara mientras tiene foco (`FocusAwareStatusBar`) | [`FocusAwareStatusBar.tsx`](../../../../frontend-mobile/src/presentation/components/layout/FocusAwareStatusBar.tsx) |
| Fechas, horas, precios y números | se formatean en el idioma de la app (`useFormatters`, `shared/i18n/format.ts`); las llamadas directas a `Intl` también pasan el idioma de la app | [`format.ts`](../../../../frontend-mobile/src/shared/i18n/format.ts) |

### Teclado

Un campo enfocado siempre queda visible sobre el teclado.

| Contenedor | Uso | Cómo mantiene visible el campo |
|---|---|---|
| [`KeyboardAwareScrollView`](../../../../frontend-mobile/src/presentation/components/ui/KeyboardAwareScrollView.tsx) | cualquier pantalla con campos | iOS: `automaticallyAdjustKeyboardInsets` nativo. Android (edge to edge): reserva el alto del teclado después del contenido. En ambos: desplaza el campo enfocado sobre el borde del teclado + 20 pt, también mientras crece un campo multilínea |
| `BottomSheetScrollView` en [`BottomSheet.tsx`](../../../../frontend-mobile/src/presentation/components/ui/BottomSheet.tsx) | campos dentro de un sheet | el mismo desplazamiento; el sheet usa `interactive` (iOS) o `fillParent` + `adjustResize` (Android) |
| [`FilterSheet`](../../../../frontend-mobile/src/presentation/components/ui/FilterSheet.tsx) | campos de filtro | `KeyboardAvoidingView` eleva la hoja completa (`padding` en iOS, `height` en Android); un buscador de opciones enfocado revela su panel de opciones completo mediante `SheetFieldFocusContext`, manteniendo visible el inicio del panel |

Ambos contenedores con scroll usan por defecto
`keyboardShouldPersistTaps="handled"`, así un toque en un botón envía sin
cerrar antes el teclado. La lógica compartida está en
[`useFocusedFieldReveal.ts`](../../../../frontend-mobile/src/presentation/components/ui/useFocusedFieldReveal.ts).

Los toques dentro de un `Modal` nativo igual pasan por los padres React del
componente que lo renderiza. Una lista que renderiza un `FilterSheet` desde su
encabezado, como la lista de resultados de vinos, también define
`keyboardShouldPersistTaps="handled"`; con el valor por defecto, la lista toma el
primer toque con el teclado abierto y solo lo cierra.

Hacer: usar `KeyboardAwareScrollView` en toda pantalla con campos y el
`TextField` compatible con sheets dentro de los sheets. Evitar: envolver una
pantalla en un `ScrollView` común más `KeyboardAvoidingView`.

## Checklist de accesibilidad

Base: WCAG 2.x AA en la web; VoiceOver y TalkBack en la app.

### Objetivos táctiles

- [ ] App: todo objetivo táctil mide al menos 44 × 44 pt. Se usa
  `minHeight: 44` o `hitSlop` para elementos visuales chicos (ejemplos:
  `BackButton` de 44 pt, `hitSlop` del `Button` chico y del `Chip`, botón de
  cierre del aviso).
- [ ] Web: los controles con solo ícono miden al menos 44 × 44 px
  (`min-h-11 min-w-11`, el cierre del aviso). Los botones de texto usan los
  tamaños de `Button`.

### Nombres y roles

- [ ] Todo control con solo ícono tiene nombre (`aria-label`, `accessibilityLabel`).
- [ ] Las imágenes informativas tienen texto alternativo o etiqueta; las
  ilustraciones y los íconos decorativos se ocultan.
- [ ] Los elementos presionables declaran rol (`accessibilityRole="button"`) y
  estado (`selected`, `disabled`, `busy`, `expanded`).
- [ ] Cada diálogo tiene título o etiqueta; cada pantalla tiene un encabezado.

### Foco y orden (web)

- [ ] `:focus-visible` muestra un outline wine-500 de 2 px con 2 px de
  separación (global); los componentes pueden sumar un anillo pero nunca quitan
  el outline sin reemplazo.
- [ ] El orden de foco sigue el orden de lectura.
- [ ] `Modal` atrapa y devuelve el foco; el fondo queda `inert`.

### Feedback

- [ ] Errores y advertencias se anuncian (`role="alert"`, live region
  assertive); el resto de los mensajes, de forma cortés (`role="status"`).
- [ ] Los errores de campo están vinculados al campo (`aria-describedby`,
  accessibility hint).
- [ ] El estado nunca se comunica solo con color: lo acompañan ícono y texto.

### Contraste y texto

- [ ] El texto cumple 4,5:1 sobre su superficie real, incluido el fondo
  `#e8eded`, las superficies rosadas y los scrims de imagen; ver
  [contraste medido](foundations.md#contraste-medido).
- [ ] El texto sobre una foto va sobre un scrim lo bastante oscuro para texto
  blanco.
- [ ] Los layouts soportan tamaños de fuente del sistema más grandes y palabras
  largas en español; el texto truncado está completo en algún lugar accesible.

### Movimiento

- [ ] Las animaciones respetan el movimiento reducido ([movimiento](foundations.md#movimiento)).
- [ ] Nada parpadea y ninguna animación es necesaria para entender el estado.
