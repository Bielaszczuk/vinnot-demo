# Fundamentos de diseño

Color, tipografía, espaciado, forma, elevación, iconografía y movimiento, tal
como los implementan hoy la web y la app. Los valores vienen de los archivos de
tokens enlazados en cada sección; si un valor de aquí y el código difieren,
vale el código.

Parte del [sistema visual](visual-system.md).

## Color

### Escala de marca: `wine`

Una sola escala borgoña, igual en ambas plataformas. **Wine 700 (`#ab214c`) es
el color de marca.**

| Token | Valor | Uso web | Uso app |
|---|---|---|---|
| wine-50 | `#fdf2f4` | fondo del ícono en avisos, fondos suaves de sección | `brandSoft`: botón ghost, tab activa, fondo del ícono en avisos |
| wine-100 | `#fce7eb` | borde de avisos y de `FormSection` | — |
| wine-200 | `#f9d0d9` | — | fondo del avatar |
| wine-300 | `#f4a9ba` | — | texto de marca del tema oscuro (sin uso, ver [inconsistencias](visual-system.md#inconsistencias-conocidas)) |
| wine-500 | `#df4d72` | outline global de foco, anillo de foco de botones y campos | `brandAccent`/`brandMuted`: íconos del detalle de una ruta y borde de `WineryCard` |
| wine-600 | `#cb2d5d` | relleno del slider de rango | `brandPrimaryHover`, `tasteAttributeColors.tannin` |
| wine-700 | `#ab214c` | botón primario, borde y texto del botón secundario, enlaces, página actual, marca de carga, acento de avisos | `brand`: botón primario, tab activa, chip seleccionado, enlaces; `borderFocus`: borde y brillo de foco del campo |
| wine-800 | `#8f1e43` | hover del botón primario | `brandPrimaryPressed`: el único color de presionado; iniciales del avatar |
| wine-900 | `#7a1d3e` | acento del aviso de error, final del degradé de `PageBanner` | `brandDeep`: tinte de sombra de toasts y de marca (`shadowColors.brand`) |
| wine-950 | `#440b1e` | tinte de la sombra de toasts y cards, centro del degradé de `PageBanner` | — |

Fuentes: web [`tailwind.css`](../../../../frontend-react/src/shared/assets/styles/tailwind.css)
(`@theme`, Tailwind CSS 4), app [`tokens.ts`](../../../../frontend-mobile/src/shared/theme/tokens.ts)
(`wine`).

Reglas:

- El borgoña significa acción, selección y marca. Nunca significa error.
- Un solo botón borgoña relleno por contexto. Las acciones secundarias usan las
  variantes outline, secondary o ghost.
- El texto largo queda neutro. El texto borgoña es para enlaces, etiquetas y
  acentos breves.

### Neutros y superficies

La web redefine la escala `gray` de Tailwind como neutros cálidos en `@theme`,
así cada utilidad `gray-*` se apoya sobre el papel crema sin tinte azul:
`gray-50` `#faf8f6`, `100` `#f4f1ee`, `200` `#e8e2dc`, `300` `#d6cec6`, `400`
`#a59b93`, `500` `#6f6762`, `600` `#57504b`, `700` `#443d39`, `800` `#2c2522`,
`900` `#1f1a18`, `950` `#110d0c`.

| Rol | Web (token semántico, `@theme`) | App (`lightTokens`, valores `neutral` de Tailwind) |
|---|---|---|
| Fondo de página | `canvas` `#f4eee6` (crema cálido) en `body` y `AppShell` | `bgBase` `#ffffff`; escenas de tabs `vinnotColors.canvas` `#FAFAFA` |
| Superficie de card / sheet | `surface` `#ffffff` | `surfaceDefault` `#ffffff` |
| Superficie sutil | `surface-cream` `#fbf7f2`, `gray-50`, `gray-100` | `bgSubtle` `#fafafa`, `bgMuted` wine-50 |
| Texto principal | `ink` `#2b2226`, `gray-900` | `textPrimary` `#171717` |
| Texto secundario | `muted` `#6b5d58`, `gray-600`, `gray-500` | `textSecondary` `#525252`, `textTertiary` `#737373` |
| Placeholder / deshabilitado | `gray-400` | `inputPlaceholder`, `textDisabled` `#a3a3a3` |
| Borde | `border` `#e7ddd3` (también el valor de un `border` sin color), campos `field` `#d6cec6` | `borderDefault` `#e5e5e5`, `inputBorder` `#d4d4d4` |
| Overlay | `bg-black/50` | `surfaceOverlay` `rgba(23, 23, 23, 0.56)` |
| Header / banda oscura | header `gray-900/95`; `PageBanner` `from-gray-900 via-wine-950 to-wine-900` | — |
| Puntuación | copas de acuarela por tipo de vino, llenas por fracción | copas de acuarela por tipo de vino, llenas por fracción |

Una regla base en `tailwind.css` fija `border-color: var(--color-border)` en
todos los elementos, porque Tailwind CSS 4 dibuja un `border` sin color en
`currentColor`.

### Paleta de la app

La app tiene una sola paleta. [`tokens.ts`](../../../../frontend-mobile/src/shared/theme/tokens.ts)
guarda todos los valores: las escalas `wine` y `neutral`, `systemColors` y los
`lightTokens` semánticos (`bg*`, `surface*`, `text*`, `border*`, `brand*`, `tab*`,
`input*`). [`vinnotTheme.ts`](../../../../frontend-mobile/src/shared/theme/vinnotTheme.ts)
conserva los nombres de `vinnotColors` (`brand`, `ink`, `muted`, `danger`…) como
alias de esos tokens y no tiene ningún hex propio; un test verifica que cada
alias esté en la paleta. Hay un solo color de presionado (`brandPrimaryPressed`,
wine-800) y un solo color de foco (`borderFocus`, wine-700). Los colores
`editorial` son solo del tema oscuro; las pantallas claras usan `bgMuted`,
`brandTint` o `surfaceDefault`.

### Mapas de acento de la app

Los acentos de contenido también viven en `tokens.ts`, así ninguna pantalla
mantiene su propio mapa:

| Mapa | Uso |
|---|---|
| `wineTypeColors`, `wineTypeColor(type)` | badges de tipo de vino: texto, tinte y borde por tipo, AA sobre blanco y sobre el tinte; un tipo desconocido usa el tinto |
| `wineTypeSwatches`, `wineTypeSwatch(type)` | un color saturado por tipo para gráficos, como la mezcla de tipos de la cava; un tipo desconocido usa gris `#A39A94` |
| `adminSectionAccent` | acento del hero y de las métricas del dashboard por sección (`AdminPageHero section`, que también elige el ícono de la sección, el mismo del dashboard), el texto blanco pasa AA |
| `tasteAttributeColors` | barras de dulzor, acidez, tanino y cuerpo en el perfil de IA y su editor |
| `profileTagColors` | familias de etiquetas del perfil de IA |
| `shadowColors` | `soft` (neutral-900), `brand` (wine-900), `deep` (wine-950) |
| `iconStrokes` | `thin` 1,75, `regular` 2, `strong` 2,4, `heavy` 3 |

[`grapeColors.ts`](../../../../frontend-mobile/src/presentation/features/home/grapeColors.ts)
(`grapeGradient`) pinta las píldoras de cepas populares del inicio con un degradé
del color de cada vino. El texto es blanco si pasa 4,5:1 sobre los dos extremos y
marrón oscuro si no; una cepa sin paleta usa la píldora neutra.

### Colores de estado

| Estado | App (`systemColors`) | Web (Tailwind) |
|---|---|---|
| Éxito | `success` y `successText` `#047857`, `successLight` `#ecfdf5`, `successBorder` | `success` `#047857`, `success-soft` `#ecf8f3` |
| Advertencia | `warning` `#d97706` (relleno), `warningLight` `#fffbeb`, `warningText` `#b45309` | `warning` `#b45309`, `warning-soft` `#fdf5e9`; también el acento del aviso de advertencia |
| Peligro | `danger` `#dc2626` (también `textDanger`, `borderDanger`), `dangerLight` `#fef2f2`, `dangerBorder`, `dangerText` `#b91c1c` | `danger` `#b91c1c` (botón danger, error y borde inválido de campo), `danger-soft` `#fdf0ef` |
| Información | `info` `#3b82f6`, `infoLight`, `infoText` `#1d4ed8` | `info` `#2b5c8a`, `info-soft` `#eef3f8` |

En la web cada token de estado pasa AA como texto sobre blanco y sobre su propio
tinte suave. En la app `success` y `danger` pasan AA como texto sobre blanco;
`warning` es un relleno, su texto usa `warningText`.

Los avisos y toasts mantienen el tinte de marca en todas las variantes: el
ícono, el rol y el texto llevan el significado, no el tono (`AlertBanner`,
`FeedbackNotice`). El color de estado va en badges, errores de campo y botones
destructivos.

### Contraste medido

Relaciones sobre la superficie real (fórmula WCAG 2.x). AA exige 4,5:1 para
texto normal y 3:1 para texto grande y partes de UI.

| Par | Relación | Resultado |
|---|---|---|
| wine-700 sobre blanco / blanco sobre wine-700 | 6,88 | AA texto |
| wine-700 sobre wine-50 | 6,28 | AA texto |
| wine-500 sobre blanco | 3,86 | solo texto grande y UI |
| `#737373` sobre blanco | 4,74 | AA texto |
| `#a3a3a3` / `gray-400` sobre blanco | 2,5 | solo placeholder o decoración |
| `danger` de la app `#dc2626` sobre blanco / blanco sobre él | 4,83 | AA texto |
| `success` de la app `#047857` sobre blanco | 5,48 | AA texto |
| `gray-500` web `#6f6762` sobre el fondo `#f4eee6` / sobre blanco | 4,80 / 5,54 | AA texto |
| `muted` web `#6b5d58` sobre el fondo | 5,47 | AA texto |
| `ink` web `#2b2226` sobre el fondo | 13,40 | AA texto |
| `rating` web `#a16207` sobre blanco | 4,92 | AA texto |
| `success` / `warning` / `danger` / `info` web sobre blanco | 5,48 / 5,02 / 6,47 / 7,00 | AA texto |
| `gray-400` web `#a59b93` sobre blanco | 2,72 | solo placeholder o decoración |

## Tipografía

**Poppins es la única familia en ambas plataformas**, pesos 400, 500, 600 y 700.

- Web: archivos WOFF2 propios declarados en
  [`globals.css`](../../../../frontend-react/src/shared/assets/styles/globals.css)
  con `font-display: swap`; `--font-sans` de Tailwind apunta a Poppins.
- App: `@expo-google-fonts/poppins` cargado en
  [`_layout.tsx`](../../../../frontend-mobile/app/_layout.tsx); los componentes
  usan `fontFamilies` de [`typography.ts`](../../../../frontend-mobile/src/shared/theme/typography.ts).

### Presets de la app (`textStyles`)

| Preset | Peso | Tamaño / interlineado | Uso |
|---|---|---|---|
| `displayLarge` / `displayMedium` | 700 | 48 / 55, 40 / 46 | números de hero y títulos de tamaño splash |
| `displaySmall` | 600 | 32 / 40 | títulos editoriales grandes |
| `headingLarge` | 600 | 28 / 35 | título hero de pantalla |
| `headingMedium` | 600 | 24 / 30 | título de `AppHeader` |
| `headingSmall` | 500 | 20 / 30 | encabezado de sección, título de estado |
| `titleLarge` / `titleMedium` / `titleSmall` | 600 / 500 / 500 | 18, 16, 13 | títulos de card, filas de lista |
| `bodyLarge` / `bodyMedium` / `bodySmall` | 400 | 16 / 26, 15 / 24, 13 / 21 | texto de lectura; `bodyMedium` es el predeterminado |
| `labelLarge` / `labelMedium` / `labelSmall` | 600 / 500 / 500 | 13, 12, 10 | chips, badges, metadatos |
| `wineName` | 600 | 24 / 30 | nombre del vino en el detalle |
| `caption` | 400 | 12 / 19,5 | ayuda y error de campo, subtítulos |
| `overline` | 600 | 10 | `TagPill` (mayúsculas) |
| `button` / `buttonSmall` | 600 | 15, 12 | etiquetas de botón |

Todos los letter spacing de la app son 0. Además de los presets, `fontSizes`
tiene `meta` 11 (líneas de metadatos de cards) y `ui` 14 (controles densos);
las pantallas usan esos pasos en lugar de tamaños literales.

### Escala web

La web usa la escala predeterminada de Tailwind CSS 4 (`text-xs` 12 px,
`text-sm` 14, `text-base` 16, `text-lg` 18, `text-xl` 20, `text-2xl` 24,
`text-3xl` 30) más `text-2xs` (11 px / 16 px), el tamaño más chico en uso. No
hay texto de 10 px ni familia serif. Los patrones en uso:

| Rol | Clases |
|---|---|
| Título de página (`h1`) | `PageBanner`: `text-2xl sm:text-3xl font-semibold tracking-tight`, blanco sobre la banda oscura |
| Antetítulo, contadores | `text-2xs font-semibold uppercase` con tracking amplio |
| Título de sección | `text-lg font-semibold` o `text-xl font-semibold` |
| Título de card | `text-lg font-semibold text-ink` (`CardHeader`) |
| Cuerpo | `text-sm` en UI densa, `text-base leading-relaxed` en bloques de lectura |
| Etiqueta de campo | `text-sm font-medium text-gray-700` |
| Ayuda / error | `text-xs text-gray-500` / `text-xs text-danger` |

Reglas:

- Un solo título principal por pantalla. Los títulos de sección y las
  etiquetas nunca compiten con el nombre del vino.
- El texto queda como texto real; nunca se pinta dentro de una ilustración.
- Los layouts toleran las longitudes de español e inglés y tamaños de fuente
  del sistema más grandes.

## Espaciado

Ambas plataformas usan una base de 4 puntos.

| | Web | App |
|---|---|---|
| Escala | spacing de Tailwind (`1` = 4 px) | `spacing` en `tokens.ts`: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24 … 96 |
| Margen lateral de pantalla | `px-3 sm:px-6 lg:px-8` | `layout.screenHorizontalPadding` 20 |
| Arriba/abajo de pantalla | `py-5 sm:py-8` | `layout.screenVerticalPadding` 24; abajo suma el inset de safe area + 24 |
| Padding de card | `Card` `p-3` / `p-5` (predeterminado) / `p-8` | `Card` 16 (`layout.cardPadding`) |
| Separación entre secciones | `space-y-*`, `gap-*` por página | `layout.sectionGap` 32 |
| Pila de campos | `gap-1` etiqueta/input; formularios `space-y-4` | `TextField` gap 7; contenido de `FormSection` gap 14 |

## Radios

| Elemento | Web | App |
|---|---|---|
| Botón | `rounded-xl` (12 px) | `radii.md` 8 (todos los tamaños; `AuthButton` igual) |
| Input / select / área de texto | `rounded-xl` (12 px) | 8 |
| Card | `rounded-2xl` (16 px) | `radii.md` 8 por defecto |
| Banda de página, card del recorrido de IA | `rounded-2xl`, `rounded-3xl` | — |
| Panel de modal | `rounded-xl` | — |
| Sección de formulario, ilustración | `rounded-2xl` (16 px) | `FormSection` 20 |
| Aviso / toast | 20 px | 20 |
| Bottom sheet | — | esquinas superiores 24 |
| Barra de tabs | — | esquinas superiores `radii["3xl"]` 24, ítem `radii.lg` 12 |
| Chip, badge, pill, avatar | `rounded-full` | `radii.full` |

Escala de la app (`radii`): `xs` 2, `sm` 4, `md` 8, `lg` 12, `xl` 16, `2xl` 20,
`3xl` 24, `4xl` 32, `full`.

## Elevación y capas

| Nivel | Web | App ([`shadows.ts`](../../../../frontend-mobile/src/shared/theme/shadows.ts)) |
|---|---|---|
| Chico: inputs, chips, botones | `shadow-sm` | `shadows.sm` (elevation Android 1) |
| Card | `shadow-sm` con tinte wine-950 al 5 % en `Card` | `Card` usa `sm` por defecto; `md` (elevation 3) disponible para filas elevadas |
| Fijo / elevado | header `shadow-lg` | `shadows.lg` (elevation 8) |
| Sheet / flotante | modal `shadow-xl` | `shadows.xl` (elevation 12); barra de tabs elevation 10 |
| Overlay | — | `shadows["2xl"]` (elevation 20) |
| Toast | `0 8px 28px -10px rgb(68 11 30 / 18%)` | sombra `brandDeep` (wine-900 `#7a1d3e`), elevation 8 |

Las sombras de la app usan `shadowColors.soft` (neutral-900) en iOS y
`elevation` en Android; ninguna pantalla fija un color de sombra literal. Un `Chip`
seleccionado suma un brillo borgoña.

Capas: el header web y los modales usan `z-50` (los modales se montan con portal
en `body`, después de la raíz de la app) y los toasts `z-index: 10000`. La app
define tokens `zIndex` (`raised` 10 … `modal` 50, `toast` 60); el host de
toasts usa 9999.

## Iconografía

| | Web | App |
|---|---|---|
| Íconos de UI | `lucide-react` a través del [`Icon`](../../../../frontend-react/src/presentation/components/ui/Icon.tsx) compartido | `lucide-react-native` (106 archivos) |
| Íconos de navegación | claves `NavigationIcon` en [`navigation.ts`](../../../../frontend-react/src/shared/config/navigation.ts), dibujadas por [`navIcons.ts`](../../../../frontend-react/src/presentation/components/layout/navIcons.ts) | Lucide en la barra de tabs |
| SVG propios | `SocialIcons`, el anillo de progreso de IA | `SocialIcons`, anillo de progreso de IA |

Los archivos del pack Reshot "Winery Flat Icons" en
[`public/images/icons`](../../../../frontend-react/public/images/icons) ya no
los dibujan el header, el drawer, el footer, la carga de IA ni el panel de admin.

Escala de tamaños web (`Icon size`), con un solo grosor de trazo para todos los
íconos (`ICON_STROKE` 1,75):

| Paso | Tamaño | Junto a |
|---|---|---|
| `xs` | 14 px | `text-xs`, `text-2xs` |
| `sm` (predeterminado) | 16 px | `text-sm`, navegación, menús |
| `md` | 20 px | `text-base`, botones, campos, botón de menú |
| `lg` | 24 px | `text-lg` a `text-xl`, marcas de sección |
| `xl` | 32 px | títulos y estados vacíos |

Tamaños en uso en la app; los trazos salen de `iconStrokes` (`thin` 1,75,
`regular` 2, `strong` 2,4, `heavy` 3):

| Contexto | App |
|---|---|
| En línea con texto | 14–18 |
| Botones, campos, avisos | 18–20, trazo `thin` en avisos |
| Cerrar en avisos | 17 |
| Barra de tabs | 22, 23 enfocado (`regular` / `strong`) |
| Volver (`BackButton`) | 18, `regular` |

Reglas:

- Los íconos de UI nuevos salen de Lucide, dibujados con `Icon` en la web. No
  se dibuja un SVG inline nuevo para un ícono que Lucide ya tiene.
- Un control con solo ícono tiene nombre accesible (`aria-label` /
  `accessibilityLabel`). `Icon` es decorativo salvo que reciba `label`.
- Los íconos decorativos se ocultan a la tecnología asistiva (`aria-hidden`,
  `accessibilityElementsHidden`, `alt=""`). Un ícono junto a su etiqueta
  visible no la repite.
- Un ícono nunca comunica un estado solo; lo acompañan texto o rol.

## Movimiento

Cada animación, con sus tiempos, su comportamiento con movimiento reducido y
su vista previa, está en el [catálogo de movimiento](motion.md). Estas son las
reglas compartidas.

| Patrón | Web | App |
|---|---|---|
| Transiciones de controles | cambios de color y sombra de 150 ms (`transition-default`, `Button`, campos, `Pagination`) | `durations.fast` 120 ms |
| Respuesta en hover y al presionar | cambio de color, más una escala o elevación leve: `RatingStars` crece al 110 %, las tarjetas de vino y de evento se elevan 4 px y las de rutas 6 px con la imagen al 105 %, los botones del hero del inicio suben 2 px, el sello de puntos crece a 1,04, los enlaces del menú lateral se achican al presionar (`active:scale`) | `Button` escala a 0,96 y `PressableCard` a 0,98 en 120 ms (solo duración, curva predeterminada de Reanimated); `MotionPressable` usa un resorte hasta 0,975 |
| Hápticos | — | impacto en `Button`, selección en `PressableCard` (`hapticsService`) |
| Aviso / toast | entrada 240 ms (`translateY -8 → 0`), salida 180 ms | mismos tiempos |
| Sheet | — | animación predeterminada de `@gorhom/bottom-sheet` |
| Marca de carga | ciclo CSS de 3,4 s | ciclo Reanimated de 3,4 s |
| Skeleton | `animate-pulse` (2 s) | loop de opacidad de 1,2 s (600 ms en cada sentido) con el ease-in-out predeterminado de `Animated` |
| Carga de IA | escenas en acuarela (`AiProcessScene`), ver [imágenes](imagery.md#escenas-de-carga-de-ia) | escenas en acuarela, ver [imágenes](imagery.md#escenas-de-carga-de-ia) |

Los tokens de la app están en [`motion.ts`](../../../../frontend-mobile/src/shared/theme/motion.ts):

- `durations`: `instant` 0, `fast` 120, `normal` 200, `slow` 320, `slower`
  480, `sluggish` 600 (ms).
- `easings`: `standard` y `emphasized` `bezier(0.2, 0, 0, 1)`, `enter`
  `bezier(0, 0, 0.2, 1)`, `exit` `bezier(0.4, 0, 1, 1)`, `spring`
  `bezier(0.34, 1.56, 0.64, 1)`, `elastic` `elastic(1.2)`, `linear`.
- `motionPresets`: `buttonPress`, `cardPress`, `fadeIn`, `screenTransition`,
  `sheetSnap`, `tabIndicator`, `skeleton` (1200 ms). `Button` y
  `PressableCard` leen solo la duración y la escala del preset; `Skeleton` lee
  solo su duración.
- `springConfigs` para `withSpring`: `gentle` (damping 20, stiffness 150,
  mass 1), `bouncy` (12, 200, 0,8), `snappy` (25, 300, 0,8), `stiff` (30, 400,
  1).

Movimiento reducido:

- Web: `prefers-reduced-motion` detiene los avisos, la marca de uvas (muestra
  la marca completa y estática), los skeletons y pulsos, los spinners chicos,
  las escenas de IA (cada parte en su pose final, con `useReducedMotion`, que
  sigue los cambios en vivo), el arte del perfil, el termómetro y las barras
  del paladar, las burbujas y la demostración de la calificación con botella,
  los sellos (quietos, con un brillo fijo), el revelado de nivel (en su lugar,
  un fundido de 0,4 s), el selector de fecha y hora, el revelado del hero del
  inicio (estado final de inmediato), el deslizamiento y el escalonado del
  menú lateral, la elevación de tarjetas y el zoom de imágenes, los efectos de
  hover del inicio y del sello, las transiciones de ancho de barras y los desplazamientos suaves
  (instantáneos). Las transiciones de color y sombra se mantienen, porque no
  mueven nada. Quedan dos efectos menores: la estrella de calificación todavía
  crece en hover sin transición, y la escala al presionar los enlaces del menú
  lateral sigue animada.
- App: Reanimated sigue el ajuste del sistema, de modo que las entradas, las
  escalas al presionar, los resortes, las escenas de IA, el arte del perfil,
  los sellos y el control de calificación muestran su estado final; los toasts
  y `Skeleton` leen `AccessibilityInfo.isReduceMotionEnabled` y aparecen sin
  desplazamiento; los deslizamientos del stack y de `Modal` pasan a ser
  fundidos; las imágenes de `expo-image` aparecen sin fundido.
  `ActivityIndicator` sigue girando, igual que los indicadores de actividad de
  Apple, porque es un indicador de progreso esencial. La cámara del mapa
  conserva su animación nativa.
- El movimiento explica un cambio de estado. Nunca simula progreso ni
  finalización.
