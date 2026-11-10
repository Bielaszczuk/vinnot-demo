import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminSearchBar } from '@components/features/admin/AdminSearchBar'
import type { TFunction } from 'i18next'

export function AdminWinesPageControls({
  t,
  search,
  setSearch,
  handleSearch,
  openCreate,
}: {
  t: TFunction
  search: string
  setSearch: (value: string) => void
  handleSearch: () => void
  openCreate: () => void
}) {
  return (
    <>
      <AdminBackLink />

      <AdminPageHeader
        title={t('admin.wines.title')}
        subtitle={t('admin.wines.subtitle')}
        actions={
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 hover:shadow-lg">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('admin.wines.new')}
          </button>
        }
      />

      <AdminSearchBar
        value={search}
        onChange={setSearch}
        onSearch={handleSearch}
        placeholder={t('admin.wines.searchPlaceholder')}
      />
    </>
  )
}
