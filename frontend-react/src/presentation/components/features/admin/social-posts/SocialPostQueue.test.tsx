import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SocialPost } from '@domain/admin/socialPost'
import { SocialPostQueue } from './SocialPostQueue'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' } }),
}))
afterEach(cleanup)

const generation = { provider: null, model: null, mock: false, attempts: 0, generatedAt: null, factCheck: null, issues: [], error: null }
const posts: SocialPost[] = [
  {
    id: 'p1', status: 'PENDING_APPROVAL', scheduledFor: '2026-11-03T22:00:00Z',
    pillar: { code: 'WINE_DAY', nameEs: 'Día del vino', nameEn: 'Wine day', weight: 1 },
    wineDay: { code: 'MERLOT', nameEs: 'Día del Merlot', nameEn: 'Merlot Day', date: '2026-11-07' },
    copies: {
      es: { hook: 'Gancho del Merlot', slides: [], caption: '', hashtags: [], altText: '', cta: '', illustration: null },
      en: { hook: 'Merlot hook', slides: [], caption: '', hashtags: [], altText: '', cta: '', illustration: null },
    },
    generation, review: null, media: null, publishing: null, publications: [], canReschedule: false, canPublishNow: false, networkSchedule: [], createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z',
  },
  {
    id: 'p2', status: 'DRAFT', scheduledFor: '2026-11-05T22:00:00Z', pillar: null, wineDay: null, copies: { es: null, en: null },
    generation, review: null, media: null, publishing: null, publications: [], canReschedule: false, canPublishNow: false, networkSchedule: [], createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z',
  },
]

const base = {
  posts, loading: false, failed: false, page: 0, totalPages: 1, totalItems: 2,
  formatDate: (iso: string) => `date:${iso}`, onSelect: vi.fn(), onPageChange: vi.fn(), onRetry: vi.fn(),
}

describe('social post queue', () => {
  it('lists each post with its slot, status, chips and hook, marking the selected one', () => {
    render(<SocialPostQueue {...base} selectedId="p1" />)
    const rows = screen.getAllByRole('button')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveAttribute('aria-current', 'true')
    expect(rows[0]).toHaveTextContent('date:2026-11-03T22:00:00Z')
    expect(rows[0]).toHaveTextContent('admin.socialPosts.status.PENDING_APPROVAL')
    expect(rows[0]).toHaveTextContent('Día del vino')
    expect(rows[0]).toHaveTextContent('Día del Merlot')
    expect(rows[0]).toHaveTextContent('Gancho del Merlot')
    expect(rows[0]).not.toHaveTextContent('Merlot hook')
    expect(rows[1]).not.toHaveAttribute('aria-current')
    expect(rows[1]).toHaveTextContent('admin.socialPosts.status.DRAFT')

    fireEvent.click(rows[1]!)
    expect(base.onSelect).toHaveBeenCalledWith('p2')
  })

  it('falls back to the hook of the other language when the UI language has none', () => {
    const english = { ...posts[0]!, id: 'p3', copies: { es: null, en: posts[0]!.copies.en } }
    render(<SocialPostQueue {...base} posts={[english]} />)
    expect(screen.getByRole('button')).toHaveTextContent('Merlot hook')
  })

  it('shows the error, the spinner or the empty message instead of the list', () => {
    const { rerender } = render(<SocialPostQueue {...base} failed />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByText('common.retry'))
    expect(base.onRetry).toHaveBeenCalled()

    rerender(<SocialPostQueue {...base} loading />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(<SocialPostQueue {...base} posts={[]} />)
    expect(screen.getByText('admin.socialPosts.queue.empty')).toBeInTheDocument()
  })

  it('pages the queue when there is more than one page', () => {
    render(<SocialPostQueue {...base} totalPages={2} totalItems={25} />)
    expect(screen.getByText(/admin.common.totalItems/)).toBeInTheDocument()
  })
})
