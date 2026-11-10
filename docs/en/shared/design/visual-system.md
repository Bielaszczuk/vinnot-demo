# Vinnot visual system

The design guide for the Vinnot web (`frontend-react`, React and Tailwind CSS 4)
and app (`frontend-mobile`, React Native and Expo). It describes what the code
implements today and is verifiable through the file links in each page. **The
code is the source of truth:** when this guide and the code disagree, fix
whichever is wrong in the same change. The [original design](original-design.md)
is a historical reference only.

## Quick path for a new screen

1. Take colors, type, spacing and radii from the tokens in
   [foundations](foundations.md); never add a scattered hex value or font.
2. Build from the [shared components](components.md): `Button`, fields,
   cards, sheets or modals, toasts, `QueryErrorState`.
3. Cover every state: loading, empty, error with retry, success feedback
   ([states](components.md#loading-empty-and-error-states)).
4. Lay it out with the shell, safe areas and keyboard-aware scroll
   ([layout](layout-and-accessibility.md)).
5. Write copy in `es-AR` (voseo) and `en-US` ([copy](content-and-copy.md)).
6. Run the [accessibility checklist](layout-and-accessibility.md#accessibility-checklist).

## Guide pages

| Page | Covers |
|---|---|
| [Foundations](foundations.md) | color tokens, typography presets, spacing, radii, elevation, iconography, motion |
| [Motion catalog](motion.md) | every web and app animation by purpose, with timing, reduced-motion behavior and animated previews |
| [Illustration, brand and imagery](imagery.md) | watercolor rules, asset pipeline, illustrated states, AI loading scenes, brand marks, email |
| [Image catalog](image-catalog.md) | every image and illustration of the web and the app, what it is for and where it lives |
| [Shared components](components.md) | which component to use, variants, do and don't, overlays, feedback, states, navigation |
| [Layout and accessibility](layout-and-accessibility.md) | web widths and breakpoints, app safe areas and keyboard, accessibility checklist |
| [Content and copy](content-and-copy.md) | voice, voseo, terminology, i18n rules, copy patterns |

## Principles

1. **Editorial wine, everyday tool.** The look is a wine magazine; the
   behavior is a tool used often. Beauty never costs readability, touch
   precision or state clarity.
2. **Watercolor sets the mood, the UI carries the meaning.** Illustrations are
   transparent watercolor raster; titles, labels and actions are live text.
3. **One brand color.** Burgundy (wine-700 `#ab214c`) marks action and
   selection. It never means error.
4. **Every action answers.** Loading, success and failure are visible, and a
   failure keeps the user's work.
5. **Light theme, Poppins only.** Both platforms render the light theme with
   one type family.
6. **Same intent, native patterns.** The web and the app share tokens, copy and
   states, and each uses its platform's overlays, navigation and gestures.

## Web and app at a glance

| Topic | Web | App | Why they differ |
|---|---|---|---|
| Styling | Tailwind CSS 4 utilities, `@theme` palette | `StyleSheet` with TypeScript tokens | platform tooling |
| Navigation | sticky dark header, drawer below `lg` | five-tab bottom bar and stacks | platform convention |
| Forms and detail overlays | centered `Modal` | `BottomSheetModal` | platform convention |
| Destructive confirmation | `ConfirmDialog` (`useConfirm`) | native `Alert.alert` | native dialog on the app |
| Toast placement | top right | top, full width up to 480 pt | screen size |
| Gesture words | "Hacé clic" | "Tocá" | input method |
| Touch target | pointer first; 44 px for icon-only controls | 44 pt for every target | input method |
| Haptics | — | `Button` and `PressableCard` | device capability |

## Known inconsistencies

Differences that exist in the code today without a product reason. Until each
one is fixed, follow the rule in the last column; do not copy the inconsistent
value into new code.

| # | Inconsistency | Evidence | Follow |
|---|---|---|---|
| 1 | Neutrals: the web uses a warm gray scale (Tailwind `gray` redefined in `tailwind.css`) on a cream canvas `#f4eee6`; the app uses `neutral` (pure gray) on white or `#FAFAFA` | `tailwind.css`, `tokens.ts` | the platform's existing neutral |
| 2 | Web `Button size="sm"` is 36 px tall (`md` and `lg` reach 44 and 48) | web `Button.tsx` | add a minimum height or hit area to reach 44 |
| 3 | Web admin pages still draw some icons as hand-written inline SVG; the rest of the web uses Lucide through `Icon` | `pages/admin/*`, `AnnouncementEditor.tsx` | `Icon` with a Lucide glyph |
| 4 | Dark mode is dormant: the app defines `darkTokens` but `ThemeProvider` always serves light; the web `ThemeProvider` toggles a `dark` class no style reads | app and web `ThemeProvider.tsx` | light only |
| 5 | NativeWind is configured in the app but no component uses `className`; its `tailwind.config.js` only mirrors `tokens.ts` | `frontend-mobile/tailwind.config.js` | `StyleSheet` with `tokens.ts` and `fontFamilies` |
| 6 | Toast stacks: the web keeps every pending toast, the app the last three | web and app `ToastProvider.tsx` | the last three |
| 7 | Copy outside i18n on the web: `ContactPage.tsx` and `AboutPage.tsx` (inline es/en), `GoogleMapsEmbed.tsx` (Spanish-only notice) | those files | i18n keys in both locales |
| 8 | The web empty-cellar state says "cava" while the rest of the UI calls the cellar "Bodega"; system error copy uses "solicitud" for a technical request | web `illustratedState.ts`, `es-AR.json` (both) | "Bodega"; "solicitud" only with approval |
| 9 | Web admin pages and `PhoneNumberField` still build their own `<select>` and some buttons by hand instead of `Select` and `Button` | `AdminWinesPage`, `AdminUsersPage`, `AdminWineriesPage`, `AdminRoutesPage`, `AdminWineSubmissions`, `AnnouncementAudienceForm`, `PhoneNumberField.tsx` | `Select`, `Button`, `fieldClassName` |
| 10 | Web admin screens keep their own accents (purple, emerald, rose) outside the palette | `pages/admin/*`, `components/features/admin/notifications/*` | wine, the status tokens and the warm gray |
| 11 | The web event form keeps icon-only and hidden submit buttons outside `Button`, and partner events use a local red link style | `EventFormSections.tsx`, `EventDateTimeField.tsx`, `EventFormModal.tsx`, `PartnerEventsPage.tsx` | `Button` (`ghost`, `danger`, `link`) with an `aria-label` on icon-only buttons |
| 12 | The web `Button` has no default `type`, so inside a form it submits unless it passes `type="button"` | `Button.tsx` | pass `type` on every `Button` inside a form |
| 13 | App admin screens keep some literal radii (about 28), hex accents (`#f43f5e`, `#ea580c`, `#7e22ce`, `#10b981`…) and three font sizes outside the tokens; user-facing app screens use `radii`, `fontSizes`, `adminSectionAccent` and the status tokens | `features/admin/*` (app) | `radii`, `fontSizes`, `adminSectionAccent`, `systemColors` |

## Source map

| Area | Web | App |
|---|---|---|
| Palette and fonts | [`tailwind.css`](../../../../frontend-react/src/shared/assets/styles/tailwind.css), [`globals.css`](../../../../frontend-react/src/shared/assets/styles/globals.css) | [`tokens.ts`](../../../../frontend-mobile/src/shared/theme/tokens.ts), [`vinnotTheme.ts`](../../../../frontend-mobile/src/shared/theme/vinnotTheme.ts), [`typography.ts`](../../../../frontend-mobile/src/shared/theme/typography.ts) |
| Elevation and motion ([catalog](motion.md)) | Tailwind utilities, [`feedback.css`](../../../../frontend-react/src/presentation/components/feedback/feedback.css) | [`shadows.ts`](../../../../frontend-mobile/src/shared/theme/shadows.ts), [`motion.ts`](../../../../frontend-mobile/src/shared/theme/motion.ts) |
| UI kit | [`components/ui`](../../../../frontend-react/src/presentation/components/ui), [`components/feedback`](../../../../frontend-react/src/presentation/components/feedback) | [`components/ui`](../../../../frontend-mobile/src/presentation/components/ui), [`ToastProvider.tsx`](../../../../frontend-mobile/src/presentation/providers/ToastProvider.tsx) |
| Layout | [`components/layout`](../../../../frontend-react/src/presentation/components/layout) | [`components/layout`](../../../../frontend-mobile/src/presentation/components/layout) |
| Brand | [`components/brand`](../../../../frontend-react/src/presentation/components/brand) | [`components/brand`](../../../../frontend-mobile/src/presentation/components/brand) |
| Illustrations | [`illustrations.ts`](../../../../frontend-react/src/shared/illustrations.ts) | [`illustrations.ts`](../../../../frontend-mobile/src/shared/illustrations.ts) |
| Copy | [`locales`](../../../../frontend-react/src/shared/i18n/locales) | [`locales`](../../../../frontend-mobile/src/shared/i18n/locales) |

## Keeping the guide true

- A new color, size or duration enters as a named token, not as a literal in a
  page.
- A change to a shared component updates its row here, in both languages, in
  the same change.
- Visual QA covers compact and large screens, Spanish and English, larger text,
  offline, broken images, loading, empty and error states.
- Fixing a known inconsistency removes its row.

## Related

- [Mobile UI/UX guidelines](../../frontend-mobile/design/ui-ux-guidelines.md)
- [Web frontend architecture](../../frontend-web/architecture/overview.md)
