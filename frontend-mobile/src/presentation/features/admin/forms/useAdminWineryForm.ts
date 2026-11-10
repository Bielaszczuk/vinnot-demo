/**
 * Admin winery form: react-hook-form with the domain validator, collapsible sections that open
 * on error, one save at a time, uploads that block the save, and backend error codes
 * translated into messages.
 */
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import type { AdminWinery } from "@/domain/admin/admin.types";
import { adminFormErrorKey } from "@/domain/admin/adminFormError";
import {
  adminWinerySection,
  toAdminWineryDraft,
  toAdminWineryPayload,
  validateAdminWineryDraft,
  type AdminWineryDraft,
  type AdminWinerySection,
} from "@/domain/admin/adminWineryDraft";
import { domainResolver, useFormSections, useGuardedSubmit } from "@/presentation/hooks/forms";
import { useAdminWineryMutations } from "@/presentation/hooks/queries/admin";
import { useToast } from "@/presentation/providers/ToastProvider";
import { getMutationErrorCode } from "@/presentation/store/mutationAdapter";

const CREATE_SECTIONS: readonly AdminWinerySection[] = ["identity", "location"];
const EDIT_SECTIONS: readonly AdminWinerySection[] = ["identity"];

export type WineryImageSlot = "logo" | "cover";

export function useAdminWineryForm({
  visible,
  editingWinery,
  onClose,
}: {
  visible: boolean;
  editingWinery?: AdminWinery | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { create, update } = useAdminWineryMutations();
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const [uploads, setUploads] = useState<Record<WineryImageSlot, boolean>>({ logo: false, cover: false });
  const isEdit = !!editingWinery?.id;
  const form = useForm<AdminWineryDraft>({
    defaultValues: toAdminWineryDraft(editingWinery),
    shouldFocusError: false,
    resolver: domainResolver(validateAdminWineryDraft, (code) => t(`admin.wineries.validation.${code}`)),
  });
  const { errors, isDirty, isSubmitting, submitCount } = form.formState;
  const sections = useFormSections(errors, adminWinerySection, isEdit ? EDIT_SECTIONS : CREATE_SECTIONS);
  const { guard, pending, isInFlight } = useGuardedSubmit();

  // Reset only when the sheet opens or switches winery: a refetched list must not wipe edits.
  const winerySnapshot = useRef(editingWinery);
  winerySnapshot.current = editingWinery;
  const wineryId = editingWinery?.id;
  const { reset } = form;
  const resetSections = sections.reset;
  useEffect(() => {
    if (!visible) return;
    reset(toAdminWineryDraft(winerySnapshot.current));
    resetSections();
  }, [visible, wineryId, reset, resetSections]);

  const imageUploading = uploads.logo || uploads.cover;
  const setImageUploading = (slot: WineryImageSlot, busy: boolean) =>
    setUploads((current) => (current[slot] === busy ? current : { ...current, [slot]: busy }));

  const save = (values: AdminWineryDraft) =>
    guard(async () => {
      const payload = toAdminWineryPayload(values);
      try {
        if (isEdit) await update.mutateAsync({ id: editingWinery!.id, payload });
        else await create.mutateAsync(payload);
        showSuccess(t(isEdit ? "admin.wineries.updated" : "admin.wineries.created"));
        onClose();
      } catch (error) {
        showError(t(adminFormErrorKey(getMutationErrorCode(error), "admin.wineries.saveError")));
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
