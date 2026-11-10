/**
 * useAdminUserMutations — account names, role update, ban, unban, delete user mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { SuspensionReason } from '@domain/admin/suspensionReason'
import type { AdminUserUpdate } from '@domain/admin/adminUserDraft'

/** First and last name of an account, sent together; the users list refreshes after it saves. */
export function useUpdateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, update }: { userId: string; update: AdminUserUpdate }) =>
      adminService.updateUser(userId, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.users.all() })
    },
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.users.all() })
    },
  })
}

export function useBanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reasonCode, note }: { userId: string; reasonCode: SuspensionReason; note?: string }) =>
      adminService.banUser(userId, reasonCode, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.users.all() })
    },
  })
}

export function useUnbanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => adminService.unbanUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.users.all() })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}
