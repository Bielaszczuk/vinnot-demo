/**
 * Admin wine form: react-hook-form with the domain validator, collapsible sections that open
 * on error, one save at a time and backend error codes translated into messages.
 */
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import type { AdminWine } from "@/domain/admin/admin.types";
import { adminFormErrorKey } from "@/domain/admin/adminFormError";
import {
  adminWineSection,
  toAdminWineDraft,
  toAdminWinePayload,
  validateAdminWineDraft,
  type AdminWineDraft,
  type AdminWineSection,
} from "@/domain/admin/adminWineDraft";
import { domainResolver, useFormSections, useGuardedSubmit } from "@/presentation/hooks/forms";
import { useAdminWineMutations } from "@/presentation/hooks/queries/admin";
import { useToast } from "@/presentation/providers/ToastProvider";
import { getMutationErrorCode } from "@/presentation/store/mutationAdapter";

const INITIAL_SECTIONS: readonly AdminWineSection[] = ["general"];

export function useAdminWineForm({
  visible,
  editingWine,
  onClose,
}: {
  visible: boolean;
  editingWine?: AdminWine | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { create, update } = useAdminWineMutations();
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const isEdit = !!editingWine?.id;
  const form = useForm<AdminWineDraft>({
    defaultValues: toAdminWineDraft(editingWine),
    shouldFocusError: false,
    resolver: domainResolver(validateAdminWineDraft, (code) => t(`admin.wines.validation.${code}`)),
  });
  const { errors, isDirty, isSubmitting, submitCount } = form.formState;
  const sections = useFormSections(errors, adminWineSection, INITIAL_SECTIONS);
  const { guard, pending, isInFlight } = useGuardedSubmit();

  // Reset only when the sheet opens or switches wine: a refetched list must not wipe edits.
  const wineSnapshot = useRef(editingWine);
  wineSnapshot.current = editingWine;
  const wineId = editingWine?.id;
  const { reset } = form;
  const resetSections = sections.reset;
  useEffect(() => {
    if (!visible) return;
    reset(toAdminWineDraft(wineSnapshot.current));
    resetSections();
  }, [visible, wineId, reset, resetSections]);

  const save = (values: AdminWineDraft) =>
    guard(async () => {
      const payload = toAdminWinePayload(values);
      try {
        if (isEdit) await update.mutateAsync({ id: editingWine!.id, payload });
        else await create.mutateAsync(payload);
        showSuccess(t(isEdit ? "admin.wines.updated" : "admin.wines.created"));
        onClose();
      } catch (error) {
        showError(t(adminFormErrorKey(getMutationErrorCode(error), "admin.wines.saveError")));
      }
    });

  const submit = () => {
    if (isInFlight() || imageUploading) return;
    void form.handleSubmit(save, () => scrollRef.current?.scrollTo({ y: 0, animated: true }))();
  };

  const saving = pending || create.isPending || update.isPending;
  return {
    form,
    sections,
    scrollRef,
    isEdit,
    submit,
    saving,
    busy: saving || imageUploading || isSubmitting,
    dirty: isDirty,
    imageUploading,
    setImageUploading,
    errorSummary: submitCount > 0 && sections.hasErrors ? t("forms.fixErrors") : null,
  };
}
