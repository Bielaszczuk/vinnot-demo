import { EventDraftNotice } from "./EventDraftNotice"
import { FormSection } from "@components/ui/FormSection"
import { useEventEditor } from './useEventEditor'
/**
 * EventFormModal — create / edit event modal
 *
 * Migrated from Vue EventFormModal.vue.
 * Used by admin and partner pages to manage events.
 *
 * Architecture: component → hook (useCreateEvent / useUpdateEvent) → service → client
 * Uses React Hook Form + Zod for validation.
 */

import { useTranslation } from 'react-i18next'
import { Modal } from '@components/ui/Modal'
import { fieldClassName } from '@components/ui/fieldStyles'
import { CoverImagePicker } from '@components/features/media/CoverImagePicker'
import type { Event } from '@domain/event/event.types'
import {
  EVENT_TYPES,
  editorStatusOptions,
  type EventFormData,
} from './EventFormConfig'
import {
  EventBasicInfoSection,
  EventDetailsSection,
  EventFormFooter,
  EventFormHeader,
  EventRegistrationSettingsSection,
} from './EventFormSections'
import { EventLocationSection } from './EventFormLocationSection'

export type { EventFormData } from './EventFormConfig'

interface EventFormModalProps {
  isOpen: boolean
  event: Partial<Event> | null
  saving: boolean
  onClose: () => void
  onSave: (data: EventFormData) => Promise<boolean | void> | void
}

export function EventFormModal({
  isOpen,
  event,
  saving,
  onClose,
  onSave,
}: EventFormModalProps) {
  const { t } = useTranslation()
  const isEditing = !!event?.id
  const {
    register, control, errors, watch, setValue, getValues, draft,
    latitude, longitude, searchAddress, geocoding, pricingMode,
    imageUploading, setImageUploading, section, submit, handleClose,
    changeSearchAddress, geocodeAddress, handleLocationChanged,
  } = useEventEditor({ isOpen, event, saving, onClose, onSave })

  if (!isOpen) return null

  const inputClass = fieldClassName()

  return (
    // The shared Modal traps focus, sets initial focus, closes on Escape and makes the page behind inert.
    <Modal
      isOpen
      onClose={() => void handleClose()}
      closeOnBackdrop={false}
      ariaLabel={t(isEditing ? "events.editEvent" : "events.createEvent")}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      backdropClassName="absolute inset-0 bg-black/60 backdrop-blur-sm"
      panelClassName="relative my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
        <EventFormHeader isEditing={isEditing} onClose={handleClose} />

        <form
          className="max-h-[70vh] space-y-5 overflow-y-auto p-6"
          onSubmit={submit}
        >
          <p className="text-sm leading-relaxed text-gray-500">{t('eventEditor.introduction')}</p>
          {Object.keys(errors).length > 0 && <p role="alert" className="text-sm text-danger">{t('eventEditor.fixErrors')}</p>}
          <EventDraftNotice {...draft} disabled={saving || imageUploading} />
          <fieldset disabled={draft.blocked || saving} className="space-y-5 disabled:opacity-60">
          <FormSection {...section('basic', watch('title') || t('eventEditor.basicSummary'))} disabled={imageUploading}>
          <CoverImagePicker key={event?.id ?? "new-event"} kind="EVENT" value={watch('imageUrl')} onChange={value => setValue('imageUrl', value, { shouldDirty: true })} onBusyChange={setImageUploading} />
          <EventBasicInfoSection
            register={register}
            control={control}
            errors={errors}
            inputClass={inputClass}
            eventTypes={EVENT_TYPES}
            statusOptions={editorStatusOptions(event?.status)}
          />

          </FormSection>
          <FormSection {...section('location', watch('locationName') || t('eventEditor.locationSummary'))}>
          <EventLocationSection
            register={register}
            inputClass={inputClass}
            latitude={latitude}
            longitude={longitude}
            searchAddress={searchAddress}
            geocoding={geocoding}
            getValues={getValues}
            onSearchAddressChange={changeSearchAddress}
            onSearchAddressSubmit={geocodeAddress}
            onMapLocationChanged={handleLocationChanged}
          />

          {(errors.latitude || errors.longitude) && <p className="text-sm text-danger">{errors.latitude?.message ?? errors.longitude?.message}</p>}
          </FormSection>
          <FormSection {...section('contact', watch('contactEmail') || t('eventEditor.contactSummary'))}>

          <EventDetailsSection
            register={register}
            errors={errors}
            inputClass={inputClass}
          />

          </FormSection>
          <FormSection {...section('registration', t(pricingMode === 'PAID' ? 'eventEditor.paid' : 'eventEditor.free'))}>
          <EventRegistrationSettingsSection
            onPricingModeChange={mode => { if (mode === "FREE") setValue("price", null, { shouldDirty: true, shouldValidate: true }) }}
            register={register}
            control={control}
            errors={errors}
            inputClass={inputClass}
          />

          </FormSection>
          </fieldset>
          <button type="submit" className="hidden" />
        </form>

        <EventFormFooter
          saving={saving || imageUploading}
          blocked={draft.blocked}
          isEditing={isEditing}
          onCancel={handleClose}
          onSave={submit}
        />
    </Modal>
  )
}
