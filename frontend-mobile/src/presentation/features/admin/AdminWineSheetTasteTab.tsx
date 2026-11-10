import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { EditableWine } from "./AdminWineSheet.contracts";
import { lightTokens } from "@/shared/theme/tokens";
import { styles } from "./AdminWineSheet.styles";

function ScoreSlider({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const normalized = Math.max(0, Math.min(100, value ?? 50));
  return (
    <View style={styles.scoreBlock}>
      <View style={styles.scoreHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.scoreValue}>{value == null ? "—" : normalized}</Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreHint}>{low}</Text>
        <View
          style={styles.sliderTrack}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width || 1)}
        >
          <View style={[styles.sliderFill, { width: `${normalized}%` }]} />
          <View style={[styles.sliderThumb, { left: `${normalized}%` }]} />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={(event) => {
              const x = event.nativeEvent.locationX;
              onChange(Math.max(0, Math.min(100, Math.round((x / trackWidth) * 100))));
            }}
          />
        </View>
        <Text style={[styles.scoreHint, styles.scoreHintRight]}>{high}</Text>
      </View>
      <View style={styles.stepRow}>
        {[0, 25, 50, 75, 100].map((step) => (
          <Pressable
            key={step}
            onPress={() => onChange(step)}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${step}`}
            accessibilityState={{ selected: normalized === step }}
            hitSlop={8}
            style={[styles.stepDot, normalized === step && styles.stepDotActive]}
          />
        ))}
      </View>
    </View>
  );
}

type TasteTabProps = {
  form: EditableWine;
  patch: (values: Partial<EditableWine>) => void;
  /** Only a saved wine has a full expert profile to edit. */
  editingWineId?: string;
  onOpenAiProfile?: (wineId: string) => void;
};

export function AdminWineTasteTab({ form, patch, editingWineId, onOpenAiProfile }: TasteTabProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.fields}>
      <View style={styles.aiHeader}>
        {editingWineId ? (
          <Pressable
            onPress={() => onOpenAiProfile?.(editingWineId)}
            accessibilityRole="button"
            style={styles.aiButton}
          >
            <Lightbulb size={14} color={lightTokens.brandPrimary} />
            <Text style={styles.aiButtonText}>{t("admin.aiProfile.editFullProfile")}</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>{t("admin.wines.tasteCreateHint")}</Text>
        )}
      </View>
      <ScoreSlider
        label={t("admin.aiProfile.body")}
        low={t("wineDetails.bodyLight")}
        high={t("wineDetails.bodyFull")}
        value={form.bodyScore}
        onChange={(bodyScore) => patch({ bodyScore })}
      />
      <ScoreSlider
        label={t("admin.aiProfile.tannins")}
        low={t("wineDetails.tanninsSmooth")}
        high={t("wineDetails.tanninsFirm")}
        value={form.tanninScore}
        onChange={(tanninScore) => patch({ tanninScore })}
      />
      <ScoreSlider
        label={t("admin.aiProfile.sweetness")}
        low={t("wineDetails.sweetnessDry")}
        high={t("wineDetails.sweetnessSweet")}
        value={form.sweetnessScore}
        onChange={(sweetnessScore) => patch({ sweetnessScore })}
      />
      <ScoreSlider
        label={t("admin.aiProfile.acidity")}
        low={t("wineDetails.acidityLow")}
        high={t("wineDetails.acidityHigh")}
        value={form.acidityScore}
        onChange={(acidityScore) => patch({ acidityScore })}
      />
    </View>
  );
}
