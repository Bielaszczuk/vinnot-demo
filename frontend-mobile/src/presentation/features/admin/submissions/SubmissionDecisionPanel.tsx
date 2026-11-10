/**
 * Decision on a wine submission: the decision as one-tap choices, the catalog wine to merge
 * with, typed corrections for an approval, a preset reason (free text only under "Other")
 * and a confirm button named after the decision.
 */
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useController, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AdminWineSubmission, AdminWineSubmissionDecision } from "@/domain/admin/admin.types";
import { emptySubmissionDecisionDraft } from "@/domain/admin/adminSubmissionCatalog";
import {
  MAX_SUBMISSION_REASON_LENGTH,
  SUBMISSION_DECISION_REASONS,
  type SubmissionReason,
} from "@/domain/admin/moderationReasons";
import { ChoiceChips, ReasonPicker } from "@/presentation/components/forms";
import { Button } from "@/presentation/components/ui/Button";
import { lightTokens, spacing } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { SubmissionOverrides } from "./SubmissionOverrides";
import { SubmissionWinePicker } from "./SubmissionWinePicker";
import type { SubmissionDecisionForm } from "./useSubmissionDecisionForm";

const DECISIONS: AdminWineSubmissionDecision[] = [
  "APPROVE_NEW",
  "MERGE_EXISTING",
  "REQUEST_CORRECTIONS",
  "REJECT",
];
const OVERRIDE_FIELDS = [
  "wineName",
  "wineryName",
  "wineType",
  "vintage",
  "grapes",
  "country",
  "region",
  "alcoholContent",
] as const;

export interface SubmissionDecisionPanelProps {
  form: SubmissionDecisionForm;
  submission: AdminWineSubmission;
}

export function SubmissionDecisionPanel({ form, submission }: SubmissionDecisionPanelProps) {
  const { t } = useTranslation();
  const { control, setValue } = form.form;
  const [showOverrides, setShowOverrides] = useState(false);
  const decision = useWatch({ control, name: "decision" });
  const reason = useController({ control, name: "reasonCode" });
  const note = useController({ control, name: "reasonNote" });
  const target = useController({ control, name: "targetWine" });
  const disabled = form.saving;

  const discardOverrides = () => {
    const empty = emptySubmissionDecisionDraft();
    for (const field of OVERRIDE_FIELDS) setValue(field, empty[field]);
    setShowOverrides(false);
  };

  return (
    <View style={styles.container}>
      <ChoiceChips
        label={t("admin.submissions.chooseDecision")}
        options={DECISIONS.map((value) => ({ value, label: t(`admin.submissions.decision.${value}`) }))}
        value={decision}
        onChange={form.chooseDecision}
        disabled={disabled}
      />

      {decision === "MERGE_EXISTING" && (
        <SubmissionWinePicker
          value={target.field.value}
          onChange={target.field.onChange}
          error={target.fieldState.error?.message}
          disabled={disabled}
        />
      )}

      {decision === "APPROVE_NEW" && (
        <View style={styles.overrides}>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onPress={() => (showOverrides ? discardOverrides() : setShowOverrides(true))}
          >
            {t(showOverrides ? "admin.submissions.discardCorrections" : "admin.submissions.correctFields")}
          </Button>
          {showOverrides && (
            <>
              <Text style={styles.hint}>{t("admin.submissions.overrideHint")}</Text>
              <SubmissionOverrides
                control={control}
                setValue={setValue}
                submission={submission}
                disabled={disabled}
              />
            </>
          )}
        </View>
      )}

      <ReasonPicker<SubmissionReason>
        label={t("admin.submissions.reasonLabel")}
        hint={t("admin.submissions.reasonHint")}
        reasons={SUBMISSION_DECISION_REASONS[decision]}
        value={reason.field.value}
        onChange={reason.field.onChange}
        labelFor={form.reasonLabel}
        note={note.field.value}
        onNoteChange={note.field.onChange}
        noteLabel={t("admin.submissions.reasonNote")}
        notePlaceholder={t("admin.submissions.reasonNotePlaceholder")}
        maxNoteLength={MAX_SUBMISSION_REASON_LENGTH}
        noteError={note.fieldState.error?.message}
        disabled={disabled}
      />

      <Button
        variant={decision === "REJECT" ? "danger" : "primary"}
        loading={disabled}
        disabled={disabled}
        onPress={() => void form.submit()}
      >
        {t(`admin.submissions.confirm.${decision}`)}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[4] },
  overrides: { gap: spacing[3] },
  hint: { ...textStyles.caption, color: lightTokens.textTertiary },
});
