/**
 * One look for every text field and select: warm border, rounded-xl,
 * 44 px tall, burgundy focus ring. `onDark` is for fields on dark bands.
 */

export type FieldTone = 'light' | 'onDark'
export type FieldSize = 'sm' | 'md'

interface FieldStyleOptions {
  invalid?: boolean
  tone?: FieldTone
  size?: FieldSize
  className?: string
}

const tones: Record<FieldTone, string> = {
  light:
    'border-field bg-white text-ink placeholder:text-gray-400 focus:border-wine-500 disabled:bg-gray-50 disabled:text-gray-500',
  onDark:
    'border-white/20 bg-white/10 text-white placeholder:text-gray-300 focus:border-white/40 focus:bg-white/15',
}

const sizes: Record<FieldSize, string> = {
  sm: 'min-h-9 px-3 py-1.5',
  md: 'min-h-11 px-3.5 py-2',
}

export function fieldClassName({ invalid = false, tone = 'light', size = 'md', className = '' }: FieldStyleOptions = {}): string {
  return [
    'w-full rounded-xl border text-sm transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-wine-500/20 disabled:cursor-not-allowed',
    sizes[size],
    tones[tone],
    invalid ? 'border-danger focus:border-danger focus:ring-danger/20' : '',
    className,
  ].filter(Boolean).join(' ')
}

/** Label, hint and error text shared by the field components. */
export const fieldLabelClassName = 'text-sm font-medium text-gray-700'
export const fieldHintClassName = 'text-xs text-gray-500'
export const fieldErrorClassName = 'text-xs text-danger'

/** Ids of the hint and error that describe a field, for `aria-describedby`. */
export function describedBy(fieldId: string, hint?: string, error?: string): string | undefined {
  if (error) return `${fieldId}-error`
  if (hint) return `${fieldId}-hint`
  return undefined
}
