import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAiProfileViewModel } from './useAiProfileViewModel'

const mocks = vi.hoisted(() => ({
  id: 'a', search: '?generate=1', generate: vi.fn(), navigate: vi.fn(), toast: vi.fn(),
}))
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: mocks.id }),
  useLocation: () => ({ pathname: `/wines/${mocks.id}/profile`, search: mocks.search }),
  useNavigate: () => mocks.navigate,
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/wine/useWine', () => ({ useWine: () => ({}) }))
vi.mock('@hooks/queries/wine/useAiProfile', () => ({ useAiProfile: () => ({}) }))
vi.mock('@hooks/queries/wine/useGenerateAiProfile', () => ({
  useGenerateAiProfile: (id: string) => ({ mutateAsync: () => mocks.generate(id), isPending: false }),
}))

describe('profile generation navigation intent', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.id = 'a'; mocks.search = '?generate=1' })

  it('generates for a different wine without remounting, but not on ordinary rerenders', async () => {
    const { rerender } = renderHook(() => useAiProfileViewModel())
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith('a'))
    rerender()
    expect(mocks.generate).toHaveBeenCalledTimes(1)
    mocks.id = 'b'
    rerender()
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith('b'))
    expect(mocks.generate).toHaveBeenCalledTimes(2)
    mocks.search = ''
    mocks.id = 'c'
    rerender()
    expect(mocks.generate).toHaveBeenCalledTimes(2)
  })
})
