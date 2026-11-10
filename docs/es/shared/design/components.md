# Componentes compartidos

Las piezas de cada pantalla y cuándo usar cada una. Los componentes web están en
[`frontend-react/src/presentation/components`](../../../../frontend-react/src/presentation/components);
los de la app en [`frontend-mobile/src/presentation/components`](../../../../frontend-mobile/src/presentation/components).
Se recurre a ellos antes de escribir markup o estilos nuevos.

Parte del [sistema visual](visual-system.md).

## Elegir el componente

| Se necesita… | Web | App |
|---|---|---|
| Disparar una acción | `Button` | `Button` |
| Navegar con aspecto de botón | `LinkButton` (`to` o `href`; nunca un link que envuelve un botón) | `Button` con navegación en `onPress` |
| Hacer tocable una card completa | link o botón que envuelve la card | `PressableCard`, `MotionPressable` |
| Volver a la pantalla anterior | `back` de `PageBanner` | `BackButton` (ruta `fallback`), `AppHeader showBack` |
| Activar o desactivar una opción | — | `ToggleRow` (fila con etiqueta), `Switch` (colores de marca) |
| Actualizar una lista deslizando | — | `BrandRefreshControl` |
| Pedir texto | `Input`, `Textarea`, `Select`, `VintageSelect`, `PhoneNumberField`; los campos directos usan `fieldClassName` | `TextField`, `SearchField`, `VintageField`, `PhoneNumberField` |
| Agrupar un formulario largo | `FormSection` | `FormSection` |
| Buscar y filtrar una lista | filtros en la página | `SearchFilterBar` + `FilterSheet` |
| Mostrar un formulario o detalle sobre la pantalla | `Modal` | `BottomSheetModal` |
| Preguntar antes de un paso destructivo | `useConfirm()` → `ConfirmDialog` | `Alert.alert` con un botón `destructive` |
| Informar el resultado de una acción | `useToast()` | `useToast()` |
| Dejar un mensaje en la página | `AlertBanner` | `FeedbackNotice` |
| Mostrar que una lectura falló | `QueryErrorState` | `QueryErrorState` |
| Mostrar una lista vacía | `EmptyState` con una `illustration` en acuarela y una acción | `EmptyState` con una `illustration` en acuarela, o `IllustratedState` |
| Mostrar la primera carga | `PageLoader` (marca de uvas) para una página o un bloque grande, skeleton con la forma del layout para listas, `Spinner` dentro de un control | `Skeleton`, `Spinner` |
| Etiquetar una añada | `VintagePill` | `VintagePill` |
| Mostrar un estado o categoría | clases de pill inline sobre los tokens de estado | `Badge`, `TagPill`, `Chip` |
| Titular una página | `PageBanner` (admin: `AdminPageHeader`, construido sobre él) | `BrowseScreenHeader` en las pestañas Vinos, Eventos y Rutas; `AppHeader`, hero de pantalla |
| Paginar una lista | `Pagination` (oculta con una sola página) | listas infinitas |
| Mostrar o elegir una puntuación | Copas de acuarela que se llenan por fracción; control de la botella para elegir | Copas de acuarela que se llenan por fracción; control de la botella para elegir |
| Mostrar el sello de una persona | `UserBadge` (CSS) | `UserBadge` (Skia y Reanimated) |
| Dibujar un ícono de UI | `Icon` | Lucide directo |

## Botones

| Variante | Web ([`Button.tsx`](../../../../frontend-react/src/presentation/components/ui/Button.tsx)) | App ([`Button.tsx`](../../../../frontend-mobile/src/presentation/components/ui/Button.tsx)) | Uso |
|---|---|---|---|
| `primary` | relleno wine-700, texto blanco, hover wine-800 | relleno wine-700, texto blanco | la única acción principal |
| `secondary` | blanco con borde y texto borgoña, hover wine-50 | blanco con borde | la alternativa borgoña junto a un primario |
| `outline` | blanco con borde gris cálido | blanco con borde y texto borgoña | alternativa reversible, cancelar en diálogos, acción de estado vacío |
| `ghost` | transparente, texto gris, hover wine-50 | relleno wine-50, texto borgoña | acción de bajo énfasis |
| `danger` | relleno `danger` (`#b91c1c`) | relleno `danger` (`#dc2626`) | eliminar, revocar, salir con pérdida |
| `link` | texto borgoña subrayado, sin caja | — | una acción de texto dentro de una frase o una card ("Ver todo") |
| `onDark` | blanco translúcido sobre bandas oscuras | — | acciones sobre `PageBanner`, el header y el drawer |

