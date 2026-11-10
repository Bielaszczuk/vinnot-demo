import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import en from '@i18n/locales/en-US.json'
import type { EventRegistration, EventRegistrationAction } from '@domain/event/event.types'
import { RegistrationReviewDialog } from './RegistrationReviewDialog'

const RM = en.events.registrationManager
const registration = { id: 'registration', contactName: 'Guest', contactEmail: 'guest@example.com' } as EventRegistration
const onConfirm = vi.fn()
const onCancel = vi.fn()

async function mount(action: EventRegistrationAction, pending = false) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } } })
  render(
    <I18nextProvider i18n={i18n}>
      <RegistrationReviewDialog registration={registration} action={action} pending={pending} onCancel={onCancel} onConfirm={onConfirm} />
    </I18nextProvider>,
  )
  return within(screen.getByRole('dialog', { name: RM.actions[action] }))
}

beforeEach(() => vi.clearAllMocks())

describe('approving a registration', () => {
  it('keeps the optional free note and its previous payload', async () => {
    const dialog = await mount('APPROVE')
    expect(dialog.queryByRole('radio')).toBeNull()
    const note = dialog.getByLabelText('Note for Guest (optional)')
    expect(note).toHaveAttribute('maxLength', '1000')
    fireEvent.change(note, { target: { value: ' See you there ' } })
    fireEvent.click(dialog.getByRole('button', { name: RM.actions.APPROVE }))
    expect(onConfirm).toHaveBeenCalledWith('See you there')
  })

  it('sends no note when nothing was typed', async () => {
    const dialog = await mount('APPROVE')
    fireEvent.click(dialog.getByRole('button', { name: RM.actions.APPROVE }))
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })
})

describe('rejecting or waitlisting a registration', () => {
  it('preselects no reason and keeps the previous payload without a note', async () => {
    const dialog = await mount('REJECT')
    expect(dialog.getByRole('radio', { name: RM.reasons.REJECT.NONE })).toBeChecked()
    fireEvent.click(dialog.getByRole('button', { name: RM.actions.REJECT }))
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })

  it('rejects with a one-tap preset reason without typing', async () => {
    const dialog = await mount('REJECT')
    const group = dialog.getByRole('group', { name: 'Reason for Guest' })
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['NONE', 'EVENT_FULL', 'REQUIREMENTS_NOT_MET', 'DUPLICATE_REGISTRATION', 'OTHER'])
    expect(dialog.queryByRole('textbox')).toBeNull()
    fireEvent.click(within(group).getByRole('radio', { name: RM.reasons.REJECT.REQUIREMENTS_NOT_MET }))
    fireEvent.click(dialog.getByRole('button', { name: RM.actions.REJECT }))
    expect(onConfirm).toHaveBeenCalledWith(RM.reasons.REJECT.REQUIREMENTS_NOT_MET)
  })

  it('waitlists with its own presets', async () => {
    const dialog = await mount('WAITLIST')
    const group = dialog.getByRole('group', { name: 'Reason for Guest' })
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['NONE', 'EVENT_FULL', 'CONFIRMING_AVAILABILITY', 'OTHER'])
    fireEvent.click(within(group).getByRole('radio', { name: RM.reasons.WAITLIST.EVENT_FULL }))
    fireEvent.click(dialog.getByRole('button', { name: RM.actions.WAITLIST }))
    expect(onConfirm).toHaveBeenCalledWith(RM.reasons.WAITLIST.EVENT_FULL)
  })

  it('asks for free text only under Other, limited to 1000 characters', async () => {
    const dialog = await mount('REJECT')
    fireEvent.click(dialog.getByRole('radio', { name: RM.reasons.OTHER }))
    const note = dialog.getByLabelText('Note for Guest (optional)')
    expect(note).toHaveAttribute('maxLength', '1000')
    fireEvent.change(note, { target: { value: '  Wrong date  ' } })
    fireEvent.click(dialog.getByRole('button', { name: RM.actions.REJECT }))
    expect(onConfirm).toHaveBeenCalledWith('Wrong date')
  })

  it('sends no note for Other left empty', async () => {
    const dialog = await mount('REJECT')
    fireEvent.click(dialog.getByRole('radio', { name: RM.reasons.OTHER }))
    fireEvent.click(dialog.getByRole('button', { name: RM.actions.REJECT }))
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })

  it('locks the reasons while the decision is saved', async () => {
    const dialog = await mount('REJECT', true)
    expect(dialog.getByRole('radio', { name: RM.reasons.REJECT.NONE })).toBeDisabled()
    expect(dialog.getByRole('button', { name: en.common.goBack })).toBeDisabled()
  })
})
