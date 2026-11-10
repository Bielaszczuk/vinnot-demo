# Layout and accessibility

How screens are laid out on the web and in the app, and the accessibility rules
every screen meets.

Part of the [visual system](visual-system.md).

## Web layout

| Rule | Value | Source |
|---|---|---|
| Shell | sticky `AppHeader`, drawer `AppSidebar`, the page's only `main`, `AppFooter`, on the warm `canvas` | [`AppShell.tsx`](../../../../frontend-react/src/presentation/components/layout/AppShell.tsx) |
| Content width | `max-w-7xl` (1280 px), centered; the home page (`/`, `/home`) is full width | `AppShell` |
| Side gutter | `px-3` → `sm:px-6` → `lg:px-8` | `AppShell` |
| Vertical rhythm | `py-5 sm:py-8` | `AppShell` |
| Header | 56 px (`h-14`); anchors keep `scroll-margin-top: 4.5rem` | [`globals.css`](../../../../frontend-react/src/shared/assets/styles/globals.css) |
| Breakpoints | Tailwind CSS 4 defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 px; none are customized | [`tailwind.css`](../../../../frontend-react/src/shared/assets/styles/tailwind.css) |
| Navigation switch | desktop navigation from `lg`; drawer below | [`AppHeader.tsx`](../../../../frontend-react/src/presentation/components/layout/AppHeader.tsx) |
| Reading columns | `max-w-2xl` to `max-w-5xl` inside the shell for forms, detail and states | pages |
| Grids | one column on phones; `sm:grid-cols-2`, `lg:grid-cols-3` / `lg:grid-cols-4` for cards | pages |
| Wide tables | scroll horizontally inside `overflow-x-auto`; essential columns are not hidden | admin pages |
| Route change | `RouteScroll` starts a new page at the top and restores the position on back/forward; query and filter changes keep the scroll | [`RouteScroll.tsx`](../../../../frontend-react/src/presentation/components/layout/RouteScroll.tsx) |

Every page opens with one `PageBanner`: the warm dark band
(`from-gray-900 via-wine-950 to-wine-900`) with white text, the page's `h1`, and
the search and filters of list pages inside it. Pages rendered inside
`AppShell` never add their own `<main>`; pages outside it (payment return,
complete profile, auth actions) own theirs.

## App layout

| Rule | Value | Source |
|---|---|---|
| Orientation and theme | portrait only, light only | [`app.config.ts`](../../../../frontend-mobile/app.config.ts) |
| Routing | Expo Router; `app/` holds route shells only, behavior lives in `src/presentation` | [`app/`](../../../../frontend-mobile/app) |
| Side gutter | 20 pt (`layout.screenHorizontalPadding`) | [`tokens.ts`](../../../../frontend-mobile/src/shared/theme/tokens.ts) |
| Safe areas | `useSafeAreaInsets` on headers (top + 8), tab bar (bottom), sheets (top + 8; the surface reaches the screen bottom and its content adds the bottom inset) and toasts (top + 12); scroll content ends with the bottom inset + 24 | layout components |
| Tab bar | 66 pt + bottom inset, 56 pt items, top radius 24 (`radii["3xl"]`); labels scale up to 1.3× with the system font size (`TabBarLabel`) | `frontend-mobile/app/(app)/(tabs)/_layout.tsx` |
| Header | `AppHeader` min 56 pt (`layout.headerHeight`); its back control is the shared `BackButton`, which goes back or, with no history, to `backFallback` | [`layout/index.tsx`](../../../../frontend-mobile/src/presentation/components/layout/index.tsx) |
| Content column on tablets | states and forms cap their width (for example `IllustratedState` 640 pt) | components |
| Status bar | dark on every screen (root `StatusBar style="dark"`); Home sits on its photo hero and shows a light one while focused (`FocusAwareStatusBar`) | [`FocusAwareStatusBar.tsx`](../../../../frontend-mobile/src/presentation/components/layout/FocusAwareStatusBar.tsx) |
| Dates, times, prices and numbers | formatted in the app language (`useFormatters`, `shared/i18n/format.ts`); direct `Intl` calls pass the app language too | [`format.ts`](../../../../frontend-mobile/src/shared/i18n/format.ts) |

