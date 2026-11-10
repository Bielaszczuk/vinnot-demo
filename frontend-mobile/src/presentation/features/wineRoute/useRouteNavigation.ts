import { useTranslation } from "react-i18next";
import type { RouteStop } from "@/domain/route/route.types";
import { routeNavigationService } from "@/application/services/routeNavigation.service";
import { useToast } from "@/presentation/providers/ToastProvider";

export function useRouteNavigation() {
  const { t } = useTranslation();
  const { showError } = useToast();
  const report = async (operation: Promise<boolean>) => {
    if (!(await operation)) showError(t("wineRoutes.navigationFailed"));
  };
  return {
    openRoute: (stops: RouteStop[]) => report(routeNavigationService.openRoute(stops)),
    openStop: (stop: RouteStop) => report(routeNavigationService.openStop(stop)),
  };
}
