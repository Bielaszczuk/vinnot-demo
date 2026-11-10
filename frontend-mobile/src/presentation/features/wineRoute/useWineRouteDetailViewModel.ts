import { useWineRoute } from "@/presentation/hooks/queries/wineRoute";
import { useShareLink } from "@/presentation/hooks/useShareLink";
import { useDetailViewTracking } from "@/presentation/hooks/useDetailViewTracking";
import { routeDurationMinutes } from "@/domain/route/route.navigation";
import { canShareRoute } from "@/domain/sharing/shareability";
import { useRouteNavigation } from "./useRouteNavigation";

export function useWineRouteDetailViewModel(id: string | undefined) {
  const query = useWineRoute(id);
  useDetailViewTracking("ROUTE", id);
  const route = query.data;
  const shareLink = useShareLink();
  const { openRoute } = useRouteNavigation();
  const canShare = route ? canShareRoute(route) : false;
  return {
    query,
    route,
    durationMinutes: route ? routeDurationMinutes(route) : 0,
    canShare,
    share: () => {
      if (route && canShare) void shareLink({ kind: "wine-routes", id: route.id, title: route.name });
    },
    navigate: () => {
      if (route) void openRoute(route.stops);
    },
  };
}
