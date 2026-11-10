vi.mock('@/presentation/hooks/usePaymentAccountStatus', () => ({
  usePaymentAccountStatus: () => ({
    data: { connected: false },
    isLoading: false,
    isError: false,
  }),
}))
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { EventDateTimeField } from './EventDateTimeField'
import { EventRegistrationSettingsSection } from './EventFormSections'
import {
  createEventFormSchema,
  EVENT_FORM_DEFAULT_VALUES,
  type EventFormData,
} from './EventFormConfig'

async function instance() {
  const i18n = createInstance()
  await i18n
    .use(initReactI18next)
    .init({
      lng: 'en-US',
      fallbackLng: false,
      resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } },
      interpolation: { escapeValue: false },
    })
  return i18n
}
it('updates the date picker language and preserves local datetime on time changes', async () => {
  const i18n = await instance(),
    change = vi.fn(),
    user = userEvent.setup()
  render(
    <I18nextProvider i18n={i18n}>
      <EventDateTimeField
        label="Start"
        value="2026-01-15T20:05"
        onChange={change}
      />
    </I18nextProvider>,
  )
  await user.click(screen.getByRole('button', { name: /Start: January/ }))
  expect(screen.getByText('Choose date and time')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Hour'), { target: { value: '21' } })
  expect(change).toHaveBeenCalledWith('2026-01-15T21:05')
  await act(async () => {
    await i18n.changeLanguage('es-AR')
  })
  expect(screen.getByText('Elegí fecha y hora')).toBeTruthy()
  expect(screen.getByLabelText('Hora')).toBeTruthy()
  expect(screen.getByRole('button', { name: /Start: .*enero/ })).toBeTruthy()
  expect(screen.queryByText('Choose date and time')).toBeNull()
})
function RegistrationSettings() {
  const {
    register,
    control,
    formState: { errors },
  } = useForm<EventFormData>({ defaultValues: EVENT_FORM_DEFAULT_VALUES })
  return (
    <EventRegistrationSettingsSection
      register={register}
      control={control}
      errors={errors}
      inputClass=""
    />
  )
}
it('translates registration settings while keeping approval option values', async () => {
  const i18n = await instance()
  render(
    <I18nextProvider i18n={i18n}>
      <RegistrationSettings />
    </I18nextProvider>,
  )
  expect(screen.queryByLabelText('Currency')).toBeNull()
  fireEvent.click(screen.getByRole('radio', { name: en.eventEditor.paid }))
  expect(screen.getByLabelText('Currency')).toBeTruthy()
  expect(
    screen.queryByRole('option', { name: 'Manual approval by the organizer' }),
  ).toBeNull()
  expect(screen.queryByLabelText('Payment alias')).toBeNull()
  fireEvent.click(screen.getByRole('radio', { name: en.eventEditor.free }))
  expect(
    (
      screen.getByRole('option', {
        name: 'Manual approval by the organizer',
      }) as HTMLOptionElement
    ).value,
  ).toBe('MANUAL')
  await act(async () => {
    await i18n.changeLanguage('es-AR')
  })
  expect(screen.queryByLabelText('Moneda')).toBeNull()
  expect(
    (
      screen.getByRole('option', {
        name: 'Automática según disponibilidad',
      }) as HTMLOptionElement
    ).value,
  ).toBe('AUTOMATIC')
})
it('localizes validation and retains the end-date and deadline rules', async () => {
  const i18n = await instance()
  const invalid = {
    ...EVENT_FORM_DEFAULT_VALUES,
    title: '',
    pricingMode: 'PAID',
    price: 100,
    currency: 'US',
    startDate: '2026-01-15T20:00',
    endDate: '2026-01-15T19:00',
    registrationDeadline: '2026-01-16T20:00',
  }
  function messages() {
    const result = createEventFormSchema(i18n.t.bind(i18n)).safeParse(invalid)
    expect(result.success).toBe(false)
    return result.error!.issues.map((issue) => issue.message)
  }
  expect(messages()).toEqual(
    expect.arrayContaining([
      en.eventEditor.validation.title,
      en.eventEditor.validation.currency,
      en.eventEditor.validation.dateOrder,
      en.eventEditor.validation.deadline,
    ]),
  )
  await i18n.changeLanguage('es-AR')
  expect(messages()).toContain(es.eventEditor.validation.dateOrder)
})
