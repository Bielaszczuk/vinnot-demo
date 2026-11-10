# Mobile conventions

## Naming and location

- Components and screens: `PascalCase.tsx`.
- Hooks: `useFeatureName.ts`.
- Services: `feature.service.ts` according to the existing convention.
- Tests next to the unit or in the mirrored path adopted by the layer.
- DTOs only in infrastructure; presentable models in domain/application.

## UI

- Use theme tokens; do not duplicate colors, spacing, or typography.
- Minimum 44×44-point touch target and readable label.
- Respect safe areas and bottom navigation padding.
- Large lists use virtualization and stable keys.
- Loading, empty, error, and content are distinct states.
- Animations communicate progress or transition; they do not add ambiguous
  movement and must respect reduced motion.

## Forms

- React Hook Form and Zod where the module already uses them.
- Local validation for feedback; backend remains authoritative.
- Field errors stay associated with the field; operation failures get a summary.
- Prevent double submission and preserve recoverable input.
- Domain validators and auth errors return translation keys (`validation.*`,
  `authErrors.*`), never display text; views translate them with
  `localizeMessage` so each locale sees its own copy and server text passes
  through unchanged.

## External links

Server-provided links (winery website, event contact) open through
`useExternalLink`, which only allows `https`, `http`, `mailto` and `tel`
(`domain/navigation/externalUrl.ts`). Other schemes (`javascript:`, `file:`,
`intent:`, custom app schemes) and system failures show an error toast.

## Accessibility

Add labels/roles, sufficient contrast, coherent focus order, large-text support,
and feedback that does not depend only on color.

## Errors and cancellation

ViewModels distinguish offline, timeout, `401`, rate limit, validation, and
provider errors. Scanner cancellation aborts the RTK promise and discards previous-generation
results. The AbortSignal reaches Axios (`store/api.ts` →
`mutationHandlers.ts` → `wines.service.ts` → `wines.client.ts`) and cancels the
client request; work the server has already started is not cancelled.
See [lifecycle](../diagrams/scan-lifecycle.md).

## Quality

```bash
cd frontend-mobile
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:coverage
```

A native change requires preflight and a development build; a JavaScript-only
change can be tested with an existing compatible binary.

## Sheets and keyboards (issue #242)

Gorhom consumers import `BottomSheetModal` and `BottomSheetScrollView` from
`presentation/components/ui/BottomSheet`. A single `BottomSheetModalProvider`
lives in `AppProviders`; do not add providers inside tabs or screens. The global host sits outside the navigator to cover tabs on both platforms.
The one exception is a screen shown inside a native modal, such as the wine
detail opened from the label scanner (`fullScreenModal`). The global host sits
beneath that modal, so the screen wraps itself in `ModalScreenSheetHost` from the
same module, which adds a local provider only while `inModal` is true. It also
adds a local toast host (`ModalScreenToastHost` from `ToastProvider`), because the
root toast host is covered by the modal too; the scanner route wraps itself in
that toast host for its own messages.
Do not use `FullWindowOverlay`: it can cover native `Modal` confirmations opened
from a sheet, such as account deletion.
Sheets driven by a `visible` prop may call `dismiss()` while closed, for example
when they mount. The wrapper ignores `dismiss()` until the sheet was presented:
Gorhom 5.2.14 turns that early dismissal into a close that never ends and then
ignores `present()`, so the sheet never opened.

The shell reserves safe areas, supplies Back and consumes Android Back while open.
The sheet surface reaches the screen bottom: the wrapper defaults `bottomInset` to 0
and `enableDynamicSizing` to false, and its `BottomSheetScrollView` and
`BottomSheetView` add the bottom safe-area inset to the content's own bottom
padding, so sheets never add `insets.bottom` themselves (issue #475: a non-zero
`bottomInset` made Gorhom clip the sheet above the home indicator and show the
backdrop as a band underneath).
`enablePanDownToClose=false` also disables its Back control; callers with sensitive
pending mutations additionally lock the backdrop and Cancel. Form sheets use
`useSheetDismissGuard` (same folder): no dismissal while saving and, with unsaved
changes, a "discard changes?" confirmation on swipe, backdrop, Cancel and Android
Back (Gorhom reports these after closing, so "keep editing" presents the sheet
again; form state lives in the caller). The admin wine, winery and route sheets
use it; the event editor keeps its own draft recovery. `TextField` and
`SearchField` select `BottomSheetTextInput` through context. The shared scroll
reveals the focused field using its measured bounds and the actual keyboard
position (`useFocusedFieldReveal`). Edge-to-edge Android does not resize the
window for the docked keyboard, so on Android the scroll also reserves
keyboard-height room at its end (`useAndroidKeyboardSpace`) so low fields such as
the event contact phone can still scroll above it. Business callbacks and contracts remain with the feature.

Already adapted native modals (`AdminDetailSheet`, `CellarReviewSheet`,
reauthentication and deletion) retain their shells. Do not add a second keyboard
compensation mechanism inside Gorhom. `AuthLayout` protects the top area outside
the scroll; on Android it reserves the same keyboard-height room at the end of
its scroll (a `KeyboardAvoidingView` `height` is not restored on edge-to-edge
when the keyboard hides) and reveals the focused field with the same shared
logic, so the last register field stays visible and the full height returns
when the keyboard closes. Content screens with text inputs scroll with
`KeyboardAwareScrollView` from `presentation/components/ui` (issue #381): iOS
keyboard insets, the same focused-field reveal on both platforms (it also follows
a growing multiline field) and the Android keyboard-height room at the end.
`ScreenContainer` uses it too. Do not wrap it in a `KeyboardAvoidingView`, except
when a fixed footer outside the scroll must rise on iOS (the AI profile editor),
which then turns the insets off. Welcome scrolls so
its copy and actions remain reachable at the largest Dynamic Type.
