import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CellarQuickAddModal } from './CellarQuickAddModal'

const mutate = vi.hoisted(() => vi.fn())
vi.mock('@hooks/queries/wine/useCellarQuickAdd', () => ({ useCellarQuickAdd: () => ({ mutate, isPending: false }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { year?: number }) => options?.year ? `${key}:${options.year}` : key }),
}))

describe('CellarQuickAddModal vintage', () => {
  beforeEach(() => mutate.mockReset())

  it('adds the wine with the chosen vintage', () => {
    render(<CellarQuickAddModal isOpen onClose={() => {}} wineId="wine-1" wineName="Malbec" catalogVintage={2020} />)
    expect(screen.getByRole('option', { name: 'vintage.catalogOption:2020' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('vintage.label'), { target: { value: '2020' } })
    fireEvent.click(screen.getByRole('button', { name: 'cellar.addWine' }))
    expect(mutate.mock.calls[0]![0]).toEqual({ wineId: 'wine-1', rating: null, purchasePrice: null, notes: null, vintage: 2020 })
  })

  it('adds the wine without vintage when none is chosen', () => {
    render(<CellarQuickAddModal isOpen onClose={() => {}} wineId="wine-1" wineName="Malbec" />)
    fireEvent.click(screen.getByRole('button', { name: 'cellar.addWine' }))
    expect(mutate.mock.calls[0]![0]).toEqual({ wineId: 'wine-1', rating: null, purchasePrice: null, notes: null, vintage: null })
  })
})
