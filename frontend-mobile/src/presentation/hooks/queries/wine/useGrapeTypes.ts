/**
 * useGrapeTypes — fetch grape type reference data.
 */
import type { GrapeType } from "@/application/services/grapeTypes.service";
import { useTypedQueryList } from "@/presentation/store/api";

export function useGrapeTypes() {
  return useTypedQueryList<GrapeType>({ key: "ref.grapeTypes" });
}
