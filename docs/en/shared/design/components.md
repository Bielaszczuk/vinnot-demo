# Shared components

The building blocks of every screen, with when to use each one. Web components
live in [`frontend-react/src/presentation/components`](../../../../frontend-react/src/presentation/components);
app components in [`frontend-mobile/src/presentation/components`](../../../../frontend-mobile/src/presentation/components).
Reach for these before writing new markup or styles.

Part of the [visual system](visual-system.md).

## Pick the right component

| You need to… | Web | App |
|---|---|---|
| Trigger an action | `Button` | `Button` |
| Navigate with a button look | `LinkButton` (`to` or `href`; never a link around a button) | `Button` with `onPress` navigation |
| Make a whole card tappable | link or button wrapping the card | `PressableCard`, `MotionPressable` |
| Go back to the previous screen | `PageBanner` `back` | `BackButton` (`fallback` route), `AppHeader showBack` |
| Turn a setting on or off | — | `ToggleRow` (labelled row), `Switch` (brand colors) |
| Refresh a list by pulling | — | `BrandRefreshControl` |
| Collect text | `Input`, `Textarea`, `Select`, `VintageSelect`, `PhoneNumberField`; raw fields use `fieldClassName` | `TextField`, `SearchField`, `VintageField`, `PhoneNumberField` |
| Group a long form | `FormSection` | `FormSection` |
| Search and filter a list | page filters | `SearchFilterBar` + `FilterSheet` |
| Show a form or detail over the screen | `Modal` | `BottomSheetModal` |
| Ask before a destructive step | `useConfirm()` → `ConfirmDialog` | `Alert.alert` with a `destructive` button |
| Report the result of an action | `useToast()` | `useToast()` |
| Keep a message on the page | `AlertBanner` | `FeedbackNotice` |
| Show that a read failed | `QueryErrorState` | `QueryErrorState` |
| Show an empty list | `EmptyState` with a watercolor `illustration` and an action | `EmptyState` with a watercolor `illustration`, or `IllustratedState` |
| Show first load | `PageLoader` (grape mark) for a page or a large block, layout-shaped skeleton for lists, `Spinner` inside a control | `Skeleton`, `Spinner` |
| Label a vintage | `VintagePill` | `VintagePill` |
| Show a status or category | inline pill classes on the status tokens | `Badge`, `TagPill`, `Chip` |
| Title a page | `PageBanner` (admin: `AdminPageHeader`, built on it) | `BrowseScreenHeader` on the Wines, Events and Routes tabs; `AppHeader`, screen hero |
| Page through a list | `Pagination` (hidden with one page) | infinite lists |
| Show or pick a rating | Watercolor glasses filled by fraction; bottle control to pick | Watercolor glasses filled by fraction; bottle control to pick |
| Show a person's seal | `UserBadge` (CSS) | `UserBadge` (Skia and Reanimated) |
| Draw a UI icon | `Icon` | Lucide directly |

## Buttons

| Variant | Web ([`Button.tsx`](../../../../frontend-react/src/presentation/components/ui/Button.tsx)) | App ([`Button.tsx`](../../../../frontend-mobile/src/presentation/components/ui/Button.tsx)) | Use |
|---|---|---|---|
| `primary` | wine-700 fill, white text, wine-800 hover | wine-700 fill, white text | the one main action |
| `secondary` | white with burgundy border and text, wine-50 hover | white with border | the burgundy alternative next to a primary |
| `outline` | white with warm gray border | white with burgundy border and text | reversible alternative, cancel in dialogs, empty-state action |
| `ghost` | transparent, gray text, wine-50 hover | wine-50 fill, burgundy text | low-emphasis action |
| `danger` | `danger` fill (`#b91c1c`) | `danger` fill (`#dc2626`) | delete, revoke, leave with loss |
| `link` | burgundy text with an underline, no box | — | a text action inside a sentence or a card ("Ver todo") |
| `onDark` | translucent white on dark bands | — | actions on `PageBanner`, the header and the drawer |

