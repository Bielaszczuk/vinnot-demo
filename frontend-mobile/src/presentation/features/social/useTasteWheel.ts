/**
 * useTasteWheel — the taste wheel's view and selection. The wheel shows one kind at a time
 * («Uvas» first, empty views hidden) and one slice can be selected; tapping it again, or
 * changing the view, clears it. Selecting gives a light haptic tick.
 */
import { useMemo, useState } from "react";
import type { TasteKind, TasteSlice } from "@/domain/social/social.types";
import { tasteWheelSlicesOf, tasteWheelViews } from "@/domain/social/socialRules";
import { useHaptics } from "@/presentation/hooks/ui";
import { paintTasteSlices, type PaintedSlice } from "./tasteWheelPalette";

export interface TasteWheelState {
  views: TasteKind[];
  view: TasteKind | null;
  /** The view's slices in wheel order, each with its colour. */
  painted: PaintedSlice[];
  selected: PaintedSlice | null;
  chooseView: (view: TasteKind) => void;
  toggle: (value: string) => void;
}

export function useTasteWheel(slices: TasteSlice[]): TasteWheelState {
  const haptics = useHaptics();
  const views = useMemo(() => tasteWheelViews(slices), [slices]);
  const [chosen, setChosen] = useState<TasteKind | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const view = chosen && views.includes(chosen) ? chosen : (views[0] ?? null);
  const painted = useMemo(() => (view ? paintTasteSlices(tasteWheelSlicesOf(slices, view)) : []), [slices, view]);
  const selected = painted.find((entry) => entry.slice.value === selectedValue) ?? null;

  const chooseView = (next: TasteKind) => {
    setChosen(next);
    setSelectedValue(null);
  };
  const toggle = (value: string) => {
    if (value === selected?.slice.value) {
      setSelectedValue(null);
      return;
    }
    haptics.selection();
    setSelectedValue(value);
  };

  return { views, view, painted, selected, chooseView, toggle };
}
