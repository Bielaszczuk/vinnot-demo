import { useTranslation } from 'react-i18next'

export function AdminQueryError({ retry }: { retry: () => unknown }) {
  const { t } = useTranslation()
  return <div role="alert" className="space-y-3 p-6 text-center">
    <p>{t('admin.feedback.loadError')}</p>
    <button type="button" className="rounded-lg border px-4 py-2" onClick={() => void retry()}>{t('common.retry')}</button>
  </div>
}
