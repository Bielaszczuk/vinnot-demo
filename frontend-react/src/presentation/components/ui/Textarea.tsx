/**
 * Textarea — a multi-line text field with the shared field look.
 */

import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import {
  describedBy,
  fieldClassName,
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
} from './fieldStyles'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={fieldId} className={fieldLabelClassName}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          className={fieldClassName({ invalid: !!error, className: `leading-relaxed ${className}`.trim() })}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          {...props}
        />
        {error && (
          <p id={`${fieldId}-error`} className={fieldErrorClassName}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${fieldId}-hint`} className={fieldHintClassName}>{hint}</p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
