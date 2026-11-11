/**
 * TasteWheel — the user's palate from their rated wines, one kind at a time: «Uvas» (the
 * default), «Estilos» or «Regiones», with empty views hidden. One wedge per entry at equal
 * angles, each painted as watercolor in its colour (grapes by their tone, styles by wine type,
 * regions in distinct hues), on a cream paper stage with the emblem of the open view at the
 * centre. Tapping a wedge or its legend row grows it, fades the rest and shows its name,
 * average score and rated wines in the centre; tapping it again clears it. It turns and grows
 * into place once; under the system Reduce Motion setting it is drawn still and selections
 * change without motion.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import type { TasteKind, TasteSlice } from "@/domain/social/social.types";
import { Chip } from "@/presentation/components/ui/Chip";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { TASTE_ART, TASTE_WEDGE_WASHES } from "@/shared/profileArt";
import { editorial, radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import paperImage from "../../../../assets/images/loading/paper.webp";
import {
  TASTE_WHEEL_MAX_SIZE,
  centreLabelFontSize,
  centreTextWidth,
  tasteWheelSize,
  tasteWheelWedges,
  wheelHole,
  type WashVariant,
} from "./tasteWheelGeometry";
import { darkWash, lightWash, type PaintedSlice } from "./tasteWheelPalette";
import { TasteWheelCanvas } from "./TasteWheelCanvas";
import { useTasteWheel } from "./useTasteWheel";

export const TASTE_WHEEL_REVEAL_MS = 900;
/** Cream margin around the wedges, as a share of the wheel. */
const STAGE_PADDING_SHARE = 0.05;
/** The vineyard is a wide landscape, so it is drawn larger to read as well as the others. */
const WIDE_EMBLEM_SCALE = 1.25;
/** Each view shows its own emblem at the centre: grapes, wine glasses for styles, a vineyard for regions. */
const WHEEL_EMBLEM: Record<TasteKind, number> = {
  GRAPE: TASTE_ART.GRAPE_CLUSTER,
  TYPE: TASTE_ART.WINE_GLASSES,
  REGION: TASTE_ART.VINEYARD,
};
const SWATCH_SIZE = 14;
/** SVG shapes take `accessible` and a label natively; the role rides along for tests and web. */
const pressTargetA11y = (accessibilityLabel: string) => ({
  accessible: true,
  accessibilityRole: "button" as const,
  accessibilityLabel,
});

