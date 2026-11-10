import { useQuery } from '@tanstack/react-query'
import { locationService } from '@services/location.service'

/** Device access stays in infrastructure; consumers share one bounded location lookup. */
export function useGeolocation(enabled = true) {
  const query = useQuery({
    queryKey: ['device-location'],
    queryFn: () => locationService.getCurrentLocation(),
    enabled,
    staleTime: 300_000,
    gcTime: 600_000,
    retry: false,
  })
  return {
    latitude: query.data?.latitude ?? null,
    longitude: query.data?.longitude ?? null,
    error: query.data === null || query.isError ? 'location_unavailable' : null,
    loading: enabled && query.isPending && !query.isError,
  }
}
