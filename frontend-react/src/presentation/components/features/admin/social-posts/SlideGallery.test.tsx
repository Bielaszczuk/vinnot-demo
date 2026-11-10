import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SocialPostCopy, SocialPostMedia } from '@domain/admin/socialPost'
import { SlideGallery } from './SlideGallery'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key) }),
}))
afterEach(cleanup)

const copy: SocialPostCopy = {
  hook: 'Tres datos sobre el Merlot',
  slides: [{ title: 'Uno', body: 'Primero.' }, { title: 'Dos', body: 'Segundo.' }, { title: 'Tres', body: 'Tercero.' }],
  caption: 'Datos.',
  hashtags: ['#vinnot'],
  altText: 'Carrusel con tres datos.',
  cta: '¿Cuál te sorprendió?',
  illustration: 'a bunch of Merlot grapes',
}
const english: SocialPostCopy = { ...copy, hook: 'Three facts about Merlot', altText: 'Carousel with three facts.' }

const ready: SocialPostMedia = {
  status: 'READY', source: 'AI', illustrationReason: null, heroUrl: 'https://images.vinnot.com/hero.png',
  slides: {
    es: {
      INSTAGRAM: ['/api/uploads/social/ig-1.jpg', '/api/uploads/social/ig-2.jpg'],
      TIKTOK: ['https://images.vinnot.com/tt-1.jpg', 'https://images.vinnot.com/tt-2.jpg', 'https://images.vinnot.com/tt-3.jpg'],
      renderedFor: 'hash',
    },
    en: { INSTAGRAM: ['/api/uploads/social/en/ig-1.jpg'], TIKTOK: ['/api/uploads/social/en/tt-1.jpg'], renderedFor: 'hash-en' },
  },
  updatedAt: '2026-11-02T12:00:00Z',
}
const noSlides = { es: null, en: null }

const onNewIllustration = vi.fn()
const onLanguageChange = vi.fn()
const onRegenerate = vi.fn()
const base = {
  postId: 'p1', language: 'es' as const, copy, media: ready, canRequestIllustration: true, canRegenerate: true, working: false,
  onNewIllustration, onLanguageChange, onRegenerate,
}

