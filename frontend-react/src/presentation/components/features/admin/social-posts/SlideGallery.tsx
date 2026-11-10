/**
 * The rendered carousel of a post (#492): its slides per language (#497) and format (Instagram 4:5, TikTok 9:16),
 * where the hero illustration came from, the render state, a download link per slide and the new illustration
 * action. A language without rendered slides keeps the text-only preview; a language without copy is pending and
 * offers to regenerate.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import {
  ILLUSTRATION_FALLBACK_REASONS,
  MEDIA_RENDER_ERRORS,
  SOCIAL_FORMATS,
  SOCIAL_LANGUAGES,
  slideFileName,
  type SocialFormat,
  type SocialLanguage,
  type SocialPostCopy,
  type SocialPostMedia,
} from '@domain/admin/socialPost'
import { SlidePreview } from './SlidePreview'

interface SlideGalleryProps {
  postId: string
  language: SocialLanguage
  /** The copy of `language`; `null` while that language is pending. */
  copy: SocialPostCopy | null
  media: SocialPostMedia | null
  canRequestIllustration: boolean
  canRegenerate: boolean
  working: boolean
  onLanguageChange: (language: SocialLanguage) => void
  onNewIllustration: () => unknown
  onRegenerate: () => unknown
}

/** Rendered pixel size of each format; the image keeps its ratio before it loads. */
const FORMAT_LAYOUT: Record<SocialFormat, { width: number; height: number; card: string; aspect: string }> = {
  INSTAGRAM: { width: 1080, height: 1350, card: 'w-56', aspect: 'aspect-[4/5]' },
  TIKTOK: { width: 1080, height: 1920, card: 'w-44', aspect: 'aspect-[9/16]' },
}

const CHIP = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
const TOGGLE_GROUP = 'inline-flex rounded-lg bg-gray-100 p-0.5'
const toggle = (pressed: boolean) =>
  `min-h-8 rounded-md px-3 text-xs font-medium transition-colors ${pressed ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`

function knownCode(codes: readonly string[], code: string | null): string {
  return code !== null && codes.includes(code) ? code : 'OTHER'
}

export function SlideGallery({
  postId, language, copy, media, canRequestIllustration, canRegenerate, working, onLanguageChange, onNewIllustration, onRegenerate,
}: SlideGalleryProps) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<SocialFormat>('INSTAGRAM')
  const slideSet = copy ? media?.slides[language] ?? null : null
  const urls = slideSet?.[format] ?? []
  const hasSlides = SOCIAL_FORMATS.some((candidate) => (slideSet?.[candidate].length ?? 0) > 0)
  const formatName = t(`admin.socialPosts.media.formats.${format}`)
  const layout = FORMAT_LAYOUT[format]
  const fallbackReason = media?.source === 'FALLBACK' && media.illustrationReason
    ? knownCode(ILLUSTRATION_FALLBACK_REASONS, media.illustrationReason)
    : null

  return (
    <section aria-labelledby="social-post-media" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="social-post-media" className="text-sm font-semibold text-gray-900">{t('admin.socialPosts.media.heading')}</h3>
        {media?.source && (
          <span className={`${CHIP} ${media.source === 'AI' ? 'bg-wine-50 text-wine-800' : 'bg-amber-50 text-amber-800'}`}>
            {t(`admin.socialPosts.media.source.${media.source}`)}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t('admin.socialPosts.languages.label')} className={TOGGLE_GROUP}>
            {SOCIAL_LANGUAGES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-pressed={language === candidate}
                title={t(`admin.socialPosts.languages.${candidate}`)}
                onClick={() => onLanguageChange(candidate)}
                className={toggle(language === candidate)}
              >
                {t(`admin.socialPosts.languages.short.${candidate}`)}
              </button>
            ))}
          </div>
          {hasSlides && (
            <div role="group" aria-label={t('admin.socialPosts.media.format')} className={TOGGLE_GROUP}>
              {SOCIAL_FORMATS.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={format === candidate}
                  onClick={() => setFormat(candidate)}
                  className={toggle(format === candidate)}
                >
                  {t(`admin.socialPosts.media.formats.${candidate}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {fallbackReason && media && (
        <p className="text-xs text-gray-600">
          {t(`admin.socialPosts.media.fallbackReason.${fallbackReason}`, fallbackReason === 'OTHER' ? { code: media.illustrationReason } : undefined)}
        </p>
      )}
      {media?.status === 'PENDING' && (
        <p role="status" className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{t('admin.socialPosts.media.pending')}</p>
      )}
      {media?.status === 'FAILED' && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>
            {knownCode(MEDIA_RENDER_ERRORS, media.error) === 'OTHER'
              ? t('admin.socialPosts.media.errors.OTHER', { code: media.error ?? '—' })
              : t(`admin.socialPosts.media.errors.${media.error}`)}
          </p>
          <p className="text-xs">{t('admin.socialPosts.media.failedHelp')}</p>
        </div>
      )}

      {!copy ? (
        <div role="status" className="space-y-2 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p>
            <span className={`${CHIP} mr-2 bg-amber-100 text-amber-800`}>{t('admin.socialPosts.languages.pending')}</span>
            {t('admin.socialPosts.languages.pendingHelp', { language: t(`admin.socialPosts.languages.${language}`) })}
          </p>
          {canRegenerate && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs">{t('admin.socialPosts.languages.regenerateHint')}</span>
              <Button variant="outline" size="sm" disabled={working} onClick={() => void onRegenerate()}>
                {t('admin.socialPosts.actions.regenerate')}
              </Button>
            </div>
          )}
        </div>
      ) : urls.length > 0 ? (
        <ol className="flex snap-x gap-3 overflow-x-auto pb-2" aria-label={t('admin.socialPosts.media.slides', { format: formatName })}>
          {urls.map((url, index) => (
            <li key={url} className={`${layout.card} shrink-0 snap-start`}>
              <img
                src={url}
                alt={t('admin.socialPosts.media.slideAlt', { alt: copy.altText || copy.hook, index: index + 1, total: urls.length })}
                width={layout.width}
                height={layout.height}
                loading="lazy"
                decoding="async"
                className={`${layout.aspect} h-auto w-full rounded-2xl bg-gray-100 object-cover shadow-sm`}
              />
            </li>
          ))}
        </ol>
      ) : (
        <SlidePreview hook={copy.hook} slides={copy.slides} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {urls.length > 0 && (
          <div role="group" aria-label={t('admin.socialPosts.media.download')} className="flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
            <span aria-hidden="true">{t('admin.socialPosts.media.download')}:</span>
            {urls.map((url, index) => (
              <a
                key={url}
                href={url}
                download={slideFileName(postId, language, format, index + 1)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('admin.socialPosts.media.downloadSlide', { index: index + 1, format: formatName })}
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-gray-200 px-2 text-xs font-medium text-wine-700 hover:bg-wine-50"
              >
                {index + 1}
              </a>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={working || !canRequestIllustration}
          onClick={() => void onNewIllustration()}
        >
          {t('admin.socialPosts.media.newIllustration')}
        </Button>
      </div>
    </section>
  )
}
