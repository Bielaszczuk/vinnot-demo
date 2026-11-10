import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { EVENT_CANCELLATION_REASONS } from '@domain/event/eventCancellation'
import { CancelEventDialog } from './CancelEventDialog'

const copy = en.events.cancellation

async function mount(props: Partial<Parameters<typeof CancelEventDialog>[0]> = {}, lng: 'en-US' | 'es-AR' = 'en-US') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(
    <I18nextProvider i18n={i18n}>
      <CancelEventDialog open eventTitle="Malbec tasting" onConfirm={onConfirm} onClose={onClose} {...props} />
    </I18nextProvider>,
  )
  return { onConfirm, onClose }
}

describe('CancelEventDialog', () => {
  it('preselects the default reason and confirms it without any input', async () => {
    const { onConfirm } = await mount()
    expect(screen.getByRole('dialog', { name: copy.title })).toBeInTheDocument()
    expect(screen.getByText(/Malbec tasting/)).toBeInTheDocument()
    expect(screen.getByLabelText(copy.reasonLabel)).toHaveValue('UNFORESEEN_CIRCUMSTANCES')
    expect(screen.queryByLabelText(copy.noteLabel)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }))
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({ reason: 'UNFORESEEN_CIRCUMSTANCES' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers every reason with a translated label in both locales', async () => {
    await mount()
    const options = screen.getAllByRole('option').map((option) => option.getAttribute('value'))
    expect(options).toEqual([...EVENT_CANCELLATION_REASONS])
    for (const reason of EVENT_CANCELLATION_REASONS) {
      expect(en.events.cancellation.reasons[reason]).toBeTruthy()
      expect(es.events.cancellation.reasons[reason]).toBeTruthy()
    }
    expect(Object.keys(es.events.cancellation).sort()).toEqual(Object.keys(en.events.cancellation).sort())
  })

  it('warns that cancelling is final and online payments are refunded automatically, in both locales', async () => {
    await mount({}, 'es-AR')
    expect(screen.getByText('Cancelar el evento es definitivo: no se puede volver a publicar. Las personas inscriptas reciben un correo con el motivo y los pagos online se devuelven automáticamente por Mercado Pago, sin posibilidad de deshacerlo. Podés revisar las entradas cobradas desde Inscripciones.')).toBeInTheDocument()
    cleanup()
    await mount({}, 'en-US')
    expect(screen.getByText('Cancelling is final: the event cannot be published again. Attendees get an email with the reason, and online payments are refunded automatically through Mercado Pago. This cannot be undone. You can review paid tickets under Registrations.')).toBeInTheDocument()
  })

  it('reveals an optional note for the other reason and sends it trimmed', async () => {
    const { onConfirm } = await mount()
    fireEvent.change(screen.getByLabelText(copy.reasonLabel), { target: { value: 'OTHER' } })
    const note = screen.getByLabelText(copy.noteLabel)
    expect(note).toHaveAttribute('maxLength', '280')
    expect(note).not.toBeRequired()
    fireEvent.change(note, { target: { value: '  Private booking  ' } })
    expect(screen.getByText('19/280')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }))
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({ reason: 'OTHER', note: 'Private booking' })
  })

  it('does not send a note typed before switching to another reason', async () => {
    const { onConfirm } = await mount()
    fireEvent.change(screen.getByLabelText(copy.reasonLabel), { target: { value: 'OTHER' } })
    fireEvent.change(screen.getByLabelText(copy.noteLabel), { target: { value: 'Draft' } })
    fireEvent.change(screen.getByLabelText(copy.reasonLabel), { target: { value: 'WEATHER' } })
    expect(screen.queryByLabelText(copy.noteLabel)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.confirm }))
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({ reason: 'WEATHER' })
  })

  it('keeps the event from the dismiss button and Escape', async () => {
    const { onClose, onConfirm } = await mount()
    fireEvent.click(screen.getByRole('button', { name: copy.keep }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('blocks both actions while the cancellation is submitting', async () => {
    const { onClose, onConfirm } = await mount({ isSubmitting: true })
    expect(screen.getByRole('button', { name: copy.keep })).toBeDisabled()
    expect(screen.getByRole('button', { name: new RegExp(copy.submitting) })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('restarts from the default reason when reopened', async () => {
    const i18n = createInstance()
    await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } } })
    const props = { eventTitle: 'Tasting', onConfirm: vi.fn(), onClose: vi.fn() }
    const view = render(<I18nextProvider i18n={i18n}><CancelEventDialog open {...props} /></I18nextProvider>)
    fireEvent.change(screen.getByLabelText(copy.reasonLabel), { target: { value: 'WEATHER' } })
    view.rerender(<I18nextProvider i18n={i18n}><CancelEventDialog open={false} {...props} /></I18nextProvider>)
    view.rerender(<I18nextProvider i18n={i18n}><CancelEventDialog open {...props} /></I18nextProvider>)
    expect(screen.getByLabelText(copy.reasonLabel)).toHaveValue('UNFORESEEN_CIRCUMSTANCES')
  })
})
