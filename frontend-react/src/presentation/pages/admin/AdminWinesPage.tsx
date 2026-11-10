/**
 * AdminWinesPage — full CRUD for wines.
 *
 * Architecture: page → view-model → hooks → service → client → http.
 * The editor is a dialog of collapsible sections (react-hook-form + Zod) with
 * an inline winery creator, a grape multi-select and an upload-on-pick photo.
 */

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { ROLES } from '@config/roles'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { AdminDeleteConfirm } from '@components/features/admin/AdminDeleteConfirm'
import { useAdminWinesViewModel } from './useAdminWinesViewModel'
import { AdminWineAiConfirmDialog } from './AdminWineAiConfirmDialog'
import { AdminWineFormDialog } from './AdminWineFormChrome'
import { AdminWinesPageControls } from './AdminWinesPageControls'
import { AdminWinesTable } from './AdminWinesTable'

export function AdminWinesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const isAdmin = hasRole(ROLES.ADMIN)

  const {
    wineTypeOptions,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
    isError,
    refetch,
    wines,
    totalItems,
    totalPages,
    editingWine,
    loadingDetails,
    closeEditor,
    confirmDeleteId,
    setConfirmDeleteId,
    confirmAiWineId,
    setConfirmAiWineId,
    wineryPicker,
    saving,
    handleSearch,
    openCreate,
    openEdit,
    onAiProfileAction,
    confirmGenerateAiProfile,
    openFullAiProfile,
    saveWine,
    handleDelete,
  } = useAdminWinesViewModel({ navigate })

  return (
    <div className="space-y-6">
      <AdminWinesPageControls
        t={t}
        search={search}
        setSearch={setSearch}
        handleSearch={handleSearch}
        openCreate={openCreate}
      />

      {isError && <AdminQueryError retry={refetch} />}
      <AdminWinesTable
        t={t}
        isAdmin={isAdmin}
        isLoading={isLoading}
        wines={wines}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        setPage={setPage}
        openEdit={openEdit}
        onAiProfileAction={onAiProfileAction}
        setConfirmDeleteId={setConfirmDeleteId}
      />

      {editingWine && (
        <AdminWineFormDialog
          wine={editingWine}
          loading={loadingDetails}
          saving={saving}
          wineTypeOptions={wineTypeOptions}
          winery={wineryPicker}
          onSave={saveWine}
          onClose={closeEditor}
          onOpenAiProfile={openFullAiProfile}
        />
      )}

      <AdminDeleteConfirm open={!!confirmDeleteId} title={t('admin.wines.deleteTitle')} message={t('admin.wines.deleteMessage')} onCancel={() => setConfirmDeleteId(null)} onConfirm={handleDelete} />

      <AdminWineAiConfirmDialog
        t={t}
        open={!!confirmAiWineId}
        onCancel={() => setConfirmAiWineId(null)}
        onConfirm={confirmGenerateAiProfile}
      />
    </div>
  )
}

export default AdminWinesPage
