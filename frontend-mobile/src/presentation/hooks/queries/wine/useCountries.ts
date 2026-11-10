/**
 * useCountries — fetch countries reference data.
 */
import type { Country } from "@/application/services/regions.service";
import { useTypedQueryList } from "@/presentation/store/api";

export function useCountries() {
  return useTypedQueryList<Country>({ key: "ref.countries" });
}
