import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AdminDashboardPage } from './AdminDashboardPage'

const auth = vi.hoisted(() => ({ admin: true }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' } }) }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: { name: 'QA' }, hasRole: (role: string) => role !== 'ROLE_ADMIN' || auth.admin }) }))
vi.mock('@hooks/queries/admin', () => ({ useAdminStats: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('@components/features/community/CommunityOverview', () => ({ ModerationShortcuts: () => <p>moderation-workload-panel</p> }))

beforeEach(() => { auth.admin = true })

it.each([true, false])('opens the moderation workload from a quick action, not at the top (admin: %s)', (admin) => {
  auth.admin = admin
  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>)
  expect(screen.queryByText('moderation-workload-panel')).toBeNull()
  const link = screen.getByRole('link', { name: /admin\.dashboard\.quickActions\.moderation\.title/ })
  expect(link).toHaveAttribute('href', '/admin/community')
  expect(link).toHaveTextContent('admin.dashboard.quickActions.moderation.desc')
})
