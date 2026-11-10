/**
 * Decision on a wine submission: react-hook-form with the domain validator, preset reasons,
 * one save at a time and backend error codes translated into messages.
 */
import { useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type {
  AdminWineSubmissionDecision,
  AdminWineSubmissionDecisionInput,
} from "@/domain/admin/admin.types";
import { adminFormErrorKey } from "@/domain/admin/adminFormError";
import {
  defaultSubmissionReason,
  emptySubmissionDecisionDraft,
  toSubmissionDecisionPayload,
  validateSubmissionDecision,
  type SubmissionDecisionDraft,
} from "@/domain/admin/adminSubmissionCatalog";
import { MAX_SUBMISSION_REASON_LENGTH, resolveReasonText } from "@/domain/admin/moderationReasons";
import { domainResolver, useGuardedSubmit } from "@/presentation/hooks/forms";
import { useToast } from "@/presentation/providers/ToastProvider";
import { getMutationErrorCode, useOperationMutation } from "@/presentation/store/mutationAdapter";

export function useSubmissionDecisionForm({
  submissionId,
  onDecided,
}: {
  submissionId: string | null;
  onDecided: () => void;
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const mutation = useOperationMutation<
    void,
    { id: string; payload: AdminWineSubmissionDecisionInput }
  >((params) => ({ key: "admin.submission.decide", params }));
  const form = useForm<SubmissionDecisionDraft>({
    defaultValues: emptySubmissionDecisionDraft(),
    shouldFocusError: false,
    resolver: domainResolver(validateSubmissionDecision, (code) => t(`admin.submissions.validation.${code}`)),
  });
  const { guard, pending, isInFlight } = useGuardedSubmit();
  const saving = pending || mutation.isPending || form.formState.isSubmitting;

  const reasonLabel = useCallback((code: string) => t(`admin.submissions.reasons.${code}`), [t]);

  const { reset: resetForm } = form;
  const reset = useCallback(() => resetForm(emptySubmissionDecisionDraft()), [resetForm]);

  const chooseDecision = (decision: AdminWineSubmissionDecision) => {
    if (saving) return;
    form.setValue("decision", decision);
    form.setValue("reasonCode", defaultSubmissionReason(decision));
    form.setValue("reasonNote", "");
    form.clearErrors();
  };

  const save = (values: SubmissionDecisionDraft) =>
    guard(async () => {
      if (!submissionId) return;
      const reason = resolveReasonText(
        values.reasonCode,
        values.reasonNote,
        reasonLabel,
        MAX_SUBMISSION_REASON_LENGTH,
      );
      try {
        await mutation.mutateAsync({ id: submissionId, payload: toSubmissionDecisionPayload(values, reason) });
        showSuccess(t("admin.submissions.decisionSaved"));
        onDecided();
      } catch (error) {
        showError(t(adminFormErrorKey(getMutationErrorCode(error), "admin.submissions.decisionError")));
      }
    });

  // Validation runs before the guard: this lock also covers it, so a second tap or a close
  // in the same frame never slips through.
  const submitting = useRef(false);
  const busy = () => submitting.current || isInFlight() || mutation.isPending;
  const submit = async () => {
    if (!submissionId || busy()) return;
    submitting.current = true;
    try {
      await form.handleSubmit(save)();
    } finally {
      submitting.current = false;
    }
  };

  return {
    form,
    reset,
    chooseDecision,
    reasonLabel,
    submit,
    saving,
    isInFlight: busy,
  };
}

export type SubmissionDecisionForm = ReturnType<typeof useSubmissionDecisionForm>;
