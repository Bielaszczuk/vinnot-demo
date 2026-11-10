/**
 * Vinnot's product-level visual language.
 *
 * `vinnotColors` keeps the product names that feature screens use, but every
 * value is an alias of `tokens.ts`, the single palette. Add a colour there, then
 * alias it here if a product name helps; never write a hex value in this file.
 */
import { lightTokens, neutral, systemColors } from "./tokens";
import { fontFamilies } from "./typography";

export const vinnotColors = {
  background: lightTokens.bgBase,
  canvas: lightTokens.bgSubtle,
  canvasMuted: lightTokens.bgCanvasMuted,
  surface: lightTokens.surfaceDefault,
  brand: lightTokens.brandPrimary,
  brandPressed: lightTokens.brandPrimaryPressed,
  brandDeep: lightTokens.brandDeep,
  brandSoft: lightTokens.brandSecondary,
  brandSoftStrong: lightTokens.brandSecondaryStrong,
  brandTint: lightTokens.brandTint,
  ink: lightTokens.textPrimary,
  muted: lightTokens.textTertiary,
  placeholder: lightTokens.inputPlaceholder,
  border: lightTokens.borderDefault,
  borderStrong: lightTokens.borderStrong,
  borderSoft: lightTokens.borderSoft,
  borderFocused: lightTokens.borderFocus,
  danger: systemColors.danger,
  dangerSoft: systemColors.dangerLight,
  warning: systemColors.warning,
  warningSoft: systemColors.warningLight,
  success: systemColors.success,
  successSoft: systemColors.successLight,
  white: neutral[0],
} as const;

export const vinnotFonts = fontFamilies;
