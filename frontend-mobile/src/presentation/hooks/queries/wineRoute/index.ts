/**
 * Wine Routes query hooks powered by Redux Toolkit Query.
 */
import { skipToken } from "@reduxjs/toolkit/query";
import type { WineRouteFilter, WineRoute, WineRouteHierarchy } from "@/domain/route/route.types";
import type { WineRoutesResult } from "@/application/services/wineRoutes.service";
import { useTypedQuery } from "@/presentation/store/api";

export function useWineRoutes(filter?: WineRouteFilter, page = 0, pageSize = 20) {
  return useTypedQuery<WineRoutesResult>({
    key: "route.list",
    params: { filter, page, pageSize },
  });
}

export function useWineRoute(id: string | undefined) {
  return useTypedQuery<WineRoute>(
    id ? { key: "route.detail", params: { id } } : skipToken,
  );
}

export function useWineRouteHierarchy() {
  return useTypedQuery<WineRouteHierarchy>({ key: "route.hierarchy" });
}
