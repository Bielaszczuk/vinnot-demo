/**
 * Select — base UI component.
 *
 * A native select with the shared field look and a Lucide chevron.
 * `tone="onDark"` is for filters on dark bands. Pass `options`, or
 * `<option>` children for custom groups.
 */

import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  describedBy,
  fieldClassName,
  fieldErrorClassName,
  fieldHintClassName,
  fieldLabelClassName,
  type FieldSize,
  type FieldTone,
} from './fieldStyles'
import { ICON_STROKE } from './iconScale'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  options?: SelectOption[]
  placeholder?: string
  tone?: FieldTone
  size?: FieldSize
  /** Classes for the wrapper, for example a width inside a filter row. */
  containerClassName?: string
  children?: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, hint, options, placeholder, id, tone = 'light', size, containerClassName = '', className = '', children, ...props },
    ref,
  ) => {
    const generatedId = useId()
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-') ?? generatedId
    const optionClass = tone === 'onDark' ? 'bg-gray-800 text-white' : undefined

    return (
      <div className={`flex flex-col gap-1 ${containerClassName}`.trim()}>
        {label && (
          <label htmlFor={selectId} className={fieldLabelClassName}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={fieldClassName({
              invalid: !!error,
              tone,
              size,
              className: `cursor-pointer appearance-none pr-10 ${className}`.trim(),
            })}
            aria-invalid={!!error}
            aria-describedby={describedBy(selectId, hint, error)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className={optionClass}>
                {placeholder}
              </option>
            )}
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className={optionClass}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
          <ChevronDown
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${tone === 'onDark' ? 'text-gray-300' : 'text-gray-500'}`}
          />
        </div>
        {error && (
          <p id={`${selectId}-error`} className={fieldErrorClassName}>{error}</p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className={fieldHintClassName}>{hint}</p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'
