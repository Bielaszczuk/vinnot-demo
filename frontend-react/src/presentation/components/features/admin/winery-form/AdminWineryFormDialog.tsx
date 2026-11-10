import { useTranslation } from 'react-i18next'
import { Home, X } from 'lucide-react'
import { Spinner } from '@components/ui/Spinner'
import { FormSection } from '@components/ui/FormSection'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import {
  AdminWineryContactSection,
  AdminWineryIdentitySection,
  AdminWineryImagesSection,
  AdminWineryLocationSection,
} from './AdminWineryFormSections'
import { useAdminWineryEditor, type AdminWineryEditorOptions } from './useAdminWineryEditor'

const TITLE_ID = 'admin-winery-form-title'

/** Winery create/edit dialog: collapsible sections on react-hook-form + Zod, guarded close, upload-on-pick logo and cover. */
export function AdminWineryFormDialog(options: AdminWineryEditorOptions) {
  const { t } = useTranslation()
  const editor = useAdminWineryEditor(options)
  const { watch, section, errorMessages, busy, isEditing } = editor
  const name = watch('name')
  const logoUrl = watch('logoUrl')
  const countryName = editor.countries.find((country) => country.id === watch('countryId'))?.name
  const regionName = editor.regions.find((region) => region.id === watch('regionId'))?.name
  const contact = [watch('email'), watch('phone'), watch('website')].filter(Boolean).join(' · ')
  const images = [logoUrl && t('admin.wineries.form.logo'), watch('imageUrl') && t('admin.wineries.form.cover')].filter(Boolean).join(' · ')
  const close = () => void editor.handleClose()

  return (
    <AdminFormDialog open onClose={close} labelledBy={TITLE_ID} widthClassName="max-w-2xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 ring-2 ring-white/20">
            {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain" /> : <Home aria-hidden="true" className="h-5 w-5 text-white/50" />}
          </div>
          <div>
            <h2 id={TITLE_ID} className="text-lg font-semibold text-white">{isEditing ? t('admin.wineries.editWinery') : t('admin.wineries.newWinery')}</h2>
            <p className="mt-0.5 text-xs text-amber-200">{name || t('admin.wineries.completeData')}</p>
          </div>
        </div>
        <button type="button" onClick={close} disabled={busy} aria-label={t('common.close')} className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <form id={editor.formId} noValidate onSubmit={editor.submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
        {errorMessages.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            <p className="font-medium">{t('admin.wineries.form.fixErrors')}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              {errorMessages.map((message) => <li key={message}>{message}</li>)}
            </ul>
          </div>
        )}
        <fieldset disabled={editor.saving} className="space-y-4 disabled:opacity-60">
          <FormSection {...section('identity', name || t('admin.wineries.form.summaries.identity'))}>
            <AdminWineryIdentitySection editor={editor} />
          </FormSection>
          <FormSection {...section('location', [regionName, countryName].filter(Boolean).join(', ') || t('admin.wineries.form.summaries.location'))}>
            <AdminWineryLocationSection editor={editor} />
          </FormSection>
          <FormSection {...section('contact', contact || t('admin.wineries.form.summaries.contact'))}>
            <AdminWineryContactSection editor={editor} />
          </FormSection>
          <FormSection
            {...section('images', images || t('admin.wineries.form.summaries.images'))}
            disabled={editor.logoBusy || editor.coverBusy}
          >
            <AdminWineryImagesSection editor={editor} />
          </FormSection>
        </fieldset>
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
        <div className="text-xs text-gray-400">{editor.wineryId && `ID: ${editor.wineryId.substring(0, 8)}...`}</div>
        <div className="flex gap-3">
          <button type="button" onClick={close} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50">{t('common.cancel')}</button>
          <button type="button" onClick={() => void editor.submit()} disabled={busy} aria-busy={editor.saving || undefined} className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-50">
            {editor.saving && <Spinner size="sm" />}
            {editor.saving ? t('admin.wineries.form.saving') : isEditing ? t('admin.wineries.saveChanges') : t('admin.wineries.createWinery')}
          </button>
        </div>
      </div>
    </AdminFormDialog>
  )
}
