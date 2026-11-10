import { useId, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ANNOUNCEMENT_LANGUAGES,
  MAX_ANNOUNCEMENT_BODY_LENGTH,
  MAX_ANNOUNCEMENT_TITLE_LENGTH,
  type AnnouncementLanguage,
  type AnnouncementVersion,
} from '@domain/admin/announcement'
import type { AnnouncementFormat } from '@domain/admin/announcementFormat'

const FORMATS: AnnouncementFormat[] = ['heading', 'bold', 'link', 'button']

const FORMAT_ICONS: Record<AnnouncementFormat, string> = {
  heading: 'M4 6v12M12 6v12M4 12h8M16 10l3-2v10',
  bold: 'M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z',
  link: 'M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1',
  button: 'M4 8h16a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zM8 12h8',
}

/** Title and formatted body of one language, with a toolbar that writes the format for the author. */
export function AnnouncementEditor({
  language,
  written,
  version,
  disabled,
  bodyRef,
  onLanguageChange,
  onChange,
  onFormat,
}: {
  language: AnnouncementLanguage
  written: AnnouncementLanguage[]
  version: AnnouncementVersion
  disabled: boolean
  bodyRef: RefObject<HTMLTextAreaElement | null>
  onLanguageChange: (language: AnnouncementLanguage) => void
  onChange: (patch: Partial<AnnouncementVersion>) => void
  onFormat: (format: AnnouncementFormat) => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const bodyId = useId()
  const helpId = useId()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">{t('admin.notifications.composer.contentLabel')}</h3>
        <div role="group" aria-label={t('admin.notifications.composer.languageLabel')} className="inline-flex rounded-lg bg-gray-100 p-1">
          {ANNOUNCEMENT_LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={language === code}
              onClick={() => onLanguageChange(code)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${language === code ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {t(`admin.notifications.languages.${code}`)}
              {written.includes(code) && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="sr-only">{t('admin.notifications.composer.written')}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500">{t('admin.notifications.composer.languageHelp')}</p>

      <div>
        <label htmlFor={titleId} className="mb-1.5 block text-xs font-medium text-gray-700">{t('admin.notifications.composer.title')}</label>
        <input
          id={titleId}
          value={version.title}
          maxLength={MAX_ANNOUNCEMENT_TITLE_LENGTH}
          disabled={disabled}
          onChange={(event) => onChange({ title: event.target.value.replace(/[\r\n]/g, ' ') })}
          placeholder={t('admin.notifications.composer.titlePlaceholder')}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-wine-500/20 disabled:opacity-60"
        />
        <p className="mt-1 text-right text-xs text-gray-500" aria-live="polite">{version.title.length}/{MAX_ANNOUNCEMENT_TITLE_LENGTH}</p>
      </div>

      <div>
        <label htmlFor={bodyId} className="mb-1.5 block text-xs font-medium text-gray-700">{t('admin.notifications.composer.body')}</label>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-wine-500/20">
          <div role="toolbar" aria-label={t('admin.notifications.composer.toolbar')} className="flex flex-wrap gap-1 border-b border-gray-200 bg-white px-2 py-1.5">
            {FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                disabled={disabled}
                onClick={() => onFormat(format)}
                title={t(`admin.notifications.composer.formats.${format}`)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={FORMAT_ICONS[format]} />
                </svg>
                {t(`admin.notifications.composer.formats.${format}`)}
              </button>
            ))}
          </div>
          <textarea
            id={bodyId}
            ref={bodyRef}
            value={version.body}
            rows={12}
            maxLength={MAX_ANNOUNCEMENT_BODY_LENGTH}
            disabled={disabled}
            aria-describedby={helpId}
            onChange={(event) => onChange({ body: event.target.value })}
            placeholder={t('admin.notifications.composer.bodyPlaceholder')}
            className="block w-full resize-y border-0 bg-transparent px-3.5 py-3 font-mono text-sm leading-relaxed text-gray-900 focus:outline-none disabled:opacity-60"
          />
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <p id={helpId} className="text-xs text-gray-500">{t('admin.notifications.composer.formatHelp')}</p>
          <p className="shrink-0 text-xs text-gray-500" aria-live="polite">{version.body.length}/{MAX_ANNOUNCEMENT_BODY_LENGTH}</p>
        </div>
      </div>
    </div>
  )
}
