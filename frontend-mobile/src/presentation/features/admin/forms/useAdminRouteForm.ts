/**
 * Admin route form: react-hook-form with the domain validator, collapsible sections that
 * open on error, the stops, one save at a time, an upload that blocks the save, and backend
 * error codes translated into messages.
 */
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import type { AdminRoute } from "@/domain/admin/admin.types";
import { adminFormErrorKey } from "@/domain/admin/adminFormError";
import {
  adminRouteSection,
  toAdminRouteDraft,
  toAdminRoutePayload,
  validateAdminRouteDraft,
  type AdminRouteDraft,
} from "@/domain/admin/adminRouteDraft";
import { domainResolver, useFormSections, useGuardedSubmit } from "@/presentation/hooks/forms";
import { useAdminRouteMutations } from "@/presentation/hooks/queries/admin";
import { useToast } from "@/presentation/providers/ToastProvider";
import { getMutationErrorCode } from "@/presentation/store/mutationAdapter";
import { CREATE_ROUTE_SECTIONS, EDIT_ROUTE_SECTIONS } from "../AdminRouteSheet.contracts";
import { useRouteStops } from "./useRouteStops";

export function useAdminRouteForm({
  visible,
  editingRoute,
  onClose,
}: {
  visible: boolean;
  editingRoute?: AdminRoute | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { create, update } = useAdminRouteMutations();
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const isEdit = !!editingRoute?.id;
  const routeKey = editingRoute?.id ?? "new";
  const form = useForm<AdminRouteDraft>({
    defaultValues: toAdminRouteDraft(editingRoute),
    shouldFocusError: false,
    resolver: domainResolver(validateAdminRouteDraft, (code) => t(`admin.routes.validation.${code}`)),
  });
  const { errors, isDirty, isSubmitting, submitCount } = form.formState;
  const sections = useFormSections(errors, adminRouteSection, isEdit ? EDIT_ROUTE_SECTIONS : CREATE_ROUTE_SECTIONS);
  const stops = useRouteStops(visible, routeKey, editingRoute?.stops);
  const { guard, pending, isInFlight } = useGuardedSubmit();

  // Reset only when the sheet opens or switches route: a refetched list must not wipe edits.
  const routeSnapshot = useRef(editingRoute);
  routeSnapshot.current = editingRoute;
  const { reset } = form;
  const resetSections = sections.reset;
  useEffect(() => {
    if (!visible) return;
    reset(toAdminRouteDraft(routeSnapshot.current));
    resetSections();
  }, [visible, routeKey, reset, resetSections]);

  const save = (values: AdminRouteDraft) =>
    guard(async () => {
      const payload = toAdminRoutePayload(values, stops.stops);
      try {
        if (isEdit) await update.mutateAsync({ id: editingRoute!.id, payload });
        else await create.mutateAsync(payload);
        showSuccess(t(isEdit ? "admin.routes.updated" : "admin.routes.created"));
        onClose();
      } catch (error) {
        showError(t(adminFormErrorKey(getMutationErrorCode(error), "admin.routes.saveError")));
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
    stops,
    scrollRef,
    isEdit,
    submit,
    saving,
    busy: saving || imageUploading || isSubmitting,
    dirty: isDirty || stops.dirty,
    imageUploading,
    setImageUploading,
    errorSummary: submitCount > 0 && sections.hasErrors ? t("forms.fixErrors") : null,
  };
}
