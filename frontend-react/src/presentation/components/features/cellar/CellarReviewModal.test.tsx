import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { winesService } from '@services/wines.service'
import type { CellarWine } from '@domain/cellar/cellar.types'
import type { WineReview } from '@domain/wine/wine.types'
import { CellarReviewModal } from './CellarReviewModal'

const toast = vi.hoisted(() => vi.fn())
const confirm = vi.hoisted(() => vi.fn())
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: toast }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR' } }) }))
vi.mock('@components/ui/QueryErrorState', () => ({ QueryErrorState: ({ onRetry }: { onRetry: () => void }) =>
  <button onClick={onRetry}>Retry lookup</button> }))
const entry = { id: 'personal-entry', wine: { id: 'wine-1', name: 'Malbec' }, rating: 4,
  notes: 'My personal note', purchasePrice: 15000, addedAt: new Date() } as CellarWine
const review = { id: 'review-1', wineId: 'wine-1' } as WineReview
const caches: QueryClient[] = []
beforeEach(() => {
  vi.spyOn(winesService, 'getMyReviewStatus').mockResolvedValue({ hasReview: false })
  vi.spyOn(winesService, 'addReview').mockResolvedValue(review)
})
afterEach(() => { cleanup(); caches.splice(0).forEach(c => c.clear()); vi.restoreAllMocks(); toast.mockClear(); confirm.mockReset() })
function open(input = entry, cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  if (!caches.includes(cache)) caches.push(cache)
  const close = vi.fn()
  const view = render(<MemoryRouter><QueryClientProvider client={cache}>
    <CellarReviewModal entry={input} onClose={close} />
  </QueryClientProvider></MemoryRouter>)
  return { ...view, close, cache }
}
it('publishes the reviewed text explicitly without price or private entry ID', async () => {
  const view = open()
  const input = await screen.findByDisplayValue('My personal note')
  expect(winesService.addReview).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: 'Public version' } })
  fireEvent.click(screen.getByRole('button', { name: 'reviews.form.submitCreate' }))
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1))
  expect(winesService.addReview).toHaveBeenCalledWith('wine-1', 4, undefined, 'Public version', null)
  expect(entry.notes).toBe('My personal note')
  expect(toast).toHaveBeenCalledWith({ type: 'success', message: 'community.reviewPublished' })
})
it('pre-fills the review vintage from the cellar note and publishes it', async () => {
  const view = open({ ...entry, vintage: 2016, wine: { ...entry.wine, vintage: 2020 } } as CellarWine)
  await screen.findByDisplayValue('My personal note')
  expect(screen.getByLabelText('vintage.label')).toHaveValue('2016')
  fireEvent.click(screen.getByRole('button', { name: 'reviews.form.submitCreate' }))
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1))
  expect(winesService.addReview).toHaveBeenCalledWith('wine-1', 4, undefined, 'My personal note', 2016)
})
it('cancel never creates a public review', async () => {
  const view = open()
  await screen.findByDisplayValue('My personal note')
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
  expect(view.close).toHaveBeenCalledTimes(1)
  expect(winesService.addReview).not.toHaveBeenCalled()
})
it('offers editing through the wine when a review already exists', async () => {
  vi.mocked(winesService.getMyReviewStatus).mockResolvedValue({ hasReview: true })
  open()
  await screen.findByText('cellar.reviewExistsTitle')
  expect(screen.queryByDisplayValue('My personal note')).toBeNull()
  expect(screen.getByRole('link', { name: 'cellar.openWine' })).toHaveAttribute('href', '/wines/wine-1?review=mine')
  expect(winesService.addReview).not.toHaveBeenCalled()
})
it('preserves the edited draft and recovers after a network error', async () => {
  vi.mocked(winesService.addReview).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(review)
  const view = open()
  fireEvent.change(await screen.findByDisplayValue('My personal note'), { target: { value: 'Keep this draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'reviews.form.submitCreate' }))
  await waitFor(() => expect(toast).toHaveBeenCalledWith({ type: 'error', message: 'reviews.errorSave' }))
  expect(screen.getByDisplayValue('Keep this draft')).toBeInTheDocument()
  expect(view.close).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'reviews.form.submitCreate' }))
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1))
})
it('rechecks a cached status on reopen', async () => {
  const first = open()
  await screen.findByDisplayValue('My personal note')
  first.unmount()
  vi.mocked(winesService.getMyReviewStatus).mockResolvedValue({ hasReview: true })
  open(entry, first.cache)
  await screen.findByText('cellar.reviewExistsTitle')
  expect(winesService.getMyReviewStatus).toHaveBeenCalledTimes(2)
})
it('prevents multiple writes and dismissal until the current submission completes', async () => {
  let resolve!: (value: WineReview) => void
  vi.mocked(winesService.addReview).mockImplementationOnce(() => new Promise(r => { resolve = r }))
  const view = open()
  await screen.findByDisplayValue('My personal note')
  const submit = screen.getByRole('button', { name: 'reviews.form.submitCreate' })
  fireEvent.click(submit)
  fireEvent.click(submit)
  fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
  await waitFor(() => expect(winesService.addReview).toHaveBeenCalledTimes(1))
  expect(view.close).not.toHaveBeenCalled()
  await act(async () => resolve(review))
  expect(view.close).toHaveBeenCalledTimes(1)
})
it('allows retrying the existence lookup without ever publishing automatically', async () => {
  vi.mocked(winesService.getMyReviewStatus).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ hasReview: false })
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Retry lookup' }))
  await screen.findByDisplayValue('My personal note')
  expect(winesService.addReview).not.toHaveBeenCalled()
})

it('closes without asking when the prefilled review was not changed', async () => {
  const view = open()
  await screen.findByDisplayValue('My personal note')
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1))
  expect(confirm).not.toHaveBeenCalled()
})
it('asks before discarding an edited review and keeps the text when declined', async () => {
  confirm.mockResolvedValue(false)
  const view = open()
  const input = await screen.findByDisplayValue('My personal note')
  fireEvent.change(input, { target: { value: 'Draft text' } })
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1))
  expect(view.close).not.toHaveBeenCalled()
  expect(screen.getByDisplayValue('Draft text')).toBeInTheDocument()
})
