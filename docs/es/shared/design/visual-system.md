# Sistema visual de Vinnot

La guía de diseño de la web de Vinnot (`frontend-react`, React y Tailwind CSS 4)
y de la app (`frontend-mobile`, React Native y Expo). Describe lo que el código
implementa hoy y se puede verificar con los enlaces a archivos de cada página.
**El código es la fuente de verdad:** cuando esta guía y el código no coinciden,
se corrige lo que esté mal en el mismo cambio. El [diseño original](original-design.md)
es solo una referencia histórica.

## Recorrido rápido para una pantalla nueva

1. Tomar colores, tipografía, espaciado y radios de los tokens de
   [fundamentos](foundations.md); no agregar hex ni fuentes sueltas.
2. Construir con los [componentes compartidos](components.md): `Button`,
   campos, cards, sheets o modales, toasts, `QueryErrorState`.
3. Cubrir todos los estados: carga, vacío, error con reintento y feedback de
   éxito ([estados](components.md#estados-de-carga-vacío-y-error)).
4. Armar el layout con el shell, las safe areas y el scroll que respeta el
   teclado ([layout](layout-and-accessibility.md)).
5. Escribir los textos en `es-AR` (voseo) y `en-US` ([textos](content-and-copy.md)).
6. Revisar el [checklist de accesibilidad](layout-and-accessibility.md#checklist-de-accesibilidad).

## Páginas de la guía

| Página | Cubre |
|---|---|
| [Fundamentos](foundations.md) | tokens de color, presets tipográficos, espaciado, radios, elevación, iconografía, movimiento |
| [Catálogo de movimiento](motion.md) | cada animación de la web y la app por propósito, con tiempos, comportamiento con movimiento reducido y vistas previas animadas |
| [Ilustración, marca e imágenes](imagery.md) | reglas de la acuarela, pipeline de assets, estados ilustrados, escenas de carga de IA, marcas, correo |
| [Catálogo de imágenes](image-catalog.md) | cada imagen e ilustración de la web y la app, para qué se usa y dónde vive |
| [Componentes compartidos](components.md) | qué componente usar, variantes, qué hacer y qué evitar, superposiciones, feedback, estados, navegación |
| [Layout y accesibilidad](layout-and-accessibility.md) | anchos y breakpoints web, safe areas y teclado en la app, checklist de accesibilidad |
| [Contenido y textos](content-and-copy.md) | voz, voseo, terminología, reglas de i18n, patrones de texto |

## Principios

1. **Vino editorial, herramienta cotidiana.** El aspecto es de revista de vinos;
   el comportamiento, de una herramienta de uso frecuente. La estética nunca
   cuesta legibilidad, precisión táctil ni claridad del estado.
2. **La acuarela da el clima, la UI da el significado.** Las ilustraciones son
   acuarelas raster con fondo transparente; títulos, etiquetas y acciones son
   texto real.
3. **Un solo color de marca.** El borgoña (wine-700 `#ab214c`) marca acción y
   selección. Nunca significa error.
4. **Toda acción responde.** Carga, éxito y fallo son visibles, y un fallo
   conserva el trabajo del usuario.
5. **Tema claro, solo Poppins.** Ambas plataformas usan el tema claro con una
   sola familia tipográfica.
6. **Misma intención, patrones nativos.** La web y la app comparten tokens,
   textos y estados; cada una usa las superposiciones, la navegación y los
   gestos de su plataforma.

## Web y app de un vistazo

| Tema | Web | App | Por qué difieren |
|---|---|---|---|
| Estilos | utilidades de Tailwind CSS 4, paleta en `@theme` | `StyleSheet` con tokens en TypeScript | herramientas de cada plataforma |
| Navegación | header oscuro fijo, drawer debajo de `lg` | barra inferior de cinco tabs y stacks | convención de plataforma |
| Formularios y detalle superpuestos | `Modal` centrado | `BottomSheetModal` | convención de plataforma |
| Confirmación destructiva | `ConfirmDialog` (`useConfirm`) | `Alert.alert` nativo | diálogo nativo en la app |
| Ubicación de toasts | arriba a la derecha | arriba, ancho completo hasta 480 pt | tamaño de pantalla |
| Palabra del gesto | "Hacé clic" | "Tocá" | método de entrada |
| Área táctil | prioridad puntero; 44 px en controles solo con ícono | 44 pt en todo objetivo | método de entrada |
| Hápticos | — | `Button` y `PressableCard` | capacidad del dispositivo |

## Inconsistencias conocidas

Diferencias que existen hoy en el código sin una razón de producto. Hasta que
se corrija cada una, se sigue la regla de la última columna; el valor
inconsistente no se copia en código nuevo.

| # | Inconsistencia | Evidencia | Seguir |
|---|---|---|---|
| 1 | Neutros: la web usa una escala de gris cálido (`gray` de Tailwind redefinido en `tailwind.css`) sobre un fondo crema `#f4eee6`; la app usa `neutral` (gris puro) sobre blanco o `#FAFAFA` | `tailwind.css`, `tokens.ts` | el neutro existente de la plataforma |
| 2 | En la web, `Button size="sm"` mide 36 px de alto (`md` y `lg` llegan a 44 y 48) | `Button.tsx` web | agregar altura mínima o área táctil hasta 44 |
| 3 | Las páginas de administración web todavía dibujan algunos íconos como SVG inline escritos a mano; el resto de la web usa Lucide mediante `Icon` | `pages/admin/*`, `AnnouncementEditor.tsx` | `Icon` con un glifo de Lucide |
| 4 | El modo oscuro está inactivo: la app define `darkTokens` pero `ThemeProvider` siempre entrega el claro; el `ThemeProvider` web alterna una clase `dark` que ningún estilo lee | `ThemeProvider.tsx` de app y web | solo tema claro |
| 5 | NativeWind está configurado en la app pero ningún componente usa `className`; su `tailwind.config.js` solo replica `tokens.ts` | `frontend-mobile/tailwind.config.js` | `StyleSheet` con `tokens.ts` y `fontFamilies` |
| 6 | Pila de toasts: la web conserva todos los pendientes, la app los últimos tres | `ToastProvider.tsx` de web y app | los últimos tres |
| 7 | Textos fuera de i18n en la web: `ContactPage.tsx` y `AboutPage.tsx` (es/en inline), `GoogleMapsEmbed.tsx` (aviso solo en español) | esos archivos | claves de i18n en ambos idiomas |
| 8 | El estado de bodega vacía de la web dice "cava" mientras el resto de la UI llama "Bodega" a la bodega del usuario; los textos de error del sistema usan "solicitud" para una petición técnica | `illustratedState.ts` web, `es-AR.json` (ambos) | "Bodega"; "solicitud" solo con aprobación |
| 9 | Las páginas de administración web y `PhoneNumberField` todavía arman su propio `<select>` y algunos botones a mano en lugar de `Select` y `Button` | `AdminWinesPage`, `AdminUsersPage`, `AdminWineriesPage`, `AdminRoutesPage`, `AdminWineSubmissions`, `AnnouncementAudienceForm`, `PhoneNumberField.tsx` | `Select`, `Button`, `fieldClassName` |
| 10 | Las pantallas de administración web conservan acentos propios (violeta, esmeralda, rosa) fuera de la paleta | `pages/admin/*`, `components/features/admin/notifications/*` | wine, los tokens de estado y el gris cálido |
| 11 | El formulario de eventos web conserva botones solo con ícono y un submit oculto fuera de `Button`, y los eventos de partner usan un estilo local de link rojo | `EventFormSections.tsx`, `EventDateTimeField.tsx`, `EventFormModal.tsx`, `PartnerEventsPage.tsx` | `Button` (`ghost`, `danger`, `link`) con `aria-label` en los botones solo con ícono |
| 12 | El `Button` web no tiene `type` por defecto, así que dentro de un formulario envía salvo que reciba `type="button"` | `Button.tsx` | pasar `type` en cada `Button` dentro de un formulario |
| 13 | Las pantallas de administración de la app conservan algunos radios literales (unos 28), acentos hex (`#f43f5e`, `#ea580c`, `#7e22ce`, `#10b981`…) y tres tamaños de fuente fuera de los tokens; las pantallas de la app para usuarios usan `radii`, `fontSizes`, `adminSectionAccent` y los tokens de estado | `features/admin/*` (app) | `radii`, `fontSizes`, `adminSectionAccent`, `systemColors` |

## Mapa de fuentes

| Área | Web | App |
|---|---|---|
| Paleta y fuentes | [`tailwind.css`](../../../../frontend-react/src/shared/assets/styles/tailwind.css), [`globals.css`](../../../../frontend-react/src/shared/assets/styles/globals.css) | [`tokens.ts`](../../../../frontend-mobile/src/shared/theme/tokens.ts), [`vinnotTheme.ts`](../../../../frontend-mobile/src/shared/theme/vinnotTheme.ts), [`typography.ts`](../../../../frontend-mobile/src/shared/theme/typography.ts) |
| Elevación y movimiento ([catálogo](motion.md)) | utilidades de Tailwind, [`feedback.css`](../../../../frontend-react/src/presentation/components/feedback/feedback.css) | [`shadows.ts`](../../../../frontend-mobile/src/shared/theme/shadows.ts), [`motion.ts`](../../../../frontend-mobile/src/shared/theme/motion.ts) |
| Kit de UI | [`components/ui`](../../../../frontend-react/src/presentation/components/ui), [`components/feedback`](../../../../frontend-react/src/presentation/components/feedback) | [`components/ui`](../../../../frontend-mobile/src/presentation/components/ui), [`ToastProvider.tsx`](../../../../frontend-mobile/src/presentation/providers/ToastProvider.tsx) |
| Layout | [`components/layout`](../../../../frontend-react/src/presentation/components/layout) | [`components/layout`](../../../../frontend-mobile/src/presentation/components/layout) |
| Marca | [`components/brand`](../../../../frontend-react/src/presentation/components/brand) | [`components/brand`](../../../../frontend-mobile/src/presentation/components/brand) |
| Ilustraciones | [`illustrations.ts`](../../../../frontend-react/src/shared/illustrations.ts) | [`illustrations.ts`](../../../../frontend-mobile/src/shared/illustrations.ts) |
| Textos | [`locales`](../../../../frontend-react/src/shared/i18n/locales) | [`locales`](../../../../frontend-mobile/src/shared/i18n/locales) |

## Cómo mantener la guía vigente

- Un color, tamaño o duración nuevo entra como token con nombre, no como literal
  en una página.
- Un cambio en un componente compartido actualiza su fila aquí, en ambos
  idiomas, en el mismo cambio.
- La QA visual cubre pantallas compactas y grandes, español e inglés, texto
  ampliado, sin conexión, imágenes rotas, carga, vacío y error.
- Corregir una inconsistencia conocida elimina su fila.

## Relacionado

- [Lineamientos UI/UX mobile](../../frontend-mobile/design/ui-ux-guidelines.md)
- [Arquitectura del frontend web](../../frontend-web/architecture/overview.md)
