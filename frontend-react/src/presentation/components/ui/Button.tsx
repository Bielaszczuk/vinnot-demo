/**
 * Button — base UI component.
 *
 * One look for every action: rounded-xl, burgundy primary, burgundy outline
 * secondary, neutral outline, ghost, danger, a text `link` and `onDark` for
 * dark bands. Use `LinkButton` when the action navigates.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles'

export type { ButtonVariant, ButtonSize, ButtonStyleOptions } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

/** The busy indicator inside a button; decorative, the button reports `aria-busy`. */
export function ButtonSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin motion-reduce:animate-none"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {isLoading ? <ButtonSpinner /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  ),
)

Button.displayName = 'Button'
