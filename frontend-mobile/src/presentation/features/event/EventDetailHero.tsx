/**
 * EventDetailHero — event detail header.
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Atoms";
import { Card } from "@/presentation/components/ui/Card";
import { CoverImage } from "@/presentation/components/features/media/CoverImage";
import { shadows } from "@/shared/theme/shadows";
import { radii, spacing } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import type { Event } from "@/domain/event/event.types";
import { formatEventDate, formatEventTime, formatEventPrice } from "./eventPresentation";
import { illustrations } from "../../../shared/illustrations";
import { fontSizes } from "@/shared/theme/typography";
import { COVER_ASPECT } from "@/domain/media/imageAspect";

interface EventDetailHeroProps {
  event: Event;
}

export function EventDetailHero({ event }: EventDetailHeroProps) {
  const { t, i18n } = useTranslation();
  const location = [event.location.name, event.location.city, event.location.region]
    .filter(Boolean)
    .join(", ");

  return (
    <Card padding={0} radius={radii.xl} style={styles.card}>
      <View style={styles.imageArea}>
        <CoverImage
          uri={event.imageUrl}
          fallbackSource={illustrations.event}
          alt={event.title}
          style={styles.image}
          containerStyle={styles.imageFallback}
          contentFit="cover"
        />
        <View style={styles.dateBadge}>
          <Text style={styles.month}>
            {event.startDate.toLocaleDateString(i18n.language, { month: "short" })}
          </Text>
          <Text style={styles.day}>{event.startDate.getDate()}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge label={t(`events.types.${event.type}`, event.type)} variant="brand" />
          <Badge
            label={event.price ? formatEventPrice(event.price, event.registration?.currency ?? "ARS", i18n.language) : t("events.free")}
            variant={event.price ? "default" : "success"}
          />
        </View>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.organizer}>{event.organizer.name}</Text>
        <View style={styles.metaGrid}>
          <Meta
            icon={<CalendarDays size={17} color={vinnotColors.brand} />}
            label={t("events.date")}
            value={`${formatEventDate(event.startDate, i18n.language)} · ${formatEventTime(event.startDate, i18n.language)}`}
          />
          <Meta
            icon={<MapPin size={17} color={vinnotColors.brand} />}
            label={t("events.location")}
            value={location}
          />
          <Meta
            icon={<Users size={17} color={vinnotColors.brand} />}
            label={t("events.attendees")}
            value={`${event.currentAttendees}${event.maxAttendees ? ` / ${event.maxAttendees}` : ""}`}
          />
        </View>
      </View>
    </Card>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaIcon}>{icon}</View>
      <View style={styles.metaText}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.metaValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vinnotColors.border,
    backgroundColor: vinnotColors.surface,
    ...shadows.md,
  },
  // Same 16:9 frame the cover was adjusted in.
  imageArea: { aspectRatio: COVER_ASPECT, backgroundColor: vinnotColors.brandSoft },
  image: { width: "100%", height: "100%" },
  imageFallback: { width: "100%", height: "100%", backgroundColor: vinnotColors.brandSoft },
  dateBadge: {
    position: "absolute",
    bottom: spacing[4],
    left: spacing[4],
    minWidth: 62,
    alignItems: "center",
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.74)",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  month: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 14,
    textTransform: "uppercase",
    color: vinnotColors.brand,
  },
  day: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.xl,
    lineHeight: 26,
    color: vinnotColors.ink,
  },
  body: { gap: 12, padding: spacing[5] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes["2xl"],
    lineHeight: 32,
    color: vinnotColors.ink,
  },
  organizer: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 20,
    color: vinnotColors.muted,
  },
  metaGrid: { gap: 11, marginTop: 4 },
  metaItem: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  metaIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  metaText: { flex: 1 },
  metaLabel: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 15,
    color: vinnotColors.muted,
  },
  metaValue: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.ui,
    lineHeight: 20,
    color: vinnotColors.ink,
  },
});
