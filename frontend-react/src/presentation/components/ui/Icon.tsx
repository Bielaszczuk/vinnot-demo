/**
 * Icon — the one way to draw a Lucide icon.
 *
 * The size scale follows the text it sits next to, and every icon uses the
 * same stroke. Icons are decorative unless a `label` is given.
 */

import type { LucideIcon, LucideProps } from 'lucide-react'
import { ICON_SIZES, ICON_STROKE, type IconSize } from './iconScale'

export type { IconSize } from './iconScale'

interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  icon: LucideIcon
  size?: IconSize
  /** Accessible name; without it the icon is hidden from assistive technology. */
  label?: string
}

export function Icon({ icon: Glyph, size = 'sm', label, className = '', ...props }: IconProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const }
  return (
    <Glyph
      size={ICON_SIZES[size]}
      strokeWidth={ICON_STROKE}
      className={`shrink-0 ${className}`.trim()}
      focusable="false"
      {...a11y}
      {...props}
    />
  )
}
