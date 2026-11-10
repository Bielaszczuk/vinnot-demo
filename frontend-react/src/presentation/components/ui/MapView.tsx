import { useTranslation } from "react-i18next"
import { hasCoordinates } from '@domain/location/coordinates'
/**
 * MapView — interactive Google Maps component
 *
 * Direct 1:1 port of Vue's MapView.vue.
 * Loads the Google Maps JS SDK, renders a map with a marker,
 * and optionally supports interactive mode (click-to-move, drag marker).
 */

import { useRef, useState, useEffect, useCallback } from 'react'

import { ExternalMapGate } from './ExternalMapGate'
import { Map } from 'lucide-react'
import { Icon } from './Icon'
import { Spinner } from './Spinner'

interface MapViewProps {
  latitude: number
  longitude: number
  zoom?: number
  height?: string
  interactive?: boolean
  showMarker?: boolean
  markerTitle?: string
  onLocationChanged?: (lat: number, lng: number) => void
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      if (window.google && window.google.maps) {
        resolve()
      } else {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Map unavailable')), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      reject(new Error('Map unavailable'))
    }
    document.head.appendChild(script)
  })
}

export function MapView(props: MapViewProps) {
  return <ExternalMapGate><LoadedMapView {...props} /></ExternalMapGate>
}

function LoadedMapView({
  latitude,
  longitude,
  zoom = 15,
  height = '400px',
  interactive = false,
  showMarker = true,
  markerTitle = 'Ubicación',
  onLocationChanged,
}: MapViewProps) {
  const { t } = useTranslation()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const initializedRef = useRef(false)
  const latestPosition = useRef({ latitude, longitude, showMarker, zoom })
  const callbackRef = useRef(onLocationChanged)
  useEffect(() => { callbackRef.current = onLocationChanged }, [onLocationChanged])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initMap = useCallback(async () => {
    if (initializedRef.current) return

    if (!API_KEY) {
      setError(t('eventEditor.mapUnavailable'))
      setLoading(false)
      return
    }

    if (!mapRef.current) {
      setLoading(false)
      return
    }

    try {
      initializedRef.current = true
      setLoading(true)
      await loadGoogleMapsScript()

      if (!mapRef.current) return

      const current = latestPosition.current
      const position = { lat: current.latitude, lng: current.longitude }

      const map = new google.maps.Map(mapRef.current, {
        center: position,
        zoom: current.zoom,
        disableDefaultUI: !interactive,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: interactive,
        fullscreenControl: interactive,
      })

      const marker = new google.maps.Marker({
        position,
        map,
        title: markerTitle,
        draggable: interactive,
        visible: current.showMarker,
      })

      if (interactive && onLocationChanged) {
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng && marker) {
            const lat = e.latLng.lat()
            const lng = e.latLng.lng()
            marker.setPosition(e.latLng)
            callbackRef.current?.(lat, lng)
          }
        })

        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          if (pos) {
            callbackRef.current?.(pos.lat(), pos.lng())
          }
        })
      }

      mapInstanceRef.current = map
      markerRef.current = marker
      initializedRef.current = true
      setLoading(false)
    } catch {
      if (!mapRef.current) return
      initializedRef.current = false
      setError(t('eventEditor.mapUnavailable'))
      setLoading(false)
    }
  }, [interactive, markerTitle, onLocationChanged, t])

  // Init on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void initMap()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initMap])

  // Update position when lat/lng change after init
  useEffect(() => () => {
    if (markerRef.current) {
      google.maps.event.clearInstanceListeners(markerRef.current)
      markerRef.current.setMap(null)
      markerRef.current = null
    }
    if (mapInstanceRef.current) {
      google.maps.event.clearInstanceListeners(mapInstanceRef.current)
      mapInstanceRef.current = null
    }
  }, [])

  // Update position when lat/lng change after init
  useEffect(() => {
    latestPosition.current = { latitude, longitude, showMarker, zoom }
    const map = mapInstanceRef.current
    const marker = markerRef.current
    if (map && marker && hasCoordinates({ latitude, longitude })) {
      const position = { lat: latitude, lng: longitude }
      map.setCenter(position)
      marker.setPosition(position)
      marker.setVisible(showMarker)
      map.setZoom(zoom)
    }
  }, [latitude, longitude, showMarker, zoom])

  return (
    <div className="relative">
      {/* Loading */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg"
          style={{ height }}
        >
          <div className="text-center">
            <Spinner size="lg" className="mx-auto" />
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
          style={{ height }}
        >
          <div className="text-center p-6">
            <Icon icon={Map} size="xl" className="mx-auto mb-2 text-gray-400" />
            <p role="alert" className="text-sm text-gray-600">{error}</p>
            <button type="button" className="mt-3 text-sm font-medium text-wine-700" onClick={() => { setError(null); void initMap() }}>{t("common.retry")}</button>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapRef}
        style={{ height, display: error ? "none" : undefined }}
        className="rounded-lg overflow-hidden border border-gray-200"
      />

      {/* Interactive hint */}
      {interactive && !loading && !error && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {t("eventEditor.mapHelp")}
        </p>
      )}
    </div>
  )
}
