import { afterEach, describe, expect, it, vi } from 'vitest'
import { locationGateway } from './location.gateway'
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
describe('bounded browser location', () => {
  it('accepts zero coordinates and clears the deadline', async () => {
    vi.useFakeTimers()
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition))
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
    await expect(locationGateway.getCurrentPosition()).resolves.toEqual({ latitude: 0, longitude: 0 })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('times out an unanswered permission request and ignores a late success', async () => {
    vi.useFakeTimers()
    let late!: PositionCallback
    const getCurrentPosition = vi.fn((success: PositionCallback) => { late = success })
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
    const assertion = expect(locationGateway.getCurrentPosition()).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion
    late({ coords: { latitude: 1, longitude: 1 } } as GeolocationPosition)
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })
  it('falls back when permission is denied or the API is absent', async () => {
    vi.stubGlobal('navigator', {})
    await expect(locationGateway.getCurrentPosition()).rejects.toThrow('unavailable')
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError) } })
    await expect(locationGateway.getCurrentPosition()).rejects.toMatchObject({ code: 1 })
  })
})
