import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { mapCellarEntryFromDto } from '@domain/cellar/cellar.mappers'
import { CellarWineCard } from '@components/features/cellar/CellarWineCard'
import { useMyCellarViewModel } from './useMyCellarViewModel'

const state = vi.hoisted(() => ({ reviewId: null as string | null }))
vi.mock('@hooks/queries/cellar/useCellar', () => ({ useCellar: () => ({ data: [] }) }))
vi.mock('@hooks/queries/cellar/useRemoveCellarEntry', () => ({ useRemoveCellarEntry: () => ({ mutate: vi.fn() }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: vi.fn() }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

function CellarAction() {
  const model = useMyCellarViewModel()
  const location = useLocation()
  const entry = mapCellarEntryFromDto({ id: 'entry', wine: { id: 'wine', name: 'Malbec' },
    addedAt: '2026-10-08T12:00:00Z', notes: 'Personal note', reviewId: state.reviewId })
  return <>
    <CellarWineCard entry={entry} onPublishReview={model.handlePublishReview} onEdit={model.handleEdit} onDelete={() => undefined} />
    <p>{location.pathname}{location.search}</p>
    {model.publishingEntry && <p>Publication draft open</p>}
  </>
}
beforeEach(() => { state.reviewId = null })
it('opens the own review directly rather than reopening the publication draft', () => {
  state.reviewId = 'own-review'
  render(<MemoryRouter initialEntries={['/cellar']}><CellarAction /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'cellar.viewReview' }))
  expect(screen.getByText('/wines/wine?review=mine')).toBeInTheDocument()
  expect(screen.queryByText('Publication draft open')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'cellar.publishReview' })).not.toBeInTheDocument()
})
it('keeps the publication draft for a private note that has no review', () => {
  render(<MemoryRouter initialEntries={['/cellar']}><CellarAction /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'cellar.publishReview' }))
  expect(screen.getByText('Publication draft open')).toBeInTheDocument()
  expect(screen.getByText('/cellar')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'cellar.viewReview' })).not.toBeInTheDocument()
})
