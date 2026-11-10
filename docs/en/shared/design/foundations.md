# Design foundations

Color, typography, spacing, shape, elevation, iconography and motion, as the web
and the app implement them today. Values come from the token files linked in
each section; when a value here and the code differ, the code wins.

Part of the [visual system](visual-system.md).

## Color

### Brand scale: `wine`

One burgundy scale, the same on both platforms. **Wine 700 (`#ab214c`) is the
brand color.**

| Token | Value | Web use | App use |
|---|---|---|---|
| wine-50 | `#fdf2f4` | notice icon well, soft section backgrounds | `brandSoft`: ghost button, active tab, notice icon well |
| wine-100 | `#fce7eb` | notice and `FormSection` border | — |
| wine-200 | `#f9d0d9` | — | avatar background |
| wine-300 | `#f4a9ba` | — | dark-theme brand text (unused, see [inconsistencies](visual-system.md#known-inconsistencies)) |
| wine-500 | `#df4d72` | global focus outline, focus ring of buttons and fields | `brandAccent`/`brandMuted`: wine route detail icons and the `WineryCard` border |
| wine-600 | `#cb2d5d` | range slider fill | `brandPrimaryHover`, `tasteAttributeColors.tannin` |
| wine-700 | `#ab214c` | primary button, secondary button border and text, links, current page, loading mark, notice accent | `brand`: primary button, active tab, selected chip, links; `borderFocus`: field focus border and glow |
| wine-800 | `#8f1e43` | primary button hover | `brandPrimaryPressed`: the one pressed color; avatar initials |
| wine-900 | `#7a1d3e` | error notice accent, `PageBanner` gradient end | `brandDeep`: toast and brand shadow tint (`shadowColors.brand`) |
| wine-950 | `#440b1e` | toast and card shadow tint, `PageBanner` gradient middle | — |

Sources: web [`tailwind.css`](../../../../frontend-react/src/shared/assets/styles/tailwind.css)
(`@theme`, Tailwind CSS 4), app [`tokens.ts`](../../../../frontend-mobile/src/shared/theme/tokens.ts)
(`wine`).

Rules:

- Burgundy means action, selection and brand. It never means error.
- Use one filled burgundy button per context. Secondary actions use outline,
  secondary or ghost variants.
- Long text stays neutral. Burgundy text is for links, labels and short accents.

### Neutrals and surfaces

The web redefines Tailwind's `gray` scale as warm neutrals in `@theme`, so every
`gray-*` utility sits on the cream paper without a blue cast: `gray-50`
`#faf8f6`, `100` `#f4f1ee`, `200` `#e8e2dc`, `300` `#d6cec6`, `400` `#a59b93`,
`500` `#6f6762`, `600` `#57504b`, `700` `#443d39`, `800` `#2c2522`, `900`
`#1f1a18`, `950` `#110d0c`.

| Role | Web (semantic token, `@theme`) | App (`lightTokens`, Tailwind `neutral` values) |
|---|---|---|
| Page canvas | `canvas` `#f4eee6` (warm cream) on `body` and `AppShell` | `bgBase` `#ffffff`; tab scenes `vinnotColors.canvas` `#FAFAFA` |
| Card / sheet surface | `surface` `#ffffff` | `surfaceDefault` `#ffffff` |
| Subtle surface | `surface-cream` `#fbf7f2`, `gray-50`, `gray-100` | `bgSubtle` `#fafafa`, `bgMuted` wine-50 |
| Primary text | `ink` `#2b2226`, `gray-900` | `textPrimary` `#171717` |
| Secondary text | `muted` `#6b5d58`, `gray-600`, `gray-500` | `textSecondary` `#525252`, `textTertiary` `#737373` |
| Placeholder / disabled | `gray-400` | `inputPlaceholder`, `textDisabled` `#a3a3a3` |
| Border | `border` `#e7ddd3` (also the default of a bare `border`), fields `field` `#d6cec6` | `borderDefault` `#e5e5e5`, `inputBorder` `#d4d4d4` |
| Overlay | `bg-black/50` | `surfaceOverlay` `rgba(23, 23, 23, 0.56)` |
| Header / dark band | header `gray-900/95`; `PageBanner` `from-gray-900 via-wine-950 to-wine-900` | — |
| Rating | watercolor glasses by wine type, filled by fraction | watercolor glasses by wine type, filled by fraction |

A base rule in `tailwind.css` sets `border-color: var(--color-border)` on every
element, because Tailwind CSS 4 draws a bare `border` in `currentColor`.

### App palette

The app has one palette. [`tokens.ts`](../../../../frontend-mobile/src/shared/theme/tokens.ts)
holds every value: the `wine` and `neutral` scales, `systemColors` and the
semantic `lightTokens` (`bg*`, `surface*`, `text*`, `border*`, `brand*`, `tab*`,
`input*`). [`vinnotTheme.ts`](../../../../frontend-mobile/src/shared/theme/vinnotTheme.ts)
keeps the `vinnotColors` names (`brand`, `ink`, `muted`, `danger`…) as aliases of
those tokens and holds no hex value of its own; a test checks that every alias
is in the palette. There is one pressed color (`brandPrimaryPressed`, wine-800)
and one focus color (`borderFocus`, wine-700). `editorial` colors belong to the
dark theme only; light screens use `bgMuted`, `brandTint` or `surfaceDefault`.

### App accent maps

Content accents also live in `tokens.ts`, so no screen keeps its own map:

| Map | Use |
|---|---|
| `wineTypeColors`, `wineTypeColor(type)` | wine type badges: text, tint and border per type, AA on white and on the tint; unknown types fall back to red |
| `wineTypeSwatches`, `wineTypeSwatch(type)` | one saturated color per type for charts, such as the cellar's type mix; unknown types use grey `#A39A94` |
| `adminSectionAccent` | admin hero and dashboard stat accent per section (`AdminPageHero section`, which also picks the section icon, the same one the dashboard uses), white text passes AA |
| `tasteAttributeColors` | sweetness, acidity, tannin and body bars in the AI profile and its editor |
| `profileTagColors` | AI profile tag families |
| `shadowColors` | `soft` (neutral-900), `brand` (wine-900), `deep` (wine-950) |
| `iconStrokes` | `thin` 1.75, `regular` 2, `strong` 2.4, `heavy` 3 |

[`grapeColors.ts`](../../../../frontend-mobile/src/presentation/features/home/grapeColors.ts)
(`grapeGradient`) paints the home screen's popular-grape pills with a gradient of
each wine's color. Text is white when it reaches 4.5:1 on both stops and dark
brown otherwise; a grape with no palette uses the neutral pill.

### Status colors

| Status | App (`systemColors`) | Web (Tailwind) |
|---|---|---|
| Success | `success` and `successText` `#047857`, `successLight` `#ecfdf5`, `successBorder` | `success` `#047857`, `success-soft` `#ecf8f3` |
| Warning | `warning` `#d97706` (fill), `warningLight` `#fffbeb`, `warningText` `#b45309` | `warning` `#b45309`, `warning-soft` `#fdf5e9`; also the warning notice accent |
| Danger | `danger` `#dc2626` (also `textDanger`, `borderDanger`), `dangerLight` `#fef2f2`, `dangerBorder`, `dangerText` `#b91c1c` | `danger` `#b91c1c` (danger button, field error and invalid border), `danger-soft` `#fdf0ef` |
| Info | `info` `#3b82f6`, `infoLight`, `infoText` `#1d4ed8` | `info` `#2b5c8a`, `info-soft` `#eef3f8` |

On the web every status token passes AA as text on white and on its own soft
tint. In the app `success` and `danger` pass AA as text on white; `warning` is a
fill, its text uses `warningText`.

Notices and toasts stay brand-tinted for every variant: the icon, the role and
the copy carry the meaning, not the hue (`AlertBanner`, `FeedbackNotice`).
Status color goes on badges, field errors and destructive buttons.

### Measured contrast

Ratios against the real surface (WCAG 2.x formula). AA needs 4.5:1 for normal
text and 3:1 for large text and UI parts.

| Pair | Ratio | Verdict |
|---|---|---|
| wine-700 on white / white on wine-700 | 6.88 | AA text |
| wine-700 on wine-50 | 6.28 | AA text |
| wine-500 on white | 3.86 | large text and UI only |
| `#737373` on white | 4.74 | AA text |
| `#a3a3a3` / `gray-400` on white | 2.5 | placeholder or decoration only |
| app `danger` `#dc2626` on white / white on it | 4.83 | AA text |
| app `success` `#047857` on white | 5.48 | AA text |
| web `gray-500` `#6f6762` on canvas `#f4eee6` / on white | 4.80 / 5.54 | AA text |
| web `muted` `#6b5d58` on canvas | 5.47 | AA text |
| web `ink` `#2b2226` on canvas | 13.40 | AA text |
| web `rating` `#a16207` on white | 4.92 | AA text |
| web `success` / `warning` / `danger` / `info` on white | 5.48 / 5.02 / 6.47 / 7.00 | AA text |
| web `gray-400` `#a59b93` on white | 2.72 | placeholder or decoration only |

## Typography

**Poppins is the only family on both platforms**, weights 400, 500, 600 and 700.

- Web: self-hosted WOFF2 files declared in
  [`globals.css`](../../../../frontend-react/src/shared/assets/styles/globals.css)
  with `font-display: swap`; Tailwind `--font-sans` points to Poppins.
- App: `@expo-google-fonts/poppins` loaded in
  [`_layout.tsx`](../../../../frontend-mobile/app/_layout.tsx); components use
  `fontFamilies` from [`typography.ts`](../../../../frontend-mobile/src/shared/theme/typography.ts).

### App presets (`textStyles`)

| Preset | Weight | Size / line height | Use |
|---|---|---|---|
| `displayLarge` / `displayMedium` | 700 | 48 / 55, 40 / 46 | hero numbers and splash-size titles |
| `displaySmall` | 600 | 32 / 40 | large editorial titles |
| `headingLarge` | 600 | 28 / 35 | screen hero title |
| `headingMedium` | 600 | 24 / 30 | `AppHeader` title |
| `headingSmall` | 500 | 20 / 30 | section header, state title |
| `titleLarge` / `titleMedium` / `titleSmall` | 600 / 500 / 500 | 18, 16, 13 | card titles, list rows |
| `bodyLarge` / `bodyMedium` / `bodySmall` | 400 | 16 / 26, 15 / 24, 13 / 21 | reading text; `bodyMedium` is the default |
| `labelLarge` / `labelMedium` / `labelSmall` | 600 / 500 / 500 | 13, 12, 10 | chips, badges, meta |
| `wineName` | 600 | 24 / 30 | wine name on detail |
| `caption` | 400 | 12 / 19.5 | field hint and error, subtitles |
| `overline` | 600 | 10 | `TagPill` (uppercase) |
| `button` / `buttonSmall` | 600 | 15, 12 | button labels |

All app letter spacings are 0. Besides the presets, `fontSizes` has `meta` 11
(card meta lines) and `ui` 14 (dense controls); screens use these steps instead
of literal sizes.

### Web scale

The web uses the Tailwind CSS 4 default scale (`text-xs` 12 px, `text-sm` 14,
`text-base` 16, `text-lg` 18, `text-xl` 20, `text-2xl` 24, `text-3xl` 30) plus
`text-2xs` (11 px / 16 px), the smallest size in use. There is no 10 px text and
no serif family. The patterns in use:

| Role | Classes |
|---|---|
| Page title (`h1`) | `PageBanner`: `text-2xl sm:text-3xl font-semibold tracking-tight`, white on the dark band |
| Eyebrow, counters | `text-2xs font-semibold uppercase` with wide tracking |
| Section title | `text-lg font-semibold` or `text-xl font-semibold` |
| Card title | `text-lg font-semibold text-ink` (`CardHeader`) |
| Body | `text-sm` in dense UI, `text-base leading-relaxed` in reading blocks |
| Field label | `text-sm font-medium text-gray-700` |
| Hint / error | `text-xs text-gray-500` / `text-xs text-danger` |

Rules:

- One main title per screen. Section titles and labels never compete with the
  wine name.
- Text stays live text; it is never painted inside an illustration.
- Layouts tolerate Spanish and English lengths and larger system font sizes.

## Spacing

Both platforms use a 4-point base.

| | Web | App |
|---|---|---|
| Scale | Tailwind spacing (`1` = 4 px) | `spacing` in `tokens.ts`: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24 … 96 |
| Screen gutter | `px-3 sm:px-6 lg:px-8` | `layout.screenHorizontalPadding` 20 |
| Screen top/bottom | `py-5 sm:py-8` | `layout.screenVerticalPadding` 24; bottom adds the safe-area inset + 24 |
| Card padding | `Card` `p-3` / `p-5` (default) / `p-8` | `Card` 16 (`layout.cardPadding`) |
| Section gap | `space-y-*`, `gap-*` per page | `layout.sectionGap` 32 |
| Field stack | `gap-1` label/input; forms `space-y-4` | `TextField` gap 7; `FormSection` content gap 14 |

## Radii

| Element | Web | App |
|---|---|---|
| Button | `rounded-xl` (12 px) | `radii.md` 8 (every size; `AuthButton` the same) |
| Input / select / text area | `rounded-xl` (12 px) | 8 |
| Card | `rounded-2xl` (16 px) | `radii.md` 8 by default |
| Page banner, AI journey card | `rounded-2xl`, `rounded-3xl` | — |
| Modal panel | `rounded-xl` | — |
| Form section, illustration | `rounded-2xl` (16 px) | `FormSection` 20 |
| Notice / toast | 20 px | 20 |
| Bottom sheet | — | top corners 24 |
| Tab bar | — | top corners `radii["3xl"]` 24, item `radii.lg` 12 |
| Chip, badge, pill, avatar | `rounded-full` | `radii.full` |

App scale (`radii`): `xs` 2, `sm` 4, `md` 8, `lg` 12, `xl` 16, `2xl` 20,
`3xl` 24, `4xl` 32, `full`.

## Elevation and layering

| Level | Web | App ([`shadows.ts`](../../../../frontend-mobile/src/shared/theme/shadows.ts)) |
|---|---|---|
| Small: inputs, chips, buttons | `shadow-sm` | `shadows.sm` (Android elevation 1) |
| Card | `shadow-sm` tinted wine-950 at 5 % on `Card` | `Card` default `sm`; `md` (elevation 3) available for raised list items |
| Sticky / raised | header `shadow-lg` | `shadows.lg` (elevation 8) |
| Sheet / floating | modal `shadow-xl` | `shadows.xl` (elevation 12); tab bar elevation 10 |
| Overlay | — | `shadows["2xl"]` (elevation 20) |
| Toast | `0 8px 28px -10px rgb(68 11 30 / 18%)` | `brandDeep` (wine-900 `#7a1d3e`) shadow, elevation 8 |

App shadows use `shadowColors.soft` (neutral-900) on iOS and `elevation` on
Android; no screen sets a literal shadow color. A selected `Chip`
adds a burgundy glow.

Stacking: the web header and modals use `z-50` (modals portal to `body`, after
the app root) and toasts `z-index: 10000`. The app defines `zIndex` tokens
(`raised` 10 … `modal` 50, `toast` 60); the toast host uses 9999.

## Iconography

| | Web | App |
|---|---|---|
| UI icons | `lucide-react` through the shared [`Icon`](../../../../frontend-react/src/presentation/components/ui/Icon.tsx) | `lucide-react-native` (106 files) |
| Navigation icons | `NavigationIcon` keys in [`navigation.ts`](../../../../frontend-react/src/shared/config/navigation.ts), drawn by [`navIcons.ts`](../../../../frontend-react/src/presentation/components/layout/navIcons.ts) | Lucide in the tab bar |
| Custom SVG | `SocialIcons`, the AI progress ring | `SocialIcons`, AI progress ring |

The Reshot "Winery Flat Icons" files in
[`public/images/icons`](../../../../frontend-react/public/images/icons) are no
longer drawn by the header, drawer, footer, AI loading or admin dashboard.

Web size scale (`Icon size`), one stroke width for every icon
(`ICON_STROKE` 1.75):

| Step | Size | Next to |
|---|---|---|
| `xs` | 14 px | `text-xs`, `text-2xs` |
| `sm` (default) | 16 px | `text-sm`, navigation, menus |
| `md` | 20 px | `text-base`, buttons, fields, the menu button |
| `lg` | 24 px | `text-lg` to `text-xl`, section marks |
| `xl` | 32 px | headings and empty states |

App sizes in use; strokes come from `iconStrokes` (`thin` 1.75, `regular` 2,
`strong` 2.4, `heavy` 3):

| Context | App |
|---|---|
| Inline with text | 14–18 |
| Buttons, fields, notices | 18–20, `thin` stroke in notices |
| Close in notices | 17 |
| Tab bar | 22, 23 focused (`regular` / `strong`) |
| Back (`BackButton`) | 18, `regular` |

Rules:

- New UI icons come from Lucide, drawn with `Icon` on the web. Do not draw a new
  inline SVG for an icon Lucide already has.
- An icon-only control has an accessible name (`aria-label` /
  `accessibilityLabel`). `Icon` is decorative unless it gets a `label`.
- Decorative icons are hidden from assistive technology (`aria-hidden`,
  `accessibilityElementsHidden`, `alt=""`). An icon next to its visible label
  does not repeat the label.
- An icon never carries a status alone; text or role goes with it.

## Motion

Every animation, with its timing, reduced-motion behavior and preview, is in
the [motion catalog](motion.md). These are the shared rules.

| Pattern | Web | App |
|---|---|---|
| Control transitions | 150 ms color and shadow changes (`transition-default`, `Button`, fields, `Pagination`) | `durations.fast` 120 ms |
| Hover and press feedback | color change, plus a small scale or lift: `RatingStars` grows to 110 %, wine and event cards lift 4 px and route cards 6 px with the image at 105 %, home hero buttons rise 2 px, the points seal grows to 1.04, sidebar links shrink on press (`active:scale`) | `Button` scales to 0.96 and `PressableCard` to 0.98 in 120 ms (duration only, Reanimated default easing); `MotionPressable` springs to 0.975 |
| Haptics | — | `Button` impact, `PressableCard` selection (`hapticsService`) |
| Notice / toast | enter 240 ms (`translateY -8 → 0`), exit 180 ms | same timings |
| Sheet | — | `@gorhom/bottom-sheet` default animation |
| Brand loading mark | 3.4 s CSS cycle | 3.4 s Reanimated cycle |
| Skeleton | `animate-pulse` (2 s) | 1.2 s opacity loop (600 ms each way) with the default `Animated` ease-in-out |
| AI loading | watercolor scenes (`AiProcessScene`), see [imagery](imagery.md#ai-loading-scenes) | watercolor scenes, see [imagery](imagery.md#ai-loading-scenes) |

App tokens live in [`motion.ts`](../../../../frontend-mobile/src/shared/theme/motion.ts):

- `durations`: `instant` 0, `fast` 120, `normal` 200, `slow` 320, `slower`
  480, `sluggish` 600 (ms).
- `easings`: `standard` and `emphasized` `bezier(0.2, 0, 0, 1)`, `enter`
  `bezier(0, 0, 0.2, 1)`, `exit` `bezier(0.4, 0, 1, 1)`, `spring`
  `bezier(0.34, 1.56, 0.64, 1)`, `elastic` `elastic(1.2)`, `linear`.
- `motionPresets`: `buttonPress`, `cardPress`, `fadeIn`, `screenTransition`,
  `sheetSnap`, `tabIndicator`, `skeleton` (1200 ms). `Button` and
  `PressableCard` read only the preset's duration and scale; `Skeleton` reads
  only its duration.
- `springConfigs` for `withSpring`: `gentle` (damping 20, stiffness 150, mass
  1), `bouncy` (12, 200, 0.8), `snappy` (25, 300, 0.8), `stiff` (30, 400, 1).

Reduced motion:

- Web: `prefers-reduced-motion` stops the notices, the grape mark (it shows the
  full static mark), the skeletons and pulses, the small spinners, the AI
  scenes (every part at its final pose, `useReducedMotion` followed live), the
  profile art, the thermometer and the palate bars, the rating bubbles and the
  pour demo, the seals (still, with a fixed highlight), the tier-up reveal (a
  0.4 s fade instead), the date and time popover, the home hero reveal (final
  state at once), the sidebar slide and stagger, the card lift and image zoom,
  the home and seal hover effects, the bar width transitions and the smooth scrolls (instant).
  Color and shadow transitions stay, since they do not move anything. Two
  small effects remain: the rating star still grows on hover without a
  transition, and the sidebar link press scale still animates.
- App: Reanimated follows the system setting, so entrances, press scales,
  springs, the AI scenes, the profile art, the seals and the pour control show
  their final state; toasts and `Skeleton` read
  `AccessibilityInfo.isReduceMotionEnabled` and appear without movement;
  stack and `Modal` slides become fades; `expo-image` images appear without a
  fade. `ActivityIndicator` keeps spinning, like Apple's activity indicators,
  because it is essential progress feedback. The map camera keeps its native
  animation.
- Motion explains a change of state. It never fakes progress or completion.
