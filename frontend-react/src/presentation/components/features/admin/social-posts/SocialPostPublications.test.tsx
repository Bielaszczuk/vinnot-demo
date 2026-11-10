import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SocialPublication } from '@domain/admin/socialPost'
import { SocialPostPublications } from './SocialPostPublications'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' },
  }),
}))
afterEach(cleanup)

const instagram: SocialPublication = {
  network: 'INSTAGRAM', status: 'PUBLISHED', externalId: 'ig-1', permalink: 'https://instagram.com/p/1', attempts: 1, error: null,
  publishedAt: '2026-11-03T22:01:00Z', metrics: { views: 1200, reach: null, likes: 80, comments: null, saves: null, shares: null, follows: null },
}
const facebook: SocialPublication = {
  network: 'FACEBOOK', status: 'FAILED', externalId: null, permalink: null, attempts: 3, error: 'TOKEN_INVALID', publishedAt: null, metrics: null,
}
const tiktok: SocialPublication = {
  network: 'TIKTOK', status: 'DRAFT_SENT', externalId: 'tt-1', permalink: null, attempts: 1, error: null, publishedAt: '2026-11-03T22:04:00Z', metrics: null,
}
const base = { retrying: null, formatDate: (iso: string) => `date:${iso}`, formatNumber: (value: number) => `n:${value}`, onRetry: vi.fn() }

describe('social post publications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing before publishing starts', () => {
    const { container } = render(<SocialPostPublications {...base} publications={[]} publishing={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists each network with its state, link, date, attempts and the figures it reported', () => {
    render(<SocialPostPublications {...base} publications={[instagram, facebook, tiktok]} publishing={null} />)
    const rows = within(screen.getByRole('list', { name: 'admin.socialPosts.publications.heading' })).getAllByRole('listitem')
    expect(rows).toHaveLength(3)

    const ig = within(rows[0]!)
    expect(ig.getByText('admin.socialPosts.networks.INSTAGRAM')).toBeInTheDocument()
    expect(ig.getByText('admin.socialPosts.publications.status.PUBLISHED')).toBeInTheDocument()
    const link = ig.getByRole('link', { name: 'admin.socialPosts.publications.open {"network":"admin.socialPosts.networks.INSTAGRAM"}' })
    expect(link).toHaveAttribute('href', 'https://instagram.com/p/1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(ig.getByText('admin.socialPosts.publications.publishedAt {"date":"date:2026-11-03T22:01:00Z"}')).toBeInTheDocument()
    expect(ig.getByText('admin.socialPosts.publications.attempts {"count":1}')).toBeInTheDocument()
    expect(ig.getByText('admin.socialPosts.publications.metrics.views')).toBeInTheDocument()
    expect(ig.getByText('n:1200')).toBeInTheDocument()
    expect(ig.getByText('n:80')).toBeInTheDocument()
    expect(ig.queryByText('admin.socialPosts.publications.metrics.reach')).not.toBeInTheDocument()
    expect(ig.queryByRole('button')).not.toBeInTheDocument()

    const fb = within(rows[1]!)
    expect(fb.getByText('admin.socialPosts.publications.status.FAILED')).toBeInTheDocument()
    expect(fb.getByText('admin.socialPosts.publications.error {"reason":"admin.socialPosts.publications.errors.TOKEN_INVALID"}')).toBeInTheDocument()
    expect(fb.queryByRole('link')).not.toBeInTheDocument()
    expect(fb.getByText('admin.socialPosts.publications.noMetrics')).toBeInTheDocument()

    const tt = within(rows[2]!)
    expect(tt.getByText('admin.socialPosts.publications.status.DRAFT_SENT')).toBeInTheDocument()
    expect(tt.getByText('admin.socialPosts.publications.draftHint')).toBeInTheDocument()
    expect(tt.queryByRole('link')).not.toBeInTheDocument()
    expect(tt.queryByRole('button')).not.toBeInTheDocument()
  })

  it('retries only a failed network and disables the retry while it runs', () => {
    const { rerender } = render(<SocialPostPublications {...base} publications={[instagram, facebook]} publishing={null} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.publications.retry {"network":"admin.socialPosts.networks.FACEBOOK"}' }))
    expect(base.onRetry).toHaveBeenCalledWith('FACEBOOK')

    rerender(<SocialPostPublications {...base} retrying="FACEBOOK" publications={[instagram, facebook]} publishing={null} />)
    expect(screen.getByRole('button', { name: /publications\.retry/ })).toBeDisabled()
  })

  it('shows why the post failed to publish, even before any network was tried', () => {
    render(<SocialPostPublications {...base} publications={[]} publishing={{ startedAt: null, finishedAt: null, error: 'MEDIA_NOT_READY' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('admin.socialPosts.publications.publishingError {"reason":"admin.socialPosts.publications.errors.MEDIA_NOT_READY"}')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows an unknown error code through the generic reason', () => {
    render(<SocialPostPublications {...base} publications={[]} publishing={{ startedAt: null, finishedAt: null, error: 'SOMETHING_NEW' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'admin.socialPosts.publications.publishingError {"reason":"admin.socialPosts.publications.errors.OTHER {\\"code\\":\\"SOMETHING_NEW\\"}"}')
  })

  it('shows when publishing started and ended without an error', () => {
    render(<SocialPostPublications {...base} publications={[instagram]} publishing={{ startedAt: '2026-11-03T22:00:00Z', finishedAt: '2026-11-03T22:05:00Z', error: null }} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.publications.started {"date":"date:2026-11-03T22:00:00Z"}')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.publications.finished {"date":"date:2026-11-03T22:05:00Z"}')).toBeInTheDocument()
  })
})
