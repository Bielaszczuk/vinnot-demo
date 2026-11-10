import { useLocalSearchParams } from "expo-router";
import { WineRouteDetailScreen } from "@/presentation/features/wineRoute/WineRouteDetailScreen";

export default function WineRouteDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WineRouteDetailScreen id={id} />;
}
