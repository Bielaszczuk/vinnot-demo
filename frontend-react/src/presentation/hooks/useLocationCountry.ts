import { useQuery } from '@tanstack/react-query'
import { geocodingService } from '@services/geocoding.service'
import type { Country } from '@services/regions.service'
import { useGeolocation } from './useGeolocation'

export function useLocationCountry(countries: Country[], enabled: boolean) {
  const geo = useGeolocation(enabled)
  const hasLocation = geo.latitude !== null && geo.longitude !== null
  const query = useQuery({
    queryKey: ['location-country', geo.latitude, geo.longitude],
    queryFn: () => geocodingService.resolveCountry(geo.latitude!, geo.longitude!),
    enabled: enabled && hasLocation && countries.length > 0,
    retry: false,
    staleTime: 600_000,
    gcTime: 600_000,
  })
  const place = query.data
  const country = place ? countries.find(item =>
    item.code.trim().toLowerCase() === place.countryCode.trim().toLowerCase()
    || item.name.trim().toLowerCase() === place.country.trim().toLowerCase(),
  ) : undefined
  return {
    country: enabled ? country?.name ?? '' : '',
    loading: enabled && (geo.loading || (hasLocation && countries.length > 0 && query.isPending && !query.isError)),
  }
}
