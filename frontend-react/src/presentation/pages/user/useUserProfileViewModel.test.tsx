import type { ChangeEvent } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useUserProfileViewModel } from './useUserProfileViewModel'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(), confirm: vi.fn(), setup: vi.fn(), deactivate: vi.fn(), remove: vi.fn(), uploadAvatar: vi.fn(),
  points: { data: undefined as unknown, isPending: false },
}))
const mutation = (mutateAsync: unknown = vi.fn()) => ({ mutateAsync, isPending: false })
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR' } }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams()] }))
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'ana@vinnot.com', username: 'ana', socialProviders: [] }, isAuthenticated: true }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }))
vi.mock('@stores/auth.store', () => ({ useAuthStore: (select: (state: { clearSession: () => void }) => unknown) => select({ clearSession: vi.fn() }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: vi.fn() }) }))
vi.mock('@services/socialAuth.service', () => ({ socialAuthService: {} }))
vi.mock('@hooks/queries/user/useUserStats', () => ({ useUserStats: () => ({ data: undefined, isLoading: false }) }))
vi.mock('@hooks/queries/user/useMyPoints', () => ({ useMyPoints: () => mocks.points }))
vi.mock('@hooks/queries/user/useUpdateProfile', () => ({ useUpdateProfile: () => mutation() }))
vi.mock('@hooks/queries/user/useUploadAvatar', () => ({ useUploadAvatar: () => mutation(mocks.uploadAvatar) }))
vi.mock('@hooks/queries/user/useChangePassword', () => ({ useChangePassword: () => mutation() }))
vi.mock('@hooks/queries/user/useRequestPasswordSetup', () => ({ useRequestPasswordSetup: () => mutation(mocks.setup) }))
vi.mock('@hooks/queries/user/useDeactivateAccount', () => ({ useDeactivateAccount: () => mutation(mocks.deactivate) }))
vi.mock('@hooks/queries/user/useDeleteAccount', () => ({ useDeleteAccount: () => mutation(mocks.remove) }))
vi.mock('@hooks/queries/user/useRequestEmailChange', () => ({ useRequestEmailChange: () => mutation() }))

const urls = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:avatar')
  URL.revokeObjectURL = vi.fn()
  mocks.confirm.mockResolvedValue(true)
  mocks.points = { data: undefined, isPending: false }
})

afterEach(() => {
  URL.createObjectURL = urls.create
  URL.revokeObjectURL = urls.revoke
})

function pickAvatar(result: { current: ReturnType<typeof useUserProfileViewModel> }, file: File) {
  const input = { files: [file], value: 'C:\\fakepath\\photo' }
  act(() => result.current.onFileInputChange({ target: input } as unknown as ChangeEvent<HTMLInputElement>))
  return input
}

it('frames a picked profile photo first and uploads only the confirmed round crop', async () => {
  mocks.uploadAvatar.mockResolvedValue('https://cdn.example/avatar.jpg')
  const { result } = renderHook(useUserProfileViewModel)
  const picked = new File(['photo'], 'me.png', { type: 'image/png' })
  const input = pickAvatar(result, picked)
  expect(input.value).toBe('')
  expect(result.current.avatarCrop).toEqual({ file: picked, url: 'blob:avatar' })
  expect(mocks.uploadAvatar).not.toHaveBeenCalled()

  const cropped = new File(['jpeg'], 'me.jpg', { type: 'image/jpeg' })
  await act(() => result.current.confirmAvatarCrop(cropped))
  expect(result.current.avatarCrop).toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:avatar')
  expect(mocks.uploadAvatar).toHaveBeenCalledWith(cropped)
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'profile.toastAvatarUpdated' })
})

it('cancelling the framing uploads nothing and keeps the current photo', () => {
  const { result } = renderHook(useUserProfileViewModel)
  pickAvatar(result, new File(['photo'], 'me.png', { type: 'image/png' }))
  act(() => result.current.cancelAvatarCrop())
  expect(result.current.avatarCrop).toBeNull()
  expect(result.current.displayAvatar).toBeNull()
  expect(mocks.uploadAvatar).not.toHaveBeenCalled()
  expect(mocks.toast).not.toHaveBeenCalled()
})

it('still refuses photos over 5 MB or in another format before framing them', () => {
  const { result } = renderHook(useUserProfileViewModel)
  const huge = new File(['x'], 'huge.jpg', { type: 'image/jpeg' })
  Object.defineProperty(huge, 'size', { value: 5 * 1024 * 1024 + 1 })
  pickAvatar(result, huge)
  expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'profile.toastFileTooLarge' })
  pickAvatar(result, new File(['x'], 'a.pdf', { type: 'application/pdf' }))
  expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'profile.toastInvalidFormat' })
  expect(result.current.avatarCrop).toBeNull()
})

it('reports a failed upload of the framed photo', async () => {
  mocks.uploadAvatar.mockRejectedValue(new Error('Network Error'))
  const { result } = renderHook(useUserProfileViewModel)
  await act(() => result.current.confirmAvatarCrop(new File(['jpeg'], 'me.jpg', { type: 'image/jpeg' })))
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'profile.toastAvatarError' })
})

it('gives the profile header the points and seal, and says while they load', () => {
  mocks.points = { data: undefined, isPending: true }
  expect(renderHook(useUserProfileViewModel).result.current).toMatchObject({ points: undefined, loadingPoints: true })
  mocks.points = { data: { points: 85, tier: 'RACIMO' }, isPending: false }
  expect(renderHook(useUserProfileViewModel).result.current).toMatchObject({ points: { points: 85, tier: 'RACIMO' }, loadingPoints: false })
})

it('never shows transport text when the password setup link fails', async () => {
  mocks.setup.mockRejectedValue(new Error('Request failed with status code 500'))
  const { result } = renderHook(useUserProfileViewModel)
  await act(() => result.current.handleRequestPasswordSetup())
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'profile.toastPasswordSetupError' })
})

it('explains a connection problem when deactivating fails offline', async () => {
  mocks.deactivate.mockRejectedValue({ status: 0, code: 'NETWORK_ERROR', message: 'Network Error' })
  const { result } = renderHook(useUserProfileViewModel)
  await act(() => result.current.handleDeactivateAccount())
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'errors.api.network' })
})

it('uses the deletion fallback for an unknown failure', async () => {
  mocks.remove.mockRejectedValue(new Error('boom'))
  const { result } = renderHook(useUserProfileViewModel)
  await act(() => result.current.handleDeleteAccount())
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'profile.toastAccountDeletionError' })
})
