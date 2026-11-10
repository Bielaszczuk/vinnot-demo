# Convenciones mobile

## Nombres y ubicación

- Componentes y screens: `PascalCase.tsx`.
- Hooks: `useFeatureName.ts`.
- Servicios: `feature.service.ts` según convención existente.
- Tests junto a la unidad o en el path espejo adoptado por la capa.
- DTOs sólo en infraestructura; modelos presentables en dominio/aplicación.

## UI

- Usar tokens del theme; no duplicar colores, spacing o tipografías.
- Área táctil mínima de 44×44 puntos y label legible.
- Respetar safe areas y padding inferior de la navegación.
- Listas grandes usan virtualización y keys estables.
- Loading, vacío, error y contenido son estados diferentes.
- Las animaciones comunican progreso o transición; no decoran con movimiento
  ambiguo y respetan reduced motion.

## Formularios

- React Hook Form y Zod cuando el módulo ya los usa.
- Validación local para feedback; backend como autoridad final.
- Errores asociados al campo y mensaje general para fallos de operación.
- Evitar doble submit y conservar datos recuperables.
- Los validadores de dominio y los errores de auth devuelven claves de
  traducción (`validation.*`, `authErrors.*`), nunca texto visible; las vistas
  las traducen con `localizeMessage`, así cada idioma ve su texto y el texto del
  servidor se muestra sin cambios.

## Enlaces externos

Los enlaces que vienen del servidor (sitio de la bodega, contacto del evento) se
abren con `useExternalLink`, que sólo admite `https`, `http`, `mailto` y `tel`
(`domain/navigation/externalUrl.ts`). Otros esquemas (`javascript:`, `file:`,
`intent:`, esquemas propios de apps) y los fallos del sistema muestran un toast
de error.

## Accesibilidad

Agregar labels/roles, contraste suficiente, orden de foco coherente, soporte de
texto ampliado y feedback que no dependa sólo del color.

## Errores y cancelación

Los ViewModels distinguen offline, timeout, `401`, rate limit, validación y error
de proveedor. En el escáner, cancelar aborta la promesa RTK y descarta resultados de una
generación anterior. El AbortSignal llega hasta Axios (`store/api.ts` →
`mutationHandlers.ts` → `wines.service.ts` → `wines.client.ts`) y cancela la
solicitud del cliente; el trabajo que el servidor ya inició no se cancela.
Véase [lifecycle](../diagrams/scan-lifecycle.md).

## Calidad

```bash
cd frontend-mobile
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:coverage
```

Un cambio nativo requiere preflight y un development build; un cambio puramente
JavaScript puede probarse con el binario compatible existente.

## Paneles y teclado (issue #242)

Los consumidores Gorhom importan `BottomSheetModal` y `BottomSheetScrollView`
desde `presentation/components/ui/BottomSheet`. Hay un único
`BottomSheetModalProvider` en `AppProviders`; no agregar proveedores dentro de
tabs o screens. El host global queda fuera del navegador para cubrir las tabs en ambos sistemas.
La única excepción es una screen mostrada dentro de un modal nativo, como el
detalle del vino abierto desde el escáner de etiquetas (`fullScreenModal`). El
host global queda debajo de ese modal, así que la screen se envuelve en
`ModalScreenSheetHost` del mismo módulo, que agrega un proveedor local solo
mientras `inModal` es verdadero. También agrega un host local de avisos
(`ModalScreenToastHost` de `ToastProvider`), porque el modal tapa igual el host
raíz de avisos; la ruta del escáner se envuelve en ese host para sus mensajes.
No usar `FullWindowOverlay`: puede tapar confirmaciones `Modal` nativas abiertas
desde un panel (por ejemplo, eliminación de cuenta).
Los paneles controlados por una prop `visible` pueden llamar a `dismiss()` estando
cerrados, por ejemplo al montarse. El envoltorio ignora `dismiss()` hasta que el
panel se presentó: Gorhom 5.2.14 convierte ese cierre temprano en un cierre que
nunca termina y después ignora `present()`, así que el panel nunca se abría.

La superficie del sheet llega al borde inferior de la pantalla: el wrapper usa por
defecto `bottomInset` 0 y `enableDynamicSizing` false, y su `BottomSheetScrollView`
y `BottomSheetView` suman el inset inferior de la safe area al padding inferior del
contenido, así que los sheets nunca suman `insets.bottom` por su cuenta (issue #475:
un `bottomInset` distinto de 0 hacía que Gorhom recortara el sheet sobre el
indicador de inicio y mostrara el fondo como una franja debajo).
El shell reserva safe areas, ofrece Volver/Back y consume Back de Android mientras
está abierto. `enablePanDownToClose=false` bloquea también su botón de retorno;
los consumidores con una mutación sensible bloquean además backdrop y Cancelar.
Los paneles con formulario usan `useSheetDismissGuard` (misma carpeta): no se
cierran mientras guardan y, con cambios sin guardar, piden confirmar «¿Descartar
los cambios?» al deslizar, tocar el fondo, Cancelar o Back de Android (Gorhom
avisa después de cerrar, así que «Seguir editando» vuelve a presentar el panel;
el estado del formulario vive en quien lo llama). Lo usan los paneles admin de
vino, bodega y ruta; el editor de eventos conserva su propia recuperación de borrador.
`TextField`/`SearchField` seleccionan `BottomSheetTextInput` por contexto; el
scroll compartido revela el campo enfocado usando sus medidas y la posición real
del teclado (`useFocusedFieldReveal`). Android edge-to-edge no redimensiona la
ventana con el teclado acoplado, así que en Android el scroll además reserva al
final un espacio del alto del teclado (`useAndroidKeyboardSpace`) para que campos
bajos, como el teléfono de contacto del evento, puedan subir por encima. La UI y los callbacks conservan sus contratos de negocio.

Los modales nativos ya adaptados (`AdminDetailSheet`, `CellarReviewSheet`,
reautenticación y eliminación) conservan sus shells. No se anida otro mecanismo
de compensación de teclado dentro de Gorhom. `AuthLayout` protege la zona superior
fuera del scroll; en Android reserva el mismo espacio del alto del teclado al
final de su scroll (en edge-to-edge un `KeyboardAvoidingView` `height` no se
restablece al ocultarse el teclado) y revela el campo enfocado con la misma
lógica compartida, así el último campo del registro queda visible y la altura
completa vuelve al cerrar el teclado. Las pantallas de contenido con campos de
texto hacen scroll con `KeyboardAwareScrollView` de `presentation/components/ui`
(issue #381): insets de teclado en iOS, el mismo revelado del campo enfocado en
ambas plataformas (también sigue a un campo multilínea que crece) y el espacio de
la altura del teclado al final en Android. `ScreenContainer` también lo usa. No se
envuelve en un `KeyboardAvoidingView`, salvo cuando un pie fijo fuera del scroll
debe subir en iOS (el editor de perfil IA), que entonces apaga los insets.
Bienvenida hace scroll para que su texto y acciones sigan accesibles con el
tamaño de texto más grande.
