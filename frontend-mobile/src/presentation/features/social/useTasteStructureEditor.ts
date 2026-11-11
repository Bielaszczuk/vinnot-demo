/**
 * Edit mode of the own «Estructura»: the four traits become sliders, «Guardar» sends only
 * the traits that changed, «Cancelar» puts the previous values back and «Volver a lo
 * calculado» clears every manual value. The saved profile comes back through the Social
 * cache tag, so the card shows the server values again once edit mode closes.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TasteTrait, TasteTraitScore } from "@/domain/social/social.types";
import { clampTasteTraitValue, tasteEditorValues, tasteStructureChanges } from "@/domain/social/socialRules";
import { useTasteTraitMutations } from "@/presentation/hooks/queries/social";
import { useToast } from "@/presentation/providers/ToastProvider";

export interface TasteStructureEditor {
  editing: boolean;
  values: Record<TasteTrait, number>;
  /** Some trait was set by hand, so it can go back to the calculated structure. */
  canReset: boolean;
  pending: boolean;
  start: () => void;
  change: (trait: TasteTrait, value: number) => void;
  save: () => void;
  cancel: () => void;
  reset: () => void;
}

export function useTasteStructureEditor(structure: readonly TasteTraitScore[]): TasteStructureEditor {
  const { t } = useTranslation();
  const { showError } = useToast();
  const { adjust, reset: resetMutation } = useTasteTraitMutations();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => tasteEditorValues(structure));
  const [touched, setTouched] = useState<ReadonlySet<TasteTrait>>(() => new Set());
  const pending = adjust.isPending || resetMutation.isPending;

  const close = () => {
    setEditing(false);
    setTouched(new Set());
  };
  const failed = () => showError(t("social.taste.adjust.error"));

  const start = () => {
    setValues(tasteEditorValues(structure));
    setTouched(new Set());
    setEditing(true);
  };

  const change = (trait: TasteTrait, value: number) => {
    setValues((current) => ({ ...current, [trait]: clampTasteTraitValue(value) }));
    setTouched((current) => (current.has(trait) ? current : new Set(current).add(trait)));
  };

  const save = () => {
    if (pending) return;
    const changes = tasteStructureChanges(structure, values, touched);
    if (Object.keys(changes).length === 0) {
      close();
      return;
    }
    adjust.mutate(changes, { onSuccess: close, onError: failed });
  };

  const reset = () => {
    if (pending) return;
    resetMutation.mutate(undefined, { onSuccess: close, onError: failed });
  };

  return {
    editing,
    values,
    canReset: structure.some((row) => row.adjusted),
    pending,
    start,
    change,
    save,
    cancel: close,
    reset,
  };
}
