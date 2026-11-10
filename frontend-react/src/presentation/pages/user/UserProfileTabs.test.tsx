import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '@domain/user/user.types'
import { UserProfileProfileTab } from './UserProfileProfileTab'
import { UserProfileSecurityTab } from './UserProfileSecurityTab'
import type { UserProfileViewModel } from './useUserProfileViewModel'

const t = (key: string) => key
const mutation = { isPending: false }

function vm(user: Partial<User>, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    t,
    user: { email: 'ana@vinnot.com', isVerified: true, ...user },
    profileUsername: 'ana', setProfileUsername: vi.fn(),
    profileFirstName: 'Ana', setProfileFirstName: vi.fn(),
    profileLastName: '', setProfileLastName: vi.fn(),
    profilePhone: '', setProfilePhone: vi.fn(),
    updateProfileMutation: mutation, triggerFileInput: vi.fn(), handleSaveProfile: vi.fn(),
    showPasswordForm: false, setShowPasswordForm: vi.fn(),
    currentPassword: '', setCurrentPassword: vi.fn(), newPassword: '', setNewPassword: vi.fn(),
    confirmPassword: '', setConfirmPassword: vi.fn(),
    changePasswordMutation: mutation, handleChangePassword: vi.fn(),
    requestPasswordSetupMutation: mutation, handleRequestPasswordSetup: vi.fn(),
    ...overrides,
  } as unknown as UserProfileViewModel
}

describe('profile tab avatar', () => {
  it('offers only the upload, without an avatar URL field', () => {
    const model = vm({})
    const { container } = render(<UserProfileProfileTab vm={model} />)
    expect(container.querySelector('input[type="url"]')).toBeNull()
    expect(screen.queryByText('profile.avatarUrl')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /profile.upload/ }))
    expect(model.triggerFileInput).toHaveBeenCalledOnce()
  })
})

describe('security tab password', () => {
  it('lets an account with a password and a linked social identity change it', () => {
    const model = vm({ hasSocialIdentity: true, hasPassword: true })
    render(<UserProfileSecurityTab vm={model} />)
    expect(screen.getByText('profile.passwordHint')).toBeInTheDocument()
    expect(screen.queryByText('profile.sendPasswordSetupLink')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /profile.changePassword/ }))
    expect(model.setShowPasswordForm).toHaveBeenCalledWith(true)
  })

  it('offers the setup link to an account without a password', () => {
    const model = vm({ hasSocialIdentity: true, hasPassword: false })
    render(<UserProfileSecurityTab vm={model} />)
    expect(screen.getByText('profile.socialPasswordHint')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /profile.changePassword/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'profile.sendPasswordSetupLink' }))
    expect(model.handleRequestPasswordSetup).toHaveBeenCalledOnce()
  })

  it('keeps the change form for a password-only account', () => {
    render(<UserProfileSecurityTab vm={vm({ hasSocialIdentity: false, hasPassword: true })} />)
    expect(screen.getByRole('button', { name: /profile.changePassword/ })).toBeInTheDocument()
    expect(screen.queryByText('profile.sendPasswordSetupLink')).toBeNull()
  })
})
