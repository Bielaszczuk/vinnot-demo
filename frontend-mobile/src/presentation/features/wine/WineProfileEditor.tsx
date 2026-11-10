import { Pressable, StyleSheet, Text, View } from "react-native";
import { Plus, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card } from "@/presentation/components/ui/Card";
import { TextField } from "@/presentation/components/ui/TextField";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { radii } from "@/shared/theme/tokens";
import type { ProfileDraft, ProfileErrors, ProfileField, ProfileListField } from "@/domain/wine/wine-profile.validators";
import { styles as profileStyles } from "./AiProfileSections.styles";
import { PROFILE_EDITOR_SECTIONS } from "./WineProfileEditor.fields";
import { fontSizes } from "@/shared/theme/typography";

type EditorProps = {
  draft: ProfileDraft;
  errors: ProfileErrors;
  disabled?: boolean;
  onChange: (field: ProfileField, value: string | string[]) => void;
  onFocus?: () => void;
};

/** Structured fields use the same card hierarchy and palette as the public profile. */
export function WineProfileEditor({ draft, errors, disabled, onChange, onFocus }: EditorProps) {
  const { t } = useTranslation();
  return <View style={profileStyles.wrapper}>
    {PROFILE_EDITOR_SECTIONS.map(section => <Card key={section.title}
      style={section.summary ? profileStyles.summaryCard : profileStyles.card}
      elevation="none" radius={radii["2xl"]}>
      <Text style={section.summary ? profileStyles.sectionEyebrow : profileStyles.sectionTitle}>
        {t(section.title)}
      </Text>
      <View style={styles.fields}>
        {section.fields.map(field => {
          const label = t(field.label);
          if (field.kind === "list") return <ProfileListEditor key={field.field} field={field.field}
            label={label} values={draft.values[field.field]} disabled={disabled} onChange={onChange} onFocus={onFocus} />;
          const input = <TextField label={label} value={draft.values[field.field]}
            onChangeText={value => onChange(field.field, value)} editable={!disabled}
            onFocus={onFocus}
            required={field.field === "summary"} testID={`profile-field-${field.field}`}
            multiline textAlignVertical="top" style={field.kind === "text" && field.multiline ? styles.longInput : styles.input}
            error={errors[field.field] ? t("admin.aiProfile.summaryRequired") : undefined} />;
          if (field.kind === "text") return <View key={field.field}>{input}</View>;
          const raw = draft.values[field.score];
          const numeric = Number(raw.replace(",", "."));
          const score = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
          return <View key={field.field} style={styles.sensory}>
            {input}
            <View style={styles.scoreRow}>
              <View style={styles.scoreTrack} accessible accessibilityRole="progressbar"
                accessibilityLabel={t("admin.aiProfile.scoreLabel", { label })}
                accessibilityValue={{ min: 0, max: 100, now: score }}>
                <View style={[styles.scoreFill, { width: `${score}%`, backgroundColor: field.color }]} />
              </View>
              <TextField value={raw} onChangeText={value => onChange(field.score, value)}
                onFocus={onFocus}
                editable={!disabled} keyboardType="decimal-pad" testID={`profile-field-${field.score}`}
                accessibilityLabel={t("admin.aiProfile.scoreLabel", { label })}
                placeholder="—" containerStyle={styles.scoreInput}
                rightIcon={<Text style={styles.scoreHint}>/100</Text>} />
            </View>
            {!!errors[field.score] && <Text style={styles.error} accessibilityRole="alert">
              {t("admin.aiProfile.scoreError")}
            </Text>}
          </View>;
        })}
      </View>
    </Card>)}
  </View>;
}

function ProfileListEditor({ field, label, values, disabled, onChange, onFocus }: {
  field: ProfileListField; label: string; values: string[]; disabled?: boolean;
  onChange: EditorProps["onChange"];
  onFocus: EditorProps["onFocus"];
}) {
  const { t } = useTranslation();
  return <View style={styles.list}>
    <Text style={styles.label}>{label}</Text>
    {values.map((value, index) => <View key={index} style={styles.listItem}>
      <TextField value={value} editable={!disabled} containerStyle={styles.listInput} onFocus={onFocus}
        style={styles.input} accessibilityLabel={`${label} ${index + 1}`}
        testID={`profile-field-${field}-${index}`}
        onChangeText={text => onChange(field, values.map((item, position) => position === index ? text : item))} />
      <Pressable accessibilityRole="button" accessibilityLabel={t("admin.aiProfile.removeItem", { label, index: index + 1 })}
        disabled={disabled} onPress={() => onChange(field, values.filter((_, position) => position !== index))}
        style={styles.remove}>
        <X size={18} color={vinnotColors.brand} />
      </Pressable>
    </View>)}
    <Pressable accessibilityRole="button" accessibilityLabel={t("admin.aiProfile.addItem", { label })}
      disabled={disabled} onPress={() => onChange(field, [...values, ""])} style={styles.add}>
      <Plus size={17} color={vinnotColors.brand} />
      <Text style={styles.addText}>{t("admin.aiProfile.add")}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  fields: { gap: 16 },
  input: { minHeight: 48, maxHeight: 100 },
  longInput: { minHeight: 100, maxHeight: 176 },
  sensory: { gap: 8 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  scoreTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: vinnotColors.brandTint, overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: 3 },
  scoreInput: { width: 126 },
  scoreHint: { color: vinnotColors.muted, fontFamily: vinnotFonts.regular, fontSize: fontSizes.xs },
  error: { color: vinnotColors.danger, fontFamily: vinnotFonts.regular, fontSize: fontSizes.xs, lineHeight: 18 },
  list: { gap: 8 },
  label: { color: vinnotColors.muted, fontFamily: vinnotFonts.medium, fontSize: fontSizes.sm },
  listItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  listInput: { flex: 1 },
  remove: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.full, backgroundColor: vinnotColors.brandSoft },
  add: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12,
    borderRadius: radii.full, backgroundColor: vinnotColors.brandSoft },
  addText: { color: vinnotColors.brand, fontFamily: vinnotFonts.medium, fontSize: fontSizes.sm },
});
