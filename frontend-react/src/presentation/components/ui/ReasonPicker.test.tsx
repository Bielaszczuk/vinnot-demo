import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { ReasonPicker } from './ReasonPicker'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => `${key}:${options?.count}/${options?.max}` }) }))

const REASONS = ['DUPLICATE', 'WRONG_DATA', 'OTHER'] as const
type Reason = (typeof REASONS)[number]
const labels: Record<Reason, string> = { DUPLICATE: 'Duplicate', WRONG_DATA: 'Wrong data', OTHER: 'Other' }

function Harness({ onNoteChange }: { onNoteChange?: (note: string) => void }) {
  const [reason, setReason] = useState<Reason>('DUPLICATE')
  const [note, setNote] = useState('')
  return (
    <ReasonPicker<Reason>
      legend="Reason"
      reasons={REASONS}
      value={reason}
      onChange={setReason}
      getLabel={(code) => labels[code]}
      note={note}
      onNoteChange={(next) => { setNote(next); onNoteChange?.(next) }}
      noteLabel="Details"
      maxNoteLength={50}
    />
  )
}

it('offers every preset as a one-tap choice with the current one checked', () => {
  render(<Harness />)
  expect(screen.getByRole('group', { name: 'Reason' })).toBeInTheDocument()
  expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['DUPLICATE', 'WRONG_DATA', 'OTHER'])
  expect(screen.getByRole('radio', { name: 'Duplicate' })).toBeChecked()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

it('asks for free text only under "Other"', () => {
  const onNoteChange = vi.fn()
  render(<Harness onNoteChange={onNoteChange} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Wrong data' }))
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: 'Other' }))
  const note = screen.getByRole('textbox', { name: 'Details' })
  expect(note).toHaveAttribute('maxLength', '50')
  fireEvent.change(note, { target: { value: 'Typo in the name' } })
  expect(onNoteChange).toHaveBeenLastCalledWith('Typo in the name')
  expect(screen.getByText('forms.reasonPicker.noteCount:16/50')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: 'Duplicate' }))
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})