Web: todas las variantes salvo `link` son `rounded-xl`; tamaños `sm` (36 px),
`md` (44 px, predeterminado) y `lg` (48 px). `LinkButton` le da a un link el
mismo aspecto (comparten `buttonClassName`), así la navegación sigue siendo un
link. En la app los tamaños son `sm` (36 pt más 4 pt de hit
slop, o sea 44 pt al tocar), `md` (48 pt, predeterminado) y `lg` (56 pt); todos
usan `radii.md` (8) y los presets `textStyles.button` / `buttonSmall`. El
`AuthButton` de las pantallas de acceso es el `Button` grande a ancho completo. La carga (`isLoading` en web,
`loading` en la app) muestra un spinner, deshabilita el botón y conserva su
tamaño; la app además informa `busy` a la tecnología asistiva. Deshabilitado es
50 % (web) / 45 % (app) de opacidad.

Hacer:

- Un solo botón primario por pantalla, sección o diálogo.
- Poner la acción destructiva al final y confirmarla antes (ver [Superposiciones](#superposiciones-sheets-modales-y-diálogos)).
- Bloquear el envío doble: el estado de carga en web; en la app,
  `useSingleAction` mantiene una intención pendiente durante la
  reautenticación y el reintento.
- Dimensionar el botón según su etiqueta en ambos idiomas.

Evitar:

- Usar borgoña para una acción destructiva o rojo para una neutra.
- Ocultar por qué un botón está deshabilitado cuando no es obvio; se explica
  junto al botón.
- Poner un botón primario dentro de un toast o de un aviso.

## Campos

| Comportamiento | Web `Input` / `Textarea` / `Select` | App `TextField` |
|---|---|---|
| Etiqueta | `<label htmlFor>` persistente | etiqueta persistente arriba; enfocada se vuelve wine-700 (AA) |
| Obligatorio | — | `required` agrega ` *` |
| Ayuda | `hint`, `text-xs text-gray-500`, enlazada con `aria-describedby` | `hint`, caption, leída como accessibility hint |
| Error | `error`, `text-xs text-danger`, `aria-invalid`, `aria-describedby` | `error` reemplaza la ayuda, borde rojo, rol `alert`, live region |
| Foco | borde wine-500 + anillo borgoña al 20 %, igual en todos los campos | borde wine-700 (`borderFocus`, el único color de foco); brillo en iOS |
| Altura | `min-h-11` (44 px), `rounded-xl`, borde cálido `field`; `size="sm"` 36 px para filtros densos |
| Select | chevron de Lucide, `tone="onDark"` para bandas oscuras, `options` o hijos `<option>` | — | mínimo 48 pt |

Dentro de un `BottomSheetModal`, `TextField` y `SearchField` pasan solos al
input del sheet (`SheetInputContext`), para que el sheet mantenga el campo
enfocado sobre el teclado. No se usa un `TextInput` directo dentro de un sheet.

Hacer:

- Mantener visible la etiqueta; el placeholder es un ejemplo, no una etiqueta.
- Validar por campo y conservar el valor que escribió el usuario.
- Definir `autoComplete` / `textContentType` y el tipo de teclado.

Evitar:

- Un resumen a nivel formulario para errores que pertenecen a un campo.
- Vaciar un campo cuando falla el envío.

## Cards y secciones

- `Card` web ([`Card.tsx`](../../../../frontend-react/src/presentation/components/ui/Card.tsx)):
  blanca, `rounded-2xl`, `border` cálido, `shadow-sm`; padding `sm`/`md`/`lg`;
  `CardHeader` para título, subtítulo y una acción.
- `Card` / `PressableCard` de la app ([`Card.tsx`](../../../../frontend-mobile/src/presentation/components/ui/Card.tsx)):
  blanca, con borde, `radii.md` (8), sombra `sm`; `PressableCard` escala a 0,98 y da
  háptico de selección.
- `FormSection` (ambas): sección plegable de un formulario largo con título,
  resumen, estado `aria-expanded` / `expanded` y borde de inválido.

Las cards de vino ponen primero la imagen, luego el nombre comercial, la bodega,
el origen, el tipo y la cepa, la puntuación y la acción. El fallback de imagen
conserva el marco. Un link de card completa puede contener botones internos que
detienen la propagación y tienen nombre propio. Un "0 reseñas" nunca es el
elemento más destacado.

## Chips, badges y pills

Aplica a la app; la web usa clases de pill inline sobre los tokens de estado,
salvo `VintagePill`, que comparten ambas plataformas, la puntuación con copas y el sello
(`UserBadge`), que también existen en las dos:

| Componente | Uso | Notas |
|---|---|---|
| `Chip` | filtro u opción seleccionable | `selected` rellena en borgoña; `role="radio"` para una sola opción de un grupo (motivos de denuncia, estados) expone `checked`; un hit slop de 5 pt llega a 44 pt |
| `Badge` | etiqueta de estado | variantes `default`, `success`, `warning`, `danger`, `info`, `brand` |
| `TagPill` | etiqueta de categoría en mayúsculas | texto `overline` |
| `VintagePill` | la añada catada en reseñas y notas de bodega | ambas plataformas |
| Puntuación con copas | una puntuación para leer, en ambas plataformas | cinco copas de acuarela; cada una se llena según su fracción (2.2 son dos llenas y 0.2 de la tercera). Copa, vino y botella siguen el tipo de vino como `wineSceneLook`; un tipo desconocido usa tinto. La flauta muestra burbujas en las copas llenas |
| Control de la botella | elegir una puntuación de 0.1 a 5.0, en ambas plataformas | sin puntuar, la botella aparece parada y tapada a la izquierda de las copas y la lectura dice `0.0 / 5`; al aparecer el control se descorcha sola, una vez, como en la escena del perfil IA (sacacorchos para los vinos tranquilos; para el espumante sale la jaula y salta el corcho), y queda abierta en su lugar. Así, al puntuar, las copas y la barra se mueven juntas desde el primer toque; si se toca antes de que termine, el descorche se completa al instante. Con movimiento reducido ya aparece destapada. El primer movimiento la levanta sobre la primera copa y sirve. La botella mide 1.3 alturas de copa y guarda el vino que falta servir: se vacía a medida que se llenan las copas y se vuelve a llenar al bajar el puntaje, con la superficie del vino siempre horizontal. En el móvil el control ocupa todo el ancho de la tarjeta y las copas se reparten (hasta 1.2 alturas de copa entre centros); en la web las copas van juntas. Al llegar a 5.0, tras servir la última copa, vuelve a su lugar parada, destapada y vacía. Parada proyecta una sombra corta de apoyo; en la mano, una más larga. Mientras se puntúa, la botella sigue el dedo o el puntero de copa en copa: al subir se inclina (118°) con el pico apenas sobre el borde izquierdo de la copa que se llena y sirve un chorro del color del vino, que entra por la boca de la copa y baja junto a la pared; al pasar a la copa siguiente la botella se traslada y recién ahí vuelve a servir; al bajar se levanta (62°) y las copas se vacían. Tocar una copa también fija el puntaje. Es un control deslizante accesible (pasos de 0.1; en la web flechas ±0.1, Re Pág/Av Pág ±0.5, Inicio/Fin) con la lectura grande `3.6 / 5`. En el formulario de reseña la etiqueta lleva `*` y una nota gris indica que los campos con (*) son obligatorios. Debajo de las copas hay una barra deslizante alineada con ellas: cada puntaje entero cae debajo del centro de su copa (1 bajo la primera, 5 bajo la última) y el 0 queda a la altura de la botella, así que con la barra llena el cursor está debajo de la última copa llena. El cursor es una copa del mismo tipo de vino, centrada sobre la barra, que se llena según el puntaje, y la barra se pinta hasta el cursor con un degradé del color del vino, del tono profundo al borde, como las píldoras de cepa del inicio. La lectura grande del puntaje va al final de la barra (en el móvil, en una línea propia justo debajo, alineada a la derecha). Arrastrar o tocar la barra fija el puntaje con los mismos pasos y hace la misma animación de la botella; mover la botella mueve la barra. La barra está oculta para lectores de pantalla, porque el control de la botella ya es el deslizante accesible. Hasta que se toca el control o la barra, una línea gris clara debajo dice «Deslizá la botella o la barra para puntuar». Mientras el dispositivo o el navegador haya puntuado menos de tres veces, cada vez que el control se abre sin puntuar y tras el descorche, una copia translúcida de la botella (sin sombra) sale de su lugar, pasa sobre las copas inclinada para servir y las llena apenas hasta 2.5, y se desvanece; mientras tanto una copita translúcida recorre la barra al mismo nivel; se repite dos veces, se corta al primer toque, nunca puntúa y no aparece con movimiento reducido |
| `UserBadge` | el sello de una persona junto a su nombre o en el perfil | arte del nivel con su animación, recortada con la forma del sello. En listas se anima al aparecer y cada 8 a 16 s, sin destellos por debajo de 40 px; en el perfil, siempre; con movimiento reducido queda quieto con un reflejo fijo ([Puntos y sellos](../../modules/gamification/README.md#interfaz)) |
| `Avatar` | foto o iniciales del usuario | fondo wine-200; nombre traducido ("Avatar de Ana") |

## Superposiciones: sheets, modales y diálogos

| Situación | Web | App |
|---|---|---|
| Formulario, detalle o tarea de varios pasos | `Modal` ([`Modal.tsx`](../../../../frontend-react/src/presentation/components/ui/Modal.tsx)) | `BottomSheetModal` ([`BottomSheet.tsx`](../../../../frontend-mobile/src/presentation/components/ui/BottomSheet.tsx)) con `BottomSheetScrollView` |
| Filtros | filtros inline en la página | `FilterSheet` (`Modal` nativo, sube desde abajo, contador de activos y limpiar) |
| Confirmar un paso destructivo o irreversible | `useConfirm({ variant: 'danger' })`; `typedConfirmation` para una frase escrita | `Alert.alert` con un botón `cancel` y uno `destructive` |
| Diálogo bloqueante que debe quedar sobre todo (reautenticación, eliminar cuenta) | `Modal` | `Modal` de React Native, `transparent`, `animationType="fade"`, fondo con `surfaceOverlay` |
| Captura a pantalla completa (escaneo de etiqueta) | ruta | ruta con `presentation: "fullScreenModal"` |

`Modal` web:

- se monta con portal en `body`, atrapa el foco, cierra con Escape, vuelve
  `inert` la raíz de la app, se apila (solo el diálogo superior está activo) y
  devuelve el foco al cerrar;
- un popover montado encima (capa popper de Radix, como el selector de fecha
  de eventos) conserva el foco y maneja su propio Escape;
- necesita un nombre: `title`, `labelledBy` o `ariaLabel`;
- tamaños `sm` … `2xl` (`max-w-sm` … `max-w-5xl`), `max-h-[90vh]` con scroll
  interno;
- `closeOnBackdrop={false}` donde un clic afuera perdería trabajo.

`BottomSheetModal` de la app:

- se cierra deslizando hacia abajo, con el botón "Volver" del header y con el
  botón atrás de Android; `enablePanDownToClose={false}` desactiva los tres en
  un sheet que no debe cerrarse por accidente;
- teclado: `interactive` en iOS, `fillParent` con `adjustResize` en Android; el
  scroll del sheet vuelve a medir el campo enfocado cuando se abre el teclado;
- respeta la safe area superior (+8 pt) y el inset inferior;
- una pantalla mostrada dentro de un modal nativo envuelve sus sheets en
  `ModalScreenSheetHost` para que aparezcan sobre ese modal.

Hacer:

- Preguntar antes de cerrar un formulario con cambios (confirmación de descarte).
- Separar visualmente el botón destructivo del de cancelar.
- Dar a cada diálogo un título descriptivo.

Evitar:

- Abrir un sheet desde otro sheet; el segundo paso se muestra inline en el
  mismo sheet.
- Usar un modal para un mensaje de éxito; para eso está el toast.

## Toasts y avisos

| | Web | App |
|---|---|---|
| API | `useToast().addToast({ type, message, duration? })` | `useToast().showSuccess / showError / showInfo / showToast(message, variant)` |
| Vista | `ToastContainer` → `AlertBanner` | `ToastProvider` → `FeedbackNotice` |
| Ubicación | arriba a la derecha, hasta 420 px de ancho, debajo de la safe area | arriba, margen lateral de 16 pt, hasta 480 pt de ancho, debajo de la safe area |
| Duración | 6 s errores, 4 s el resto; `duration` la reemplaza; se pausa con hover y foco | 6 s errores, 4 s el resto; no se cierra solo con lector de pantalla activo |
| Pila | todos los toasts pendientes | los últimos 3 |
| Anuncio | rol `alert` para error/advertencia, `status` para el resto | rol `alert` / live region assertive para error/advertencia; iOS lo anuncia con VoiceOver |

`AlertBanner` (web) y `FeedbackNotice` (app) también son el aviso inline: card
blanca, borde wine-100, radio de 20 px, un fondo wine-50 para el ícono Lucide
(`Check`, `CircleAlert`, `TriangleAlert`, `Info`) y un botón de cierre opcional
de 44 px.

El toast es para el resultado de una acción que el usuario acaba de hacer. El
aviso inline es para una condición que sigue vigente mientras el usuario está
en la página. Un error de validación pertenece a su campo, no a un toast.

## Estados de carga, vacío y error

| Estado | Patrón |
|---|---|
| Primera carga de una página | `PageLoader` en web (marca de uvas, anunciada, sin texto "Cargando…" visible); bloques skeleton con la geometría final para listas |
| Carga dentro de un bloque | `PageLoader compact` en web; `Spinner` dentro de un control |
| Espera a nivel marca (inicio, resultados de vinos) | marca de uvas animada |
| Generación con IA | recorrido de IA en acuarela en ambas plataformas ([imágenes](imagery.md#escenas-de-carga-de-ia)) |
| Lista vacía | `EmptyState`: ilustración en acuarela (clave `illustration` en ambas plataformas), título, motivo, una próxima acción (botón `outline` en la app, o `primary` con `action.variant`); con filtros activos la acción los limpia. En la app, `secondaryAction` suma un botón `ghost` debajo: el catálogo de vinos vacío ofrece «Agregá tu vino» y deja «Limpiar» como secundaria |
| Bodega vacía | `IllustratedState kind="emptyCellar"` o `EmptyState illustration="emptyCellar"` |
| Lectura fallida | `QueryErrorState error={…} onRetry={refetch}`: ilustración, título, descripción y "Reintentar" |
| Falló la ruta completa | `IllustratedState` a tamaño completo; `RouteErrorBoundary` en web |

`QueryErrorState` es solo para lecturas. Una mutación fallida mantiene su propia
recuperación: conserva el formulario, muestra el error y permite reenviar. El
reintento se oculta para `session`, `forbidden` y `notFound`, donde reintentar
no ayuda.

## Visualización de datos del vino

- **Perfil de sabor** (`WineTasteProfile` en ambas plataformas): una fila por
  atributo (cuerpo, taninos, dulzor, acidez) con su nombre, una barra de 0 a
  100 en su tono de `tasteAttributeColors` en la app (dulzor rosa empolvado,
  acidez oliva, tanino wine-600, cuerpo ocre; cada uno con al menos 3:1 sobre
  blanco), wine-400/500 en la web, y las dos palabras de los extremos (por ejemplo ligero ↔
  pleno). Un puntaje de 0 dibuja igual una marca chica (`sensoryBarWidth`,
  mínimo 3 %) para que el origen se vea. Cada barra es un `progressbar` con su
  valor. Si el vino no tiene ningún puntaje, la ficha no muestra la tarjeta
  (`hasTasteScores` en ambas plataformas).
- **Comparación** (`WineComparisonAttributeTable` en la app, `WineComparePage`
  en la web): los dos vinos se nombran en una leyenda antes de las filas; cada
  atributo muestra ambos valores y un eje con el vino A a la izquierda y el
  vino B a la derecha de un punto medio, así la posición muestra la diferencia.
  En la app, las pantallas angostas o el texto grande (ancho / escala de fuente
  menor a 380) apilan los valores.
- El color nunca es la única codificación: nombre, valor y largo de barra van
  juntos, y ambos vinos usan la misma escala.

## Navegación y headers

- Web: un header oscuro cálido fijo (`bg-gray-900/95`, 56 px, interior
  `max-w-7xl`) con la marca en blanco e íconos Lucide; navegación de escritorio
  desde `lg`, un drawer (`AppSidebar`) debajo de `lg` que abre un botón de menú
  de 44 px; `AppFooter` cierra cada página. Cada página abre con un solo
  `PageBanner` ([`PageBanner.tsx`](../../../../frontend-react/src/presentation/components/ui/PageBanner.tsx)):
  una banda oscura cálida (`from-gray-900 via-wine-950 to-wine-900`) con brillos
  suaves, el único `h1` de la página, antetítulo, subtítulo e ícono opcionales,
  `actions` en la fila del título, `back` arriba y `children` para la búsqueda
  y los filtros que pertenecen al título. Las páginas de admin usan
  `AdminPageHeader`, que lo renderiza.
- Las listas web paginan con `Pagination`
  ([`Pagination.tsx`](../../../../frontend-react/src/presentation/components/ui/Pagination.tsx)):
  anterior, una ventana de dos páginas a cada lado, siguiente y una línea
  "Página 2 de 5"; con una sola página no se muestra.
- App: cinco tabs (inicio, vinos, eventos, rutas, perfil) con íconos Lucide,
  una pill activa wine-50 y tinte activo borgoña; la barra mide 66 pt más el
  inset inferior. Las etiquetas crecen con el tamaño de texto del sistema hasta
  1,3x (`TabBarLabel`) para no recortarse. Vinos, Eventos y Rutas comparten
  `BrowseScreenHeader`
  ([`BrowseScreenHeader.tsx`](../../../../frontend-mobile/src/presentation/components/layout/BrowseScreenHeader.tsx)):
  antetítulo VINNOT, título en negrita, subtítulo apagado y el bloque de
  búsqueda, plano sobre el `canvas`. Las pantallas de stack usan
  `AppHeader` (título, subtítulo opcional, botón atrás) y `SectionHeader`
  (título y una acción de texto). Todo control para volver es el `BackButton`
  compartido
  ([`BackButton.tsx`](../../../../frontend-mobile/src/presentation/components/ui/BackButton.tsx)):
  un ícono `ArrowLeft` en wine-700, un área táctil de 44 pt, una variante
  `pill` con la etiqueta "Volver" y una variante `icon` (`AppHeader`). Vuelve
  con `goBackOr`, así una pantalla abierta desde un link o una notificación
  abre su ruta `fallback` (Inicio por defecto) en lugar de no hacer nada; un
  view model puede pasar su propio `onPress`. Inicio muestra la barra de estado
  clara sobre su hero oscuro mientras está enfocada (`FocusAwareStatusBar`).
- El estado activo queda dentro de su contenedor; íconos y etiquetas no se
  recortan.
