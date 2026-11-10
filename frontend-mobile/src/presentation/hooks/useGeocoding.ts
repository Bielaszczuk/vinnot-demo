/**
 * useGeocoding — imperative geocoding action for admin forms.
 */

import { useCallback, useState } from "react";
import { geocodingService, type GeocodeResult } from "@/application/services/geocoding.service";

export function useGeocoding() {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = useCallback(async (address: string): Promise<GeocodeResult> => {
    setIsGeocoding(true);
    setError(null);

    try {
      const result = await geocodingService.geocodeAddress(address);
      if (!result.ok) setError(result.errorMessage ?? result.status);
      return result;
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : "Error al geocodificar ubicación";
      setError(message);
      return {
        ok: false,
        status: "UNKNOWN_ERROR",
        errorMessage: message,
        location: null,
      };
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  return {
    geocodeAddress,
    isGeocoding,
    error,
  };
}

export default useGeocoding;
