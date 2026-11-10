import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { AdminDeleteConfirm } from './AdminDeleteConfirm'
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
it('awaits the complete action once, blocks dismissal and restores controls after failure', async () => {
  let reject!: (error: Error) => void
  const onConfirm = vi.fn(
    () =>
      new Promise<void>((_, fail) => {
        reject = fail
      }),
  )
  const onCancel = vi.fn()
  render(
    <AdminDeleteConfirm
      open
      title="Cancel event"
      message="History is retained"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )
  expect(
    screen.getByRole('dialog', { name: 'Cancel event' }),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
  fireEvent.click(screen.getByRole('button', { name: 'common.loading' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(onCancel).not.toHaveBeenCalled()
  await act(async () => reject(new Error('private error')))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'admin.feedback.deleteError',
  )
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
})
it('uses a custom dismiss label so cancelling an event is not confused with keeping it', () => {
  const onCancel = vi.fn()
  render(
    <AdminDeleteConfirm
      open
      title="Cancel event?"
      message="History is retained"
      onConfirm={vi.fn()}
      onCancel={onCancel}
      confirmLabel="admin.events.cancelAction"
      cancelLabel="partner.keepEvent"
    />,
  )
  expect(screen.queryByRole('button', { name: 'common.cancel' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'partner.keepEvent' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
})
