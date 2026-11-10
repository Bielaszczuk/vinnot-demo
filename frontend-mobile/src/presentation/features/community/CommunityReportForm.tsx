/**
 * CommunityReportForm — reason, details and privacy note for a community report.
 * Callers own the mutation; the form only keeps the draft while it is mounted.
 */
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { Chip } from "@/presentation/components/ui/Chip";
import { TextField } from "@/presentation/components/ui/TextField";
import {
  reportReasons,
  type ReportInput,
  type ReportReason,
  type ReportTargetType,
} from "@/domain/community/community.types";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export interface ReportDraft {
  reason: ReportReason;
  description: string;
}

/** A user report targets the author; any other report targets the content itself. */
export function toReportInput(
  type: ReportTargetType,
  targetId: string,
  authorId: string | undefined,
  draft: ReportDraft,
): ReportInput {
  return {
    targetType: type,
    targetId: type === "USER" ? (authorId ?? targetId) : targetId,
    reason: draft.reason,
    description: draft.description,
  };
}

export function CommunityReportForm({
  pending,
  layout = "inline",
  error,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  /** "sheet" renders inputs that cooperate with the bottom-sheet keyboard handling. */
  layout?: "inline" | "sheet";
  /** Already translated error, shown inside the form (sheet layout). */
  error?: string;
  onSubmit: (draft: ReportDraft) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [description, setDescription] = useState("");
  const inSheet = layout === "sheet";
  const cannotSend = pending || (reason === "OTHER" && !description.trim());
  const submit = () => onSubmit({ reason, description });
  return (
    <View style={inSheet ? styles.sheetForm : styles.form}>
      <Text style={styles.note}>{t("community.privacy")}</Text>
      <Text style={styles.label}>{t("community.reason")}</Text>
      <View accessibilityRole="radiogroup" style={styles.choices}>
        {reportReasons.map((value) => (
          <Chip
            key={value}
            role="radio"
            label={t(`community.reasons.${value}`)}
            selected={reason === value}
            disabled={pending}
            onPress={() => setReason(value)}
          />
        ))}
      </View>
      <TextField
        label={t("community.details")}
        value={description}
        maxLength={2000}
        multiline
        editable={!pending}
        onChangeText={setDescription}
        style={styles.details}
      />
      {inSheet && !!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <View style={styles.actions}>
        <Button fullWidth loading={inSheet && pending} disabled={cannotSend} onPress={submit}>
          {t(pending && !inSheet ? "community.pending" : "community.send")}
        </Button>
        <Button variant="ghost" fullWidth disabled={pending} onPress={onCancel}>
          {t("community.cancel")}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: lightTokens.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: lightTokens.surfaceDefault,
  },
  sheetForm: { gap: 12 },
  note: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  label: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  details: { minHeight: 96, textAlignVertical: "top" },
  actions: { gap: 10, marginTop: 4 },
  error: { ...textStyles.bodySmall, color: lightTokens.textDanger },
});
