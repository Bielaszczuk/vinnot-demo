import type { ComponentProps } from "react";
import {
  BedDouble,
  Building2,
  CarFront,
  Footprints,
  Landmark,
  Map,
  MapPin,
  Mountain,
  Utensils,
} from "lucide-react-native";
import type { RouteDifficulty, StopType } from "@/domain/route/route.types";

type GlyphProps = Pick<ComponentProps<typeof MapPin>, "color" | "size" | "strokeWidth">;

const DIFFICULTY_ICONS = {
  short: Footprints,
  medium: CarFront,
  long: Map,
} satisfies Record<RouteDifficulty, typeof MapPin>;

const STOP_ICONS = {
  winery: Building2,
  restaurant: Utensils,
  viewpoint: Mountain,
  attraction: Landmark,
  accommodation: BedDouble,
} satisfies Record<StopType, typeof MapPin>;

export function RouteDifficultyGlyph({
  difficulty,
  color,
  size = 14,
  strokeWidth = 1.8,
}: GlyphProps & { difficulty: RouteDifficulty }) {
  const Icon = DIFFICULTY_ICONS[difficulty] ?? MapPin;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

export function RouteStopTypeGlyph({
  type,
  color,
  size = 14,
  strokeWidth = 1.8,
}: GlyphProps & { type: StopType }) {
  const Icon = STOP_ICONS[type] ?? MapPin;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
