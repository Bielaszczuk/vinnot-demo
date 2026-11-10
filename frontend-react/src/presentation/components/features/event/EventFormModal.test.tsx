vi.mock('@/presentation/hooks/usePaymentAccountStatus', () => ({
  usePaymentAccountStatus: () => ({
    data: { connected: false },
    isLoading: false,
    isError: false,
  }),
}))
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import { EventFormModal } from './EventFormModal'
import type { Event } from '@domain/event/event.types'
vi.mock('@/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'draft-test-user' } }),
}))
const mocks = vi.hoisted(() => ({ geocode: vi.fn(), toast: vi.fn() }))
vi.mock('@hooks/useToast', () => ({
  useToast: () => ({ addToast: mocks.toast }),
}))
vi.mock('@hooks/useGeocoding', () => ({
  useGeocoding: () => ({ geocodeAddress: mocks.geocode }),
}))
vi.mock('@components/features/media/CoverImagePicker', () => ({
  CoverImagePicker: () => <div>Cover picker</div>,
}))
vi.mock('@components/ui/MapView', () => ({
  MapView: ({
    latitude,
    longitude,
    showMarker,
    onLocationChanged,
  }: {
    latitude: number
    longitude: number
    showMarker: boolean
    onLocationChanged: (lat: number, lng: number) => void
  }) => (
    <button type="button" onClick={() => onLocationChanged(0, 0)}>
      Map {showMarker ? `${latitude},${longitude}` : 'no point'}
    </button>
  ),
}))
vi.mock('./EventDateTimeField', () => ({
  EventDateTimeField: ({
    label,
    value,
    onChange,
  }: {
    label: string
    value: string
    onChange: (value: string) => void
  }) => (
    <label>
      {label}
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  ),
}))
const existing: Partial<Event> = {
  id: 'event',
  title: 'Harvest tasting',
  startDate: new Date('2027-02-10T18:00:00Z'),
  endDate: new Date('2027-02-10T20:00:00Z'),
  price: 10000,
  websiteUrl: 'https://venue.example',
  organizer: {
    id: 'organizer',
    name: 'Venue',
    email: 'venue@example.com',
    phone: '+541112345678',
  },
}
async function mount(event: Partial<Event> | null = existing) {
  const i18n = createInstance()
  await i18n
    .use(initReactI18next)
    .init({
      lng: 'en-US',
      resources: { 'en-US': { translation: en } },
      interpolation: { escapeValue: false },
    })
  const save = vi.fn()
  const close = vi.fn()
  const result = render(
    <I18nextProvider i18n={i18n}>
      <EventFormModal
        isOpen
        event={event}
        saving={false}
        onClose={close}
        onSave={save}
      />
    </I18nextProvider>,
  )
  await waitFor(() =>
    expect(screen.getByText(en.eventDraft.ready)).toBeVisible(),
  )
  return { ...result, save, close }
}
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})
it('preserves an existing paid price and website when saving without expanding optional sections', async () => {
  const { save } = await mount()
  fireEvent.click(screen.getByRole('button', { name: en.events.saveChanges }))
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 10000,
        websiteUrl: 'https://venue.example',
        maxAttendees: null,
      }),
    ),
  )
})
it('retains unsaved fields when folding sections and switches a paid event to free with an empty unlimited capacity', async () => {
  const { save } = await mount()
  fireEvent.change(screen.getByDisplayValue('Harvest tasting'), {
    target: { value: 'New tasting title' },
  })
  fireEvent.click(screen.getByRole('button', { name: /Basic information/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Registration/ }))
  fireEvent.click(screen.getByRole('radio', { name: 'Free' }))
  fireEvent.change(screen.getByLabelText(en.events.maxAttendees), {
    target: { value: '' },
  })
  fireEvent.click(screen.getByRole('button', { name: en.events.saveChanges }))
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New tasting title',
        price: null,
        maxAttendees: null,
      }),
    ),
  )
})
it('opens a collapsed invalid section and prevents submission until its numeric fields are valid', async () => {
  const { save } = await mount()
  fireEvent.click(screen.getByRole('button', { name: /^Registration/ }))
  fireEvent.change(screen.getByLabelText(en.events.registration.maxTickets), {
    target: { value: '21' },
  })
  fireEvent.click(screen.getByRole('button', { name: /^Registration/ }))
  fireEvent.click(screen.getByRole('button', { name: en.events.saveChanges }))
  await waitFor(() =>
    expect(
      screen.getByText(en.eventEditor.validation.maxTicketsPerRegistration),
    ).toBeVisible(),
  )
  expect(save).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: /^Registration/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
})
it('allows selection without searching and ignores a geocode response after the pin was corrected manually', async () => {
  let resolve!: (value: unknown) => void
  mocks.geocode.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    }),
  )
  const { save } = await mount()
  fireEvent.click(screen.getByRole('button', { name: /^Location/ }))
  expect(screen.getByRole('button', { name: 'Map no point' })).toBeVisible()
  fireEvent.change(
    screen.getByPlaceholderText(en.events.searchAddressPlaceholder),
    { target: { value: 'Venue' } },
  )
  fireEvent.click(screen.getByRole('button', { name: en.events.searchAddress }))
  fireEvent.click(screen.getByRole('button', { name: 'Map no point' }))
  await act(async () =>
    resolve({
      ok: true,
      location: {
        latitude: -32,
        longitude: -68,
        formattedAddress: 'Wrong place',
      },
    }),
  )
  expect(screen.getByRole('button', { name: 'Map 0,0' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: en.events.saveChanges }))
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 0, longitude: 0 }),
    ),
  )
})

