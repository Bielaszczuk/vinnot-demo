import { it, expect, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ConfirmProvider } from '@app/providers/ConfirmProvider'
import { useConfirm } from '@hooks/useConfirm'
import { ConfirmDialog } from './ConfirmDialog'

function Request({ phrase, result }: { phrase?: string; result: (value: boolean) => void }) {
  const { confirm } = useConfirm()
  return <button onClick={() => void confirm({ title: 'Delete account', message: 'Cannot be undone',
    confirmLabel: 'Delete', cancelLabel: 'Cancel', variant: 'danger',
    typedConfirmation: phrase ? { phrase, label: `Type ${phrase}` } : undefined,
  }).then(result)}>Open</button>
}
function setup(phrase?: string) {
  const result = vi.fn()
  render(<ConfirmProvider><Request phrase={phrase} result={result} /><ConfirmDialog /></ConfirmProvider>)
  fireEvent.click(screen.getByText('Open'))
  return result
}
it.each(['acepto borrar cuenta', 'I agree to delete my account'])('requires the complete phrase %s', async (phrase) => {
  const result = setup(phrase)
  const input = screen.getByLabelText(`Type ${phrase}`)
  expect(screen.getByText('Delete')).toBeDisabled()
  fireEvent.change(input, { target: { value: 'delete' } })
  fireEvent.click(screen.getByText('Delete'))
  expect(result).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: ` ${phrase} ` } })
  expect(screen.getByText('Delete')).toBeEnabled()
  await act(async () => fireEvent.click(screen.getByText('Delete')))
  expect(result).toHaveBeenCalledExactlyOnceWith(true)
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('cancels and resets the typed text when reopened', async () => {
  const result = setup('acepto borrar cuenta')
  fireEvent.change(screen.getByLabelText('Type acepto borrar cuenta'), { target: { value: 'acepto borrar cuenta' } })
  await act(async () => fireEvent.click(screen.getByText('Cancel')))
  expect(result).toHaveBeenCalledExactlyOnceWith(false)
  fireEvent.click(screen.getByText('Open'))
  expect(screen.getByLabelText('Type acepto borrar cuenta')).toHaveValue('')
  expect(screen.getByText('Delete')).toBeDisabled()
})
it('preserves ordinary confirmations without a phrase', async () => {
  const result = setup()
  expect(screen.queryByRole('textbox')).toBeNull()
  await act(async () => fireEvent.click(screen.getByText('Delete')))
  expect(result).toHaveBeenCalledExactlyOnceWith(true)
})
