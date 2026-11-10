import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { WineComparison } from "@/domain/wine/wine.types";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

type ComparisonAttribute = NonNullable<WineComparison["attributeComparison"]>["attributes"][number];

interface WineComparisonAttributeTableProps {
  wineAName: string;
  wineBName: string;
  attributesLabel: string;
  attributes: ComparisonAttribute[];
}

export function WineComparisonAttributeTable({
  wineAName, wineBName, attributesLabel, attributes,
}: WineComparisonAttributeTableProps) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 380;
  return (
    <View style={styles.table}>
      <Text accessibilityRole="header" style={styles.title}>{attributesLabel}</Text>
      <View style={styles.legend}>
        <Text style={[styles.wineName, styles.primaryName]}>{wineAName}</Text>
        <Text style={[styles.wineName, styles.rightText]}>{wineBName}</Text>
      </View>
      {attributes.map((attribute, index) => (
        <View key={`${attribute.name}-${index}`} style={styles.attribute}>
          <Text accessibilityRole="header" style={styles.attributeName}>{attribute.name}</Text>
          <View testID={`comparison-attribute-values-${index}`} style={[styles.values, stacked && styles.stacked]}>
            <Text style={[styles.valueText, styles.primaryName, stacked && styles.stackedValue]}>{attribute.wineAValue}</Text>
            <Text style={[styles.valueText, !stacked && styles.rightText, stacked && styles.stackedValue]}>{attribute.wineBValue}</Text>
          </View>
          <View testID={`comparison-axis-${index}`} style={styles.axis}>
            <ScoreHalf wineName={wineAName} attributeName={attribute.name}
              value={attribute.wineAValue} score={attribute.wineAScore} primary />
            <ScoreHalf wineName={wineBName} attributeName={attribute.name}
              value={attribute.wineBValue} score={attribute.wineBScore} />
            <View pointerEvents="none" style={styles.midpoint} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ScoreHalf({ wineName, attributeName, value, score, primary = false }: {
  wineName: string; attributeName: string; value: string; score?: number; primary?: boolean;
}) {
  const normalizedScore = typeof score === "number" && Number.isFinite(score)
    ? Math.min(100, Math.max(0, score)) : undefined;
  return (
    <View style={styles.half}>
      <View
        accessible={normalizedScore !== undefined}
        accessibilityRole={normalizedScore !== undefined ? "progressbar" : undefined}
        accessibilityLabel={`${wineName} · ${attributeName} · ${value}`}
        accessibilityValue={normalizedScore !== undefined ? { min: 0, max: 100, now: normalizedScore } : undefined}
        style={[styles.track, primary ? styles.leftTrack : styles.rightTrack]}
      >
        {normalizedScore !== undefined && (
          <View style={[styles.bar, primary ? styles.primaryBar : styles.secondaryBar, { width: `${normalizedScore}%` }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  table: { gap: 16 },
  title: { fontFamily: vinnotFonts.semibold, fontSize: fontSizes.lg, lineHeight: 23, color: vinnotColors.ink },
  legend: { flexDirection: "row", gap: 20 },
  wineName: { flex: 1, fontFamily: vinnotFonts.semibold, fontSize: fontSizes.xs, lineHeight: 18, color: vinnotColors.muted },
  primaryName: { color: vinnotColors.brandDeep },
  rightText: { textAlign: "right" },
  attribute: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderColor: vinnotColors.borderSoft },
  attributeName: { textAlign: "center", fontFamily: vinnotFonts.semibold, fontSize: fontSizes.sm, lineHeight: 19, color: vinnotColors.ink },
  values: { flexDirection: "row", gap: 12 },
  stacked: { flexDirection: "column" },
  stackedValue: { flexBasis: "auto", flexGrow: 0 },
  valueText: { flexShrink: 1, flexGrow: 1, flexBasis: 0, fontFamily: vinnotFonts.regular, fontSize: fontSizes.xs, lineHeight: 18, color: vinnotColors.muted },
  axis: { flexDirection: "row", alignItems: "center", position: "relative" },
  half: { flex: 1 },
  track: { height: 12, width: "100%", overflow: "hidden", backgroundColor: vinnotColors.borderSoft },
  leftTrack: { alignItems: "flex-end", borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  rightTrack: { alignItems: "flex-start", borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  bar: { height: "100%" },
  primaryBar: { backgroundColor: vinnotColors.brand, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  secondaryBar: { backgroundColor: vinnotColors.muted, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  midpoint: { position: "absolute", left: "50%", width: 2, marginLeft: -1, height: 20, backgroundColor: vinnotColors.white },
});
