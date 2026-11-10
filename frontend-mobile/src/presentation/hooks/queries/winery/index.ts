/**
 * Winery query hooks powered by Redux Toolkit Query.
 */
import { skipToken } from "@reduxjs/toolkit/query";
import type { WineryFilter } from "@/domain/winery/winery.types";
import type { PaginatedResult, WineSummary } from "@/domain/wine/wine.types";
import type { WineriesResult } from "@/application/services/wineries.service";
import type { Winery } from "@/domain/winery/winery.types";
import { useExecuteMutationMutation, useTypedQuery } from "@/presentation/store/api";
import { useMutationAdapter } from "@/presentation/store/mutationAdapter";

/** Pass `enabled: false` to skip the request, for example until the user types a search. */
export function useWineries(filter?: WineryFilter, page = 0, pageSize = 20, enabled = true) {
  return useTypedQuery<WineriesResult>(
    enabled
      ? {
          key: "winery.list",
          params: { filter, page, pageSize },
        }
      : skipToken,
  );
}

export function useWinery(id: string | undefined) {
  return useTypedQuery<Winery>(
    id ? { key: "winery.detail", params: { id } } : skipToken,
  );
}

export function useWineryWines(id: string | undefined, page = 0, pageSize = 20) {
  return useTypedQuery<PaginatedResult<WineSummary>>(
    id ? { key: "winery.wines", params: { id, page, pageSize } } : skipToken,
  );
}

interface UpdateWineryCoordinatesVars {
  id: string;
  latitude: number;
  longitude: number;
  address?: string | null;
}

export function useUpdateWineryCoordinates() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (variables: UpdateWineryCoordinatesVars) =>
      trigger({ key: "winery.updateCoordinates", params: { ...variables } }),
    state,
  );
}
