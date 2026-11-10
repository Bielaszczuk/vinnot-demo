import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useAdminUsers } from '@hooks/queries/admin/useAdminUsers'
import { useUpdateUserRole, useBanUser, useUnbanUser, useDeleteUser, useUpdateAdminUser } from '@hooks/queries/admin/useAdminUserMutations'
import type { AdminUser } from '@domain/admin/admin.types'
import { DEFAULT_SUSPENSION_REASON, allowsSuspensionNote, type SuspensionReason } from '@domain/admin/suspensionReason'
import { isAdminUserUpdateEmpty, type AdminUserUpdate } from '@domain/admin/adminUserDraft'

const PAGE_SIZE = 20

type ConfirmActionType = 'ban' | 'unban' | 'delete'
type ConfirmAction =
  | { type: ConfirmActionType; user: AdminUser }
  | { type: 'role'; user: AdminUser; role: string }

const ROLE_PRIORITY = ['ROLE_ADMIN', 'ROLE_PARTNER', 'ROLE_MODERATOR', 'ROLE_USER']

export function useAdminUsersViewModel() {
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [banReason, setBanReason] = useState<SuspensionReason>(DEFAULT_SUSPENSION_REASON)
  const [banNote, setBanNote] = useState('')
  const [accountUser, setAccountUser] = useState<AdminUser | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const showBanNote = allowsSuspensionNote(banReason)

  const { data, isLoading, isError, refetch } = useAdminUsers(page, PAGE_SIZE, activeSearch || undefined)
  const updateRoleMutation = useUpdateUserRole()
  const banMutation = useBanUser()
  const unbanMutation = useUnbanUser()
  const deleteMutation = useDeleteUser()
  const accountMutation = useUpdateAdminUser()
  const accountSaving = accountMutation.isPending

  const users = data?.items ?? []
  const totalItems = data?.totalItems ?? 0
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)
  const working = updateRoleMutation.isPending || banMutation.isPending || unbanMutation.isPending || deleteMutation.isPending || accountSaving

  const handleSearch = useCallback(() => {
    setPage(0)
    setActiveSearch(search)
  }, [search])

  const resolveUserRole = useCallback((user: AdminUser): string => {
    const roleSet = new Set(user.roles)
    return ROLE_PRIORITY.find((role) => roleSet.has(role)) ?? 'ROLE_USER'
  }, [])

  /** Picking a role opens an in-page confirmation; nothing is saved until it is confirmed. */
  const handleRoleChange = useCallback((user: AdminUser, role: string) => {
    if (role === resolveUserRole(user)) return
    setConfirmAction({ type: 'role', user, role })
  }, [resolveUserRole])

  const resetBanReason = useCallback(() => {
    setBanReason(DEFAULT_SUSPENSION_REASON)
    setBanNote('')
  }, [])

  const openConfirmAction = useCallback((type: ConfirmActionType, user: AdminUser) => {
    resetBanReason()
    setConfirmAction({ type, user })
  }, [resetBanReason])

  const clearConfirmAction = useCallback(() => {
    setConfirmAction(null)
    resetBanReason()
  }, [resetBanReason])

  const confirmAndAct = useCallback(async () => {
    if (!confirmAction) return
    const { type, user } = confirmAction
    if (confirmAction.type === 'role') {
      try {
        await updateRoleMutation.mutateAsync({ userId: user.id, role: confirmAction.role })
        addToast({ type: 'success', message: t('admin.users.toastRoleUpdated', { username: user.username }) })
        clearConfirmAction()
      } catch {
        addToast({ type: 'error', message: t('admin.users.toastRoleUpdateError') })
      }
      return
    }
    try {
      if (type === 'ban') {
        await banMutation.mutateAsync({ userId: user.id, reasonCode: banReason, note: showBanNote ? banNote : undefined })
      } else if (type === 'unban') {
        await unbanMutation.mutateAsync(user.id)
      } else {
        await deleteMutation.mutateAsync(user.id)
      }
      addToast({ type: 'success', message: t('admin.users.toastActionCompleted', { username: user.username }) })
      clearConfirmAction()
    } catch {
      addToast({ type: 'error', message: t('admin.users.toastActionError') })
    }
  }, [addToast, banMutation, banNote, banReason, clearConfirmAction, confirmAction, deleteMutation, showBanNote, t, unbanMutation, updateRoleMutation])

  const openAccountEdit = useCallback((user: AdminUser) => {
    setAccountError(null)
    setAccountUser(user)
  }, [])

  const closeAccountEdit = useCallback(() => {
    setAccountUser(null)
    setAccountError(null)
  }, [])

  /** Saves the names; on failure the dialog stays open with the error so nothing typed is lost. */
  const saveAccount = useCallback(async (update: AdminUserUpdate) => {
    if (!accountUser || isAdminUserUpdateEmpty(update)) return
    setAccountError(null)
    try {
      await accountMutation.mutateAsync({ userId: accountUser.id, update })
      addToast({ type: 'success', message: t('admin.users.accountUpdated') })
      closeAccountEdit()
    } catch {
      setAccountError(t('admin.users.accountError'))
    }
  }, [accountMutation, accountUser, addToast, closeAccountEdit, t])

  return {
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
  }
}
