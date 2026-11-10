/**
 * useWineTypes — wine types from the reference catalog (`GET /reference/wine-types`).
 */
import type { WineTypeOption } from "@/domain/wine/wine.types";
import { useTypedQueryList } from "@/presentation/store/api";

export function useWineTypes() {
  return useTypedQueryList<WineTypeOption>({ key: "ref.wineTypes" });
}