Web: every variant except `link` is `rounded-xl`; sizes `sm` (36 px), `md`
(44 px, default) and `lg` (48 px). `LinkButton` gives a link the same look
(`buttonClassName` is shared), so navigation stays a link. App sizes are `sm`
(36 pt plus a 4 pt hit slop, so 44 pt to touch), `md` (48 pt, default) and `lg`
(56 pt); every size uses `radii.md` (8) and the `textStyles.button` /
`buttonSmall` presets. The auth screens' `AuthButton` is the large `Button`
at full width. Loading (`isLoading` on web, `loading` on
the app) shows a spinner, disables the button and keeps its size; the app also
reports `busy` to assistive technology. Disabled is 50 % (web) / 45 % (app)
opacity.

Do:

- Keep one primary button per screen, section or dialog.
- Put the destructive action last and confirm it first (see [Overlays](#overlays-sheets-modals-and-dialogs)).
- Block double submission: the loading state on web; `useSingleAction` on the
  app keeps one intent pending through reauthentication and retry.
- Size the button to its label in both languages.

Don't:

- Use burgundy for a destructive action, or red for a neutral one.
- Hide why a button is disabled when the reason is not obvious; say it next to
  the button.
- Put a primary button inside a toast or a notice.

## Fields

| Behavior | Web `Input` / `Textarea` / `Select` | App `TextField` |
|---|---|---|
| Label | persistent `<label htmlFor>` | persistent label above; focused label turns wine-700 (AA) |
| Required | — | `required` adds ` *` |
| Hint | `hint`, `text-xs text-gray-500`, linked with `aria-describedby` | `hint`, caption, read as accessibility hint |
| Error | `error`, `text-xs text-danger`, `aria-invalid`, `aria-describedby` | `error` replaces the hint, red border, `alert` role, live region |
| Focus | wine-500 border + 20 % wine ring, the same on every field | wine-700 border (`borderFocus`, the one focus color); iOS glow |
| Height | `min-h-11` (44 px), `rounded-xl`, warm `field` border; `size="sm"` 36 px for dense filters |
| Select | Lucide chevron, `tone="onDark"` for dark bands, `options` or `<option>` children | — | min 48 pt |

Inside a `BottomSheetModal`, `TextField` and `SearchField` switch to the sheet
input on their own (`SheetInputContext`), so the sheet can keep the focused
field above the keyboard. Do not use a raw `TextInput` inside a sheet.

Do:

- Keep the label visible; a placeholder is an example, not a label.
- Validate at field level and keep the value the user typed.
- Set `autoComplete` / `textContentType` and the keyboard type.

Don't:

- Show a form-level summary for errors that belong to one field.
- Clear a field on a failed submit.

## Cards and sections

- Web `Card` ([`Card.tsx`](../../../../frontend-react/src/presentation/components/ui/Card.tsx)):
  white, `rounded-2xl`, warm `border`, `shadow-sm`; padding `sm`/`md`/`lg`;
  `CardHeader` for title, subtitle and an action.
- App `Card` / `PressableCard` ([`Card.tsx`](../../../../frontend-mobile/src/presentation/components/ui/Card.tsx)):
  white, border, `radii.md` (8), `sm` shadow; `PressableCard` scales to 0.98 and
  gives selection haptics.
- `FormSection` (both): a collapsible section of a long form with title,
  summary, `aria-expanded` / `expanded` state and an invalid border.

Wine cards put the image first, then the commercial name, winery, origin, type
and grape, rating and action. The image fallback keeps the frame. A whole-card
link can hold inner buttons that stop propagation and have their own names. A
"0 reviews" count is never the most prominent element.

## Chips, badges and pills

Applies to the app; the web uses inline pill classes on the status tokens,
except `VintagePill`, which both platforms share, and the glass rating and the seal
(`UserBadge`), which also exist on both:

| Component | Use | Notes |
|---|---|---|
| `Chip` | a selectable filter or option | `selected` fills burgundy; `role="radio"` for one choice in a group (report reasons, statuses) exposes `checked`; a 5 pt hit slop reaches 44 pt |
| `Badge` | a status label | variants `default`, `success`, `warning`, `danger`, `info`, `brand` |
| `TagPill` | an uppercase category tag | `overline` text |
| `VintagePill` | the tasted vintage on reviews and cellar notes | both platforms |
| Glass rating | a rating to read, on both platforms | five watercolor glasses; each fills by its fraction (2.2 is two full and 0.2 of the third). Glass, wine and bottle follow the wine type like `wineSceneLook`; an unknown type uses red. The flute shows bubbles in filled glasses |
| Bottle control | pick a rating from 0.1 to 5.0, on both platforms | not rated yet, the bottle appears upright and corked to the left of the glasses and the readout says `0.0 / 5`; when the control appears it uncorks itself, once, as the AI profile scene does (a corkscrew for still wines; for sparkling the cage comes off and the cork pops), and stays open at its place. So when rating, the glasses and the bar move together from the first touch; a touch before it ends finishes the uncorking at once. With reduced motion it appears already open. The first move lifts it over the first glass and pours. The bottle is 1.3 glass heights tall and holds the wine still to be poured: it empties as the glasses fill and fills again as the score goes down, with the wine surface always level. On mobile the control takes the card's full width and the glasses spread out (up to 1.2 glass heights apart); on the web the glasses stay close together. At 5.0, after the last glass is poured, it goes back to its place upright, open and empty. Standing, it casts a short contact shadow; held, a longer one. While rating, the bottle follows the finger or pointer from glass to glass: rising, it tilts (118°) with its mouth just above the left rim of the glass being filled and pours a stream of the wine's colour that enters through the rim and runs down the near wall; moving on to the next glass, the bottle is carried over and only then pours again; falling, it lifts (62°) and the glasses empty. Tapping a glass also sets the score. It is an accessible slider (0.1 steps; on the web arrows ±0.1, Page Up/Page Down ±0.5, Home/End) with the large `3.6 / 5` readout. In the review form the label carries `*` and a grey note says that fields marked (*) are required. Under the glasses sits a slider bar lined up with them: each whole score falls under the centre of its glass (1 under the first, 5 under the last) and 0 sits at the bottle, so with a full bar the thumb is under the last, full glass. The thumb is a glass of the same wine type, centred on the bar, that fills with the score, and the bar takes a gradient of the wine colour, from the deep hue to the rim like the home grape pills, up to the thumb. The large score readout sits at the end of the bar (on mobile, on its own line right below, aligned right). Dragging or tapping the bar sets the score with the same steps and plays the same bottle animation; moving the bottle moves the bar. The bar is hidden from screen readers, because the bottle control is already the accessible slider. Until the control or the bar is touched, a light grey line underneath says “Drag the bottle or the bar to rate”. While the device or browser has rated fewer than three times, each time the control opens unrated, after the uncorking, a see-through copy of the bottle (no shadow) leaves the stand, glides over the glasses tilted to pour and fills them faintly up to 2.5, then fades; meanwhile a see-through small glass glides along the bar at the same level; it plays twice, stops at the first touch, never rates and is skipped with reduced motion |
| `UserBadge` | a person's seal next to their name or on the profile | tier art with its animation, clipped to the seal shape. In lists it plays when it appears and every 8 to 16 s, without sparkles below 40 px; on the profile, always; with reduced motion it stays still with a fixed highlight ([Points and seals](../../modules/gamification/README.md#interface)) |
| `Avatar` | user photo or initials | wine-200 background; translated name ("Avatar de Ana") |

## Overlays: sheets, modals and dialogs

| Situation | Web | App |
|---|---|---|
| Form, detail or multi-step task | `Modal` ([`Modal.tsx`](../../../../frontend-react/src/presentation/components/ui/Modal.tsx)) | `BottomSheetModal` ([`BottomSheet.tsx`](../../../../frontend-mobile/src/presentation/components/ui/BottomSheet.tsx)) with `BottomSheetScrollView` |
| Filters | inline filters on the page | `FilterSheet` (native `Modal`, slide up, active count and clear) |
| Confirm a destructive or irreversible step | `useConfirm({ variant: 'danger' })`; `typedConfirmation` for a typed phrase | `Alert.alert` with a `cancel` and a `destructive` button |
| A blocking dialog that must sit above everything (reauthentication, delete account) | `Modal` | React Native `Modal`, `transparent`, `animationType="fade"`, backdrop on `surfaceOverlay` |
| Full-screen capture (label scan) | route | route with `presentation: "fullScreenModal"` |

Web `Modal`:

- portals to `body`, traps focus, closes with Escape, makes the app root
  `inert`, stacks (only the top dialog is active) and returns focus on close;
- a popover portaled over it (Radix popper layer, such as the event date picker)
  keeps focus and handles its own Escape;
- needs a name: `title`, `labelledBy` or `ariaLabel`;
- sizes `sm` … `2xl` (`max-w-sm` … `max-w-5xl`), `max-h-[90vh]` with inner scroll;
- `closeOnBackdrop={false}` where an outside click would lose work.

App `BottomSheetModal`:

- swipe down, the header "Volver" button and the Android back button close it;
  `enablePanDownToClose={false}` disables all three for a sheet that must not
  be dismissed by accident;
- keyboard: `interactive` on iOS, `fillParent` with `adjustResize` on Android;
  the sheet scroll re-measures the focused field when the keyboard opens;
- respects the top safe area (+8 pt) and the bottom inset;
- a screen shown inside a native modal wraps its sheets in
  `ModalScreenSheetHost` so they render above that modal.

Do:

- Ask before closing a dirty form (discard confirmation).
- Keep the destructive button visually separate from cancel.
- Give every dialog a descriptive title.

Don't:

- Open a sheet from a sheet; render the second step inline in the same sheet.
- Use a modal for a success message; use a toast.

## Toasts and notices

| | Web | App |
|---|---|---|
| API | `useToast().addToast({ type, message, duration? })` | `useToast().showSuccess / showError / showInfo / showToast(message, variant)` |
| View | `ToastContainer` → `AlertBanner` | `ToastProvider` → `FeedbackNotice` |
| Placement | top right, up to 420 px wide, below the safe area | top, 16 pt side margin, up to 480 pt wide, below the safe area |
| Duration | 6 s errors, 4 s others; `duration` overrides; pauses on hover and focus | 6 s errors, 4 s others; no auto-dismiss while a screen reader is on |
| Stack | every pending toast | the last 3 |
| Announce | `alert` role for error/warning, `status` for others | `alert` role / assertive live region for error/warning; iOS announces with VoiceOver |

`AlertBanner` (web) and `FeedbackNotice` (app) are also the inline notice:
white card, wine-100 border, 20 px radius, a wine-50 icon well with a Lucide
icon (`Check`, `CircleAlert`, `TriangleAlert`, `Info`) and an optional 44 px
close button.

Use a toast for the outcome of an action the user just took. Use an inline
notice for a condition that stays true while the user is on the page. A
validation error belongs to its field, not to a toast.

## Loading, empty and error states

| State | Pattern |
|---|---|
| First load of a page | web `PageLoader` (grape mark, announced, no visible "Loading…" text); skeleton blocks with the final geometry for lists |
| Load inside a block | web `PageLoader compact`; `Spinner` inside a control |
| Brand-level wait (launch, wine results) | animated grape mark |
| AI generation | watercolor AI journey on both platforms ([imagery](imagery.md#ai-loading-scenes)) |
| Empty list | `EmptyState`: watercolor illustration (`illustration` key on both platforms), title, reason, one next action (`outline` button on the app, or `primary` with `action.variant`); with active filters the action clears them. On the app, `secondaryAction` adds a `ghost` button below: the empty wine catalog offers “Add your wine” and keeps “Clear” as the secondary one |
| Empty cellar | `IllustratedState kind="emptyCellar"` or `EmptyState illustration="emptyCellar"` |
| Failed read | `QueryErrorState error={…} onRetry={refetch}`: illustration, title, description and "Reintentar" |
| Whole route failed | `IllustratedState` full size; web `RouteErrorBoundary` |

`QueryErrorState` is for reads only. A failed mutation keeps its own recovery:
keep the form, show the error and let the user resubmit. The retry is hidden
for `session`, `forbidden` and `notFound`, where retrying cannot help.

## Wine data visualization

- **Taste profile** (`WineTasteProfile` on both platforms): one row per
  attribute (body, tannins, sweetness, acidity) with its name, a 0–100 bar in
  its `tasteAttributeColors` tone on the app (sweetness dusty rose, acidity
  olive, tannin wine-600, body ochre; each at least 3:1 on white), wine-400/500
  on the web, and the two endpoint words (for example light ↔ full). A score
  of 0 still draws a small marker (`sensoryBarWidth`, minimum 3 %) so the
  origin is visible. Each bar is a `progressbar` with its value. When the wine
  has no score at all, the wine page hides the card (`hasTasteScores` on
  both platforms).
- **Comparison** (app `WineComparisonAttributeTable`, web `WineComparePage`):
  the two wines are named in a legend before the rows; each attribute shows both
  values and an axis with wine A on the left and wine B on the right of a
  midpoint, so position shows the difference. On the app, narrow screens or
  large text (width / font scale under 380) stack the values.
- Color is never the only encoding: the name, the value and the bar length go
  together, and both wines use the same scale.

## Navigation and headers

- Web: a sticky warm-dark header (`bg-gray-900/95`, 56 px, `max-w-7xl` inner)
  with the white brand and Lucide icons; desktop navigation from `lg`, a drawer
  (`AppSidebar`) below `lg` opened by a 44 px menu button; `AppFooter` closes
  every page. Each page opens with one `PageBanner`
  ([`PageBanner.tsx`](../../../../frontend-react/src/presentation/components/ui/PageBanner.tsx)):
  a warm dark band (`from-gray-900 via-wine-950 to-wine-900`) with soft glows,
  the page's only `h1`, an optional eyebrow, subtitle and icon, `actions` on the
  title row, `back` above it, and `children` for the search and filters that
  belong to the title. Admin pages use `AdminPageHeader`, which renders it.
- Web lists page with `Pagination`
  ([`Pagination.tsx`](../../../../frontend-react/src/presentation/components/ui/Pagination.tsx)):
  previous, a window of two pages on each side, next and a "Página 2 de 5"
  line; it renders nothing with a single page.
- App: five tabs (home, wines, events, routes, profile) with Lucide icons, a
  wine-50 active pill and burgundy active tint; the bar is 66 pt plus the
  bottom inset. Labels grow with Dynamic Type up to 1.3x (`TabBarLabel`) so
  they never clip. Wines, Events and Routes share `BrowseScreenHeader`
  ([`BrowseScreenHeader.tsx`](../../../../frontend-mobile/src/presentation/components/layout/BrowseScreenHeader.tsx)):
  a VINNOT eyebrow, a bold title, a muted subtitle and the search block, flat
  on the `canvas`. Stack screens use `AppHeader` (title, optional subtitle,
  back button) and `SectionHeader` (title and a text action). Every back
  control is the shared `BackButton`
  ([`BackButton.tsx`](../../../../frontend-mobile/src/presentation/components/ui/BackButton.tsx)):
  one `ArrowLeft` icon in wine-700, a 44 pt target, a `pill` variant with the
  "Volver" label and an `icon` variant (`AppHeader`). It goes back through
  `goBackOr`, so a screen opened from a link or a notification opens its
  `fallback` route (Home by default) instead of doing nothing; a view model can
  pass its own `onPress`. Home shows a light status bar over its dark hero
  while it is focused (`FocusAwareStatusBar`).
- The active state stays inside its container; icons and labels do not clip.
