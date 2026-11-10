/**
 * Button looks shared by `Button` and `LinkButton`.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link' | 'onDark'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-wine-700 text-white shadow-sm hover:bg-wine-800 active:bg-wine-900',
  secondary: 'border border-wine-700 bg-white text-wine-700 hover:bg-wine-50 active:bg-wine-100',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-700 hover:bg-wine-50 hover:text-wine-800',
  danger: 'bg-danger text-white shadow-sm hover:bg-red-800',
  link: 'bg-transparent text-wine-700 underline underline-offset-4 decoration-wine-300 hover:text-wine-800 hover:decoration-wine-700',
  onDark: 'border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
}

/** The class list of a button look, shared by `Button` and `LinkButton`. */
export function buttonClassName({ variant = 'primary', size = 'md', className = '' }: ButtonStyleOptions = {}): string {
  const shape = variant === 'link' ? 'rounded-sm px-0.5 text-sm' : `rounded-xl ${sizeStyles[size]}`
  return [
    'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    shape,
    variantStyles[variant],
    className,
  ].filter(Boolean).join(' ')
}
