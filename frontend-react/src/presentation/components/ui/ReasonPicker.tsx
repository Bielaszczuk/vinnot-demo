/**
 * ReasonPicker — one-tap preset reasons, with free text only under "Other".
 *
 * Generalizes the event cancellation and user suspension pickers: the caller
 * passes its reason codes (from the domain) and their labels, keeps one reason
 * always selected, and receives the optional note for the "other" reason.
 */

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { fieldClassName, fieldLabelClassName } from './fieldStyles'

type ReasonTone = 'wine' | 'warning' | 'danger'

const CHIP_TONES: Record<ReasonTone, string> = {
  wine: 'hover:border-wine-400 peer-checked:border-wine-600 peer-checked:bg-wine-600 peer-focus-visible:ring-wine-500/40',
  warning: 'hover:border-orange-400 peer-checked:border-orange-600 peer-checked:bg-orange-600 peer-focus-visible:ring-orange-500/40',
  danger: 'hover:border-red-400 peer-checked:border-red-600 peer-checked:bg-red-600 peer-focus-visible:ring-red-500/40',
}

export interface ReasonPickerProps<Code extends string> {
  legend: string
  reasons: readonly Code[]
  value: Code
  onChange: (reason: Code) => void
  getLabel: (reason: Code) => string
  note: string
  onNoteChange: (note: string) => void
  noteLabel: string
  maxNoteLength: number
  /** The reason that asks for free text; `OTHER` by default. */
  otherReason?: Code
  notePlaceholder?: string
  help?: string
  disabled?: boolean
  tone?: ReasonTone
}

export function ReasonPicker<Code extends string>({
  legend,
  reasons,
  value,
  onChange,
  getLabel,
  note,
  onNoteChange,
  noteLabel,
  maxNoteLength,
  otherReason = 'OTHER' as Code,
  notePlaceholder,
  help,
  disabled = false,
  tone = 'wine',
}: ReasonPickerProps<Code>) {
  const { t } = useTranslation()
  const name = useId()
  const helpId = useId()
  const noteId = useId()
  const showNote = value === otherReason

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2" aria-describedby={help ? helpId : undefined} disabled={disabled}>
        <legend className={fieldLabelClassName}>{legend}</legend>
        <div className="flex flex-wrap gap-2">
          {reasons.map((code) => (
            <label key={code} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={code}
                checked={value === code}
                onChange={() => onChange(code)}
                className="peer sr-only"
              />
              <span className={`inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors peer-checked:text-white peer-focus-visible:ring-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${CHIP_TONES[tone]}`}>
                {getLabel(code)}
              </span>
            </label>
          ))}
        </div>
        {help && <p id={helpId} className="text-xs text-gray-500">{help}</p>}
      </fieldset>
      {showNote && (
        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className={fieldLabelClassName}>{noteLabel}</label>
          <textarea
            id={noteId}
            value={note}
            rows={3}
            maxLength={maxNoteLength}
            disabled={disabled}
            placeholder={notePlaceholder}
            onChange={(event) => onNoteChange(event.target.value)}
            className={fieldClassName()}
          />
          <p className="text-right text-xs text-gray-500" aria-live="polite">
            {t('forms.reasonPicker.noteCount', { count: note.length, max: maxNoteLength })}
          </p>
        </div>
      )}
    </div>
  )
}
