import { AdminTableScroll } from '@components/features/admin/AdminTableScroll'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
/**
 * AdminUsersPage — User management: list, search, account names, role update, ban/unban, delete
 *
 * Migrated from Vue: frontend/src/pages/admin/AdminUsersPage.vue
 * Architecture: page → hooks → service → client → http
 */

import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminSearchBar } from '@components/features/admin/AdminSearchBar'
import { AdminPagination } from '@components/features/admin/AdminPagination'
import { Spinner } from '@components/ui/Spinner'
import { UserBadge } from '@components/features/points/UserBadge'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import { AdminUserAccountDialog } from '@components/features/admin/users/AdminUserAccountDialog'
import { AdminUserAvatar } from '@components/features/admin/users/AdminUserAvatar'
import {
  MAX_SUSPENSION_NOTE_LENGTH,
  SUSPENSION_REASONS,
  type SuspensionReason,
} from '@domain/admin/suspensionReason'
import { useAdminUsersViewModel } from './useAdminUsersViewModel'

/** Assignable roles, in the order the selector lists them. */
const ROLES = [
  { value: 'ROLE_USER', labelKey: 'admin.users.roles.user' },
  { value: 'ROLE_MODERATOR', labelKey: 'admin.users.roles.moderator' },
  { value: 'ROLE_PARTNER', labelKey: 'admin.users.roles.partner' },
  { value: 'ROLE_ADMIN', labelKey: 'admin.users.roles.admin' },
] as const

/** One-tap ban reasons; a reason is always preselected so banning never asks to type. */
function SuspensionReasonChips({
  value,
  disabled,
  onChange,
}: {
  value: SuspensionReason
  disabled: boolean
  onChange: (reason: SuspensionReason) => void
}) {
  const { t } = useTranslation()
  const name = useId()
  const helpId = useId()
  return (
    <fieldset className="space-y-2" aria-describedby={helpId}>
      <legend className="text-xs font-medium text-gray-700">{t('admin.users.suspensionReasonLabel')}</legend>
      <div className="flex flex-wrap gap-2">
        {SUSPENSION_REASONS.map((code) => (
          <label key={code} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={code}
              checked={value === code}
              disabled={disabled}
              onChange={() => onChange(code)}
              className="peer sr-only"
            />
            <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-orange-400 peer-checked:border-orange-600 peer-checked:bg-orange-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/40 peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
              {t(`admin.users.suspensionReasons.${code}`)}
            </span>
          </label>
        ))}
      </div>
      <p id={helpId} className="text-xs text-gray-500">{t('admin.users.suspensionReasonHelp')}</p>
    </fieldset>
  )
}

