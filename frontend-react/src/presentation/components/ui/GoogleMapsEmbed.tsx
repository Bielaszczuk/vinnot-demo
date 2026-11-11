/**
 * GoogleMapsEmbed — reusable map embed component
 *
 * Renders a Google Maps embed iframe for place, directions, or view modes.
 * Falls back to a placeholder when the API key is missing or config is invalid.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalMapGate } from './ExternalMapGate'
import { Map } from 'lucide-react'
import { Icon } from './Icon'

interface GoogleMapsEmbedProps {
  mode?: 'place' | 'directions' | 'view'
  query?: string
  origin?: string
  destination?: string
  waypoints?: string[]
  center?: string
  zoom?: number
  height?: string
  mapType?: 'roadmap' | 'satellite'
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

export function GoogleMapsEmbed(props: GoogleMapsEmbedProps) {
  return <ExternalMapGate><LoadedGoogleMapsEmbed {...props} /></ExternalMapGate>
}

function LoadedGoogleMapsEmbed({
  mode = 'place',
  query,
  origin,
  destination,
  waypoints,
  center,
  zoom = 15,
  height = '450px',
  mapType = 'roadmap',
}: GoogleMapsEmbedProps) {
  const { t } = useTranslation()
  const { embedUrl, hasValidConfig } = useMemo(() => {
    if (!API_KEY) return { embedUrl: '', hasValidConfig: false }

    const baseUrl = 'https://www.google.com/maps/embed/v1/'
    const params = new URLSearchParams({
      key: API_KEY,
      maptype: mapType,
    })

    if (zoom) {
      params.append('zoom', zoom.toString())
    }

    let url = ''
    let valid = false

    switch (mode) {
      case 'place':
        if (query) {
          params.append('q', query)
          valid = true
        }
        url = `${baseUrl}place?${params.toString()}`
        break

      case 'directions':
        if (origin) params.append('origin', origin)
        if (destination) params.append('destination', destination)
        if (waypoints && waypoints.length > 0) {
          params.append('waypoints', waypoints.join('|'))
        }
        valid = !!origin && !!destination
        url = `${baseUrl}directions?${params.toString()}`
        break

      case 'view':
        if (center) {
          params.append('center', center)
          valid = true
        }
        url = `${baseUrl}view?${params.toString()}`
        break
    }

    return { embedUrl: url, hasValidConfig: valid }
  }, [mode, query, origin, destination, waypoints, center, zoom, mapType])

  if (!hasValidConfig) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100"
      >
        <div className="p-6 text-center">
          <Icon icon={Map} size="xl" className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">{t('externalMaps.unavailable')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <iframe
        src={embedUrl}
        style={{ height }}
        className="w-full rounded-lg border border-gray-200"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        title="Google Maps"
      />
    </div>
  )
}
