import React from 'react'
import { Input } from '@components/ui/Input'

type PasswordWithStrengthProps = {
  label: string
  placeholder: string
  error?: string
  hint?: string
  name?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}

export const PasswordWithStrength = React.forwardRef<HTMLInputElement, PasswordWithStrengthProps>(
  ({ label, placeholder, error, hint, ...rest }, ref) => {
    const [value, setValue] = React.useState('')
    const strength = React.useMemo(() => {
      if (!value) return { score: 0, label: '', color: '' }
      let score = 0
      if (value.length >= 8) score++
      if (value.length >= 12) score++
      if (/[A-Z]/.test(value)) score++
      if (/[a-z]/.test(value)) score++
      if (/[0-9]/.test(value)) score++
      if (/[^A-Za-z0-9]/.test(value)) score++
      if (score <= 2) return { score, label: 'Débil', color: 'bg-red-500' }
      if (score <= 4) return { score, label: 'Media', color: 'bg-yellow-500' }
      return { score, label: 'Fuerte', color: 'bg-green-500' }
    }, [value])

    return (
      <div>
        <Input
          ref={ref}
          label={label}
          type="password"
          autoComplete="new-password"
          placeholder={placeholder}
          error={error}
          {...rest}
          onChange={(event) => {
            setValue(event.target.value)
            rest.onChange?.(event)
          }}
        />
        {value && !error ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${strength.color}`}
                style={{ width: `${(strength.score / 6) * 100}%` }}
              />
            </div>
            <span className="text-2xs font-medium text-gray-500">{strength.label}</span>
          </div>
        ) : !error ? (
          <p className="mt-1 text-2xs text-gray-500">{hint}</p>
        ) : null}
      </div>
    )
  },
)

PasswordWithStrength.displayName = 'PasswordWithStrength'
