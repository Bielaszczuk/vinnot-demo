import {
  useWatch,
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { Select } from '@components/ui/Select'
import type { EventStatus, EventType } from '@domain/event/event.types'
import type { EventFormData } from './EventFormConfig'
import { EventDateTimeField } from './EventDateTimeField'
import { PaymentAccountStatus } from './PaymentAccountStatus'

interface EventFormHeaderProps {
  isEditing: boolean
  onClose: () => void
}

export function EventFormHeader({ isEditing, onClose }: EventFormHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between border-b border-wine-100 bg-wine-50 px-6 py-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing
            ? t('events.editEvent', 'Editar Evento')
            : t('events.createEvent', 'Crear evento')}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {t('events.formSubtitle', 'Completá los datos del evento')}
        </p>
      </div>
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-wine-700 transition-colors hover:bg-wine-100 hover:text-wine-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500"
      >
        <Icon icon={X} size="md" />
      </button>
    </div>
  )
}

interface EventBasicInfoSectionProps {
  register: UseFormRegister<EventFormData>
  control: Control<EventFormData>
  errors: FieldErrors<EventFormData>
  inputClass: string
  eventTypes: { value: EventType; label: string }[]
  statusOptions: { value: EventStatus; label: string; disabled?: boolean }[]
}

export function EventBasicInfoSection({
  register,
  control,
  errors,
  inputClass,
  eventTypes,
  statusOptions,
}: EventBasicInfoSectionProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="event-title"
            className="mb-1.5 block text-xs font-medium text-gray-700"
          >
            {t('events.eventTitle', 'Título del evento')} *
          </label>
          <input
            type="text"
            id="event-title"
            {...register('title')}
            className={inputClass}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="event-description"
            className="mb-1.5 block text-xs font-medium text-gray-700"
          >
            {t('events.description', 'Descripción')}
          </label>
          <textarea
            rows={3}
            id="event-description"
            {...register('description')}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              {t('events.eventType', 'Tipo de evento')} *
            </label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select {...field} aria-label={t('events.eventType', 'Tipo de evento')}>
                  {eventTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`events.types.${opt.value}`, {
                        defaultValue: opt.label,
                      })}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              {t('events.status', 'Estado')} *
            </label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select {...field} aria-label={t('events.status', 'Estado')}>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {t(`events.statusLabels.${opt.value.toLowerCase()}`, {
                        defaultValue: opt.value,
                      })}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <EventDateTimeField
                label={t('events.startDate', 'Inicio')}
                value={field.value}
                onChange={field.onChange}
                error={errors.startDate?.message}
              />
            )}
          />
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <EventDateTimeField
                label={t('events.endDate', 'Fin')}
                value={field.value}
                onChange={field.onChange}
                error={errors.endDate?.message}
              />
            )}
          />
        </div>
      </div>
    </div>
  )
}

interface EventDetailsSectionProps {
  register: UseFormRegister<EventFormData>
  errors: FieldErrors<EventFormData>
  inputClass: string
}

