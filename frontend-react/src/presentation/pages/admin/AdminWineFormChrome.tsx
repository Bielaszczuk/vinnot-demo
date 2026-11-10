import { useTranslation } from 'react-i18next'
import { ImageIcon, X } from 'lucide-react'
import { Spinner } from '@components/ui/Spinner'
import { FormSection } from '@components/ui/FormSection'
import type { SelectOption } from '@components/ui/Select'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import {
  AdminWineCompositionSection,
  AdminWineDescriptionSection,
  AdminWineIdentitySection,
  AdminWinePricesSection,
  AdminWineTasteSection,
} from '@components/features/admin/wine-form/AdminWineFormSections'
import { useAdminWineEditor, type AdminWineEditorOptions } from '@components/features/admin/wine-form/useAdminWineEditor'
import { ADMIN_WINE_TASTE_SCORES } from '@domain/admin/adminWineForm'

const TITLE_ID = 'admin-wine-form-title'

export function AdminWineFormHeader({ isEditing, name, imageUrl, onClose, closeDisabled = false }: {
  isEditing: boolean
  name: string
  imageUrl: string | null
  onClose: () => void
  closeDisabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-wine-700 to-wine-800 px-6 py-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 ring-2 ring-white/20">
          {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon aria-hidden="true" className="h-5 w-5 text-white/50" />}
        </div>
        <div>
          <h2 id={TITLE_ID} className="text-lg font-semibold text-white">{isEditing ? t('admin.wines.editWine') : t('admin.wines.newWine')}</h2>
          <p className="mt-0.5 text-xs text-wine-200">{name || t('admin.wines.completeData')}</p>
        </div>
      </div>
      <button type="button" onClick={onClose} disabled={closeDisabled} aria-label={t('common.close')} className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50">
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  )
}

export function AdminWineFormFooter({ isEditing, wineId, saving, disabled, onCancel, onSave }: {
  isEditing: boolean
  wineId?: string
  saving: boolean
  disabled: boolean
  onCancel: () => void
  onSave: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
      <div className="text-xs text-gray-400">{wineId && `ID: ${wineId.substring(0, 8)}...`}</div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={disabled} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50">{t('common.cancel')}</button>
        <button type="button" onClick={onSave} disabled={disabled} aria-busy={saving || undefined} className="flex items-center gap-2 rounded-xl bg-wine-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-wine-700 disabled:opacity-50">
          {saving && <Spinner size="sm" />}
          {saving ? t('admin.wines.form.saving') : isEditing ? t('admin.wines.saveChanges') : t('admin.wines.createWine')}
        </button>
      </div>
    </div>
  )
}

export interface AdminWineFormDialogProps extends AdminWineEditorOptions {
  /** The wine details are still loading; the form mounts once they arrive. */
  loading: boolean
  wineTypeOptions: SelectOption[]
}

/** Wine create/edit dialog: collapsible sections on react-hook-form + Zod, guarded close, upload-on-pick photo. */
export function AdminWineFormDialog({ loading, ...props }: AdminWineFormDialogProps) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <AdminFormDialog open onClose={props.onClose} ariaLabel={t('admin.wines.editWine')} widthClassName="max-w-4xl">
        <div className="p-12 text-center"><Spinner /></div>
      </AdminFormDialog>
    )
  }
  return <AdminWineFormBody {...props} />
}

function AdminWineFormBody({ wineTypeOptions, ...options }: Omit<AdminWineFormDialogProps, 'loading'>) {
  const { t } = useTranslation()
  const editor = useAdminWineEditor(options)
  const { watch, section, errorMessages, busy } = editor
  const name = watch('name')
  const grapes = watch('grapes')
  const scoresSet = ADMIN_WINE_TASTE_SCORES.filter((key) => watch(key) != null).length
  const prices = [watch('priceMin'), watch('priceMax')].filter((price) => price != null).join(' – ')
  const close = () => void editor.handleClose()

  return (
    <AdminFormDialog open onClose={close} labelledBy={TITLE_ID} widthClassName="max-w-4xl">
      <AdminWineFormHeader isEditing={editor.isEditing} name={name} imageUrl={watch('imageUrl')} closeDisabled={busy} onClose={close} />
      <form id={editor.formId} noValidate onSubmit={editor.submit} className="max-h-[65vh] space-y-4 overflow-y-auto p-6">
        {errorMessages.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            <p className="font-medium">{t('admin.wines.form.fixErrors')}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              {errorMessages.map((message) => <li key={message}>{message}</li>)}
            </ul>
          </div>
        )}
        <fieldset disabled={editor.saving} className="space-y-4 disabled:opacity-60">
          <FormSection {...section('identity', name ? [name, watch('wineryName')].filter(Boolean).join(' · ') : t('admin.wines.form.summaries.identity'))} disabled={editor.wineryBusy}>
            <AdminWineIdentitySection editor={editor} wineTypeOptions={wineTypeOptions} />
          </FormSection>
          <FormSection {...section('composition', grapes.length ? grapes.join(', ') : t('admin.wines.form.summaries.composition'))}>
            <AdminWineCompositionSection editor={editor} />
          </FormSection>
          <FormSection
            {...section('description', t(watch('imageUrl') ? 'admin.wines.form.summaries.withPhoto' : 'admin.wines.form.summaries.withoutPhoto'))}
            disabled={editor.imageBusy}
          >
            <AdminWineDescriptionSection editor={editor} />
          </FormSection>
          <FormSection {...section('prices', prices || t('admin.wines.form.summaries.prices'))}>
            <AdminWinePricesSection editor={editor} />
          </FormSection>
          <FormSection {...section('taste', scoresSet ? t('admin.wines.form.summaries.scoresSet', { count: scoresSet }) : t('admin.wines.form.summaries.taste'))}>
            <AdminWineTasteSection editor={editor} />
          </FormSection>
        </fieldset>
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
      <AdminWineFormFooter
        isEditing={editor.isEditing}
        wineId={editor.wineId}
        saving={editor.saving}
        disabled={busy}
        onCancel={close}
        onSave={() => void editor.submit()}
      />
    </AdminFormDialog>
  )
}
