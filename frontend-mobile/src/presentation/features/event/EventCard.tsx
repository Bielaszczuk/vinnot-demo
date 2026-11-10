/**
 * EventCard — visual event summary; navigation stays owned by its parent screen.
 */
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { CoverImage } from "@/presentation/components/features/media/CoverImage";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { shadows } from "@/shared/theme/shadows";
import { radii, spacing } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import type { Event } from "@/domain/event/event.types";
import { daysUntil, formatEventDate, formatEventTime, formatEventPrice } from "./eventPresentation";
import { EventTypeGlyph } from "./EventTypeGlyph";
import { illustrations } from "../../../shared/illustrations";
import { fontSizes } from "@/shared/theme/typography";
import { COVER_ASPECT } from "@/domain/media/imageAspect";

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const { t, i18n } = useTranslation();
  const days = daysUntil(event.startDate);
  const capacityPercent = event.maxAttendees
    ? Math.min(100, (event.currentAttendees / event.maxAttendees) * 100)
    : 0;
  const location = [event.location.name || event.location.city, event.location.region]
    .filter(Boolean)
    .join(", ");

  return (
    <MotionPressable
      onPress={onPress}
      pressedScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      style={styles.card}
    >
      <View style={styles.imageArea}>
        <CoverImage
          uri={event.imageUrl}
          fallbackSource={illustrations.event}
          alt={event.title}
          style={styles.image}
          containerStyle={styles.imageFallback}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(23,23,23,0.32)", "transparent", "rgba(23,23,23,0.46)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.typeBadge}>
          <EventTypeGlyph type={event.type} size={12} color={vinnotColors.white} />
          <Text style={styles.typeText}>{t(`events.types.${event.type}`, event.type)}</Text>
        </View>
        {days >= 0 && days <= 7 ? (
          <View style={styles.daysBadge}>
            <Text style={styles.daysText}>
              {days === 0
                ? t("events.today")
                : days === 1
                  ? t("events.tomorrow")
                  : `${days} ${t("events.daysLeft")}`}
            </Text>
          </View>
        ) : null}
        <View style={styles.dateBadge}>
          <Text style={styles.month}>
            {event.startDate.toLocaleDateString(i18n.language, { month: "short" })}
          </Text>
          <Text style={styles.day}>{event.startDate.getDate()}</Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{event.price ? formatEventPrice(event.price, event.registration?.currency ?? "ARS", i18n.language) : t("events.free")}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <CalendarDays size={15} color={vinnotColors.brand} />
          <Text numberOfLines={1} style={styles.meta}>
            {formatEventDate(event.startDate, i18n.language)} · {formatEventTime(event.startDate, i18n.language)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <MapPin size={15} color={vinnotColors.brand} />
          <Text numberOfLines={1} style={styles.meta}>
            {location}
          </Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.attendeesRow}>
            <Users size={15} color={vinnotColors.muted} />
            <Text style={styles.attendees}>
              {t("events.attendeeCount", {
                count: event.maxAttendees ?? event.currentAttendees,
                value: `${event.currentAttendees}${event.maxAttendees ? `/${event.maxAttendees}` : ""}`,
              })}
            </Text>
          </View>
          {event.maxAttendees ? (
            <View style={styles.capacityTrack}>
              <View style={[styles.capacityFill, { width: `${capacityPercent}%` }]} />
            </View>
          ) : null}
        </View>
      </View>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    borderRadius: radii["3xl"],
    backgroundColor: vinnotColors.surface,
    ...shadows.md,
  },
  // Same 16:9 frame the cover was adjusted in, so the card shows what the organizer framed.
  imageArea: {
    aspectRatio: COVER_ASPECT,
    overflow: "hidden",
    backgroundColor: vinnotColors.brandSoft,
  },
  image: { width: "100%", height: "100%" },
  imageFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: vinnotColors.brandSoft,
  },
  typeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: vinnotColors.brand,
  },
  typeText: {
    color: vinnotColors.white,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 13,
    textTransform: "uppercase",
  },
  daysBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  daysText: {
    color: vinnotColors.brand,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 13,
    textTransform: "uppercase",
  },
  dateBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    minWidth: 52,
    alignItems: "center",
    borderRadius: radii.lg,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  month: {
    color: vinnotColors.brand,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 12,
    textTransform: "uppercase",
  },
  day: {
    color: vinnotColors.ink,
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.xl,
    lineHeight: 24,
  },
  priceBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    borderRadius: radii.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "rgba(23,23,23,0.86)",
  },
  priceText: {
    color: vinnotColors.white,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 15,
  },
  body: { gap: spacing[2], padding: spacing[4] },
  title: {
    color: vinnotColors.ink,
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.xl,
    lineHeight: 25,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  meta: {
    flex: 1,
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  footer: {
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: vinnotColors.borderSoft,
    paddingTop: spacing[3],
    marginTop: 2,
  },
  attendeesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  attendees: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 16,
  },
  capacityTrack: {
    height: 5,
    overflow: "hidden",
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brandSoft,
  },
  capacityFill: {
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brand,
  },
});
