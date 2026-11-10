/**
 * The icon size scale and stroke shared by every Lucide icon.
 */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** One stroke width for every UI icon. */
export const ICON_STROKE = 1.75

/** Pixel size per step, paired with the text size it accompanies. */
export const ICON_SIZES: Record<IconSize, number> = {
  xs: 14, // text-xs, text-2xs
  sm: 16, // text-sm
  md: 20, // text-base, buttons and fields
  lg: 24, // text-lg to text-xl, section marks
  xl: 32, // headings and empty states
}
