import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CellarWine } from '@domain/cellar/cellar.types'
import { CellarEditModal } from './CellarEditModal'

const mutate = vi.hoisted(() => vi.fn())
const state = vi.hoisted(() => ({ pending: false, confirm: vi.fn() }))
vi.mock('@hooks/queries/cellar/useUpdateCellarEntry', () => ({ useUpdateCellarEntry: () => ({ mutate, isPending: state.pending }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: state.confirm }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { year?: number }) => options?.year ? `${key}:${options.year}` : key }),
}))

const entry = { id: 'entry-1', wine: { id: 'wine-1', name: 'Malbec', winery: 'Bodega', grapeVarieties: [], vintage: 2020 },
  rating: 4, notes: 'Silky', purchasePrice: 15000, vintage: 2016, addedAt: new Date() } as unknown as CellarWine

function save(value: CellarWine) {
  render(<CellarEditModal entry={value} onClose={() => {}} />)
  return screen.getByLabelText('vintage.label')
}

describe('CellarEditModal vintage', () => {
  beforeEach(() => mutate.mockReset())

  it('pre-selects the stored vintage, suggests the label vintage and keeps sending it', () => {
    const select = save(entry)
    expect(select).toHaveValue('2016')
    expect(screen.getByRole('option', { name: 'vintage.catalogOption:2020' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(mutate.mock.calls[0]![0]).toEqual({ cellarWineId: 'entry-1',
      updates: { rating: 4, purchasePrice: 15000, notes: 'Silky', vintage: 2016 } })
  })

  it('saves a newly chosen vintage', () => {
    fireEvent.change(save(entry), { target: { value: '2019' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(mutate.mock.calls[0]![0].updates.vintage).toBe(2019)
  })

  it('asks to clear the vintage when the user removes it', () => {
    fireEvent.change(save(entry), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(mutate.mock.calls[0]![0].updates.vintage).toBeNull()
  })

  it('sends no vintage change for a note without vintage, as before', () => {
    save({ ...entry, vintage: null })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    const { updates } = mutate.mock.calls[0]![0]
    expect(updates).toMatchObject({ rating: 4, purchasePrice: 15000, notes: 'Silky' })
    expect(updates.vintage).toBeUndefined()
  })
})

describe('CellarEditModal draft', () => {
  beforeEach(() => { state.pending = false; state.confirm.mockReset() })

  it('closes on Escape without asking when nothing changed', async () => {
    const onClose = vi.fn()
    render(<CellarEditModal entry={entry} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(state.confirm).not.toHaveBeenCalled()
  })

  it('asks before discarding edited notes and keeps them when declined', async () => {
    state.confirm.mockResolvedValue(false)
    const onClose = vi.fn()
    render(<CellarEditModal entry={entry} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('cellar.notesPlaceholder'), { target: { value: 'Changed' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    await waitFor(() => expect(state.confirm).toHaveBeenCalledOnce())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('cellar.notesPlaceholder')).toHaveValue('Changed')
  })

  it('cannot be closed while saving', () => {
    state.pending = true
    const onClose = vi.fn()
    render(<CellarEditModal entry={entry} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('scrolls its content inside a height-limited dialog on short screens', () => {
    render(<CellarEditModal entry={entry} onClose={() => {}} />)
    const body = screen.getByTestId('cellar-edit-body')
    expect(body).toHaveClass('overflow-y-auto')
    expect(body.parentElement).toHaveClass('max-h-[90vh]')
  })
})

describe('CellarEditModal rating', () => {
  beforeEach(() => { state.pending = false; mutate.mockReset() })

  it('rates with the pour control in steps of 0.1 and can clear the rating', () => {
    render(<CellarEditModal entry={entry} onClose={() => {}} />)
    const slider = screen.getByRole('slider', { name: 'cellar.rating' })
    expect(slider).toHaveAttribute('aria-valuenow', '4')
    fireEvent.keyDown(slider, { key: 'End' })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(mutate.mock.calls[0]![0].updates.rating).toBe(4.9)
    fireEvent.click(screen.getByRole('button', { name: 'cellar.clearRating' }))
    expect(screen.queryByRole('button', { name: 'cellar.clearRating' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(mutate.mock.calls[1]![0].updates.rating).toBeNull()
  })

  it('labels the notes and price fields and shows saving on the button', () => {
    state.pending = true
    render(<CellarEditModal entry={entry} onClose={() => {}} />)
    expect(screen.getByRole('textbox', { name: 'cellar.notes' })).toHaveValue('Silky')
    expect(screen.getByRole('spinbutton', { name: 'cellar.purchasePrice' })).toHaveValue(15000)
    expect(screen.getByRole('button', { name: /common.saving/ })).toHaveAttribute('aria-busy', 'true')
  })
})

