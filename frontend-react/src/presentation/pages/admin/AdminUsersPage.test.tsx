import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminUsersPage } from './AdminUsersPage'

const viewModel = vi.hoisted(() => vi.fn())
vi.mock('./useAdminUsersViewModel', () => ({ useAdminUsersViewModel: viewModel }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR' } }) }))
afterEach(cleanup)

const user = { id: 'user-1', username: 'ana', email: 'ana@example.com', roles: ['ROLE_USER'], enabled: true, locked: false }
const actions = { setBanReason: vi.fn(), setBanNote: vi.fn(), confirmAndAct: vi.fn(), clearConfirmAction: vi.fn() }

function renderPage(overrides: Record<string, unknown>) {
  viewModel.mockReturnValue({
    t: (key: string) => key, page: 0, setPage: vi.fn(), search: '', setSearch: vi.fn(),
    isLoading: false, isError: false, refetch: vi.fn(), users: [], totalItems: 0, totalPages: 0,
    banReason: 'SPAM', banNote: '', showBanNote: false, working: false,
    handleSearch: vi.fn(), resolveUserRole: () => 'ROLE_USER', handleRoleChange: vi.fn(), openConfirmAction: vi.fn(),
    ...actions, ...overrides,
  })
  render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)
  return screen.getByRole('dialog')
}

describe('admin user ban reason', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers one-tap reasons with spam preselected and explains what the person is told', () => {
    const dialog = renderPage({ confirmAction: { type: 'ban', user } })
    const group = within(dialog).getByRole('group', { name: 'admin.users.suspensionReasonLabel' })
    const options = within(group).getAllByRole('radio')
    expect(options.map(option => option.getAttribute('value'))).toEqual(['SPAM', 'HARASSMENT', 'FRAUD', 'IMPERSONATION', 'TERMS_VIOLATION', 'OTHER'])
    expect(within(group).getByRole('radio', { name: 'admin.users.suspensionReasons.SPAM' })).toBeChecked()
    expect(within(dialog).getByText('admin.users.suspensionReasonHelp')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('admin.users.suspensionNote')).not.toBeInTheDocument()
    fireEvent.click(within(group).getByRole('radio', { name: 'admin.users.suspensionReasons.OTHER' }))
    expect(actions.setBanReason).toHaveBeenCalledWith('OTHER')
  })

  it('shows the optional detail only for Other and confirms the ban', () => {
    const dialog = renderPage({ confirmAction: { type: 'ban', user }, banReason: 'OTHER', showBanNote: true })
    const note = within(dialog).getByLabelText('admin.users.suspensionNote')
    expect(note).toHaveAttribute('maxLength', '255')
    fireEvent.change(note, { target: { value: 'Repeated fake events' } })
    expect(actions.setBanNote).toHaveBeenCalledWith('Repeated fake events')
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.users.ban' }))
    expect(actions.confirmAndAct).toHaveBeenCalled()
  })

  it.each(['unban', 'delete'])('tells the admin the person is notified by email when confirming %s', (type) => {
    const dialog = renderPage({ confirmAction: { type, user } })
    expect(within(dialog).getByText('admin.users.notifiedByEmail')).toBeInTheDocument()
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
  })
})

describe('admin users table on phones', () => {
  it('scrolls sideways so the actions column stays reachable', () => {
    viewModel.mockReturnValue({
      t: (key: string) => key, page: 0, setPage: vi.fn(), search: '', setSearch: vi.fn(),
      isLoading: false, isError: false, refetch: vi.fn(), users: [user], totalItems: 1, totalPages: 1,
      banReason: 'SPAM', banNote: '', showBanNote: false, working: false, confirmAction: null,
      handleSearch: vi.fn(), resolveUserRole: () => 'ROLE_USER', handleRoleChange: vi.fn(), openConfirmAction: vi.fn(),
      ...actions,
    })
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)
    const region = screen.getByRole('region', { name: 'admin.common.tableScroll' })
    expect(region).toHaveClass('overflow-x-auto')
    expect(region).toHaveAttribute('tabindex', '0')
    expect(within(region).getByRole('table')).toHaveClass('min-w-[720px]')
  })
})

