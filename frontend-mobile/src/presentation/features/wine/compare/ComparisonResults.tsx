/**
 * ComparisonResults — every section of an AI wine comparison, in reading order.
 * Sections without data render nothing, so legacy cached comparisons keep their layout.
 */
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "@/presentation/components/ui/Card";
import { WineComparisonAttributeTable } from "@/presentation/features/wine/WineComparisonAttributeTable";
import { styles } from "@/presentation/features/wine/compare.styles";
import type { WineComparison } from "@/domain/wine/wine.types";
import { radii } from "@/shared/theme/tokens";
import { Callout, type WineNames } from "./ComparisonParts";
import { ComparisonTastingNotes } from "./ComparisonTastingNotes";
import {
  ComparisonBestFor,
  ComparisonChooseIf,
  ComparisonPairingsSection,
  ComparisonServingAging,
} from "./ComparisonDetailSections";

interface ComparisonResultsProps extends WineNames {
  comparison: WineComparison;
}

export function ComparisonResults({ comparison, ...names }: ComparisonResultsProps) {
  const { t } = useTranslation();
  const { wineAName, wineBName } = names;

  return (
    <>
      {!!comparison.summary && (
        <Card radius={radii["2xl"]} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("compare.aiSummary", "Resumen")}</Text>
          <Text style={styles.bodyText}>{comparison.summary}</Text>
        </Card>
      )}

      {!!comparison.attributeComparison?.attributes.length && (
        <Card radius={radii["2xl"]} style={styles.sectionCard}>
          <WineComparisonAttributeTable
            wineAName={wineAName}
            wineBName={wineBName}
            attributesLabel={t("compare.attributes", "Atributos")}
            attributes={comparison.attributeComparison.attributes}
          />
        </Card>
      )}

      {!!comparison.tastingNotes && <ComparisonTastingNotes notes={comparison.tastingNotes} {...names} />}

      <ComparisonList title={t("compare.keyDifferences", "Diferencias clave")} items={comparison.keyDifferences ?? []} />
      <ComparisonList title={t("compare.similarities", "Similitudes")} items={comparison.similarities ?? []} />

      <ComparisonBestFor bestFor={comparison.bestFor} {...names} />
      <ComparisonChooseIf choices={comparison.chooseIf} {...names} />
      <ComparisonPairingsSection pairings={comparison.pairings} {...names} />
      <ComparisonServingAging serving={comparison.serving} aging={comparison.aging} {...names} />
      {!!comparison.value && <Callout eyebrow={t("compare.value", "Relación precio-calidad")} text={comparison.value} />}

      {!!(comparison.recommendationWineA || comparison.recommendationWineB) && (
        <Card radius={radii["2xl"]} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("compare.recommendation", "Recomendación")}</Text>
          {!!comparison.recommendationWineA && (
            <View>
              <Text style={styles.sectionTitle}>{wineAName}</Text>
              <Text style={styles.bodyText}>{comparison.recommendationWineA}</Text>
            </View>
          )}
          {!!comparison.recommendationWineB && (
            <View>
              <Text style={styles.sectionTitle}>{wineBName}</Text>
              <Text style={styles.bodyText}>{comparison.recommendationWineB}</Text>
            </View>
          )}
        </Card>
      )}
      {!!comparison.recommendation && (
        <Callout eyebrow={t("compare.verdict", "Veredicto")} text={comparison.recommendation} />
      )}
    </>
  );
}

function ComparisonList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Card radius={radii["2xl"]} style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.bodyText}>{item}</Text>
        </View>
      ))}
    </Card>
  );
}
