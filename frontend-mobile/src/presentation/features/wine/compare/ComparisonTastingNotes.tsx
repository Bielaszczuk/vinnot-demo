/**
 * ComparisonTastingNotes — one wine's tasting notes at a time behind an A/B switch,
 * so both full notes fit a phone width without a cramped two-column layout.
 */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { ComparisonPerWine, ComparisonTastingNote } from "@/domain/wine/wine.types";
import { sectionStyles as styles } from "./compareSections.styles";
import { SectionCard, wineNameFor, type WineNames, type WineSide } from "./ComparisonParts";

const NOTE_FIELDS = ["appearance", "nose", "palate", "finish"] as const;

interface ComparisonTastingNotesProps extends WineNames {
  notes: ComparisonPerWine<ComparisonTastingNote>;
}

export function ComparisonTastingNotes({ notes, ...names }: ComparisonTastingNotesProps) {
  const { t } = useTranslation();
  const sides = (["A", "B"] as const).filter((side) => !!notes[side === "A" ? "wineA" : "wineB"]);
  const [selected, setSelected] = useState<WineSide>(sides[0] ?? "A");
  const active = sides.includes(selected) ? selected : (sides[0] ?? "A");
  const note = notes[active === "A" ? "wineA" : "wineB"];
  if (!note) return null;

  return (
    <SectionCard title={t("compare.tastingNotes.title", "Notas de cata")}>
      {sides.length > 1 ? (
        <View accessibilityRole="tablist" accessibilityLabel={t("compare.tastingNotes.switchLabel", "Elegí qué vino ver")}
          style={styles.segmented}>
          {sides.map((side) => {
            const isActive = side === active;
            return (
              <Pressable key={side} testID={`tasting-tab-${side}`} accessibilityRole="tab"
                accessibilityState={{ selected: isActive }} onPress={() => setSelected(side)}
                style={[styles.segment, isActive && styles.segmentActive]}>
                <Text numberOfLines={1} style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                  {wineNameFor(side, names)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.eyebrow}>{wineNameFor(active, names)}</Text>
      )}
      {!!note.identity && <Text testID="tasting-identity" style={styles.identity}>{note.identity}</Text>}
      {NOTE_FIELDS.map((field) => note[field] ? (
        <View key={field} style={styles.noteRow}>
          <Text style={styles.fieldLabel}>{t(`compare.tastingNotes.${field}`)}</Text>
          <Text style={styles.bodyText}>{note[field]}</Text>
        </View>
      ) : null)}
    </SectionCard>
  );
}
