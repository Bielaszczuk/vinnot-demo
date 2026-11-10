/**
 * useRegions — fetch regions reference data.
 */
import { skipToken } from "@reduxjs/toolkit/query";
import type { Region } from "@/application/services/regions.service";
import { useTypedQueryList } from "@/presentation/store/api";

/** Pass `enabled: false` to skip the request until a country is known. */
export function useRegions(countryId?: string, enabled = true) {
  return useTypedQueryList<Region>(
    enabled
      ? {
          key: "ref.regions",
          params: countryId ? { countryId } : undefined,
        }
      : skipToken,
  );
}
