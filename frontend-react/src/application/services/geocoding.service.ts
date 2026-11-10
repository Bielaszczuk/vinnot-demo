/**
 * Geocoding service
 *
 * Encapsulates Google Geocoding request/response normalization.
 */

import { geocodingClient } from '@api/clients/geocoding.client'

export interface GeocodedLocation {
  latitude: number
  longitude: number
  formattedAddress: string
  city: string | null
  region: string | null
  country: string | null
}

export interface GeocodeResult {
  ok: boolean
  status: string
  errorMessage: string | null
  location: GeocodedLocation | null
}

type AddressComponent = { long_name: string; types: string[] }

function findComponent(
  components: AddressComponent[],
  type: string,
): string | null {
  return components.find((component) => component.types.includes(type))?.long_name ?? null
}

function normalizeText(value: string | null): string {
  return value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim() ?? ''
}

export function extractLocationComponents(components: AddressComponent[] | undefined): {
  city: string | null
  region: string | null
  country: string | null
} {
  const values = components ?? []
  let city = findComponent(values, 'locality')
    ?? findComponent(values, 'postal_town')
    ?? findComponent(values, 'administrative_area_level_2')
    ?? findComponent(values, 'sublocality_level_1')
  let region = findComponent(values, 'administrative_area_level_1')
  const country = findComponent(values, 'country')

  if (normalizeText(region) === 'ciudad autonoma de buenos aires') {
    city = 'Ciudad Autónoma de Buenos Aires'
    region = 'Buenos Aires'
  }

  return { city, region, country }
}

export const geocodingService = {
  async resolveCountry(latitude: number, longitude: number): Promise<{ country: string; countryCode: string } | null> {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) return null
    try {
      const response = await geocodingClient.reverseGeocodeViaMapsJs(latitude, longitude, key)
      if (response.status !== 'OK') return null
      const country = response.results[0]?.address_components?.find(component => component.types.includes('country'))
      return country ? { country: country.long_name, countryCode: country.short_name } : null
    } catch { return null }
  },
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return {
        ok: false,
        status: 'NO_API_KEY',
        errorMessage: 'API Key de Google Maps no configurada',
        location: null,
      }
    }

    const mapSuccessfulResponse = (response: {
      status: string
      error_message?: string
      results: Array<{
        formatted_address: string
        geometry?: { location?: { lat: number; lng: number } }
        address_components?: Array<{ long_name: string; types: string[] }>
      }>
    }): GeocodeResult => {
      const first = response.results?.[0]
      if (response.status !== 'OK' || !first?.geometry?.location) {
        return {
          ok: false,
          status: response.status || 'UNKNOWN_ERROR',
          errorMessage: response.error_message ?? null,
          location: null,
        }
      }

      const { city, region, country } = extractLocationComponents(first.address_components)
      return {
        ok: true,
        status: response.status,
        errorMessage: null,
        location: {
          latitude: first.geometry.location.lat,
          longitude: first.geometry.location.lng,
          formattedAddress: first.formatted_address,
          city,
          region,
          country,
        },
      }
    }

    try {
      const restResponse = await geocodingClient.geocodeAddress(address, apiKey)
      const restResult = mapSuccessfulResponse(restResponse)
      if (restResult.ok) return restResult

      // Vue usa geocoding directo REST. En React agregamos fallback al SDK de Maps
      // cuando el provider rechaza la API REST (REQUEST_DENIED) pero el mapa está disponible.
      if (restResult.status === 'REQUEST_DENIED' || restResult.status === 'UNKNOWN_ERROR') {
        const mapsJsResponse = await geocodingClient.geocodeAddressViaMapsJs(address, apiKey)
        const mapsJsResult = mapSuccessfulResponse(mapsJsResponse)
        if (mapsJsResult.ok) return mapsJsResult
      }

      return restResult
    } catch (error) {
      const mapsJsResponse = await geocodingClient.geocodeAddressViaMapsJs(address, apiKey)
      const mapsJsResult = mapSuccessfulResponse(mapsJsResponse)
      if (mapsJsResult.ok) return mapsJsResult

      return {
        ok: false,
        status: mapsJsResult.status || 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : null,
        location: null,
      }
    }
  },
}

export default geocodingService
