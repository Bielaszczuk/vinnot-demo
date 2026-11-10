import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Spinner } from '@components/ui/Spinner'
import { FormSection } from '@components/ui/FormSection'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import { routeLengthLabel } from '@components/features/wineRoute/routeLength'
import { AdminRouteCoverSection, AdminRouteDetailsSection, AdminRouteLogisticsSection } from './AdminRouteFormSections'
import { AdminRouteStopsSection } from './AdminRouteStopsSection'
import { useAdminRouteEditor, type AdminRouteEditorOptions } from './useAdminRouteEditor'

const TITLE_ID = 'admin-route-form-title'

function AdminRouteFormHeader({ title, subtitle, onClose, closeDisabled = false }: {
  title: string
  subtitle: string
  onClose: () => void
  closeDisabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-emerald-700 to-emerald-800 px-6 py-4">
      <div>
        <h2 id={TITLE_ID} className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-emerald-200">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} disabled={closeDisabled} aria-label={t('common.close')} className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50">
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  )
}

/** Dialog shown while the stored route loads, before the form can start from it. */
export function AdminRouteFormLoading({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <AdminFormDialog open onClose={onClose} labelledBy={TITLE_ID} widthClassName="max-w-3xl">
      <AdminRouteFormHeader title={t('admin.routes.editRoute')} subtitle={t('admin.routes.designRoute')} onClose={onClose} />
      <div className="p-12 text-center"><Spinner /></div>
    </AdminFormDialog>
  )
}

/** Route create/edit dialog: collapsible sections on react-hook-form + Zod, guarded close, stops with inline winery creation. */
export function AdminRouteFormDialog(options: AdminRouteEditorOptions) {
  const { t } = useTranslation()
  const editor = useAdminRouteEditor(options)
  const { values, section, errorMessages, busy, isEditing, stopsEditor } = editor
  const close = () => void editor.handleClose()
  const place = [values.region, values.country].filter(Boolean).join(', ')
  const length = editor.minutes || values.estimatedDays ? routeLengthLabel(t, editor.minutes ?? 0, values.estimatedDays) : ''
  const logistics = [length, values.totalDistance != null ? `${values.totalDistance} km` : ''].filter(Boolean).join(' · ')
  const stopCount = stopsEditor.stops.length

  return (
    <AdminFormDialog open onClose={close} labelledBy={TITLE_ID} widthClassName="max-w-3xl">
      <AdminRouteFormHeader
        title={isEditing ? t('admin.routes.editRoute') : t('admin.routes.newRoute')}
        subtitle={values.name || t('admin.routes.designRoute')}
        onClose={close}
        closeDisabled={busy}
      />
      <form id={editor.formId} noValidate onSubmit={editor.submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
        {errorMessages.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            <p className="font-medium">{t('admin.routes.form.fixErrors')}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              {errorMessages.map((message) => <li key={message}>{message}</li>)}
            </ul>
          </div>
        )}
        <fieldset disabled={editor.saving} className="space-y-4 disabled:opacity-60">
          <FormSection {...section('details', [values.name, place].filter(Boolean).join(' · ') || t('admin.routes.form.summaries.details'))}>
            <AdminRouteDetailsSection editor={editor} />
          </FormSection>
          <FormSection {...section('logistics', logistics || t('admin.routes.form.summaries.logistics'))}>
            <AdminRouteLogisticsSection editor={editor} />
          </FormSection>
          <FormSection
            {...section('stops', stopCount > 0 ? t('admin.routes.form.summaries.stops', { count: stopCount }) : t('admin.routes.form.summaries.stopsEmpty'))}
            disabled={stopsEditor.wineryBusy}
          >
            <AdminRouteStopsSection editor={editor} />
          </FormSection>
          <FormSection
            {...section('cover', values.imageUrl ? t('admin.routes.form.summaries.coverChosen') : t('admin.routes.form.summaries.cover'))}
            disabled={editor.imageBusy}
          >
            <AdminRouteCoverSection editor={editor} />
          </FormSection>
        </fieldset>
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
        <div className="text-xs text-gray-400">{editor.routeId && `ID: ${editor.routeId.substring(0, 8)}...`}</div>
        <div className="flex gap-3">
          <button type="button" onClick={close} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50">{t('common.cancel')}</button>
          <button type="button" onClick={() => void editor.submit()} disabled={busy} aria-busy={editor.saving || undefined} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50">
            {editor.saving && <Spinner size="sm" />}
            {editor.saving ? t('admin.routes.form.saving') : isEditing ? t('admin.routes.saveChanges') : t('admin.routes.createRoute')}
          </button>
        </div>
      </div>
    </AdminFormDialog>
  )
}
