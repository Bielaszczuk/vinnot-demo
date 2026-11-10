/**
 * Presentation-side names for the admin wine draft. The rules live in the domain
 * (`@/domain/admin/adminWineDraft`); this file only keeps the sheet's vocabulary.
 */
import {
  ADMIN_WINE_ALLERGENS,
  ADMIN_WINE_TYPES,
  toAdminWineDraft,
  type AdminWineDraft,
  type AdminWineSection,
} from "@/domain/admin/adminWineDraft";

export const WINE_TYPES = ADMIN_WINE_TYPES;
export const ALLERGEN_OPTIONS = ADMIN_WINE_ALLERGENS;
/** Section order of the sheet. Taste is available on create too. */
export const SECTIONS: readonly AdminWineSection[] = ["general", "composition", "descriptions", "media", "taste"];

export type EditableWine = AdminWineDraft;
export const toForm = toAdminWineDraft;
