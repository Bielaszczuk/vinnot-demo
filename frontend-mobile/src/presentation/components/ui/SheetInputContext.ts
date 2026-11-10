import { createContext } from "react";
import type { HostInstance } from "react-native";

/** Anything the sheet can measure on screen: a text input or a whole panel. */
export type SheetMeasurable = Pick<HostInstance, "measureInWindow">;

export const SheetInputContext = createContext(false);
export const SheetFieldFocusContext = createContext<(field: SheetMeasurable | null) => void>(() => {});
/** The sticky footer registers itself here so revealed fields stay above it, not only above the keyboard. */
export const SheetFooterContext = createContext<{ current: SheetMeasurable | null } | null>(null);
