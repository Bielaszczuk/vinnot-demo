import type { LucideIcon } from "lucide-react-native";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import {
  BookOpen,
  Bus,
  Grape,
  Hammer,
  Landmark,
  MapPin,
  Music2,
  Trophy,
  Utensils,
  Wine,
} from "lucide-react-native";
import type { EventType } from "@/domain/event/event.types";

const EVENT_TYPE_ICONS: Partial<Record<EventType, LucideIcon>> = {
  TASTING: Wine,
  FESTIVAL: Music2,
  TOUR: Bus,
  WORKSHOP: Hammer,
  DINNER: Utensils,
  PAIRING: Utensils,
  HARVEST: Grape,
  FAIR: Landmark,
  COMPETITION: Trophy,
  CLASS: BookOpen,
  OTHER: MapPin,
};

type EventTypeGlyphProps = {
  type: EventType | string;
  size?: number;
  color?: string;
};

export function EventTypeGlyph({
  type,
  size = 14,
  color = vinnotColors.brand,
}: EventTypeGlyphProps) {
  const Icon = EVENT_TYPE_ICONS[type as EventType] ?? MapPin;
  return <Icon size={size} color={color} />;
}