/** `maxSize` caps the wheel; it takes 88% of the card's content width when that is smaller. */
export function TasteWheel({ slices, maxSize = TASTE_WHEEL_MAX_SIZE }: { slices: TasteSlice[]; maxSize?: number }) {
  const { t } = useTranslation();
  const { formatRating } = useFormatters();
  const reduceMotion = useReduceMotionEnabled();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const wheel = useTasteWheel(slices);
  const [contentWidth, setContentWidth] = useState<number | null>(null);
  const size = tasteWheelSize(contentWidth, maxSize);
  const stage = size + 2 * Math.round(size * STAGE_PADDING_SHARE);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: TASTE_WHEEL_REVEAL_MS, easing: Easing.out(Easing.cubic) });
  }, [progress, reduceMotion]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + 0.8 * progress.value,
    transform: [{ rotate: `${(1 - progress.value) * -60}deg` }, { scale: 0.55 + 0.45 * progress.value }],
  }));

  const wedges = tasteWheelWedges(
    wheel.painted.map((entry) => entry.slice),
    size,
  );
  const center = size / 2;
  const hole = wheelHole(size);
  const emblem = hole * 1.4 * (wheel.view === "REGION" ? WIDE_EMBLEM_SCALE : 1);
  /** Wine styles are named from their code; grapes and regions keep the name sent. */
  const labelOf = (slice: TasteSlice) =>
    slice.kind === "TYPE" ? t(`wines.types.${slice.value}`, { defaultValue: slice.label }) : slice.label;
  const winesOf = (slice: TasteSlice) => t("social.taste.ratedWines", { count: slice.ratedWines });
  /** Older payloads carry no rated wines: then only the name and score are told. */
  const a11yOf = (slice: TasteSlice) =>
    slice.ratedWines > 0
      ? t("social.taste.sliceButtonA11y", { label: labelOf(slice), score: formatRating(slice.score), wines: winesOf(slice) })
      : t("social.taste.sliceScoreA11y", { label: labelOf(slice), score: formatRating(slice.score) });
  const selected = wheel.selected;
  const selectedLabel = selected ? labelOf(selected.slice) : "";
  const labelSize = centreLabelFontSize(selectedLabel);

  return (
    <View
      testID="taste-wheel-container"
      style={styles.container}
      onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
    >
      {wheel.views.length > 1 ? (
        <View
          style={styles.views}
          accessibilityRole="radiogroup"
          accessibilityLabel={t("social.taste.viewsA11y")}
          testID="taste-views"
        >
          {wheel.views.map((kind) => (
            <Chip
              key={kind}
              role="radio"
              label={t(`social.taste.views.${kind}`)}
              selected={kind === wheel.view}
              onPress={() => wheel.chooseView(kind)}
            />
          ))}
        </View>
      ) : null}
      <View testID="taste-wheel-stage" style={[styles.stage, { width: stage, height: stage }]}>
        <Image
          testID="taste-wheel-paper"
          accessible={false}
          source={paperImage}
          contentFit="cover"
          style={[StyleSheet.absoluteFill, styles.paper]}
        />
        <View testID="taste-wheel" style={{ width: size, height: size }}>
          <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <TasteWheelCanvas
                size={size}
                wedges={wedges}
                colors={wheel.painted.map((entry) => entry.color)}
                selectedValue={selected?.slice.value ?? null}
                reduceMotion={reduceMotion}
              />
            </View>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
              <Circle
                cx={center}
                cy={center}
                r={hole - 0.5}
                stroke={editorial.creamMuted}
                strokeWidth={1}
                strokeDasharray="2 4"
                fill="none"
              />
              {wedges.map((wedge, index) => (
                <Path
                  key={wedge.key}
                  {...pressTargetA11y(a11yOf(wedge.slice))}
                  testID={`taste-slice-${wedge.slice.value}`}
                  d={wedge.sector}
                  fill={wheel.painted[index]!.color}
                  fillOpacity={0}
                  onPress={() => wheel.toggle(wedge.slice.value)}
                />
              ))}
            </Svg>
          </Animated.View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centre]}>
            {selected ? (
              <View testID="taste-wheel-centre-text" style={[styles.centreText, { width: centreTextWidth(hole) }]}>
                <Text
                  testID="taste-wheel-centre-label"
                  style={[styles.centreLabel, { fontSize: labelSize, lineHeight: labelSize + 3 }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {selectedLabel}
                </Text>
                <Text testID="taste-wheel-centre-score" style={styles.centreScore}>
                  {formatRating(selected.slice.score)}
                </Text>
                {selected.slice.ratedWines > 0 ? (
                  <Text
                    testID="taste-wheel-centre-wines"
                    style={styles.centreWines}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {winesOf(selected.slice)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Image
                testID="taste-wheel-emblem"
                accessible={false}
                source={WHEEL_EMBLEM[wheel.view ?? "GRAPE"]}
                style={{ width: emblem, height: emblem }}
                contentFit="contain"
              />
            )}
          </View>
        </View>
      </View>
      <Text style={styles.hint}>{t("social.taste.tapHint")}</Text>
      <View style={styles.legend}>
        {wheel.painted.map((entry, index) => (
          <LegendRow
            key={`${entry.slice.kind}:${entry.slice.value}`}
            entry={entry}
            variant={wedges[index]!.variant}
            label={labelOf(entry.slice)}
            score={formatRating(entry.slice.score)}
            accessibilityLabel={a11yOf(entry.slice)}
            selected={selected?.slice.value === entry.slice.value}
            onPress={() => wheel.toggle(entry.slice.value)}
          />
        ))}
      </View>
    </View>
  );
}

interface LegendRowProps {
  entry: PaintedSlice;
  variant: WashVariant;
  label: string;
  score: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}

function LegendRow({ entry, variant, label, score, accessibilityLabel, selected, onPress }: LegendRowProps) {
  return (
    <Pressable
      testID={`taste-row-${entry.slice.value}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={[styles.row, selected && { borderColor: entry.color, backgroundColor: editorial.cream }]}
    >
      <View testID={`taste-dot-${entry.slice.value}`} style={[styles.swatch, { backgroundColor: lightWash(entry.color) }]}>
        <Image
          testID={`taste-dot-${entry.slice.value}-wash`}
          accessible={false}
          source={TASTE_WEDGE_WASHES[variant - 1]}
          tintColor={darkWash(entry.color)}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.rowScore}>{score}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: "stretch", alignItems: "center", gap: 14 },
  views: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  stage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: editorial.creamMuted,
    backgroundColor: editorial.cream,
  },
  paper: { opacity: 0.18 },
  centre: { alignItems: "center", justifyContent: "center" },
  centreText: { alignItems: "center" },
  centreLabel: {
    fontFamily: vinnotFonts.semibold,
    textAlign: "center",
    color: vinnotColors.ink,
  },
  centreScore: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 22,
    color: vinnotColors.brand,
  },
  centreWines: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes["2xs"],
    lineHeight: 13,
    color: vinnotColors.muted,
  },
  hint: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    color: vinnotColors.muted,
  },
  legend: { alignSelf: "stretch", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.surface,
  },
  swatch: { width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: radii.full, overflow: "hidden" },
  rowLabel: {
    maxWidth: 150,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: vinnotColors.ink,
  },
  rowLabelSelected: { fontFamily: vinnotFonts.semibold },
  rowScore: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    color: vinnotColors.muted,
  },
});
