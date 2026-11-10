import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUser } from '@domain/admin/admin.types'
import { useAdminUsersViewModel } from './useAdminUsersViewModel'

const mocks = vi.hoisted(() => ({ toast: vi.fn(), ban: vi.fn(), unban: vi.fn(), remove: vi.fn(), role: vi.fn(), account: vi.fn() }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/admin/useAdminUsers', () => ({ useAdminUsers: () => ({ data: { items: [], totalItems: 0 }, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('@hooks/queries/admin/useAdminUserMutations', () => ({
  useUpdateUserRole: () => ({ mutateAsync: mocks.role, isPending: false }),
  useBanUser: () => ({ mutateAsync: mocks.ban, isPending: false }),
  useUnbanUser: () => ({ mutateAsync: mocks.unban, isPending: false }),
  useDeleteUser: () => ({ mutateAsync: mocks.remove, isPending: false }),
  useUpdateAdminUser: () => ({ mutateAsync: mocks.account, isPending: false }),
}))

const user = { id: 'user-1', username: 'ana' } as AdminUser

describe('admin user ban reason', () => {
  beforeEach(() => vi.clearAllMocks())

  it('preselects spam when the ban dialog opens and bans with only the reason code', async () => {
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.openConfirmAction('ban', user))
    expect(result.current.banReason).toBe('SPAM')
    expect(result.current.showBanNote).toBe(false)
    await act(() => result.current.confirmAndAct())
    expect(mocks.ban).toHaveBeenCalledWith({ userId: 'user-1', reasonCode: 'SPAM', note: undefined })
  })

  it('reveals the detail only for Other and sends it with that reason', async () => {
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.openConfirmAction('ban', user))
    act(() => result.current.setBanReason('OTHER'))
    expect(result.current.showBanNote).toBe(true)
    act(() => result.current.setBanNote('Repeated fake events'))
    await act(() => result.current.confirmAndAct())
    expect(mocks.ban).toHaveBeenCalledWith({ userId: 'user-1', reasonCode: 'OTHER', note: 'Repeated fake events' })
  })

  it('drops a detail typed under Other when a preset reason is chosen afterwards', async () => {
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.openConfirmAction('ban', user))
    act(() => { result.current.setBanReason('OTHER'); result.current.setBanNote('Private detail') })
    act(() => result.current.setBanReason('FRAUD'))
    await act(() => result.current.confirmAndAct())
    expect(mocks.ban).toHaveBeenCalledWith({ userId: 'user-1', reasonCode: 'FRAUD', note: undefined })
  })

  it('resets the reason and detail when the dialog closes', () => {
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.openConfirmAction('ban', user))
    act(() => { result.current.setBanReason('OTHER'); result.current.setBanNote('Draft') })
    act(() => result.current.clearConfirmAction())
    act(() => result.current.openConfirmAction('ban', user))
    expect(result.current.banReason).toBe('SPAM')
    expect(result.current.banNote).toBe('')
  })

  it('keeps unban and delete unchanged', async () => {
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.openConfirmAction('unban', user))
    await act(() => result.current.confirmAndAct())
    expect(mocks.unban).toHaveBeenCalledWith('user-1')
    act(() => result.current.openConfirmAction('delete', user))
    await act(() => result.current.confirmAndAct())
    expect(mocks.remove).toHaveBeenCalledWith('user-1')
    expect(mocks.ban).not.toHaveBeenCalled()
  })
})

describe('admin user role change', () => {
  beforeEach(() => vi.clearAllMocks())
  const member = { id: 'user-1', username: 'ana', roles: ['ROLE_USER'] } as AdminUser

  it('asks for confirmation before changing a role instead of saving on select', () => {
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.handleRoleChange(member, 'ROLE_MODERATOR'))
    expect(mocks.role).not.toHaveBeenCalled()
    expect(result.current.confirmAction).toEqual({ type: 'role', user: member, role: 'ROLE_MODERATOR' })
  })

  it('ignores picking the role the person already has', () => {
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.handleRoleChange(member, 'ROLE_USER'))
    expect(result.current.confirmAction).toBeNull()
  })

  it('keeps the previous role payload once confirmed and closes the dialog', async () => {
    mocks.role.mockResolvedValue(undefined)
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.handleRoleChange(member, 'ROLE_MODERATOR'))
    await act(() => result.current.confirmAndAct())
    expect(mocks.role).toHaveBeenCalledWith({ userId: 'user-1', role: 'ROLE_MODERATOR' })
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.users.toastRoleUpdated' })
    expect(result.current.confirmAction).toBeNull()
  })

  it('keeps the dialog open and explains the failure when the role cannot change', async () => {
    mocks.role.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.handleRoleChange(member, 'ROLE_ADMIN'))
    await act(() => result.current.confirmAndAct())
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'admin.users.toastRoleUpdateError' })
    expect(result.current.confirmAction).toEqual({ type: 'role', user: member, role: 'ROLE_ADMIN' })
  })
})

describe('admin user account names', () => {
  beforeEach(() => vi.clearAllMocks())
  const member = { id: 'user-1', username: 'ana', firstName: 'Ana', lastName: 'Pérez' } as AdminUser
  const names = { firstName: 'Ana María', lastName: 'Pérez' }

  it('opens the account dialog for one user and closes it without saving', () => {
    const { result } = renderHook(useAdminUsersViewModel)
    expect(result.current.accountUser).toBeNull()
    act(() => result.current.openAccountEdit(member))
    expect(result.current.accountUser).toBe(member)
    expect(result.current.accountError).toBeNull()
    act(() => result.current.closeAccountEdit())
    expect(result.current.accountUser).toBeNull()
    expect(mocks.account).not.toHaveBeenCalled()
  })

  it('sends both names, confirms with a toast and closes the dialog', async () => {
    mocks.account.mockResolvedValue(undefined)
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.openAccountEdit(member))
    await act(() => result.current.saveAccount(names))
    expect(mocks.account).toHaveBeenCalledWith({ userId: 'user-1', update: names })
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.users.accountUpdated' })
    expect(result.current.accountUser).toBeNull()
  })

  it('never sends an empty update or a save without an open account', async () => {
    const { result } = renderHook(useAdminUsersViewModel)
    await act(() => result.current.saveAccount(names))
    act(() => result.current.openAccountEdit(member))
    await act(() => result.current.saveAccount({}))
    expect(mocks.account).not.toHaveBeenCalled()
    expect(result.current.accountUser).toBe(member)
  })

  it('keeps the dialog open with the error when saving fails, and clears it on retry', async () => {
    mocks.account.mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(useAdminUsersViewModel)
    act(() => result.current.openAccountEdit(member))
    await act(() => result.current.saveAccount(names))
    expect(result.current.accountUser).toBe(member)
    expect(result.current.accountError).toBe('admin.users.accountError')
    expect(mocks.toast).not.toHaveBeenCalled()
    mocks.account.mockResolvedValueOnce(undefined)
    await act(() => result.current.saveAccount(names))
    expect(result.current.accountError).toBeNull()
    expect(result.current.accountUser).toBeNull()
  })
})