it('recovers after Escape, keeps failed submissions and removes only a successfully saved draft', async () => {
  const first = await mount()
  fireEvent.change(screen.getByDisplayValue('Harvest tasting'), {
    target: { value: 'Recover me' },
  })
  await waitFor(() =>
    expect(screen.getByText(en.eventDraft.saved)).toBeVisible(),
  )
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(first.close).toHaveBeenCalledTimes(1))
  first.unmount()
  const i18n = createInstance()
  await i18n
    .use(initReactI18next)
    .init({ lng: 'en-US', resources: { 'en-US': { translation: en } } })
  const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  render(
    <I18nextProvider i18n={i18n}>
      <EventFormModal
        isOpen
        event={existing}
        saving={false}
        onClose={vi.fn()}
        onSave={save}
      />
    </I18nextProvider>,
  )
  await waitFor(() =>
    expect(screen.getByText(en.eventDraft.found)).toBeVisible(),
  )
  fireEvent.click(screen.getByRole('button', { name: en.eventDraft.restore }))
  expect(screen.getByDisplayValue('Recover me')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: en.events.saveChanges }))
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  expect(
    localStorage.getItem('vinnot:event-draft:v1:draft-test-user:event'),
  ).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: en.events.saveChanges }))
  await waitFor(() =>
    expect(
      localStorage.getItem('vinnot:event-draft:v1:draft-test-user:event'),
    ).toBeNull(),
  )
})
it('requires an explicit discard confirmation and restores the initial event', async () => {
  await mount()
  fireEvent.change(screen.getByDisplayValue('Harvest tasting'), {
    target: { value: 'Discard me' },
  })
  await waitFor(() =>
    expect(screen.getByText(en.eventDraft.saved)).toBeVisible(),
  )
  fireEvent.click(screen.getByRole('button', { name: en.eventDraft.discard }))
  expect(screen.getByDisplayValue('Discard me')).toBeVisible()
  fireEvent.click(
    screen.getByRole('button', { name: en.eventDraft.confirmAction }),
  )
  await waitFor(() =>
    expect(screen.getByDisplayValue('Harvest tasting')).toBeVisible(),
  )
})

it.each(['4', ''])(
  'restores raw numeric draft fields, including an unfinished value %j',
  async (maxTickets) => {
    const first = await mount()
    fireEvent.click(screen.getByRole('button', { name: /^Registration/ }))
    fireEvent.change(screen.getByLabelText(en.events.registration.maxTickets), {
      target: { value: maxTickets },
    })
    fireEvent.change(
      screen.getByLabelText(en.events.registration.holdMinutes),
      { target: { value: '15' } },
    )
    await waitFor(() =>
      expect(screen.getByText(en.eventDraft.saved)).toBeVisible(),
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(first.close).toHaveBeenCalledOnce())
    first.unmount()
    const i18n = createInstance()
    await i18n
      .use(initReactI18next)
      .init({ lng: 'en-US', resources: { 'en-US': { translation: en } } })
    render(
      <I18nextProvider i18n={i18n}>
        <EventFormModal
          isOpen
          event={existing}
          saving={false}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </I18nextProvider>,
    )
    await waitFor(() =>
      expect(screen.getByText(en.eventDraft.found)).toBeVisible(),
    )
    fireEvent.click(screen.getByRole('button', { name: en.eventDraft.restore }))
    fireEvent.click(screen.getByRole('button', { name: /^Registration/ }))
    expect(
      screen.getByLabelText(en.events.registration.maxTickets),
    ).toHaveValue(maxTickets ? Number(maxTickets) : null)
    expect(
      screen.getByLabelText(en.events.registration.holdMinutes),
    ).toHaveValue(15)
  },
)

const statusOptions = () =>
  screen.getAllByRole('option').filter((option) => option.closest('select')?.getAttribute('name') === 'status')
    .map((option) => option.getAttribute('value'))

it('offers no cancelled status in the editor: cancelling goes through the cancel dialog', async () => {
  await mount({ ...existing, status: 'PUBLISHED' })
  expect(statusOptions()).toEqual(['DRAFT', 'PUBLISHED', 'COMPLETED'])
})

it('opens a sold-out event as published and saves it without asking for SOLD_OUT', async () => {
  const { save } = await mount({ ...existing, status: 'SOLD_OUT' })
  const status = document.querySelector('select[name="status"]') as HTMLSelectElement
  expect(status.value).toBe('PUBLISHED')
  fireEvent.click(screen.getByRole('button', { name: en.events.saveChanges }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ status: 'PUBLISHED' })))
})

it('still shows the status of an event that is already cancelled', async () => {
  await mount({ ...existing, status: 'CANCELLED' })
  const status = document.querySelector('select[name="status"]') as HTMLSelectElement
  expect(status.value).toBe('CANCELLED')
  expect(screen.getByRole('option', { name: en.events.statusLabels.cancelled })).toBeDisabled()
})

it('moves focus into the dialog, keeps Tab inside it and still closes on Escape', async () => {
  const view = await mount()
  const dialog = screen.getByRole('dialog', { name: en.events.editEvent })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
  const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')]
    .filter((element) => element.tabIndex >= 0 && !element.closest('[hidden], [aria-hidden="true"]'))
  focusable.at(-1)!.focus()
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(document.activeElement).toBe(focusable[0])
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1))
})
