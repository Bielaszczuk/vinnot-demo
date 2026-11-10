import { act, renderHook } from '@testing-library/react-native'
import { useReauthentication } from './useReauthentication'
import { reauthenticationService } from '@/application/services/reauthentication.service'
import { socialAuthService } from '@/application/services/socialAuth.service'
import { Platform } from 'react-native'
let mockGeneration = 0
let mockProviders: string[] | undefined
jest.mock('@/presentation/store/auth.store', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ sessionGeneration: mockGeneration, user: { socialProviders: mockProviders } }) }))
jest.mock('@/application/services/socialAuth.service', () => ({ socialAuthService: { acquire: jest.fn() } }))

beforeEach(() => { jest.restoreAllMocks(); mockGeneration = 0; mockProviders = undefined })
afterEach(() => { jest.restoreAllMocks(); reauthenticationService.cancel() })

it('keeps a failed challenge open, then resolves with the proof on retry', async () => {
  const { result } = renderHook(() => useReauthentication())
  let pending!: Promise<string>
  act(() => { pending = reauthenticationService.request() })
  expect(result.current.open).toBe(true)
  const confirm = jest.spyOn(reauthenticationService, 'confirm').mockRejectedValueOnce(new Error('wrong password'))
  await act(async () => { await result.current.confirm('wrong') })
  expect(result.current.failed).toBe(true)
  expect(result.current.open).toBe(true)
  confirm.mockResolvedValueOnce(undefined)
  const cancelled = expect(pending).rejects.toThrow('cancelled')
  await act(async () => { await result.current.confirm('correct') })
  act(() => { result.current.cancel() })
  await cancelled
  expect(result.current.open).toBe(false)
  expect(result.current.busy).toBe(false)
  expect(result.current.failed).toBe(false)
})

it('cancels on account change and ignores confirmation that arrives afterwards', async () => {
  let finish!: () => void
  jest.spyOn(reauthenticationService, 'confirm').mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const { result, rerender } = renderHook(() => useReauthentication())
  let pending!: Promise<string>
  act(() => { pending = reauthenticationService.request() })
  const rejected = expect(pending).rejects.toThrow('cancelled')
  let confirmation!: Promise<void>
  act(() => { confirmation = result.current.confirm('password') })
  expect(result.current.busy).toBe(true)
  mockGeneration++
  rerender({})
  await rejected
  await act(async () => { finish(); await confirmation })
  expect(result.current.open).toBe(false)
  expect(result.current.busy).toBe(false)
  expect(result.current.failed).toBe(false)
})

it('offers linked Google everywhere and linked Apple only on iOS', () => {
  mockProviders = ['FACEBOOK', 'APPLE', 'GOOGLE']
  const original = Platform.OS
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
  expect(renderHook(() => useReauthentication()).result.current.providers).toEqual(['GOOGLE'])
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' })
  expect(renderHook(() => useReauthentication()).result.current.providers).toEqual(['GOOGLE', 'APPLE'])
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
})

it('confirms with a fresh provider token and resolves the pending action', async () => {
  mockProviders = ['APPLE']
  const { result } = renderHook(() => useReauthentication())
  let pending!: Promise<string>
  act(() => { pending = reauthenticationService.request() })
  jest.mocked(socialAuthService.acquire).mockRejectedValueOnce(new Error('cancelled by user'))
  await act(async () => { await result.current.confirmWithProvider('APPLE') })
  expect(result.current.failedProvider).toBe('APPLE')
  expect(result.current.open).toBe(true)
  jest.mocked(socialAuthService.acquire).mockResolvedValueOnce({ provider: 'APPLE', token: 'identity-token', nonce: 'nonce' })
  const confirm = jest.spyOn(reauthenticationService, 'confirmWithProvider').mockImplementation(async () => {
    reauthenticationService.cancel()
  })
  const settled = expect(pending).rejects.toThrow('cancelled')
  await act(async () => { await result.current.confirmWithProvider('APPLE') })
  await settled
  expect(confirm).toHaveBeenCalledWith({ provider: 'APPLE', token: 'identity-token', nonce: 'nonce' })
  expect(result.current.failedProvider).toBeNull()
  expect(result.current.busyProvider).toBeNull()
})

it('acquires a fresh provider credential and resolves the challenge with its proof', async () => {
  mockProviders = ['GOOGLE']
  jest.mocked(socialAuthService.acquire).mockResolvedValue({ provider: 'GOOGLE', token: 'google-id-token' })
  const confirm = jest.spyOn(reauthenticationService, 'confirmWithProvider').mockRejectedValueOnce(new Error('AUTH_FAILED'))
  const { result } = renderHook(() => useReauthentication())
  act(() => { void reauthenticationService.request().catch(() => undefined) })
  await act(async () => { await result.current.confirmWithProvider('GOOGLE') })
  expect(result.current.failedProvider).toBe('GOOGLE')
  expect(result.current.failed).toBe(false)
  confirm.mockResolvedValueOnce(undefined)
  await act(async () => { await result.current.confirmWithProvider('GOOGLE') })
  expect(socialAuthService.acquire).toHaveBeenCalledWith('GOOGLE')
  expect(confirm).toHaveBeenLastCalledWith({ provider: 'GOOGLE', token: 'google-id-token', nonce: undefined })
  expect(result.current.failedProvider).toBeNull()
})
