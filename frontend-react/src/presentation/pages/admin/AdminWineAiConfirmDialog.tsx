import { useId } from 'react'
import type { TFunction } from 'i18next'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'

export function AdminWineAiConfirmDialog({
  t,
  open,
  onCancel,
  onConfirm,
}: {
  t: TFunction
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()

  return (
    <AdminFormDialog open={open} onClose={onCancel} labelledBy={titleId} panelClassName="space-y-4 p-6">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h3 id={titleId} className="text-center font-semibold text-gray-900">{t('admin.wines.generateAiTitle')}</h3>
      <p className="text-center text-sm text-gray-500">{t('admin.wines.generateAiMessage')}</p>
      <div className="flex justify-center gap-3 pt-2">
        <button onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">{t('common.cancel')}</button>
        <button onClick={onConfirm} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700">
          {t('admin.aiProfile.generate')}
        </button>
      </div>
    </AdminFormDialog>
  )
}
