/** Zero is a valid coordinate; absent, non-finite and out-of-range values are not. */
export function hasCoordinates<T extends { latitude?: number | null; longitude?: number | null }>(
  location: T,
): location is T & { latitude: number; longitude: number } {
  return typeof location.latitude === 'number' && Number.isFinite(location.latitude)
    && location.latitude >= -90 && location.latitude <= 90
    && typeof location.longitude === 'number' && Number.isFinite(location.longitude)
    && location.longitude >= -180 && location.longitude <= 180
}
