import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppVersionSettings } from '@domain/admin/appVersion'
import { AdminAppVersionsPage } from './AdminAppVersionsPage'

const viewModel = vi.hoisted(() => vi.fn())
vi.mock('./useAdminAppVersionsViewModel', () => ({ useAdminAppVersionsViewModel: viewModel }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' } }),
}))
afterEach(cleanup)

const settings: AppVersionSettings = {
  platforms: [
    { platform: 'IOS', minimumVersion: '0.3.0', updatedAt: '2026-10-25T12:00:00Z', updatedBy: 'admin@vinnot.test' },
    { platform: 'ANDROID', minimumVersion: null, updatedAt: null, updatedBy: null },
  ],
  recentChanges: [
    { platform: 'IOS', previousMinimumVersion: null, minimumVersion: '0.3.0', changedBy: 'admin@vinnot.test', changedAt: '2026-10-25T12:00:00Z' },
    { platform: 'IOS', previousMinimumVersion: '0.3.0', minimumVersion: null, changedBy: 'admin@vinnot.test', changedAt: '2026-10-26T12:00:00Z' },
  ],
}

function state(overrides: Record<string, unknown> = {}) {
  return {
    t: (key: string) => key,
    settings: { data: settings, isError: false, refetch: vi.fn() },
    draftOf: (platform: string) => (platform === 'IOS' ? '0.3.0' : ''),
    edit: vi.fn(),
    invalid: () => false,
    changed: () => true,
    save: vi.fn(),
    clear: vi.fn(),
    saving: null,
    platformLabel: (platform: string) => platform,
    formatDate: (value: string) => value,
    pendingRaise: null,
    cancelRaise: vi.fn(),
    confirmRaise: vi.fn(),
    ...overrides,
  }
}

function renderPage(overrides: Record<string, unknown> = {}) {
  const vm = state(overrides)
  viewModel.mockReturnValue(vm)
  render(<MemoryRouter><AdminAppVersionsPage /></MemoryRouter>)
  return vm
}

describe('admin app versions page', () => {
  it('warns before anything else and shows each platform with its last change', () => {
    renderPage()
    expect(screen.getByRole('note')).toHaveTextContent('admin.appVersions.warning')
    expect(screen.getByRole('heading', { name: 'IOS' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ANDROID' })).toBeInTheDocument()
    expect(screen.getByText('admin.appVersions.updated')).toBeInTheDocument()
    expect(screen.getByText('admin.appVersions.neverChanged')).toBeInTheDocument()
    expect(screen.getAllByText('admin.appVersions.change')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'admin.appVersions.clear' })[1]).toBeDisabled()
  })

  it('edits, saves and clears a platform', () => {
    const vm = renderPage()
    const field = screen.getAllByLabelText('admin.appVersions.fieldLabel')[0]!
    fireEvent.change(field, { target: { value: '0.4.0' } })
    expect(vm.edit).toHaveBeenCalledWith('IOS', '0.4.0')

    fireEvent.click(screen.getAllByRole('button', { name: 'admin.appVersions.save' })[0]!)
    expect(vm.save).toHaveBeenCalledWith('IOS')
    fireEvent.click(screen.getAllByRole('button', { name: 'admin.appVersions.clear' })[0]!)
    expect(vm.clear).toHaveBeenCalledWith('IOS')
  })

  it('shows the format error of an invalid field', () => {
    renderPage({ invalid: (platform: string) => platform === 'ANDROID' })
    expect(screen.getByRole('alert')).toHaveTextContent('admin.appVersions.invalidFormat')
    expect(screen.getAllByLabelText('admin.appVersions.fieldLabel')[1]).toHaveAttribute('aria-invalid', 'true')
  })

  it('confirms a raise and blocks the fields while saving', () => {
    const vm = renderPage({ pendingRaise: { platform: 'ANDROID', from: null, to: '0.2.0' }, saving: 'ANDROID' })
    expect(screen.getByRole('heading', { name: 'admin.appVersions.confirmTitle' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('admin.appVersions.fieldLabel')[0]).toBeDisabled()
    expect(screen.getByRole('button', { name: /admin\.appVersions\.confirm/ })).toBeDisabled()
    expect(vm.confirmRaise).not.toHaveBeenCalled()
  })

  it('applies or cancels a pending raise', () => {
    const vm = renderPage({ pendingRaise: { platform: 'IOS', from: '0.3.0', to: '0.4.0' } })
    fireEvent.click(screen.getByRole('button', { name: 'admin.appVersions.confirm' }))
    expect(vm.confirmRaise).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    expect(vm.cancelRaise).toHaveBeenCalled()
  })

  it('shows the empty history, the loading state and the retry', () => {
    renderPage({ settings: { data: { ...settings, recentChanges: [] }, isError: false, refetch: vi.fn() } })
    expect(screen.getByText('admin.appVersions.noChanges')).toBeInTheDocument()
    cleanup()

    renderPage({ settings: { data: undefined, isError: false, refetch: vi.fn() } })
    expect(screen.queryByLabelText('admin.appVersions.fieldLabel')).not.toBeInTheDocument()
    cleanup()

    const refetch = vi.fn()
    renderPage({ settings: { data: undefined, isError: true, refetch } })
    fireEvent.click(screen.getByRole('button'))
    expect(refetch).toHaveBeenCalled()
  })
})
