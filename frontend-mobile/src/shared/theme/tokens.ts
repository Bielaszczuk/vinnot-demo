/**
 * Design Tokens — Vinnot Mobile
 *
 * The single palette of the app: every colour of the UI comes from here.
 * `vinnotColors` (vinnotTheme.ts) is a set of derived aliases, never new values.
 * The wine scale mirrors the web palette (frontend-react/src/shared/assets/styles/tailwind.css).
 * These raw tokens feed:
 *   - vinnotTheme.ts      (product aliases used by feature screens)
 *   - ThemeProvider       (React context, StyleSheet usage)
 *   - shadows.ts / motion.ts / typography.ts
 *   - tailwind.config.js  (kept in step by hand; NativeWind is configured but unused)
 *
 * @contract: keep the wine scale in sync with the web `@theme` palette.
 */

// ─── Color Palette ───────────────────────────────────────────────────────────

export const wine = {
  50: "#fdf2f4",
  100: "#fce7eb",
  200: "#f9d0d9",
  300: "#f4a9ba",
  400: "#ec7794",
  500: "#df4d72",
  600: "#cb2d5d",
  700: "#ab214c",
  800: "#8f1e43",
  900: "#7a1d3e",
  950: "#440b1e",
} as const;

export const neutral = {
  0: "#ffffff",
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#e5e5e5",
  300: "#d4d4d4",
  400: "#a3a3a3",
  500: "#737373",
  600: "#525252",
  700: "#404040",
  800: "#262626",
  900: "#171717",
  950: "#0a0a0a",
} as const;

// Status colours use the higher-contrast values: success and danger pass AA as
// text on white (5.48:1 and 4.83:1); warning is a fill, use warningText for text.
export const systemColors = {
  success: "#047857",
  successLight: "#ecfdf5",
  successText: "#047857",
  successBorder: "#a7f3d0",
  warning: "#d97706",
  warningLight: "#fffbeb",
  warningText: "#b45309",
  danger: "#dc2626",
  dangerLight: "#fef2f2",
  dangerBorder: "#fecaca",
  dangerText: "#b91c1c",
  info: "#3b82f6",
  infoLight: "#dbeafe",
  infoText: "#1d4ed8",
} as const;

/**
 * Dark editorial colours. They belong to the dormant dark theme and to the
 * illustrated heroes; light screens never use `ink`, `cellar` or `cream` as a
 * background (use `lightTokens.bgMuted`, `brandTint` or `surfaceDefault`).
 */
export const editorial = {
  brand: wine[700],
  brandMuted: wine[500],
  brandDeep: wine[800],
  ink: "#100709",
  inkSoft: "#180B0F",
  cellar: "#211016",
  cellarRaised: "#2A151C",
  cream: "#F6EDE1",
  creamMuted: "#E8D8C5",
} as const;

// ─── Semantic Tokens ─────────────────────────────────────────────────────────

// ColorTheme is the shape shared by both light and dark token objects.
// Defined as a loose string map so darkTokens (different literal values) satisfies it.
export type ColorTheme = Record<string, string>;

