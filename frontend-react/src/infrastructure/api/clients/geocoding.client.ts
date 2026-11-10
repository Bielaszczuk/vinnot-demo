/**
 * Geocoding API client (Google Geocoding REST)
 */

const GOOGLE_GEOCODE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const GOOGLE_MAPS_JS_BASE_URL = 'https://maps.googleapis.com/maps/api/js'

export interface GeocodeAddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

export interface GeocodeResult {
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  address_components?: GeocodeAddressComponent[]
}

export interface GeocodeResponse {
  status: string
  error_message?: string
  results: GeocodeResult[]
}

function normalizeMapsJsResult(result: {
  formatted_address: string
  geometry?: { location?: { lat: () => number; lng: () => number } }
  address_components?: GeocodeAddressComponent[]
}): GeocodeResult {
  return {
    formatted_address: result.formatted_address,
    geometry: {
      location: {
        lat: result.geometry?.location?.lat?.() ?? 0,
        lng: result.geometry?.location?.lng?.() ?? 0,
      },
    },
    address_components: result.address_components,
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Maps JS is only available in browser context'))
      return
    }

    const googleWindow = window as typeof window & {
      google?: { maps?: unknown }
    }

    if (googleWindow.google?.maps) {
      resolve()
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Error al cargar Google Maps JS SDK')))
      return
    }

    const script = document.createElement('script')
    script.src = `${GOOGLE_MAPS_JS_BASE_URL}?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Error al cargar Google Maps JS SDK'))
    document.head.appendChild(script)
  })
}

export const geocodingClient = {
  async reverseGeocodeViaMapsJs(latitude: number, longitude: number, apiKey: string): Promise<GeocodeResponse> {
    return new Promise((resolve) => {
      let settled = false
      const complete = (result: GeocodeResponse) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }
      const timer = setTimeout(() => complete({ status: 'TIMEOUT', results: [] }), 10_000)
      void loadGoogleMapsScript(apiKey).then(() => {
        if (settled) return
        const maps = (window as typeof window & { google?: typeof google }).google?.maps
        if (!maps?.Geocoder) { complete({ status: 'UNKNOWN_ERROR', results: [] }); return }
        new maps.Geocoder().geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          complete({ status, results: (results ?? []).map(normalizeMapsJsResult) })
        })
      }).catch(() => complete({ status: 'UNKNOWN_ERROR', results: [] }))
    })
  },
  async geocodeAddress(address: string, apiKey: string): Promise<GeocodeResponse> {
    const query = encodeURIComponent(address)
    const url = `${GOOGLE_GEOCODE_BASE_URL}?address=${query}&key=${apiKey}`
    const response = await fetch(url)
    return response.json() as Promise<GeocodeResponse>
  },

  async geocodeAddressViaMapsJs(address: string, apiKey: string): Promise<GeocodeResponse> {
    await loadGoogleMapsScript(apiKey)

    return new Promise((resolve) => {
      const googleWindow = window as typeof window & {
        google?: {
          maps?: {
            Geocoder?: new () => {
              geocode: (
                request: { address: string },
                callback: (
                  results: Array<{
                    formatted_address: string
                    geometry?: { location?: { lat: () => number; lng: () => number } }
                    address_components?: GeocodeAddressComponent[]
                  }> | null,
                  status: string,
                ) => void,
              ) => void
            }
          }
        }
      }

      const GeocoderClass = googleWindow.google?.maps?.Geocoder
      if (!GeocoderClass) {
        resolve({
          status: 'UNKNOWN_ERROR',
          error_message: 'Google Maps Geocoder no disponible',
          results: [],
        })
        return
      }

      const geocoder = new GeocoderClass()
      geocoder.geocode({ address }, (results, status) => {
        resolve({ status, results: (results ?? []).map(normalizeMapsJsResult) })
      })
    })
  },
}

export default geocodingClient
