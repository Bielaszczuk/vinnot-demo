import { useLocalSearchParams } from "expo-router";
import { EventDetailScreen } from "@/presentation/features/event/EventDetailScreen";

export default function EventDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventDetailScreen eventId={id} />;
}