export const lightTokens = {
  // Backgrounds
  bgBase: neutral[0],
  bgSubtle: neutral[50],
  bgMuted: wine[50],
  bgInverted: neutral[900],
  bgCanvasMuted: neutral[100],

  // Surfaces (cards, sheets, modals)
  surfaceDefault: neutral[0],
  surfaceRaised: neutral[0],
  surfaceReading: neutral[0],
  surfaceReadingMuted: neutral[50],
  surfaceOverlay: "rgba(23, 23, 23, 0.56)",
  // Warm watercolor paper behind illustrated public heroes and editorial blocks.
  surfacePaper: "#fcf8f6",

  // Text
  textPrimary: neutral[900],
  textSecondary: neutral[600],
  textTertiary: neutral[500],
  textDisabled: neutral[400],
  textInverted: neutral[0],
  textBrand: wine[700],
  textDanger: systemColors.danger,

  // Border
  borderDefault: neutral[200],
  borderStrong: neutral[300],
  borderSoft: "#f0e5e8",
  // Hairline edge on top of a coloured fill (gradient pills).
  borderOnColor: "rgba(255,255,255,0.18)",
  // The one focus colour: the brand burgundy.
  borderFocus: wine[700],
  borderDanger: systemColors.danger,

  // Brand
  brandPrimary: wine[700],
  brandPrimaryHover: wine[600],
  // The one pressed colour.
  brandPrimaryPressed: wine[800],
  brandSecondary: wine[50],
  brandSecondaryStrong: wine[200],
  brandTint: "#f7e8ed",
  brandDeep: wine[900],
  brandAccent: wine[500],

  // Status
  ...systemColors,

  // Tab / navigation
  tabActive: wine[700],
  tabInactive: neutral[500],
  tabBarBg: neutral[0],
  tabBarBorder: neutral[200],

  // Input
  inputBg: neutral[0],
  inputBorder: neutral[300],
  inputPlaceholder: neutral[400],
} as const;

export const darkTokens: ColorTheme = {
  bgBase: "#090305",
  bgSubtle: "#100609",
  bgMuted: editorial.cellar,
  bgInverted: neutral[0],
  surfaceDefault: editorial.cellar,
  surfaceRaised: editorial.cellarRaised,
  surfaceReading: editorial.cream,
  surfaceReadingMuted: editorial.creamMuted,
  surfaceOverlay: "rgba(4, 1, 2, 0.88)",
  textPrimary: "#FBF4EC",
  textSecondary: "#D8C5B5",
  textTertiary: "#A98E80",
  textDisabled: "#725864",
  textInverted: editorial.inkSoft,
  textBrand: wine[300],
  textDanger: systemColors.danger,
  borderDefault: "#3B222A",
  borderStrong: "#65404C",
  borderFocus: wine[500],
  borderDanger: systemColors.danger,
  brandPrimary: wine[500],
  brandPrimaryHover: wine[400],
  brandPrimaryPressed: wine[600],
  brandSecondary: editorial.cellarRaised,
  brandAccent: wine[300],
  ...systemColors,
  tabActive: wine[300],
  tabInactive: "#A98E80",
  tabBarBg: "#14090D",
  tabBarBorder: "#3B222A",
  inputBg: "#211016",
  inputBorder: "#5B3944",
  inputPlaceholder: "#8E747D",
} as const;

// ─── Accent maps ─────────────────────────────────────────────────────────────

export interface WineTypeColor {
  /** Badge text and icon; at least 4.5:1 on white and on `bg`. */
  text: string;
  bg: string;
  border: string;
}

/** Wine type colours for badges and labels: watercolor tones with AA text on white. */
export const wineTypeColors = {
  RED: { text: wine[800], bg: wine[50], border: wine[200] },
  WHITE: { text: "#7a5a12", bg: "#fbf6e6", border: "#ecdfb8" },
  ROSE: { text: "#a8344f", bg: "#fdf0f1", border: "#f4ccd5" },
  SPARKLING: { text: "#6e5c1a", bg: "#f8f4e1", border: "#e6dcae" },
  DESSERT: { text: "#8a4b14", bg: "#fbf0e3", border: "#efd4b4" },
  FORTIFIED: { text: "#6e2f22", bg: "#f7ece8", border: "#e3c7be" },
  ORANGE: { text: "#97470f", bg: "#fdf0e4", border: "#f1d2b6" },
} as const satisfies Record<string, WineTypeColor>;

export type WineTypeColorKey = keyof typeof wineTypeColors;

/** Colours of a wine type; an unknown type falls back to the red (brand) badge. */
export function wineTypeColor(type?: string | null): WineTypeColor {
  const key = type?.toUpperCase() as WineTypeColorKey | undefined;
  return (key && wineTypeColors[key]) || wineTypeColors.RED;
}