export function AdminUsersPage() {
  const { i18n } = useTranslation()
  const {
    t,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
    isError,
    refetch,
    users,
    totalItems,
    totalPages,
    confirmAction,
    banReason,
    setBanReason,
    banNote,
    setBanNote,
    showBanNote,
    working,
    handleSearch,
    resolveUserRole,
    handleRoleChange,
    openConfirmAction,
    clearConfirmAction,
    confirmAndAct,
    accountUser,
    accountSaving,
    accountError,
    openAccountEdit,
    closeAccountEdit,
    saveAccount,
  } = useAdminUsersViewModel()
  const banNoteId = useId()
  const roleLabel = (role: string) => t(ROLES.find((option) => option.value === role)?.labelKey ?? 'admin.users.roles.user')

  return (
    <div className="space-y-6">
      <AdminBackLink />
      <AdminPageHeader title={t('admin.users.title')} subtitle={t('admin.users.subtitle')} />
      <AdminSearchBar value={search} onChange={setSearch} onSearch={handleSearch} placeholder={t('admin.users.searchPlaceholder')} />

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        {isError ? <AdminQueryError retry={refetch} /> : isLoading ? <div className="p-12 text-center"><Spinner /></div> : users.length === 0 ? <div className="p-12 text-center"><p className="text-sm text-gray-500">{t('admin.users.noUsers')}</p></div> : (
          <AdminTableScroll><table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.users.username')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.users.email')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.users.role')}</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">{t('admin.users.points')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.users.status')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.users.lastAccess')}</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">{t('admin.common.actions')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AdminUserAvatar userId={u.id} username={u.username} avatarUrl={u.avatarUrl} />
                      <div><div className="inline-flex items-center gap-1.5 font-medium text-gray-900">{u.username}<UserBadge tier={u.badgeTier} size={18} /></div>{u.name && <div className="text-xs text-gray-500">{u.name}</div>}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      aria-label={t('admin.users.roleFor', { username: u.username })}
                      value={resolveUserRole(u)}
                      disabled={working}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-slate-500/20 disabled:opacity-60"
                    >
                      {ROLES.map((role) => <option key={role.value} value={role.value}>{t(role.labelKey)}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs font-medium tabular-nums text-gray-700">{new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language).format(u.points ?? 0)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${u.locked ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20' : u.enabled ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-gray-100 text-gray-600 ring-1 ring-gray-300/40'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.locked ? 'bg-red-500' : u.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {u.locked ? t('admin.users.statusLabels.locked') : u.enabled ? t('admin.users.statusLabels.active') : t('admin.users.statusLabels.disabled')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString(i18n.resolvedLanguage ?? i18n.language, { day: 'numeric', month: 'short' }) : t('admin.users.never')}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => openAccountEdit(u)} disabled={working} className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-60" title={t('admin.users.editAccount', { username: u.username })} aria-label={t('admin.users.editAccount', { username: u.username })}>
                        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {!u.locked ? (
                        <button onClick={() => openConfirmAction('ban', u)} className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" title={t('admin.users.ban')} aria-label={t('admin.users.ban')}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </button>
                      ) : (
                        <button onClick={() => openConfirmAction('unban', u)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title={t('admin.users.unban')} aria-label={t('admin.users.unban')}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      )}
                      <button onClick={() => openConfirmAction('delete', u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={t('common.delete')} aria-label={t('common.delete')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></AdminTableScroll>
        )}
        <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} label={t('admin.users.labelPlural')} />
      </div>

      {accountUser && (
        <AdminUserAccountDialog
          key={accountUser.id}
          user={accountUser}
          saving={accountSaving}
          error={accountError}
          onSave={saveAccount}
          onClose={closeAccountEdit}
        />
      )}

      {/* Confirm Action Modal */}
      {confirmAction?.type === 'role' ? (
        <AdminFormDialog open onClose={() => { if (!working) clearConfirmAction() }} labelledBy="admin-user-action-title" panelClassName="space-y-4 p-6">
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-slate-100">
            <svg aria-hidden="true" className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>
          </div>
          <h3 id="admin-user-action-title" className="font-semibold text-gray-900 text-center">{t('admin.users.confirmRoleTitle')}</h3>
          <p className="text-sm text-gray-600 text-center">
            {t('admin.users.confirmRoleMessage', { username: confirmAction.user.username, from: roleLabel(resolveUserRole(confirmAction.user)), to: roleLabel(confirmAction.role) })}
          </p>
          <p className="text-xs text-gray-500 text-center">{t('admin.users.confirmRoleHint')}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button type="button" onClick={clearConfirmAction} disabled={working} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50">{t('common.cancel')}</button>
            <button type="button" onClick={confirmAndAct} disabled={working} className="px-4 py-2 text-sm font-medium text-white rounded-xl flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60">
              {working && <Spinner size="sm" />}
              {working ? t('admin.users.roleChanging') : t('admin.users.changeRole')}
            </button>
          </div>
        </AdminFormDialog>
      ) : confirmAction && (
        <AdminFormDialog open onClose={clearConfirmAction} labelledBy="admin-user-action-title" panelClassName="space-y-4 p-6">
          <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${confirmAction.type === 'delete' ? 'bg-red-50' : confirmAction.type === 'ban' ? 'bg-orange-50' : 'bg-emerald-50'}`}>
            {confirmAction.type === 'delete' ? <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              : confirmAction.type === 'ban' ? <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              : <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          </div>
          <h3 id="admin-user-action-title" className="font-semibold text-gray-900 text-center">{confirmAction.type === 'ban' ? t('admin.users.confirmBanTitle') : confirmAction.type === 'unban' ? t('admin.users.confirmUnbanTitle') : t('admin.users.confirmDeleteTitle')}</h3>
          <p className="text-sm text-gray-500 text-center">{t('admin.users.confirmActionMessage', { username: confirmAction.user.username })}</p>
          {confirmAction.type === 'ban' ? (
            <div className="space-y-3">
              <SuspensionReasonChips value={banReason} disabled={working} onChange={setBanReason} />
              {showBanNote && (
                <div>
                  <label htmlFor={banNoteId} className="text-xs font-medium text-gray-700 block mb-1.5">{t('admin.users.suspensionNote')}</label>
                  <textarea
                    id={banNoteId}
                    value={banNote}
                    rows={3}
                    maxLength={MAX_SUSPENSION_NOTE_LENGTH}
                    disabled={working}
                    onChange={(e) => setBanNote(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
                  />
                  <p className="text-right text-xs text-gray-500" aria-live="polite">{banNote.length}/{MAX_SUSPENSION_NOTE_LENGTH}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center">{t('admin.users.notifiedByEmail')}</p>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={clearConfirmAction} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">{t('common.cancel')}</button>
            <button onClick={confirmAndAct} disabled={working} className={`px-4 py-2 text-sm font-medium text-white rounded-xl flex items-center gap-2 ${confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : confirmAction.type === 'ban' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {working && <Spinner size="sm" />}
              {confirmAction.type === 'ban' ? t('admin.users.ban') : confirmAction.type === 'unban' ? t('admin.users.unban') : t('common.delete')}
            </button>
          </div>
        </AdminFormDialog>
      )}
    </div>
  )
}

export default AdminUsersPage