### Keyboard

A focused field always stays visible above the keyboard.

| Container | Use | How it keeps the field visible |
|---|---|---|
| [`KeyboardAwareScrollView`](../../../../frontend-mobile/src/presentation/components/ui/KeyboardAwareScrollView.tsx) | any screen with fields | iOS: native `automaticallyAdjustKeyboardInsets`. Android (edge to edge): reserves the keyboard height after the content. Both: scroll the focused field above the keyboard top + 20 pt, also while a multiline field grows |
| `BottomSheetScrollView` in [`BottomSheet.tsx`](../../../../frontend-mobile/src/presentation/components/ui/BottomSheet.tsx) | fields inside a sheet | same reveal; the sheet uses `interactive` (iOS) or `fillParent` + `adjustResize` (Android) |
| [`FilterSheet`](../../../../frontend-mobile/src/presentation/components/ui/FilterSheet.tsx) | filter fields | `KeyboardAvoidingView` lifts the whole sheet (`padding` on iOS, `height` on Android); a focused option search reveals its whole option panel through `SheetFieldFocusContext`, keeping the panel top visible |

Both scroll containers default to `keyboardShouldPersistTaps="handled"`, so a
tap on a button submits without first dismissing the keyboard. The shared
logic is [`useFocusedFieldReveal.ts`](../../../../frontend-mobile/src/presentation/components/ui/useFocusedFieldReveal.ts).

Touches inside a native `Modal` still pass through the React parents of the
component that renders it. A list that renders a `FilterSheet` from its header,
such as the wine results list, also sets `keyboardShouldPersistTaps="handled"`;
with the default, the list takes the first tap while the keyboard is open and
only dismisses it.

Do: use `KeyboardAwareScrollView` for every screen with a field, and the
sheet-aware `TextField` inside sheets. Don't: wrap a screen in a plain
`ScrollView` plus `KeyboardAvoidingView`.

## Accessibility checklist

Baseline: WCAG 2.x AA on the web; VoiceOver and TalkBack on the app.

### Targets

- [ ] App: every touch target is at least 44 × 44 pt. Use `minHeight: 44` or
  `hitSlop` for small visuals (examples: `BackButton` 44 pt, small `Button`
  and `Chip` hit slop, notice close button).
- [ ] Web: icon-only controls are at least 44 × 44 px (`min-h-11 min-w-11`, the
  notice close button). Text buttons use the `Button` sizes.

### Names and roles

- [ ] Every icon-only control has a name (`aria-label`, `accessibilityLabel`).
- [ ] Informative images have alt text or a label; illustrations and decorative
  icons are hidden.
- [ ] Pressables declare a role (`accessibilityRole="button"`) and state
  (`selected`, `disabled`, `busy`, `expanded`).
- [ ] Each dialog has a title or label; each screen has one heading.

### Focus and order (web)

- [ ] `:focus-visible` shows a 2 px wine-500 outline with a 2 px offset
  (global); components may add a ring but never remove the outline without a
  replacement.
- [ ] Focus order follows the reading order.
- [ ] `Modal` traps and returns focus; the background is `inert`.

### Feedback

- [ ] Errors and warnings are announced (`role="alert"`, assertive live region);
  other messages politely (`role="status"`).
- [ ] Field errors are linked to the field (`aria-describedby`, accessibility hint).
- [ ] State is never conveyed by color alone: icon and text go with it.

### Contrast and text

- [ ] Text meets 4.5:1 on its real surface, including the `#e8eded` canvas, pink
  surfaces and image scrims; see [measured contrast](foundations.md#measured-contrast).
- [ ] Text over a photo sits on a scrim dark enough for white text.
- [ ] Layouts survive larger system font sizes and long Spanish words; truncated
  text is available in full somewhere reachable.

### Motion

- [ ] Animations respect reduced motion ([motion](foundations.md#motion)).
- [ ] Nothing flashes, and no animation is required to understand the state.