describe('slide gallery', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the rendered Instagram slides as lazy 4:5 images with alt text and switches to TikTok', () => {
    render(<SlideGallery {...base} />)
    const instagram = screen.getByRole('button', { name: 'admin.socialPosts.media.formats.INSTAGRAM' })
    expect(instagram).toHaveAttribute('aria-pressed', 'true')
    const images = within(screen.getByRole('list', { name: 'admin.socialPosts.media.slides {"format":"admin.socialPosts.media.formats.INSTAGRAM"}' })).getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', '/api/uploads/social/ig-1.jpg')
    expect(images[0]).toHaveAttribute('loading', 'lazy')
    expect(images[0]).toHaveAttribute('width', '1080')
    expect(images[0]).toHaveAttribute('height', '1350')
    expect(images[0]).toHaveClass('aspect-[4/5]')
    expect(images[1]).toHaveAttribute('alt', 'admin.socialPosts.media.slideAlt {"alt":"Carrusel con tres datos.","index":2,"total":2}')
    expect(screen.queryByText('admin.socialPosts.detail.previewHelp')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.media.formats.TIKTOK' }))
    const tiktok = screen.getAllByRole('img')
    expect(tiktok).toHaveLength(3)
    expect(tiktok[2]).toHaveAttribute('src', 'https://images.vinnot.com/tt-3.jpg')
    expect(tiktok[2]).toHaveAttribute('height', '1920')
    expect(tiktok[2]).toHaveClass('aspect-[9/16]')
    expect(screen.getByRole('button', { name: 'admin.socialPosts.media.formats.TIKTOK' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('offers each slide of the selected format as a download', () => {
    render(<SlideGallery {...base} />)
    const instagram = within(screen.getByRole('group', { name: 'admin.socialPosts.media.download' })).getAllByRole('link')
    expect(instagram).toHaveLength(2)
    expect(instagram[0]).toHaveAttribute('href', '/api/uploads/social/ig-1.jpg')
    expect(instagram[0]).toHaveAttribute('download', 'vinnot-p1-es-instagram-01.jpg')
    expect(instagram[1]).toHaveAccessibleName('admin.socialPosts.media.downloadSlide {"index":2,"format":"admin.socialPosts.media.formats.INSTAGRAM"}')

    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.media.formats.TIKTOK' }))
    const tiktok = within(screen.getByRole('group', { name: 'admin.socialPosts.media.download' })).getAllByRole('link')
    expect(tiktok).toHaveLength(3)
    expect(tiktok[2]).toHaveAttribute('download', 'vinnot-p1-es-tiktok-03.jpg')
  })

  it('switches the content language next to the formats and shows the slides, alt text and downloads of that language', () => {
    const { rerender } = render(<SlideGallery {...base} />)
    const languages = within(screen.getByRole('group', { name: 'admin.socialPosts.languages.label' }))
    expect(languages.getByRole('button', { name: 'admin.socialPosts.languages.short.es' })).toHaveAttribute('aria-pressed', 'true')
    expect(languages.getByRole('button', { name: 'admin.socialPosts.languages.short.en' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(languages.getByRole('button', { name: 'admin.socialPosts.languages.short.en' }))
    expect(onLanguageChange).toHaveBeenCalledWith('en')

    rerender(<SlideGallery {...base} language="en" copy={english} />)
    expect(screen.getByRole('button', { name: 'admin.socialPosts.languages.short.en' })).toHaveAttribute('aria-pressed', 'true')
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveAttribute('src', '/api/uploads/social/en/ig-1.jpg')
    expect(images[0]).toHaveAttribute('alt', 'admin.socialPosts.media.slideAlt {"alt":"Carousel with three facts.","index":1,"total":1}')
    const links = within(screen.getByRole('group', { name: 'admin.socialPosts.media.download' })).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/api/uploads/social/en/ig-1.jpg')
    expect(links[0]).toHaveAttribute('download', 'vinnot-p1-en-instagram-01.jpg')

    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.media.formats.TIKTOK' }))
    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', '/api/uploads/social/en/tt-1.jpg')
  })

  it('keeps the text preview of a language whose slides are not rendered yet', () => {
    render(<SlideGallery {...base} language="en" copy={english} media={{ ...ready, status: 'PENDING', slides: { ...ready.slides, en: null } }} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Three facts about Merlot')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'admin.socialPosts.media.formats.TIKTOK' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'admin.socialPosts.languages.short.es' })).toBeInTheDocument()
  })

  it('shows a missing language as pending with the regenerate action instead of slides', () => {
    const { rerender } = render(<SlideGallery {...base} language="en" copy={null} media={{ ...ready, slides: { ...ready.slides, en: null } }} />)
    const pending = screen.getByRole('status')
    expect(pending).toHaveTextContent('admin.socialPosts.languages.pending')
    expect(pending).toHaveTextContent('admin.socialPosts.languages.pendingHelp {"language":"admin.socialPosts.languages.en"}')
    expect(pending).toHaveTextContent('admin.socialPosts.languages.regenerateHint')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'admin.socialPosts.media.download' })).not.toBeInTheDocument()
    fireEvent.click(within(pending).getByRole('button', { name: 'admin.socialPosts.actions.regenerate' }))
    expect(onRegenerate).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.languages.short.es' }))
    expect(onLanguageChange).toHaveBeenCalledWith('es')

    rerender(<SlideGallery {...base} language="en" copy={null} canRegenerate={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('admin.socialPosts.languages.pending')
    expect(screen.queryByRole('button', { name: 'admin.socialPosts.actions.regenerate' })).not.toBeInTheDocument()
    expect(screen.queryByText('admin.socialPosts.languages.regenerateHint')).not.toBeInTheDocument()

    rerender(<SlideGallery {...base} language="en" copy={null} working />)
    expect(screen.getByRole('button', { name: 'admin.socialPosts.actions.regenerate' })).toBeDisabled()
  })

  it('tells an AI illustration from the pillar vignette and explains why the vignette was used', () => {
    const { rerender } = render(<SlideGallery {...base} />)
    expect(screen.getByText('admin.socialPosts.media.source.AI')).toBeInTheDocument()
    expect(screen.queryByText(/fallbackReason/)).not.toBeInTheDocument()

    rerender(<SlideGallery {...base} media={{ ...ready, source: 'FALLBACK', illustrationReason: 'AI_IMAGE_UNAVAILABLE' }} />)
    expect(screen.getByText('admin.socialPosts.media.source.FALLBACK')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.media.fallbackReason.AI_IMAGE_UNAVAILABLE')).toBeInTheDocument()

    rerender(<SlideGallery {...base} media={{ ...ready, source: 'FALLBACK', illustrationReason: 'HERO_STORE_FAILED' }} />)
    expect(screen.getByText('admin.socialPosts.media.fallbackReason.HERO_STORE_FAILED')).toBeInTheDocument()

    rerender(<SlideGallery {...base} media={{ ...ready, source: 'FALLBACK', illustrationReason: 'QUOTA_GONE' }} />)
    expect(screen.getByText('admin.socialPosts.media.fallbackReason.OTHER {"code":"QUOTA_GONE"}')).toBeInTheDocument()

    rerender(<SlideGallery {...base} media={{ ...ready, source: null }} />)
    expect(screen.queryByText(/admin\.socialPosts\.media\.source\./)).not.toBeInTheDocument()
  })

  it('shows a calm rendering note while pending, keeping the text preview until slides exist', () => {
    const { rerender } = render(<SlideGallery {...base} media={{ ...ready, status: 'PENDING', slides: noSlides }} />)
    expect(screen.getByRole('status')).toHaveTextContent('admin.socialPosts.media.pending')
    expect(screen.getByText('admin.socialPosts.detail.previewHelp')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'admin.socialPosts.media.download' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'admin.socialPosts.media.formats.TIKTOK' })).not.toBeInTheDocument()

    rerender(<SlideGallery {...base} media={{ ...ready, status: 'PENDING' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('admin.socialPosts.media.pending')
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('explains a failed render and retries it with a new illustration', () => {
    const { rerender } = render(<SlideGallery {...base} media={{ ...ready, status: 'FAILED', error: 'TEXT_DOES_NOT_FIT', slides: noSlides }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('admin.socialPosts.media.errors.TEXT_DOES_NOT_FIT')
    expect(screen.getByRole('alert')).toHaveTextContent('admin.socialPosts.media.failedHelp')
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.media.newIllustration' }))
    expect(onNewIllustration).toHaveBeenCalledTimes(1)

    rerender(<SlideGallery {...base} media={{ ...ready, status: 'FAILED', error: 'OutOfMemoryError' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('admin.socialPosts.media.errors.OTHER {"code":"OutOfMemoryError"}')

    rerender(<SlideGallery {...base} media={{ ...ready, status: 'FAILED', error: null }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('admin.socialPosts.media.errors.OTHER {"code":"—"}')
  })

  it('keeps the text-only preview for a post rendered before slides existed', () => {
    render(<SlideGallery {...base} media={null} />)
    expect(within(screen.getByRole('list', { name: 'admin.socialPosts.detail.preview' })).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.media.newIllustration' }))
    expect(onNewIllustration).toHaveBeenCalledTimes(1)
  })

  it('falls back to the hook for the alt text when the copy has none', () => {
    render(<SlideGallery {...base} copy={{ ...copy, altText: '' }} />)
    expect(screen.getAllByRole('img')[0]).toHaveAttribute('alt', 'admin.socialPosts.media.slideAlt {"alt":"Tres datos sobre el Merlot","index":1,"total":2}')
  })

  it('disables the new illustration action when the post no longer accepts it and while working', () => {
    const { rerender } = render(<SlideGallery {...base} canRequestIllustration={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.media.newIllustration' }))
    expect(screen.getByRole('button', { name: 'admin.socialPosts.media.newIllustration' })).toBeDisabled()
    expect(onNewIllustration).not.toHaveBeenCalled()

    rerender(<SlideGallery {...base} working />)
    expect(screen.getByRole('button', { name: 'admin.socialPosts.media.newIllustration' })).toBeDisabled()
  })
})
