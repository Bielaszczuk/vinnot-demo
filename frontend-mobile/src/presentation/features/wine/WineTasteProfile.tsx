/**
 * WineTasteProfile — visual taste profile bars.
 */
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { lightTokens, radii, wine as wineColor } from "@/shared/theme/tokens";
import { textStyles, fontSizes } from "@/shared/theme/typography";
import type { Wine } from "@/domain/wine/wine.types";
import { hasTasteScores } from "@/domain/wine/wine.quick-info";
import { sensoryBarWidth } from "./sensoryBar";

interface WineTasteProfileProps {
  wine: Wine;
}

const attributes = [
  { key: "bodyScore", label: "wineDetails.body", min: "wineDetails.bodyLight", max: "wineDetails.bodyFull" },
  { key: "tanninScore", label: "wineDetails.tannins", min: "wineDetails.tanninsSmooth", max: "wineDetails.tanninsFirm" },
  { key: "sweetnessScore", label: "wineDetails.sweetness", min: "wineDetails.sweetnessDry", max: "wineDetails.sweetnessSweet" },
  { key: "acidityScore", label: "wineDetails.acidity", min: "wineDetails.acidityLow", max: "wineDetails.acidityHigh" },
] as const;

function resolveBarScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function WineTasteProfile({ wine }: WineTasteProfileProps) {
  const { t } = useTranslation();
  if (!hasTasteScores(wine)) return null;

  return (
    <View style={styles.wrapper}>
      {attributes.map((attr) => {
        const score = wine[attr.key];
        if (score == null || !Number.isFinite(score)) return null;
        return (
          <View key={attr.key} style={styles.row}>
            <Text style={styles.label}>{t(attr.label)}</Text>
            <View style={styles.barRow}>
              <Text style={styles.edgeLabel}>{t(attr.min)}</Text>
              <View style={styles.track} accessible accessibilityRole="progressbar"
                accessibilityLabel={t(attr.label)} accessibilityValue={{ min: 0, max: 100, now: resolveBarScore(score) }}>
                <View style={[styles.fill, { width: `${sensoryBarWidth(resolveBarScore(score))}%` }]} />
              </View>
              <Text style={styles.edgeLabel}>{t(attr.max)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  row: { gap: 7 },
  label: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  edgeLabel: {
    width: 58,
    ...textStyles.caption,
    color: lightTokens.textTertiary,
    fontSize: fontSizes["2xs"],
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: lightTokens.bgMuted,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: wineColor[500],
  },
});
