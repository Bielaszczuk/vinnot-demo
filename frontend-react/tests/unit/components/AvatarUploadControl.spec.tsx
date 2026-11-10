import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { UserProfileHeroSection } from '@pages/user/UserProfileSections'
import type { UserProfileViewModel } from '@pages/user/useUserProfileViewModel'

afterEach(cleanup)

function renderHero(overrides: Partial<UserProfileViewModel> = {}) {
  const vm = {
    t: (key: string) => key,
    i18n: { language: 'es-AR' },
    user: { name: 'María', username: 'maria', roles: [], createdAt: '2025-01-01' },
    stats: null,
    displayAvatar: null,
    isDraggingOver: false,
    uploadAvatarMutation: { isPending: false },
    fileInputRef: createRef<HTMLInputElement>(),
    triggerFileInput: vi.fn(),
    onDrop: vi.fn(),
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onFileInputChange: vi.fn(),
    ...overrides,
  } as unknown as UserProfileViewModel
  render(<UserProfileHeroSection vm={vm} />)
  return vm
}

it('reaches the avatar upload control with Tab and opens the picker with Enter or Space', async () => {
  const user = userEvent.setup()
  const vm = renderHero()
  await user.tab()
  const control = screen.getByRole('button', { name: 'profile.changeAvatar' })
  expect(control).toHaveFocus()
  await user.keyboard('{Enter}')
  await user.keyboard(' ')
  expect(vm.triggerFileInput).toHaveBeenCalledTimes(2)
})

it('keeps click and drag-and-drop upload working', () => {
  const vm = renderHero()
  const control = screen.getByRole('button', { name: 'profile.changeAvatar' })
  fireEvent.click(control)
  fireEvent.dragOver(control)
  fireEvent.drop(control)
  expect(vm.triggerFileInput).toHaveBeenCalledTimes(1)
  expect(vm.onDragOver).toHaveBeenCalledTimes(1)
  expect(vm.onDrop).toHaveBeenCalledTimes(1)
})

it('shows the round framing dialog for a picked photo and cancels it', () => {
  const file = new File(['photo'], 'me.png', { type: 'image/png' })
  const vm = renderHero({
    avatarCrop: { file, url: 'blob:avatar' },
    confirmAvatarCrop: vi.fn(),
    cancelAvatarCrop: vi.fn(),
  } as Partial<UserProfileViewModel>)
  expect(screen.getByRole('dialog', { name: 'media.crop.title' })).toBeVisible()
  expect(screen.getByTestId('image-crop-round-mask')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'media.crop.cancel' }))
  expect(vm.cancelAvatarCrop).toHaveBeenCalledTimes(1)
  expect(vm.confirmAvatarCrop).not.toHaveBeenCalled()
})