describe('admin user seals and points', () => {
  it('shows each user seal after the username and their points, without a seal when hidden', () => {
    viewModel.mockReturnValue({
      t: (key: string) => key, page: 0, setPage: vi.fn(), search: '', setSearch: vi.fn(),
      isLoading: false, isError: false, refetch: vi.fn(), totalItems: 2, totalPages: 1,
      users: [
        { ...user, points: 1372, badgeTier: 'RESERVA', lastLoginAt: null },
        { ...user, id: 'user-2', username: 'bob', points: 3, badgeTier: null, locked: true, lastLoginAt: null },
      ],
      banReason: 'SPAM', banNote: '', showBanNote: false, working: false, confirmAction: null,
      handleSearch: vi.fn(), resolveUserRole: () => 'ROLE_USER', handleRoleChange: vi.fn(), openConfirmAction: vi.fn(),
      ...actions,
    })
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)
    expect(screen.getByRole('columnheader', { name: 'admin.users.points' })).toBeInTheDocument()
    const seal = screen.getByRole('img', { name: 'points.emblemLabel' })
    expect(seal).toHaveAttribute('data-tier', 'RESERVA')
    expect(screen.getByText('ana')).toContainElement(seal)
    expect(screen.getByText('bob').querySelector('.vinnot-seal')).toBeNull()
    expect(screen.getByText(/^1\.?372$/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})

describe('admin user role change', () => {
  beforeEach(() => vi.clearAllMocks())
  const roleOptions = [
    { value: 'ROLE_USER', label: 'admin.users.roles.user' },
    { value: 'ROLE_MODERATOR', label: 'admin.users.roles.moderator' },
    { value: 'ROLE_PARTNER', label: 'admin.users.roles.partner' },
    { value: 'ROLE_ADMIN', label: 'admin.users.roles.admin' },
  ]
  function renderTable(overrides: Record<string, unknown> = {}) {
    viewModel.mockReturnValue({
      t: (key: string) => key, page: 0, setPage: vi.fn(), search: '', setSearch: vi.fn(),
      isLoading: false, isError: false, refetch: vi.fn(), users: [user], totalItems: 1, totalPages: 1,
      banReason: 'SPAM', banNote: '', showBanNote: false, working: false, confirmAction: null,
      handleSearch: vi.fn(), resolveUserRole: () => 'ROLE_USER', handleRoleChange: vi.fn(), openConfirmAction: vi.fn(),
      ...actions, ...overrides,
    })
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)
  }

  it('labels the role control per user and names every role through translations', () => {
    const handleRoleChange = vi.fn()
    renderTable({ handleRoleChange })
    const select = screen.getByRole('combobox', { name: 'admin.users.roleFor' })
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(roleOptions.map((option) => option.label))
    fireEvent.change(select, { target: { value: 'ROLE_ADMIN' } })
    expect(handleRoleChange).toHaveBeenCalledWith(user, 'ROLE_ADMIN')
  })

  it('confirms the change inside the page before saving it', () => {
    renderTable({ confirmAction: { type: 'role', user, role: 'ROLE_MODERATOR' } })
    const dialog = screen.getByRole('dialog', { name: 'admin.users.confirmRoleTitle' })
    expect(within(dialog).getByText('admin.users.confirmRoleMessage')).toBeInTheDocument()
    expect(within(dialog).getByText('admin.users.confirmRoleHint')).toBeInTheDocument()
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.users.changeRole' }))
    expect(actions.confirmAndAct).toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }))
    expect(actions.clearConfirmAction).toHaveBeenCalled()
  })

  it('shows the change in progress and locks the role controls while it saves', () => {
    renderTable({ confirmAction: { type: 'role', user, role: 'ROLE_MODERATOR' }, working: true })
    const dialog = screen.getByRole('dialog', { name: 'admin.users.confirmRoleTitle' })
    expect(within(dialog).getByRole('button', { name: /admin\.users\.roleChanging/ })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'common.cancel' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'admin.users.roleFor', hidden: true })).toBeDisabled()
  })
})

describe('admin user account names', () => {
  beforeEach(() => vi.clearAllMocks())
  const member = { ...user, firstName: 'Ana', lastName: 'Pérez' }
  function renderAccount(overrides: Record<string, unknown> = {}) {
    viewModel.mockReturnValue({
      t: (key: string) => key, page: 0, setPage: vi.fn(), search: '', setSearch: vi.fn(),
      isLoading: false, isError: false, refetch: vi.fn(), users: [member], totalItems: 1, totalPages: 1,
      banReason: 'SPAM', banNote: '', showBanNote: false, working: false, confirmAction: null,
      handleSearch: vi.fn(), resolveUserRole: () => 'ROLE_USER', handleRoleChange: vi.fn(), openConfirmAction: vi.fn(),
      accountUser: null, accountSaving: false, accountError: null,
      openAccountEdit: vi.fn(), closeAccountEdit: vi.fn(), saveAccount: vi.fn(),
      ...actions, ...overrides,
    })
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)
  }

  it('offers an edit action per row that opens the account dialog for that user', () => {
    const openAccountEdit = vi.fn()
    renderAccount({ openAccountEdit })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.users.editAccount' }))
    expect(openAccountEdit).toHaveBeenCalledWith(member)
  })

  it('saves both names from the dialog and closes it from Cancel', () => {
    const saveAccount = vi.fn()
    const closeAccountEdit = vi.fn()
    renderAccount({ accountUser: member, saveAccount, closeAccountEdit })
    const dialog = screen.getByRole('dialog', { name: 'admin.users.account' })
    fireEvent.change(within(dialog).getByLabelText('admin.users.lastName'), { target: { value: 'Gómez' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.users.saveAccount' }))
    expect(saveAccount).toHaveBeenCalledWith({ firstName: 'Ana', lastName: 'Gómez' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }))
    expect(closeAccountEdit).toHaveBeenCalled()
  })

  it('keeps the dialog open with the error and locks it while saving', () => {
    renderAccount({ accountUser: member, accountSaving: true, accountError: 'admin.users.accountError' })
    const dialog = screen.getByRole('dialog', { name: 'admin.users.account' })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('admin.users.accountError')
    expect(within(dialog).getByRole('button', { name: /admin\.users\.saveAccount/ })).toBeDisabled()
  })
})
