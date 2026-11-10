import { beforeEach, describe, expect, it, vi } from 'vitest'
import { geocodingClient } from '@api/clients/geocoding.client'
import { extractLocationComponents, geocodingService } from './geocoding.service'

vi.mock('@api/clients/geocoding.client', () => ({
  geocodingClient: { geocodeAddress: vi.fn(), geocodeAddressViaMapsJs: vi.fn(), reverseGeocodeViaMapsJs: vi.fn() },
}))

describe('extractLocationComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'maps-key')
  })
  it('normalizes Ciudad Autónoma de Buenos Aires for event filtering', () => {
    const result = extractLocationComponents([
      { long_name: 'Buenos Aires', types: ['locality'] },
      {
        long_name: 'Ciudad Autónoma de Buenos Aires',
        types: ['administrative_area_level_1'],
      },
      { long_name: 'Argentina', types: ['country'] },
    ])

    expect(result).toEqual({
      city: 'Ciudad Autónoma de Buenos Aires',
      region: 'Buenos Aires',
      country: 'Argentina',
    })
  })

  it('keeps the provider hierarchy for regular Argentine provinces', () => {
    const result = extractLocationComponents([
      { long_name: 'Ciudad de Mendoza', types: ['locality'] },
      { long_name: 'Mendoza', types: ['administrative_area_level_1'] },
      { long_name: 'Argentina', types: ['country'] },
    ])

    expect(result).toEqual({
      city: 'Ciudad de Mendoza',
      region: 'Mendoza',
      country: 'Argentina',
    })
  })

  it('uses component fallbacks and handles absent components', () => {
    expect(extractLocationComponents([
      { long_name: 'District', types: ['administrative_area_level_2'] },
      { long_name: 'Portugal', types: ['country'] },
    ])).toEqual({ city: 'District', region: null, country: 'Portugal' })
    expect(extractLocationComponents(undefined)).toEqual({ city: null, region: null, country: null })
  })

  it('returns a configuration error without invoking a provider', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '')
    await expect(geocodingService.geocodeAddress('Mendoza')).resolves.toMatchObject({
      ok: false, status: 'NO_API_KEY',
    })
    expect(geocodingClient.geocodeAddress).not.toHaveBeenCalled()
  })

  it('maps a successful REST response', async () => {
    vi.mocked(geocodingClient.geocodeAddress).mockResolvedValue({
      status: 'OK',
      results: [{
        formatted_address: 'Mendoza, Argentina',
        geometry: { location: { lat: -32.8, lng: -68.8 } },
        address_components: [{ long_name: 'Mendoza', short_name: 'Mendoza', types: ['locality'] }],
      }],
    })
    await expect(geocodingService.geocodeAddress('Mendoza')).resolves.toMatchObject({
      ok: true, location: { latitude: -32.8, longitude: -68.8 },
    })
  })

  it('falls back to Maps JS for denied REST responses', async () => {
    vi.mocked(geocodingClient.geocodeAddress).mockResolvedValue({
      status: 'REQUEST_DENIED', error_message: 'denied', results: [],
    })
    vi.mocked(geocodingClient.geocodeAddressViaMapsJs).mockResolvedValue({
      status: 'OK',
      results: [{ formatted_address: 'Mendoza', geometry: { location: { lat: -32.8, lng: -68.8 } } }],
    })
    await expect(geocodingService.geocodeAddress('Mendoza')).resolves.toMatchObject({ ok: true })
    expect(geocodingClient.geocodeAddressViaMapsJs).toHaveBeenCalled()
  })

  it('preserves a stable failure and recovers from REST exceptions', async () => {
    vi.mocked(geocodingClient.geocodeAddress).mockResolvedValueOnce({
      status: 'ZERO_RESULTS', results: [],
    })
    await expect(geocodingService.geocodeAddress('Unknown')).resolves.toMatchObject({
      ok: false, status: 'ZERO_RESULTS',
    })

    vi.mocked(geocodingClient.geocodeAddress).mockRejectedValueOnce(new Error('rest offline'))
    vi.mocked(geocodingClient.geocodeAddressViaMapsJs).mockResolvedValueOnce({
      status: 'ZERO_RESULTS', results: [],
    })
    await expect(geocodingService.geocodeAddress('Unknown')).resolves.toMatchObject({
      ok: false, status: 'ZERO_RESULTS', errorMessage: 'rest offline',
    })
  })

  it('recovers a location through Maps JS when REST throws', async () => {
    vi.mocked(geocodingClient.geocodeAddress).mockRejectedValueOnce(new Error('rest offline'))
    vi.mocked(geocodingClient.geocodeAddressViaMapsJs).mockResolvedValueOnce({
      status: 'OK',
      results: [{ formatted_address: 'Mendoza', geometry: { location: { lat: -32.8, lng: -68.8 } } }],
    })
    await expect(geocodingService.geocodeAddress('Mendoza')).resolves.toMatchObject({
      ok: true, location: { latitude: -32.8, longitude: -68.8 },
    })
  })
})


describe('country resolution', () => {
  it('does not call a provider without browser configuration', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    await expect(geocodingService.resolveCountry(0,0)).resolves.toBeNull();
  });
  it('preserves the country ISO code for catalog matching', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test');
    vi.mocked(geocodingClient.reverseGeocodeViaMapsJs).mockResolvedValue({ status:'OK',results:[{formatted_address:'AR',geometry:{location:{lat:0,lng:0}},address_components:[{long_name:'Argentina',short_name:'AR',types:['country']}]}]});
    await expect(geocodingService.resolveCountry(0,0)).resolves.toEqual({ country:'Argentina',countryCode:'AR' });
  });
  it.each([{ status: 'TIMEOUT', results: [] }, { status: 'OK', results: [] }, { status: 'OK', results: [{ formatted_address: 'x', geometry: { location: { lat: 0, lng: 0 } } }] }, { status: 'OK', results: [{ formatted_address: 'x', geometry: { location: { lat: 0, lng: 0 } }, address_components: [] }] }])('falls back when the provider cannot resolve a country', async response => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test');
    vi.mocked(geocodingClient.reverseGeocodeViaMapsJs).mockResolvedValue(response);
    await expect(geocodingService.resolveCountry(0,0)).resolves.toBeNull();
  });
  it('normalizes a transport failure without retrying', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test');
    vi.mocked(geocodingClient.reverseGeocodeViaMapsJs).mockRejectedValue(new Error('offline'));
    await expect(geocodingService.resolveCountry(0,0)).resolves.toBeNull();
  });
});
