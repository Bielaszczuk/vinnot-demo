import { Redirect } from "expo-router";
import { WINE_ROUTES_ROUTE } from "@/presentation/navigation/discoveryNavigation";

export default function LegacyWineRoutesRoute() {
  return <Redirect href={WINE_ROUTES_ROUTE} />;
}
