/**
 * RouteStopTimeline — expandable native route stops timeline.
 */
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  Mail,
  Navigation,
  Phone,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card } from "@/presentation/components/ui/Card";
import { lightTokens, radii, wine, iconStrokes } from "@/shared/theme/tokens";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { textStyles } from "@/shared/theme/typography";
import type { RouteStop } from "@/domain/route/route.types";
import { RouteStopTypeGlyph } from "./RouteGlyph";
import { formatRouteDuration } from "./routePresentation";
import { useRouteNavigation } from "./useRouteNavigation";

interface RouteStopTimelineProps {
  stops: RouteStop[];
}

export function RouteStopTimeline({ stops }: RouteStopTimelineProps) {
  const { t } = useTranslation();
  const { openStop } = useRouteNavigation();
  const [expandedStop, setExpandedStop] = useState<string | null>(stops[0]?.id ?? null);

  if (stops.length === 0) return null;

  return (
    <Card elevation="none" radius={radii["2xl"]} style={styles.card}>
      <Text style={styles.sectionTitle}>{t("wineRoutes.routeStops")}</Text>
      <View style={styles.timeline}>
        <View style={styles.line} />
        {stops.map((stop, index) => {
          const isExpanded = expandedStop === stop.id;
          const isFirst = index === 0;
          const isLast = index === stops.length - 1;
          return (
            <View key={stop.id} style={[styles.stopRow, isExpanded && styles.stopRowExpanded]}>
              <View style={styles.dotWrap}>
                <View style={[styles.dot, isFirst && styles.dotFirst, isLast && styles.dotLast]}>
                  {isFirst ? (
                    <Navigation size={14} color={lightTokens.textInverted} fill={lightTokens.textInverted} />
                  ) : isLast ? (
                    <Check size={15} color={lightTokens.textInverted} strokeWidth={iconStrokes.strong} />
                  ) : (
                    <Text style={styles.dotText}>{index + 1}</Text>
                  )}
                </View>
              </View>
              <View style={styles.stopContent}>
                <Pressable
                  onPress={() => setExpandedStop(isExpanded ? null : stop.id)}
                  accessibilityRole="button"
                  accessibilityLabel={stop.name}
                  accessibilityState={{ expanded: isExpanded }}
                  style={styles.stopHeader}
                >
                  <Text numberOfLines={2} style={styles.stopName}>
                    {stop.name}
                  </Text>
                  <ChevronDown
                    size={18}
                    color={lightTokens.textTertiary}
                    style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}
                  />
                </Pressable>
                <View style={styles.stopMeta}>
                  <RouteStopTypeGlyph type={stop.type} size={13} color={lightTokens.textTertiary} />
                  <Text style={styles.stopType}>
                    {t(`wineRoutes.stopTypes.${stop.type}`, stop.type)}
                  </Text>
                  {stop.duration > 0 && (
                    <Text style={styles.stopType}>· {formatRouteDuration(stop.duration)}</Text>
                  )}
                </View>
                {!!stop.location.address && (
                  <Text numberOfLines={isExpanded ? 3 : 1} style={styles.address}>
                    {stop.location.address}
                  </Text>
                )}

                {isExpanded && (
                  <View style={styles.expanded}>
                    {!!stop.description && (
                      <Text style={styles.description}>{stop.description}</Text>
                    )}
                    {!!stop.winery && (
                      <View style={styles.wineryBox}>
                        <View style={styles.wineryHeading}>
                          <Building2 size={14} color={wine[700]} />
                          <Text style={styles.wineryName}>{stop.winery.name}</Text>
                        </View>
                        {!!stop.winery.phone && (
                          <Contact
                            icon={<Phone size={13} color={wine[700]} />}
                            value={stop.winery.phone}
                          />
                        )}
                        {!!stop.winery.email && (
                          <Contact
                            icon={<Mail size={13} color={wine[700]} />}
                            value={stop.winery.email}
                          />
                        )}
                      </View>
                    )}
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={t("events.openMaps")}
                      onPress={() => void openStop(stop)}
                      style={styles.mapsButton}
                    >
                      <ExternalLink size={14} color={wine[700]} />
                      <Text style={styles.mapsText}>{t("events.openMaps")}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function Contact({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <View style={styles.contactRow}>
      {icon}
      <Text style={styles.contactText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
  },
  sectionTitle: { ...textStyles.headingSmall, color: vinnotColors.ink, marginBottom: 20 },
  timeline: { position: "relative" },
  line: {
    position: "absolute",
    left: 18,
    top: 18,
    bottom: 18,
    width: 1,
    borderRadius: 1,
    backgroundColor: vinnotColors.borderSoft,
  },
  stopRow: {
    flexDirection: "row",
    gap: 10,
    borderRadius: radii.xl,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  stopRowExpanded: { backgroundColor: vinnotColors.brandSoft },
  dotWrap: { width: 32, alignItems: "center" },
  dot: {
    zIndex: 1,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  dotFirst: { borderColor: wine[600], backgroundColor: wine[700] },
  dotLast: { borderColor: vinnotColors.success, backgroundColor: vinnotColors.success },
  dotText: { ...textStyles.labelMedium, color: lightTokens.textPrimary },
  stopContent: { flex: 1, gap: 5 },
  stopHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stopName: { flex: 1, ...textStyles.titleMedium, color: vinnotColors.ink },
  stopMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  stopType: { ...textStyles.caption, color: lightTokens.textSecondary },
  address: { ...textStyles.caption, color: lightTokens.textSecondary },
  expanded: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: lightTokens.borderDefault,
    marginTop: 8,
    paddingTop: 10,
  },
  description: { ...textStyles.bodySmall, color: lightTokens.textSecondary, lineHeight: 21 },
  wineryBox: {
    gap: 6,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: vinnotColors.surface,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
  },
  wineryHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  wineryName: { flex: 1, ...textStyles.labelMedium, color: vinnotColors.ink },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  contactText: { flex: 1, ...textStyles.caption, color: lightTokens.textSecondary },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    minHeight: 44,
    paddingVertical: 10,
    backgroundColor: vinnotColors.surface,
  },
  mapsText: { ...textStyles.labelMedium, color: vinnotColors.brand },
});
