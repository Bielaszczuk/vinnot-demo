/**
 * Inline copy editor (#489) with the S4 limits: hook, 3 to 7 slides, caption, hashtags, alt text and CTA. It edits
 * one content language at a time (#497) and names the legal line that closes that language's caption.
 */
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import {
  LEGAL_LINES,
  MAX_ALT_TEXT_LENGTH,
  MAX_CAPTION_LENGTH,
  MAX_HOOK_LENGTH,
  MAX_SLIDES,
  MAX_SLIDE_BODY_LENGTH,
  MAX_SLIDE_TITLE_LENGTH,
  MIN_SLIDES,
  type SocialLanguage,
  type SocialPostCopyDraft,
  type SocialPostDraftError,
  type SocialPostSlide,
} from '@domain/admin/socialPost'

type DraftTextField = Exclude<keyof SocialPostCopyDraft, 'slides'>

interface SocialPostEditFormProps {
  draft: SocialPostCopyDraft
  /** The language whose copy is being edited and saved. */
  language: SocialLanguage
  errors: SocialPostDraftError[]
  saving: boolean
  onChange: (field: DraftTextField, value: string) => void
  onSlideChange: (index: number, field: keyof SocialPostSlide, value: string) => void
  onAddSlide: () => void
  onRemoveSlide: (index: number) => void
  onSave: () => unknown
  onCancel: () => unknown
}

const FIELD = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'
const LABEL = 'block text-sm font-medium text-gray-900'

function Counter({ value, max }: { value: string; max: number }) {
  const { t } = useTranslation()
  return <span className={`text-xs ${value.length > max ? 'text-red-700' : 'text-gray-500'}`}>{t('admin.socialPosts.editor.counter', { count: value.length, max })}</span>
}

export function SocialPostEditForm({
  draft, language, errors, saving, onChange, onSlideChange, onAddSlide, onRemoveSlide, onSave, onCancel,
}: SocialPostEditFormProps) {
  const { t } = useTranslation()
  return (
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void onSave() }} aria-labelledby="social-post-editor-title">
      <div className="space-y-1">
        <h3 id="social-post-editor-title" className="font-semibold text-gray-900">{t('admin.socialPosts.editor.heading')}</h3>
        <p className="text-sm text-gray-600">{t('admin.socialPosts.editor.language', { language: t(`admin.socialPosts.languages.${language}`) })}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between"><label htmlFor="social-post-hook" className={LABEL}>{t('admin.socialPosts.editor.hook')}</label><Counter value={draft.hook} max={MAX_HOOK_LENGTH} /></div>
        <input id="social-post-hook" value={draft.hook} onChange={(event) => onChange('hook', event.target.value)} className={FIELD} />
      </div>

      <fieldset className="space-y-3">
        <legend className={LABEL}>{t('admin.socialPosts.editor.slides')}</legend>
        {draft.slides.map((slide, index) => (
          <div key={index} className="space-y-2 rounded-xl bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('admin.socialPosts.detail.slide', { index: index + 1 })}</span>
              {draft.slides.length > MIN_SLIDES && (
                <button type="button" onClick={() => onRemoveSlide(index)} className="text-xs text-red-700 hover:underline">
                  {t('admin.socialPosts.editor.removeSlide', { index: index + 1 })}
                </button>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between"><label htmlFor={`social-post-slide-${index}-title`} className="text-xs text-gray-600">{t('admin.socialPosts.editor.slideTitle')}</label><Counter value={slide.title} max={MAX_SLIDE_TITLE_LENGTH} /></div>
              <input id={`social-post-slide-${index}-title`} value={slide.title} onChange={(event) => onSlideChange(index, 'title', event.target.value)} className={`${FIELD} bg-white`} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between"><label htmlFor={`social-post-slide-${index}-body`} className="text-xs text-gray-600">{t('admin.socialPosts.editor.slideBody')}</label><Counter value={slide.body} max={MAX_SLIDE_BODY_LENGTH} /></div>
              <textarea id={`social-post-slide-${index}-body`} value={slide.body} onChange={(event) => onSlideChange(index, 'body', event.target.value)} rows={2} className={`${FIELD} bg-white`} />
            </div>
          </div>
        ))}
        {draft.slides.length < MAX_SLIDES && (
          <Button type="button" variant="outline" size="sm" onClick={onAddSlide}>{t('admin.socialPosts.editor.addSlide')}</Button>
        )}
      </fieldset>

      <div className="space-y-1">
        <div className="flex items-center justify-between"><label htmlFor="social-post-caption" className={LABEL}>{t('admin.socialPosts.editor.caption')}</label><Counter value={draft.caption} max={MAX_CAPTION_LENGTH} /></div>
        <textarea id="social-post-caption" value={draft.caption} onChange={(event) => onChange('caption', event.target.value)} rows={5} className={FIELD} />
        <p className="text-xs text-gray-500">{t('admin.socialPosts.editor.captionHelp')}</p>
        <p className="text-xs text-gray-500">{t('admin.socialPosts.editor.legalLine', { line: LEGAL_LINES[language] })}</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="social-post-hashtags" className={LABEL}>{t('admin.socialPosts.editor.hashtags')}</label>
        <input id="social-post-hashtags" value={draft.hashtags} onChange={(event) => onChange('hashtags', event.target.value)} className={FIELD} />
        <p className="text-xs text-gray-500">{t('admin.socialPosts.editor.hashtagsHelp')}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between"><label htmlFor="social-post-alt" className={LABEL}>{t('admin.socialPosts.editor.altText')}</label><Counter value={draft.altText} max={MAX_ALT_TEXT_LENGTH} /></div>
        <textarea id="social-post-alt" value={draft.altText} onChange={(event) => onChange('altText', event.target.value)} rows={2} className={FIELD} />
      </div>

      <div className="space-y-1">
        <label htmlFor="social-post-cta" className={LABEL}>{t('admin.socialPosts.editor.cta')}</label>
        <input id="social-post-cta" value={draft.cta} onChange={(event) => onChange('cta', event.target.value)} className={FIELD} />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 rounded-lg bg-red-50 p-3 pl-7 text-sm text-red-800">
          {errors.map((error) => <li key={error}>{t(`admin.socialPosts.editor.errors.${error}`)}</li>)}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={saving} onClick={() => void onCancel()}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={saving || errors.length > 0} isLoading={saving}>{t('admin.socialPosts.editor.save')}</Button>
      </div>
    </form>
  )
}