/** One saturated colour per wine type, for charts such as the cellar's type mix. */
export const wineTypeSwatches = {
  RED: "#7A1D3E",
  WHITE: "#E4C766",
  ROSE: "#EE9AAE",
  SPARKLING: "#B9C98A",
  DESSERT: "#C9853A",
  FORTIFIED: "#6E2F22",
  ORANGE: "#E08A3C",
} as const satisfies Record<WineTypeColorKey, string>;

/** Swatch of a wine type; an unknown type gets a neutral grey. */
export function wineTypeSwatch(type?: string | null): string {
  const key = type?.toUpperCase() as WineTypeColorKey | undefined;
  return (key && wineTypeSwatches[key]) || neutral[400];
}

/**
 * Taste wheel washes, the same hex values as the web wheel. Each family is ordered so that
 * consecutive shades read apart: reds garnet, ruby, violet and plum; whites gold, green-yellow
 * and straw; rosés in three pinks; anything else warm greys. Styles use `wineTypeSwatches`
 * with `unknownStyle` for a type without a swatch; regions take eight distinct hues.
 */
export const tasteWheelPalette = {
  red: ["#7A1F3D", "#B8304A", "#6B3F8F", "#9A4A7C"],
  white: ["#D4A537", "#B7C25A", "#E9D47F"],
  rose: ["#E58FA6", "#D3637E", "#F2B5BC"],
  neutral: ["#A99A8C", "#8C7F76", "#CDBDA9"],
  unknownStyle: "#A59B93",
  regions: ["#C8664A", "#D9A441", "#8A9A4B", "#3F8C8A", "#4F6FA8", "#8C6BB1", "#C95D85", "#8B5A3C"],
} as const;

/**
 * One accent per admin section (hero mark, "New" button, stat value). Every
 * accent carries white text and reads on white (at least 4.5:1).
 */
export const adminSectionAccent = {
  dashboard: wine[800],
  wines: wine[700],
  wineries: "#9a4a1f",
  routes: "#4f6b2f",
  events: "#6b3a6b",
  users: "#7a5230",
  reviews: "#8a6418",
  community: wine[900],
  notifications: wine[700],
  submissions: wine[800],
} as const;

export type AdminSection = keyof typeof adminSectionAccent;

/** Taste bar fills (AI profile and its editor); each one stands 3:1 on a white card. */
export const tasteAttributeColors = {
  sweetness: "#b9657f",
  acidity: "#6f8a45",
  tannin: wine[600],
  body: "#a8762c",
} as const;

export type TasteAttribute = keyof typeof tasteAttributeColors;

/** Tag families of the AI wine profile (aromas, flavours, pairings): muted watercolor tones, AA text. */
export const profileTagColors = {
  violet: { bg: "#f5f0f8", text: "#6f3e78", border: "#e4d7e8" },
  amber: { bg: "#fff8e8", text: "#8a5a12", border: "#f2e2b8" },
  rose: { bg: wine[50], text: wine[900], border: "#f7e8ed" },
  emerald: { bg: "#ecf7f1", text: "#2d6b50", border: "#cee8d9" },
  green: { bg: "#f0f7ed", text: "#466a38", border: "#d9e8d2" },
  sky: { bg: "#eef6f8", text: "#366975", border: "#d5e8ec" },
} as const;

/** Shadow tints: neutral ink for elevation, the deep brand for branded cards and toasts. */
export const shadowColors = {
  soft: neutral[900],
  brand: wine[900],
  deep: wine[950],
} as const;

/** Lucide stroke widths: thin for notices and dense rows, strong for focus and selection marks. */
export const iconStrokes = {
  thin: 1.75,
  regular: 2,
  strong: 2.4,
  heavy: 3,
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ─── Border Radii ─────────────────────────────────────────────────────────────

export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  "4xl": 32,
  full: 9999,
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;

// ─── Layout ───────────────────────────────────────────────────────────────────

export const layout = {
  screenHorizontalPadding: 20,
  screenVerticalPadding: 24,
  cardPadding: 16,
  sectionGap: 32,
  tabBarHeight: 62,
  headerHeight: 56,
} as const;
