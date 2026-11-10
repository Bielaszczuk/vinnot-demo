import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useMyCellarViewModel } from './useMyCellarViewModel'

const mocks = vi.hoisted(() => ({ toast: vi.fn(), confirm: vi.fn(), remove: vi.fn() }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/queries/cellar/useCellar', () => ({ useCellar: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() }) }))
vi.mock('@hooks/queries/cellar/useRemoveCellarEntry', () => ({ useRemoveCellarEntry: () => ({ mutate: mocks.remove }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }))

beforeEach(() => vi.resetAllMocks())

it('confirms that the wine left the cellar instead of repeating the button label', async () => {
  mocks.confirm.mockResolvedValue(true)
  mocks.remove.mockImplementation((_id: string, options: { onSuccess: () => void }) => options.onSuccess())
  const { result } = renderHook(useMyCellarViewModel)
  await act(() => result.current.handleDelete('c1'))
  expect(mocks.remove).toHaveBeenCalledWith('c1', expect.any(Object))
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'cellar.removeSuccess' })
})

it('does not remove anything when the person keeps the wine', async () => {
  mocks.confirm.mockResolvedValue(false)
  const { result } = renderHook(useMyCellarViewModel)
  await act(() => result.current.handleDelete('c1'))
  expect(mocks.remove).not.toHaveBeenCalled()
  expect(mocks.toast).not.toHaveBeenCalled()
})
