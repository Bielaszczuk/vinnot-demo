/**
 * WineCard — branded mobile summary card for wine list views.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WineGlassIcon } from "@/presentation/components/ui/WineGlassIcon";
import { Barrel, BottleWine } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { WineImage } from "@/presentation/features/wine/WineImage";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { radii, iconStrokes, shadowColors } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import type { WineSummary } from "@/domain/wine/wine.types";
import { fontSizes } from "@/shared/theme/typography";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";

interface WineCardProps {
  wine: WineSummary;
  onPress: () => void;
  /** Opens the wine straight on its reviews; without it the count stays plain text. */
  onReviewsPress?: () => void;
  isInCellar?: boolean;
}

const OPEN_REVIEWS_ACTION = "openReviews";

/** "(5) reviews": the number sits in its own Text so a link can underline just it. */
function ReviewCount({ count, onPress }: { count: number; onPress?: () => void }) {
  const { t } = useTranslation();
  const text = (
    <Text style={styles.reviewCount}>
      (<Text style={onPress ? styles.reviewCountLink : undefined}>{count}</Text>){" "}
      {t("wines.reviewCountNoun", { count })}
    </Text>
  );
  if (!onPress) return text;
  return (
    <Pressable
      onPress={onPress}
      style={styles.reviewCountAction}
      accessibilityRole="link"
      accessibilityLabel={t("wines.reviewCountLink", { count })}
    >
      {text}
    </Pressable>
  );
}

export function WineCard({ wine, onPress, onReviewsPress, isInCellar = false }: WineCardProps) {
  const { t } = useTranslation();
  const { formatRating } = useFormatters();
  const locationLine = [wine.winery, [wine.country, wine.region].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");
  const typeLabel = t(`wines.types.${wine.type?.toLowerCase()}`, wine.type).toUpperCase();
  const hasRating = wine.rating != null && wine.rating > 0;

  return (
    <View style={styles.wrapper}>
      <MotionPressable
        onPress={onPress}
        style={styles.card}
        pressedScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${wine.name}. ${t("wines.viewDetails")}`}
        // The count link sits inside this button, where screen readers never reach it: offer it as an action.
        accessibilityActions={
          onReviewsPress ? [{ name: OPEN_REVIEWS_ACTION, label: t("wines.openReviews") }] : undefined
        }
        onAccessibilityAction={
          onReviewsPress
            ? (event) => {
                if (event.nativeEvent.actionName === OPEN_REVIEWS_ACTION) onReviewsPress();
              }
            : undefined
        }
      >
        <View style={styles.imageArea}>
          <WineImage
            uri={wine.imageUrl ?? wine.bottleImageUrl} wineType={wine.type}
            alt={wine.name}
            style={styles.image}
            containerStyle={styles.imageFallback}
          />
          <View style={styles.typePill}>
            <Text style={styles.typeText}>{typeLabel}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <WineGlassIcon
              fill={hasRating ? 1 : 0}
              size={12}
            />
            <Text style={[styles.ratingBadgeText, !hasRating && styles.ratingBadgeTextMuted]}>
              {hasRating ? formatRating(wine.rating!) : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.name}>
              {wine.name}
            </Text>
            {isInCellar ? (
              <View
                style={styles.cellarBadge}
                accessibilityLabel={t("wines.inCellar")}
                accessibilityRole="image"
              >
                <Barrel size={17} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />
              </View>
            ) : null}
          </View>
          {wine.grapeVarieties.length > 0 ? (
            <Text numberOfLines={1} style={styles.grapes}>
              {wine.grapeVarieties.join(" · ")}
            </Text>
          ) : null}
          <Text numberOfLines={1} style={styles.location}>
            {locationLine}
          </Text>

          <View style={styles.footer}>
            <View style={styles.metaRow}>
              <ReviewCount count={wine.reviewCount} onPress={onReviewsPress} />
              {wine.vintage ? (
                <View style={styles.vintagePill}>
                  <Text style={styles.vintageText}>{wine.vintage}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </MotionPressable>

      <View style={styles.notchMask}>
        <MotionPressable
          onPress={onPress}
          style={styles.detailAction}
          pressedScale={0.92}
          accessibilityRole="button"
          accessibilityLabel={`${t("wines.viewDetails")}: ${wine.name}`}
        >
          <BottleWine size={22} color={vinnotColors.white} strokeWidth={iconStrokes.thin} />
        </MotionPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: "relative",
  },
  card: {
    flex: 1,
    height: 330,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    borderRadius: radii["3xl"],
    backgroundColor: vinnotColors.surface,
    shadowColor: shadowColors.deep,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 4,
  },
  imageArea: {
    position: "relative",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderBottomLeftRadius: radii["3xl"],
    borderBottomRightRadius: radii["3xl"],
    backgroundColor: vinnotColors.brandSoft,
  },
  image: {
    width: "82%",
    height: "92%",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
  },
  typePill: {
    position: "absolute",
    top: 12,
    left: 12,
    minHeight: 27,
    justifyContent: "center",
    borderRadius: radii.full,
    paddingHorizontal: 10,
    backgroundColor: "rgba(23, 23, 23, 0.86)",
  },
  typeText: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 13,
    letterSpacing: 0,
    color: vinnotColors.white,
  },
  cellarBadge: {
    flexShrink: 0,
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brandSoft,
  },
  ratingBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    minWidth: 47,
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: vinnotColors.white,
    borderRadius: radii.full,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 8,
  },
  ratingBadgeText: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 15,
    color: vinnotColors.ink,
  },
  ratingBadgeTextMuted: {
    color: vinnotColors.muted,
  },
  body: {
    flex: 1,
    gap: 3,
    paddingTop: 10,
    paddingHorizontal: 13,
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  name: {
    flex: 1,
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.md,
    lineHeight: 20,
    letterSpacing: 0,
    color: vinnotColors.ink,
  },
  grapes: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    letterSpacing: 0,
    color: vinnotColors.brand,
  },
  location: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0,
    color: vinnotColors.muted,
  },
  metaRow: {
    minHeight: 34,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingBottom: 0,
  },
  footer: {
    minHeight: 34,
    marginTop: 3,
    flexDirection: "row",
    alignItems: "stretch",
    marginRight: 46,
  },
  reviewCount: {
    flexShrink: 1,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes["2xs"],
    lineHeight: 15,
    color: vinnotColors.muted,
  },
  reviewCountLink: {
    color: vinnotColors.brand,
    textDecorationLine: "underline",
  },
  // A 44 pt touch target whose negative margin keeps the footer at its current height.
  reviewCountAction: {
    flexShrink: 1,
    minHeight: 44,
    justifyContent: "center",
    marginVertical: -5,
  },
  vintagePill: {
    flexShrink: 0,
    minHeight: 23,
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: vinnotColors.canvas,
    paddingHorizontal: 8,
  },
  vintageText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes["2xs"],
    lineHeight: 13,
    color: vinnotColors.muted,
  },
  notchMask: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 62,
    height: 62,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    overflow: "hidden",
    borderTopLeftRadius: 31,
    backgroundColor: vinnotColors.canvas,
    paddingRight: 4,
    paddingBottom: 4,
  },
  detailAction: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: vinnotColors.brand,
    shadowColor: vinnotColors.brandDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
});
