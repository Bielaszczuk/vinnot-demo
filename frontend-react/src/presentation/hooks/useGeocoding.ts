/**
 * useGeocoding
 *
 * Hook wrapper for geocoding service.
 */

import { useCallback } from 'react'
import { geocodingService } from '@services/geocoding.service'

export function useGeocoding() {
  const geocodeAddress = useCallback(async (address: string) => {
    return geocodingService.geocodeAddress(address)
  }, [])

  return { geocodeAddress }
}

export default useGeocoding
