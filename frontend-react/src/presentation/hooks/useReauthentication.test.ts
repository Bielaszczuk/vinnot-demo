import { act, renderHook } from '@testing-library/react'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { useReauthentication } from './useReauthentication'
import { reauthenticationService } from '@services/reauthentication.service'
const state = vi.hoisted(() => ({ generation: 0, providers: undefined as string[] | undefined }))
vi.mock('@stores/auth.store', () => ({
  useAuthStore: (selector: (s: { sessionGeneration: number; user?: { socialProviders?: string[] } }) => unknown) =>
    selector({ sessionGeneration: state.generation, user: { socialProviders: state.providers } }),
}))

beforeEach(() => { vi.restoreAllMocks(); state.generation = 0; state.providers = undefined })
afterEach(() => { vi.restoreAllMocks(); reauthenticationService.cancel() })

it('keeps a failed challenge open, then resolves with the proof on retry', async () => {
  const { result } = renderHook(() => useReauthentication())
  let pending!: Promise<string>
  act(() => { pending = reauthenticationService.request() })
  expect(result.current.open).toBe(true)
  const confirm = vi.spyOn(reauthenticationService, 'confirm').mockRejectedValueOnce(new Error('wrong password'))
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
  vi.spyOn(reauthenticationService, 'confirm').mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const { result, rerender } = renderHook(() => useReauthentication())
  let pending!: Promise<string>
  act(() => { pending = reauthenticationService.request() })
  const rejected = expect(pending).rejects.toThrow('cancelled')
  let confirmation!: Promise<void>
  act(() => { confirmation = result.current.confirm('password') })
  expect(result.current.busy).toBe(true)
  state.generation++
  rerender()
  await rejected
  await act(async () => { finish(); await confirmation })
  expect(result.current.open).toBe(false)
  expect(result.current.busy).toBe(false)
  expect(result.current.failed).toBe(false)
})

it('offers only linked id-token providers and records a provider sign-in that failed before confirmation', async () => {
  state.providers = ['FACEBOOK', 'APPLE']
  const { result } = renderHook(() => useReauthentication())
  expect(result.current.providers).toEqual(['APPLE'])
  vi.spyOn(reauthenticationService, 'confirm').mockRejectedValueOnce(new Error('wrong password'))
  await act(async () => { await result.current.confirm('wrong') })
  expect(result.current.failed).toBe(true)
  act(() => { result.current.providerFailed('GOOGLE') })
  expect(result.current.failed).toBe(false)
  expect(result.current.failedProvider).toBe('GOOGLE')
})
