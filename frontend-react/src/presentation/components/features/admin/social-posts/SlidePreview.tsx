/**
 * Text preview of the carousel slides (#489): brand burgundy cards, Playfair Display titles (Georgia when the
 * face is not loaded) and Poppins body. It is a preview of the copy, never the final artwork.
 */
import { useTranslation } from 'react-i18next'
import type { SocialPostSlide } from '@domain/admin/socialPost'

const TITLE_FONT = { fontFamily: "'Playfair Display', Georgia, serif" }

export function SlidePreview({ hook, slides }: { hook: string; slides: SocialPostSlide[] }) {
  const { t } = useTranslation()
  return (
    <div>
      <p className="mb-3 text-xs text-gray-500">{t('admin.socialPosts.detail.previewHelp')}</p>
      <ol className="flex snap-x gap-3 overflow-x-auto pb-2" aria-label={t('admin.socialPosts.detail.preview')}>
        <li className="flex aspect-[4/5] w-56 shrink-0 snap-start flex-col justify-end rounded-2xl bg-gradient-to-br from-wine-900 via-wine-800 to-wine-700 p-5 text-white shadow-md">
          <p className="text-xl font-semibold leading-snug" style={TITLE_FONT}>{hook}</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-wine-200">vinnot</p>
        </li>
        {slides.map((slide, index) => (
          <li key={`${index}-${slide.title}`} className="flex aspect-[4/5] w-56 shrink-0 snap-start flex-col rounded-2xl border border-wine-100 bg-wine-50 p-5 text-wine-950 shadow-sm">
            <span className="text-2xs font-medium uppercase tracking-wide text-wine-600">{t('admin.socialPosts.detail.slide', { index: index + 1 })}</span>
            <p className="mt-2 text-lg font-semibold leading-snug" style={TITLE_FONT}>{slide.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-wine-900">{slide.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
