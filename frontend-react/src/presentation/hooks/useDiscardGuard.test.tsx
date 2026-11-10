import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useDiscardGuard } from './useDiscardGuard'

const confirm = vi.hoisted(() => vi.fn())
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

beforeEach(() => vi.clearAllMocks())

it('closes directly when nothing changed', async () => {
  const onClose = vi.fn()
  const { result } = renderHook(() => useDiscardGuard({ dirty: false, busy: false, onClose }))
  await act(() => result.current())
  expect(confirm).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledOnce()
})

it('asks before discarding unsaved changes and keeps the draft when declined', async () => {
  const onClose = vi.fn()
  confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  const { result } = renderHook(() => useDiscardGuard({ dirty: true, busy: false, onClose }))
  await act(() => result.current())
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
    title: 'common.discardChangesTitle', confirmLabel: 'common.discardChanges', cancelLabel: 'common.keepEditing',
  }))
  expect(onClose).not.toHaveBeenCalled()
  await act(() => result.current())
  expect(onClose).toHaveBeenCalledOnce()
})

it('cannot close while saving', async () => {
  const onClose = vi.fn()
  const { result } = renderHook(() => useDiscardGuard({ dirty: true, busy: true, onClose }))
  await act(() => result.current())
  expect(confirm).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})
