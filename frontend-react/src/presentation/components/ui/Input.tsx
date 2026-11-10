/**
 * Input — base UI component
 */

import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import {
  describedBy,
  fieldClassName,
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
  type FieldTone,
} from './fieldStyles'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  tone?: FieldTone
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, tone, className = '', ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-') ?? generatedId

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className={fieldLabelClassName}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={fieldClassName({ invalid: !!error, tone, className })}
          aria-invalid={!!error}
          aria-describedby={describedBy(inputId, hint, error)}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className={fieldErrorClassName}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className={fieldHintClassName}>{hint}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
