import { afterEach, expect, it, vi } from 'vitest'
import { geocodingClient } from './geocoding.client'
afterEach(() => {
  Reflect.deleteProperty(window, 'google')
  document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach(script => script.remove())
  vi.useRealTimers()
})
it('reverse geocodes through the SDK once, including zero coordinates', async () => {
  const geocode = vi.fn((_request, callback) => callback([{ formatted_address: 'Argentina', geometry: { location: { lat: () => 0, lng: () => 0 } }, address_components: [{ long_name: 'Argentina', short_name: 'AR', types: ['country'] }] }], 'OK'))
  Object.assign(window, { google: { maps: { Geocoder: class { geocode = geocode } } } })
  const response = await geocodingClient.reverseGeocodeViaMapsJs(0, 0, 'local-test-key')
  expect(response.status).toBe('OK')
  expect(response.results[0]?.address_components?.[0]?.short_name).toBe('AR')
  expect(geocode).toHaveBeenCalledExactlyOnceWith({ location: { lat: 0, lng: 0 } }, expect.any(Function))
})
it('times out a stalled SDK load without issuing a late geocoder request', async () => {
  vi.useFakeTimers()
  const pending = geocodingClient.reverseGeocodeViaMapsJs(0, 0, 'local-test-key')
  await vi.advanceTimersByTimeAsync(10_000)
  expect(await pending).toEqual({ status: 'TIMEOUT', results: [] })
  const geocode = vi.fn()
  Object.assign(window, { google: { maps: { Geocoder: class { geocode = geocode } } } })
  document.querySelector('script')!.dispatchEvent(new Event('load'))
  await Promise.resolve()
  expect(geocode).not.toHaveBeenCalled()
})
it('returns a fallback after a provider failure, with no REST retry', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  const pending = geocodingClient.reverseGeocodeViaMapsJs(0, 0, 'local-test-key')
  document.querySelector('script')!.dispatchEvent(new Event('error'))
  expect(await pending).toEqual({ status: 'UNKNOWN_ERROR', results: [] })
  expect(fetchSpy).not.toHaveBeenCalled()
  fetchSpy.mockRestore()
})
