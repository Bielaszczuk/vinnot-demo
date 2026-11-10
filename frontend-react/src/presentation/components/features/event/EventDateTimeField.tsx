import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { Select } from '@components/ui/Select'
import * as Popover from '@radix-ui/react-popover'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { CalendarDays, Check, ChevronDown, Clock3, X } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import {
  combineLocalDateTime,
  splitLocalDateTime,
} from '@shared/utils/dateTime'
import 'react-day-picker/style.css'
import './EventDateTimeField.css'

interface EventDateTimeFieldProps {
  label: string
  value: string | null | undefined
  onChange: (value: string) => void
  error?: string
  optional?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, index) =>
  index.toString().padStart(2, '0'),
)
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatLocalDate(value: Date) {
  return format(value, 'yyyy-MM-dd')
}

export function EventDateTimeField({
  label,
  value,
  onChange,
  error,
  optional = false,
}: EventDateTimeFieldProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = (i18n.resolvedLanguage ?? i18n.language).startsWith('en') ? enUS : es
  const [open, setOpen] = useState(false)
  const { date, time } = splitLocalDateTime(value)
  const selectedDate = date ? parseLocalDate(date) : undefined
  const [hour = '00', minute = '00'] = time.split(':')
  const minuteOptions = useMemo(
    () => (MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort()),
    [minute],
  )

  const updateDate = (nextDate: Date | undefined) => {
    if (!nextDate) return
    onChange(combineLocalDateTime(formatLocalDate(nextDate), time))
  }

  const updateTime = (nextHour: string, nextMinute: string) => {
    onChange(combineLocalDateTime(date, `${nextHour}:${nextMinute}`))
  }

  const formattedDate = selectedDate
    ? format(selectedDate, 'PPP', { locale: dateLocale })
    : t('events.dateTime.selectDate')

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-medium text-gray-700">
        {label}{optional ? null : ' *'}
      </legend>

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`group flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl border bg-white px-3 text-left transition hover:border-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500/20 ${
              error ? 'border-danger' : 'border-field'
            }`}
            aria-label={`${label}: ${formattedDate}, ${time || t('events.dateTime.noTime')}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wine-50 text-wine-700">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-medium ${selectedDate ? 'text-ink' : 'text-gray-500'}`}>
                {formattedDate}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                {time || t('events.dateTime.selectTime')}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={8}
            align="start"
            collisionPadding={16}
            className="event-date-time-popover z-[120] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-3 shadow-xl outline-none"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="text-xs text-gray-500">{t('events.dateTime.choose')}</p>
              </div>
              <Popover.Close asChild>
                <button
                  type="button"
                  title={t('common.close')}
                  aria-label={t('events.dateTime.closePicker')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </Popover.Close>
            </div>

            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={updateDate}
              locale={dateLocale}
              showOutsideDays
              weekStartsOn={1}
            />

            <div className="mt-2 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium text-gray-600">{t('events.dateTime.eventTime')}</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Select
                  aria-label={t('events.dateTime.hour')}
                  value={hour}
                  onChange={(event) => updateTime(event.target.value, minute)}
                  disabled={!date}
                  options={HOURS.map((option) => ({ value: option, label: option }))}
                />
                <span className="font-semibold text-gray-400">:</span>
                <Select
                  aria-label={t('events.dateTime.minutes')}
                  value={minute}
                  onChange={(event) => updateTime(hour, event.target.value)}
                  disabled={!date}
                  options={minuteOptions.map((option) => ({ value: option, label: option }))}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              {optional && value ? (
                <Button type="button" variant="link" onClick={() => onChange('')}>
                  {t('common.clear')}
                </Button>
              ) : <span />}
              <Popover.Close asChild>
                <Button type="button" size="sm" disabled={!date} leftIcon={<Icon icon={Check} />}>
                  {t('events.dateTime.done')}
                </Button>
              </Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </fieldset>
  )
}
