import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGAL_LINES, type SocialPost, type SocialPostCopy } from '@domain/admin/socialPost'
import { SocialPostDetail } from './SocialPostDetail'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' },
  }),
}))
afterEach(cleanup)

const spanish: SocialPostCopy = {
  hook: 'Tres datos sobre el Merlot',
  slides: [{ title: 'Uno', body: 'Primero.' }, { title: 'Dos', body: 'Segundo.' }, { title: 'Tres', body: 'Tercero.' }],
  caption: `Datos del Merlot.\n\n${LEGAL_LINES.es}`,
  hashtags: ['#vinnot', '#merlot'],
  altText: 'Carrusel con tres datos.',
  cta: '¿Cuál te sorprendió?',
  illustration: null,
}
const english: SocialPostCopy = {
  ...spanish,
  hook: 'Three facts about Merlot',
  caption: `Merlot facts.\n\n${LEGAL_LINES.en}`,
  hashtags: ['#vinnot', '#merlotday'],
  altText: 'Carousel with three facts.',
  cta: 'Which one surprised you?',
}

const post: SocialPost = {
  id: 'p1', status: 'PENDING_APPROVAL', scheduledFor: '2026-11-03T22:00:00Z',
  pillar: { code: 'CURIOUS_FACT', nameEs: 'Dato curioso', nameEn: 'Curious fact', weight: 2 },
  wineDay: { code: 'MERLOT', nameEs: 'Día del Merlot', nameEn: 'Merlot Day', date: '2026-11-07' },
  copies: { es: spanish, en: english },
  generation: { provider: 'openai', model: 'gpt-4o-mini', mock: true, attempts: 2, generatedAt: '2026-11-02T12:00:00Z', factCheck: 'FLAGGED', issues: ['1853 es discutido'], error: null },
  review: { reviewedBy: 'admin@vinnot.test', reviewedAt: '2026-11-02T13:00:00Z', reason: 'Tono', editedBy: 'editor@vinnot.test', automatic: false },
  media: null, publishing: null, publications: [], canReschedule: false, canPublishNow: false, networkSchedule: [], createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T13:00:00Z',
}

const handlers = {
  onApprove: vi.fn(), onStartReject: vi.fn(), onReasonChange: vi.fn(), onConfirmReject: vi.fn(),
  onCancelReject: vi.fn(), onEdit: vi.fn(), onRegenerate: vi.fn(), onNewIllustration: vi.fn(), onLanguageChange: vi.fn(),
  onRetryPublication: vi.fn(),
}
const base = {
  post, language: 'es' as const, actions: ['approve', 'reject', 'edit', 'regenerate'] as const, working: false, rejecting: false, reason: '',
  canRequestIllustration: true, formatDate: (iso: string) => `date:${iso}`, formatNumber: (value: number) => `n:${value}`,
  retryingNetwork: null, ...handlers,
}