export function EventDetailsSection({
  register,
  errors,
  inputClass,
}: EventDetailsSectionProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="event-contactEmail"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              {t('events.contactEmail', 'Email de contacto')}
            </label>
            <input
              type="email"
              placeholder="contacto@ejemplo.com"
              id="event-contactEmail"
              {...register('contactEmail')}
              className={inputClass}
            />
            {errors.contactEmail && (
              <p className="mt-1 text-xs text-danger">
                {errors.contactEmail.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="event-contactPhone"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              {t('events.contactPhone', 'Teléfono')}
            </label>
            <input
              type="tel"
              placeholder="+54 261 123-4567"
              id="event-contactPhone"
              {...register('contactPhone')}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="event-websiteUrl"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              {t('events.websiteUrl', 'Sitio Web')}
            </label>
            <input
              type="url"
              placeholder="https://..."
              id="event-websiteUrl"
              {...register('websiteUrl')}
              className={inputClass}
            />
            {errors.websiteUrl && (
              <p className="mt-1 text-xs text-danger">
                {errors.websiteUrl.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface EventRegistrationSettingsSectionProps {
  register: UseFormRegister<EventFormData>
  control: Control<EventFormData>
  errors: FieldErrors<EventFormData>
  onPricingModeChange?: (value: 'FREE' | 'PAID') => void
  inputClass: string
}

export function EventRegistrationSettingsSection({
  onPricingModeChange,
  register,
  control,
  errors,
  inputClass,
}: EventRegistrationSettingsSectionProps) {
  const { t } = useTranslation()
  const paid = useWatch({ control, name: 'pricingMode' }) === 'PAID'
  return (
    <div>
      {(
        [
          'maxTicketsPerRegistration',
          'registrationHoldMinutes',
          'paymentQrUrl',
        ] as const
      ).map(
        (name) =>
          errors[name] && (
            <p key={name} role="alert" className="text-sm text-danger">
              {errors[name]?.message}
            </p>
          ),
      )}
      <div className="space-y-4">
        <Controller
          name="pricingMode"
          control={control}
          render={({ field }) => (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                {t('eventEditor.registrationType')}
              </legend>
              <div className="flex gap-3">
                {(['FREE', 'PAID'] as const).map((value) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm ${field.value === value ? 'border-wine-600 bg-wine-50 text-wine-700' : 'border-gray-200'}`}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      checked={field.value === value}
                      onChange={() => {
                        field.onChange(value)
                        onPricingModeChange?.(value)
                      }}
                      value={value}
                      className="accent-wine-700"
                    />
                    {t(
                      value === 'FREE'
                        ? 'eventEditor.free'
                        : 'eventEditor.paid',
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        />
        {paid && (
          <div className="rounded-xl border border-wine-100 bg-wine-50 p-4 space-y-2">
            <p className="text-sm text-gray-600">
              {t('eventEditor.externalPayment')}
            </p>
            <PaymentAccountStatus />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {paid && (
            <div>
              <label
                htmlFor="event-price"
                className="mb-1.5 block text-xs font-medium text-gray-700"
              >
                {t('events.price', 'Precio')} ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="5000"
                id="event-price"
                {...register('price')}
                className={inputClass}
              />
              {errors.price && (
                <p className="text-xs text-danger">{errors.price.message}</p>
              )}
            </div>
          )}
          <div>
            <label
              htmlFor="event-maxAttendees"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              {t('events.maxAttendees', 'Máximo asistentes')}
            </label>
            <input
              type="number"
              min="1"
              placeholder="50"
              id="event-maxAttendees"
              {...register('maxAttendees')}
              className={inputClass}
            />
          </div>
        </div>
        {errors.maxAttendees && (
          <p className="text-xs text-danger">{errors.maxAttendees.message}</p>
        )}
        <p className="text-xs text-gray-500">{t('eventEditor.capacityHelp')}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          {paid && (
            <label className="text-xs font-medium text-gray-700">
              {t('events.registration.currency')}
              <Select {...register('currency')} containerClassName="mt-1">
                <option value="ARS">{t('eventEditor.currencyArs')}</option>
              </Select>
              {errors.currency ? (
                <span className="mt-1 block text-xs text-danger">
                  {errors.currency.message}
                </span>
              ) : null}
            </label>
          )}
          <label className="text-xs font-medium text-gray-700">
            {t('events.registration.maxTickets')}
            <input
              type="number"
              min={1}
              max={20}
              {...register('maxTicketsPerRegistration')}
              className={inputClass}
            />
          </label>
          <label className="text-xs font-medium text-gray-700">
            {t('events.registration.holdMinutes')}
            <input
              type="number"
              min={5}
              max={10080}
              {...register('registrationHoldMinutes')}
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="registrationDeadline"
            control={control}
            render={({ field }) => (
              <EventDateTimeField
                label={t('events.registration.deadline')}
                value={field.value}
                onChange={field.onChange}
                error={errors.registrationDeadline?.message}
                optional
              />
            )}
          />
          {!paid && (
            <label className="text-xs font-medium text-gray-700">
              {t('events.registration.approval')}
              <Select {...register('approvalMode')} containerClassName="mt-1">
                <option value="MANUAL">
                  {t('events.registration.manual')}
                </option>
                <option value="AUTOMATIC">
                  {t('events.registration.automatic')}
                </option>
              </Select>
            </label>
          )}
        </div>

        {!paid && (
          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              {...register('attendeeConfirmationRequired')}
              className="h-4 w-4 accent-wine-600"
            />
            {t('events.registration.attendeeConfirmation')}
          </label>
        )}
      </div>
    </div>
  )
}

interface EventFormFooterProps {
  blocked?: boolean
  saving: boolean
  isEditing: boolean
  onCancel: () => void
  onSave: () => void
}

export function EventFormFooter({
  saving,
  blocked,
  isEditing,
  onCancel,
  onSave,
}: EventFormFooterProps) {
  const { t } = useTranslation()

  return (
    <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
      <Button type="button" variant="ghost" onClick={onCancel}>
        {t('eventDraft.close')}
      </Button>
      <Button type="button" disabled={blocked} isLoading={saving} onClick={onSave}>
        {isEditing
          ? t('events.saveChanges', 'Guardar cambios')
          : t('events.createEvent', 'Crear evento')}
      </Button>
    </div>
  )
}
