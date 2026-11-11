import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowUpRight, Clock, MapPin, Navigation, Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { useCountryName } from "@/presentation/hooks/useCountryName";
import { Badge, TagPill } from "@/presentation/components/ui/Atoms";
import { PressableCard } from "@/presentation/components/ui/Card";
import { radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import type { WineRoute } from "@/domain/route/route.types";
import { RouteCoverImage } from "./RouteCoverImage";
import { RouteDifficultyGlyph } from "./RouteGlyph";
import { formatRouteDistance, formatRouteLength } from "./routePresentation";
import { wineTypeLabel } from "@/presentation/features/wine/wineTypeLabel";
import { COVER_ASPECT } from "@/domain/media/imageAspect";

export function WineRouteCard({ route, onPress }: { route: WineRoute; onPress: () => void }) {
  const { formatRating } = useFormatters();
  const { t } = useTranslation();
  const countryName = useCountryName();
  const location = [route.region, countryName(route.country)].filter(Boolean).join(", ");

  return (
    <PressableCard
      onPress={onPress}
      padding={0}
      radius={radii["2xl"]}
      elevation="none"
      style={styles.card}
    >
      <View style={styles.imageArea}>
        <RouteCoverImage uri={route.imageUrl} alt={route.name} style={styles.image} />
      </View>
      <View style={styles.body}>
        <View style={styles.eyebrowRow}>
          {route.difficulty ? (
            <View style={styles.difficulty}>
              <RouteDifficultyGlyph
                difficulty={route.difficulty}
                size={13}
                color={vinnotColors.brand}
              />
              <Text style={styles.difficultyText}>
                {t(`wineRoutes.difficulty.${route.difficulty}`, route.difficulty)}
              </Text>
            </View>
          ) : (
            <View style={styles.difficulty} />
          )}
          {!!route.rating && (
            <View style={styles.stat}>
              <Star size={14} color={vinnotColors.brand} fill={vinnotColors.brand} />
              <Text style={styles.statText}>{formatRating(route.rating)}</Text>
            </View>
          )}
          <ArrowUpRight size={19} color={vinnotColors.brand} />
        </View>
        <Text numberOfLines={2} style={styles.name}>
          {route.name}
        </Text>
        {!!location && (
          <Text numberOfLines={2} style={styles.location}>
            {location}
          </Text>
        )}
        {!!route.description && (
          <Text numberOfLines={2} style={styles.description}>
            {route.description}
          </Text>
        )}
        <View style={styles.stats}>
          <Stat
            icon={<Clock size={15} color={vinnotColors.brand} />}
            value={formatRouteLength(route.duration, route.estimatedDays, t)}
          />
          <Stat
            icon={<Navigation size={15} color={vinnotColors.brand} />}
            value={formatRouteDistance(route.distance)}
          />
          <Stat
            icon={<MapPin size={15} color={vinnotColors.brand} />}
            value={`${route.stopCount ?? route.stops.length} ${t("wineRoutes.stops")}`}
          />
        </View>
        {route.tags.length > 0 && (
          <View style={styles.tags}>
            {route.tags.slice(0, 2).map((tag) => (
              <TagPill key={tag} label={wineTypeLabel(t, tag)} />
            ))}
            {route.tags.length > 2 && <Badge label={`+${route.tags.length - 2}`} />}
          </View>
        )}
      </View>
    </PressableCard>
  );
}

function Stat({ icon, value }: { icon: ReactNode; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: vinnotColors.borderSoft, backgroundColor: vinnotColors.surface },
  // Same 16:9 frame the cover was adjusted in.
  imageArea: { aspectRatio: COVER_ASPECT, overflow: "hidden", backgroundColor: vinnotColors.brandSoft },
  image: { width: "100%", height: "100%" },
  body: { gap: 10, padding: 18 },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  difficulty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brandSoft,
  },
  difficultyText: { ...textStyles.labelSmall, color: vinnotColors.brand },
  name: { ...textStyles.headingSmall, color: vinnotColors.ink },
  location: { ...textStyles.caption, color: vinnotColors.muted },
  description: { ...textStyles.bodySmall, color: vinnotColors.muted, lineHeight: 21 },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: vinnotColors.borderSoft,
    paddingTop: 12,
    marginTop: 2,
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { ...textStyles.caption, color: vinnotColors.ink },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