describe('social post detail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the slides, the caption with its legal line, hashtags, CTA, alt text, generation and review', () => {
    render(<SocialPostDetail {...base} actions={[...base.actions]} />)
    expect(within(screen.getByRole('list', { name: 'admin.socialPosts.detail.preview' })).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText(/Datos del Merlot\./)).toHaveTextContent(LEGAL_LINES.es)
    expect(screen.getByText('admin.socialPosts.detail.legalLine')).toBeInTheDocument()
    expect(screen.getByText('#merlot')).toBeInTheDocument()
    expect(screen.getByText('¿Cuál te sorprendió?')).toBeInTheDocument()
    expect(screen.getByText('Carrusel con tres datos.')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.generation.mock')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.generation.factCheck.FLAGGED')).toBeInTheDocument()
    expect(screen.getByText('1853 es discutido')).toBeInTheDocument()
    expect(screen.getByText(/gpt-4o-mini/)).toHaveTextContent('openai')
    expect(screen.getByText('admin.socialPosts.generation.generatedAt {"date":"date:2026-11-02T12:00:00Z"}')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.review.reviewedBy {"by":"admin@vinnot.test","date":"date:2026-11-02T13:00:00Z"}')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.review.editedBy {"by":"editor@vinnot.test"}')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.review.reason {"reason":"Tono"}')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.detail.scheduledFor {"date":"date:2026-11-03T22:00:00Z"}')).toBeInTheDocument()
  })

  it('shows the rendered slides of a post with media and requests a new illustration', () => {
    const media = {
      status: 'READY' as const, source: 'AI' as const, illustrationReason: null, heroUrl: null,
      slides: { es: { INSTAGRAM: ['ig-1.jpg', 'ig-2.jpg'], TIKTOK: ['tt-1.jpg'], renderedFor: 'hash' }, en: null }, updatedAt: '2026-11-02T12:00:00Z',
    }
    render(<SocialPostDetail {...base} post={{ ...post, media }} actions={[...base.actions]} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getByText('admin.socialPosts.media.source.AI')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.media.newIllustration' }))
    expect(handlers.onNewIllustration).toHaveBeenCalledTimes(1)
  })

  it('calls each action handler from its button', () => {
    render(<SocialPostDetail {...base} actions={[...base.actions]} />)
    fireEvent.click(screen.getByText('admin.socialPosts.actions.approve'))
    fireEvent.click(screen.getByText('admin.socialPosts.actions.reject'))
    fireEvent.click(screen.getByText('admin.socialPosts.actions.edit'))
    fireEvent.click(screen.getByText('admin.socialPosts.actions.regenerate'))
    expect(handlers.onApprove).toHaveBeenCalledTimes(1)
    expect(handlers.onStartReject).toHaveBeenCalledTimes(1)
    expect(handlers.onEdit).toHaveBeenCalledTimes(1)
    expect(handlers.onRegenerate).toHaveBeenCalledTimes(1)
  })

  it('warns that regenerating an approved post sends it back to pending approval', () => {
    render(<SocialPostDetail {...base} post={{ ...post, status: 'APPROVED' }} actions={['reject', 'edit', 'regenerate']} />)
    expect(screen.getByText('admin.socialPosts.actions.regenerateApprovedHint')).toBeInTheDocument()
    fireEvent.click(screen.getByText('admin.socialPosts.actions.regenerate'))
    expect(handlers.onRegenerate).toHaveBeenCalledTimes(1)
    cleanup()
    render(<SocialPostDetail {...base} actions={[...base.actions]} />)
    expect(screen.queryByText('admin.socialPosts.actions.regenerateApprovedHint')).toBeNull()
  })

  it('shows the reason form while rejecting and confirms or cancels it', () => {
    render(<SocialPostDetail {...base} actions={['reject']} rejecting reason="Tono" />)
    expect(screen.queryByText('admin.socialPosts.actions.reject')).not.toBeInTheDocument()
    const reason = screen.getByLabelText('admin.socialPosts.actions.rejectReason')
    expect(reason).toHaveValue('Tono')
    fireEvent.change(reason, { target: { value: 'Otro' } })
    expect(handlers.onReasonChange).toHaveBeenCalledWith('Otro')
    fireEvent.click(screen.getByText('admin.socialPosts.actions.confirmReject'))
    fireEvent.click(screen.getByText('common.cancel'))
    expect(handlers.onConfirmReject).toHaveBeenCalledTimes(1)
    expect(handlers.onCancelReject).toHaveBeenCalledTimes(1)
  })

  it('explains a post without copy, a generation error, a missing legal line and hides empty review and actions', () => {
    const bare: SocialPost = {
      ...post, status: 'DRAFT', pillar: null, wineDay: null, copies: { es: null, en: null },
      generation: { provider: null, model: null, mock: false, attempts: 0, generatedAt: null, factCheck: null, issues: [], error: 'provider down' },
      review: { reviewedBy: null, reviewedAt: null, reason: null, editedBy: null, automatic: false },
    }
    const { rerender } = render(<SocialPostDetail {...base} post={bare} actions={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('admin.socialPosts.detail.noCopy')
    expect(screen.getByRole('alert')).toHaveTextContent('provider down')
    expect(screen.getByText('admin.socialPosts.generation.notGenerated')).toBeInTheDocument()
    expect(screen.queryByText('admin.socialPosts.review.heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'admin.socialPosts.languages.label' })).not.toBeInTheDocument()

    rerender(<SocialPostDetail {...base} post={{ ...post, copies: { ...post.copies, es: { ...spanish, caption: 'Sin línea' } }, review: null, generation: { ...post.generation, reviewedAt: null } as never }} actions={['approve']} working />)
    expect(screen.getByText('admin.socialPosts.detail.legalMissing')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.actions.approve')).toBeDisabled()

    rerender(<SocialPostDetail {...base} post={{ ...post, review: { reviewedBy: 'admin@vinnot.test', reviewedAt: null, reason: null, editedBy: null, automatic: false } }} actions={[]} />)
    expect(screen.getByText('admin.socialPosts.review.reviewedBy {"by":"admin@vinnot.test","date":"—"}')).toBeInTheDocument()
  })

  it('shows the copy of the selected language with its own legal line check and switches language', () => {
    const { rerender } = render(<SocialPostDetail {...base} language="en" actions={[...base.actions]} />)
    expect(screen.getByText(/Merlot facts\./)).toHaveTextContent(LEGAL_LINES.en)
    expect(screen.getByText('admin.socialPosts.detail.legalLine')).toBeInTheDocument()
    expect(screen.getByText('#merlotday')).toBeInTheDocument()
    expect(screen.getByText('Which one surprised you?')).toBeInTheDocument()
    expect(screen.getByText('Carousel with three facts.')).toBeInTheDocument()
    expect(screen.queryByText('¿Cuál te sorprendió?')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.languages.short.es' }))
    expect(handlers.onLanguageChange).toHaveBeenCalledWith('es')

    rerender(<SocialPostDetail {...base} language="en" post={{ ...post, copies: { ...post.copies, en: { ...english, caption: `Merlot facts. ${LEGAL_LINES.es}` } } }} actions={[...base.actions]} />)
    expect(screen.getByText('admin.socialPosts.detail.legalMissing')).toBeInTheDocument()
  })

  it('shows a missing language as pending with one regenerate action and no copy to edit', () => {
    render(<SocialPostDetail {...base} language="en" post={{ ...post, copies: { es: spanish, en: null } }} actions={['approve', 'reject', 'regenerate']} />)
    expect(screen.getByRole('status')).toHaveTextContent('admin.socialPosts.languages.pending')
    expect(screen.queryByText('admin.socialPosts.detail.caption')).not.toBeInTheDocument()
    expect(screen.queryByText('admin.socialPosts.detail.noCopy')).not.toBeInTheDocument()
    const regenerate = screen.getAllByRole('button', { name: 'admin.socialPosts.actions.regenerate' })
    expect(regenerate).toHaveLength(1)
    fireEvent.click(regenerate[0]!)
    expect(handlers.onRegenerate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('admin.socialPosts.actions.approve')).toBeInTheDocument()
  })

  it('says the system approved the post instead of naming a reviewer, without the internal reason', () => {
    render(<SocialPostDetail {...base} post={{
      ...post, status: 'APPROVED',
      review: { reviewedBy: null, reviewedAt: '2026-11-02T22:00:00Z', reason: 'AUTO_APPROVED', editedBy: null, automatic: true },
    }} actions={[]} />)
    const review = within(screen.getByRole('region', { name: 'admin.socialPosts.review.heading' }))
    expect(review.getByText('admin.socialPosts.review.automatic {"date":"date:2026-11-02T22:00:00Z"}')).toBeInTheDocument()
    expect(review.queryByText(/review\.reviewedBy/)).not.toBeInTheDocument()
    expect(review.queryByText(/review\.reason/)).not.toBeInTheDocument()
  })

  it('shows each network publication with its retry and keeps the queue actions it had', () => {
    const published: SocialPost = {
      ...post, status: 'FAILED',
      publishing: { startedAt: '2026-11-03T22:00:00Z', finishedAt: '2026-11-03T22:05:00Z', error: 'PUBLISH_FAILED' },
      publications: [
        { network: 'INSTAGRAM', status: 'PUBLISHED', externalId: 'ig-1', permalink: 'https://instagram.com/p/1', attempts: 1, error: null, publishedAt: '2026-11-03T22:01:00Z', metrics: null },
        { network: 'THREADS', status: 'FAILED', externalId: null, permalink: null, attempts: 3, error: 'RATE_LIMITED', publishedAt: null, metrics: null },
      ],
    }
    render(<SocialPostDetail {...base} post={published} actions={[]} />)
    expect(within(screen.getByRole('list', { name: 'admin.socialPosts.publications.heading' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('admin.socialPosts.publications.publishingError {"reason":"admin.socialPosts.publications.errors.OTHER {\\"code\\":\\"PUBLISH_FAILED\\"}"}')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.publications.retry {"network":"admin.socialPosts.networks.THREADS"}' }))
    expect(handlers.onRetryPublication).toHaveBeenCalledWith('THREADS')
    expect(screen.queryByText('admin.socialPosts.actions.approve')).not.toBeInTheDocument()
  })

  it('places the schedule panel it is given under the header and keeps the review actions (#513)', () => {
    render(<SocialPostDetail {...base} actions={[...base.actions]} schedule={<p>schedule panel</p>} />)
    expect(screen.getByText('schedule panel')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.actions.approve' }))
    expect(handlers.onApprove).toHaveBeenCalledTimes(1)
  })

  it('shows no publications section on a post that never started publishing', () => {
    render(<SocialPostDetail {...base} actions={[...base.actions]} />)
    expect(screen.queryByRole('list', { name: 'admin.socialPosts.publications.heading' })).not.toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.actions.approve')).toBeInTheDocument()
  })
})
