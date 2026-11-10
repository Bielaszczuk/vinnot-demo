/**
 * Rating display: five watercolor glasses, each filled by its fraction
 * (2.2 = two full glasses and a fifth of the third). Glass and wine follow the wine type.
 */
import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { ratingGlassFills } from "@/domain/wine/ratingGlasses";
import type { WineType } from "@/domain/wine/wine.types";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { ratingArt, wineTop, type RatingArt } from "./ratingArt";

/** Bubbles only read on glasses at least this tall. */
const BUBBLE_MIN_HEIGHT = 30;

function Bubble({ index, art, height }: { index: number; art: RatingArt; height: number }) {
  const [boxX, boxY, boxW, boxH] = art.glass.box;
  const width = (height * art.glass.width) / art.glass.height;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(index * 450, withRepeat(withTiming(1, { duration: 1800, easing: Easing.in(Easing.quad) }), -1, false));
  }, [index, progress]);
  const rise = height * boxH * 0.8;
  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.2 ? progress.value * 4.5 : 0.9 * (1 - (progress.value - 0.2) / 0.8),
    transform: [{ translateY: -rise * progress.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.bubble, style, {
      left: (boxX + boxW * (0.25 + index * 0.17)) * width,
      top: (boxY + boxH * 0.95) * height,
    }]} />
  );
}

export function RatingGlass({ fill, art, height, bubbles = false }: { fill: number; art: RatingArt; height: number; bubbles?: boolean }) {
  const width = (height * art.glass.width) / art.glass.height;
  const top = wineTop(art.glass.box, fill) * height;
  return (
    <View style={[styles.glass, { width, height }]} testID={`rating-glass-${fill}`}>
      {/* Explicit size: a bundled asset carries its own width/height, which would beat absoluteFill. */}
      <Image source={art.glass.source} style={[styles.art, { width, height }]} resizeMode="stretch" testID="rating-glass-art" />
      {fill > 0 && (
        <View style={[styles.wine, { top }]}>
          <Image source={art.wine} style={{ position: "absolute", left: 0, top: -top, width, height }} resizeMode="stretch" />
        </View>
      )}
      {bubbles && fill > 0.15 && [0, 1, 2, 3].map((index) => <Bubble key={index} index={index} art={art} height={height} />)}
    </View>
  );
}

interface RatingGlassesProps {
  rating: number | null | undefined;
  /** Glass, wine and bubbles follow the wine type; red when unknown. */
  wineType?: WineType | null;
  max?: number;
  /** Glass height in points. */
  size?: number;
  showLabel?: boolean;
}

export function RatingGlasses({ rating, wineType, max = 5, size = 28, showLabel = false }: RatingGlassesProps) {
  const { t } = useTranslation();
  const { formatRating } = useFormatters();
  const reduceMotion = useReducedMotion();
  const art = ratingArt(wineType);
  const value = rating ?? 0;
  return (
    <View style={styles.row} accessible accessibilityRole="image"
      accessibilityLabel={t("reviews.ratingOutOf", { value: formatRating(value), max })}>
      {ratingGlassFills(value, max).map((fill, index) => (
        <RatingGlass key={index} fill={fill} art={art} height={size}
          bubbles={art.bubbles && !reduceMotion && size >= BUBBLE_MIN_HEIGHT} />
      ))}
      {showLabel && <Text style={[styles.label, { fontSize: Math.max(11, size * 0.45) }]}>{formatRating(value)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 1 },
  glass: { overflow: "hidden" },
  art: { position: "absolute", left: 0, top: 0 },
  wine: { position: "absolute", left: 0, right: 0, bottom: 0, overflow: "hidden" },
  bubble: { position: "absolute", width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,240,0.9)" },
  label: { color: lightTokens.textSecondary, marginLeft: 4, ...textStyles.labelMedium },
});
