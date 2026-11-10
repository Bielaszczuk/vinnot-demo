/**
 * CellarStatsBanner — the cellar's cover: illustration, headline figures and
 * the mix of wine types. The purchase price is stored but not shown here.
 */
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { summarizeCellar, type CellarTypeShare } from "@/domain/cellar/cellar.stats";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { WineGlassIcon } from "@/presentation/components/ui/WineGlassIcon";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { wineTypeLabel } from "@/presentation/features/wine/wineTypeLabel";
import { illustrations } from "@/shared/illustrations";
import { shadows } from "@/shared/theme/shadows";
import { iconStrokes, radii, spacing, wineTypeSwatch } from "@/shared/theme/tokens";
import { fontSizes } from "@/shared/theme/typography";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";

interface CellarStatsBannerProps {
  entries: CellarEntry[];
  onAddPress: () => void;
}

const COVER_SHADE = ["rgba(28, 8, 18, 0.05)", "rgba(28, 8, 18, 0.82)"] as const;
/** Subtitle on the shaded illustration: white, slightly softer than the title. */
const SUBTITLE_ON_IMAGE = "rgba(255, 255, 255, 0.86)";
const COVER_HEIGHT = 184;
const ADD_BUTTON_HEIGHT = 40;
const MIX_BAR_HEIGHT = 10;
const LEGEND_DOT_SIZE = 9;
/** The illustration is wider than the card so its watercolor edges fall outside. */
const COVER_ZOOM = 1.14;
/** Share of the illustration hidden above the card, so the arch and lantern stay in view. */
const COVER_TOP_CROP = 0.1;

export function CellarStatsBanner({ entries, onAddPress }: CellarStatsBannerProps) {
  const { formatRating } = useFormatters();
  const { t } = useTranslation();
  const summary = summarizeCellar(entries);
  const [coverWidth, setCoverWidth] = useState(0);
  const imageSize = coverWidth * COVER_ZOOM;

  if (summary.wineCount === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <View style={styles.emptyTitles}>
          <Text accessibilityRole="header" style={styles.title}>{t("cellar.title")}</Text>
          <Text style={styles.subtitle}>{t("cellar.subtitle")}</Text>
        </View>
        <AddButton label={t("cellar.addWine")} onPress={onAddPress} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cover} onLayout={(event) => setCoverWidth(event.nativeEvent.layout.width)}>
        <Image
          testID="cellar-banner-illustration"
          source={illustrations.emptyCellar}
          resizeMode="cover"
          style={[
            styles.coverImage,
            {
              width: imageSize,
              height: imageSize,
              left: (coverWidth - imageSize) / 2,
              top: -imageSize * COVER_TOP_CROP,
            },
          ]}
          accessibilityIgnoresInvertColors
        />
        <LinearGradient colors={COVER_SHADE} style={StyleSheet.absoluteFill} />
        <View style={styles.coverAdd}>
          <AddButton label={t("cellar.addWine")} onPress={onAddPress} onImage />
        </View>
        <View style={styles.coverTitles}>
          <Text accessibilityRole="header" style={[styles.title, styles.titleOnImage]}>
            {t("cellar.title")}
          </Text>
          <Text style={[styles.subtitle, styles.subtitleOnImage]}>{t("cellar.subtitle")}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.stats}>
          <Stat value={String(summary.wineCount)} label={t("cellar.stats.wines")} />
          <View style={styles.divider} />
          <Stat
            value={summary.averageRating != null ? formatRating(summary.averageRating) : "—"}
            label={t("cellar.stats.average")}
            withGlass={summary.averageRating != null}
          />
          <View style={styles.divider} />
          <Stat value={String(summary.regionCount)} label={t("cellar.stats.regions")} />
        </View>
        <TypeMix
          mix={summary.typeMix}
          total={summary.wineCount}
          label={(type) => wineTypeLabel(t, type)}
          title={t("cellar.stats.typeMix")}
        />
      </View>
    </View>
  );
}

function AddButton({ label, onPress, onImage = false }: { label: string; onPress: () => void; onImage?: boolean }) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.addButton, onImage && styles.addButtonOnImage]}
    >
      <Plus size={17} color={onImage ? vinnotColors.brand : vinnotColors.white} strokeWidth={iconStrokes.strong} />
      <Text style={[styles.addButtonText, onImage && styles.addButtonTextOnImage]}>{label}</Text>
    </MotionPressable>
  );
}

function Stat({ value, label, withGlass = false }: { value: string; label: string; withGlass?: boolean }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        {withGlass && <WineGlassIcon fill={1} size={13} />}
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{value}</Text>
      </View>
      <Text numberOfLines={1} style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TypeMix({
  mix,
  total,
  label,
  title,
}: {
  mix: CellarTypeShare[];
  total: number;
  label: (type: string) => string;
  title: string;
}) {
  const description = mix.map((share) => `${label(share.type)} ${share.count}`).join(", ");
  return (
    <View style={styles.mix} accessible accessibilityLabel={`${title}: ${description}`}>
      <View style={styles.mixBar}>
        {mix.map((share) => (
          <View
            key={share.type}
            testID={`cellar-type-mix-${share.type}`}
            style={{ flex: share.count / total, backgroundColor: wineTypeSwatch(share.type) }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {mix.map((share) => (
          <View key={share.type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: wineTypeSwatch(share.type) }]} />
            <Text style={styles.legendText}>{`${label(share.type)} · ${share.count}`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: radii["3xl"],
    backgroundColor: vinnotColors.white,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    ...shadows.sm,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
    padding: spacing[5],
  },
  emptyTitles: { flex: 1 },
  cover: {
    height: COVER_HEIGHT,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: vinnotColors.brandDeep,
  },
  coverImage: { position: "absolute" },
  coverAdd: { position: "absolute", top: spacing[3.5], right: spacing[3.5] },
  coverTitles: { paddingHorizontal: spacing[5], paddingBottom: spacing[4] },
  title: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes["3xl"],
    color: vinnotColors.ink,
  },
  titleOnImage: { color: vinnotColors.white },
  subtitle: {
    marginTop: spacing[0.5],
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 21,
    color: vinnotColors.muted,
  },
  subtitleOnImage: { color: SUBTITLE_ON_IMAGE },
  addButton: {
    minHeight: ADD_BUTTON_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1.5],
    borderRadius: radii.full,
    paddingHorizontal: spacing[3.5],
    backgroundColor: vinnotColors.brand,
  },
  addButtonOnImage: { backgroundColor: vinnotColors.white, ...shadows.sm },
  addButtonText: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.sm,
    color: vinnotColors.white,
  },
  addButtonTextOnImage: { color: vinnotColors.brand },
  body: { gap: spacing[4], paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4] },
  stats: { flexDirection: "row", alignItems: "center" },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: vinnotColors.border },
  stat: { flex: 1, alignItems: "center", gap: spacing[0.5] },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: spacing[1] },
  statValue: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.xl,
    color: vinnotColors.ink,
  },
  statLabel: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    color: vinnotColors.muted,
  },
  mix: { gap: spacing[2.5] },
  mixBar: {
    height: MIX_BAR_HEIGHT,
    flexDirection: "row",
    gap: spacing[0.5],
    overflow: "hidden",
    borderRadius: radii.full,
    backgroundColor: vinnotColors.canvasMuted,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing[3.5], rowGap: spacing[1.5] },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing[1.5] },
  legendDot: { width: LEGEND_DOT_SIZE, height: LEGEND_DOT_SIZE, borderRadius: radii.full },
  legendText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    color: vinnotColors.ink,
  },
});
