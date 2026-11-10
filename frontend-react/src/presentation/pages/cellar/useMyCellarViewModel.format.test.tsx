import { renderHook } from '@testing-library/react'
import i18next from 'i18next'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useMyCellarViewModel } from './useMyCellarViewModel'

const lang = vi.hoisted(() => ({ current: 'es-AR' }))
vi.mock('@hooks/queries/cellar/useCellar', () => ({
  useCellar: () => ({ data: [
    { id: 'a', rating: 4, purchasePrice: 1500, wine: { region: 'Mendoza', type: 'RED' } },
    { id: 'b', rating: 5, purchasePrice: 20.5, wine: { region: 'Salta', type: 'WHITE' } },
    { id: 'c', rating: null, purchasePrice: null, wine: { region: 'mendoza', type: 'RED' } },
  ] }),
}))
vi.mock('@hooks/queries/cellar/useRemoveCellarEntry', () => ({ useRemoveCellarEntry: () => ({ mutate: vi.fn() }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: vi.fn() }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: lang.current } }) }))

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

beforeEach(async () => {
  await i18next.init({ lng: 'es-AR', resources: {} })
})

it('shows the cellar summary like the app, with the average in the app language and no money total', async () => {
  const spanish = renderHook(() => useMyCellarViewModel(), { wrapper })
  expect(spanish.result.current).not.toHaveProperty('totalInvested')
  expect(spanish.result.current.totalWines).toBe(3)
  expect(spanish.result.current.averageRating).toBe(4.5)
  expect(spanish.result.current.averageRatingLabel).toBe('4,5')
  expect(spanish.result.current.regionCount).toBe(2)
  expect(spanish.result.current.typeMix).toEqual([{ type: 'RED', count: 2 }, { type: 'WHITE', count: 1 }])
  spanish.unmount()
  lang.current = 'en-US'
  await i18next.changeLanguage('en-US')
  const english = renderHook(() => useMyCellarViewModel(), { wrapper })
  expect(english.result.current.averageRatingLabel).toBe('4.5')
})
