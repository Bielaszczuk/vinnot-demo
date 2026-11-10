/**
 * Quick winery — the minimum a catalog editor needs to create a missing winery without
 * leaving the wine form: a name and a country (POST /admin/wineries requires both), and
 * optionally a region of that country.
 */
import type { AdminWineryPayload } from "./admin.types";

export const QUICK_WINERY_NAME_MAX = 255;

export interface QuickWineryDraft {
  name: string;
  countryId: string;
  regionId: string;
}

export type QuickWineryErrorCode = "nameRequired" | "nameTooLong" | "countryRequired";
export type QuickWineryError = { field: keyof QuickWineryDraft; code: QuickWineryErrorCode };

export function validateQuickWinery(draft: QuickWineryDraft): QuickWineryError[] {
  const errors: QuickWineryError[] = [];
  const name = draft.name.trim();
  if (!name) errors.push({ field: "name", code: "nameRequired" });
  else if (name.length > QUICK_WINERY_NAME_MAX) errors.push({ field: "name", code: "nameTooLong" });
  if (!draft.countryId) errors.push({ field: "countryId", code: "countryRequired" });
  return errors;
}

export function toQuickWineryPayload(draft: QuickWineryDraft): AdminWineryPayload {
  return { name: draft.name.trim(), countryId: draft.countryId, regionId: draft.regionId || null };
}
