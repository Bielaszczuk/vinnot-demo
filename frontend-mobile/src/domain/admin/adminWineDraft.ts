/**
 * Admin wine draft — the editable shape of a catalog wine, its validation rules and the
 * payload it becomes. Limits mirror CreateWineAdminRequest so the form catches what the
 * backend would reject.
 */
import type { AdminWine, AdminWinePayload } from "./admin.types";

export const ADMIN_WINE_TYPES = ["RED", "WHITE", "ROSE", "SPARKLING", "DESSERT", "FORTIFIED"] as const;
export const ADMIN_WINE_ALLERGENS = ["SULFITES", "EGG", "MILK", "FISH", "NUTS", "GLUTEN"] as const;
export const ADMIN_WINE_LIMITS = {
  name: 255,
  style: 100,
  description: 20000,
  imageUrl: 500,
  grapes: 50,
  grapeName: 100,
} as const;

export interface AdminWineDraft {
  name: string;
  wineType: string;
  wineryId: string;
  wineryName: string;
  vintage: number | null;
  style: string;
  grapes: string[];
  allergens: string[];
  alcoholContent: string;
  descriptionEs: string;
  descriptionEn: string;
  imageUrl: string;
  priceMin: string;
  priceMax: string;
  isActive: boolean;
  isFeatured: boolean;
  acidityScore: number | null;
  tanninScore: number | null;
  bodyScore: number | null;
  sweetnessScore: number | null;
}

export type AdminWineDraftErrorCode =
  | "nameRequired"
  | "nameTooLong"
  | "wineryRequired"
  | "styleTooLong"
  | "alcoholInvalid"
  | "priceInvalid"
  | "priceRange"
  | "imageUrlTooLong"
  | "tooManyGrapes";

export type AdminWineDraftError = { field: keyof AdminWineDraft; code: AdminWineDraftErrorCode };

/** Form sections of the wine sheet; validation errors open the section that holds them. */
export type AdminWineSection = "general" | "composition" | "descriptions" | "media" | "taste";

export function adminWineSection(field: string): AdminWineSection {
  if (["grapes", "allergens"].includes(field)) return "composition";
  if (field.startsWith("description")) return "descriptions";
  if (["imageUrl", "priceMin", "priceMax"].includes(field)) return "media";
  if (field.endsWith("Score")) return "taste";
  return "general";
}

export function toAdminWineDraft(wine?: AdminWine | null): AdminWineDraft {
  return {
    name: wine?.name ?? "",
    wineType: wine?.wineType ?? "RED",
    wineryId: wine?.wineryId ?? "",
    wineryName: wine?.wineryName ?? "",
    vintage: wine?.vintage ?? null,
    style: wine?.style ?? "",
    grapes: wine?.grapes ?? [],
    allergens: wine?.allergens ?? [],
    alcoholContent: wine?.alcoholContent != null ? String(wine.alcoholContent) : "",
    descriptionEs: wine?.descriptionEs ?? "",
    descriptionEn: wine?.descriptionEn ?? "",
    imageUrl: wine?.imageUrl ?? "",
    priceMin: wine?.priceMin != null ? String(wine.priceMin) : "",
    priceMax: wine?.priceMax != null ? String(wine.priceMax) : "",
    isActive: wine?.isActive ?? true,
    isFeatured: wine?.isFeatured ?? false,
    acidityScore: wine?.acidityScore ?? null,
    tanninScore: wine?.tanninScore ?? null,
    bodyScore: wine?.bodyScore ?? null,
    sweetnessScore: wine?.sweetnessScore ?? null,
  };
}

/** Parses an optional decimal typed with a dot or a comma; blank is null, garbage is NaN. */
export function parseOptionalDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed.replace(",", "."));
}

function numberOrNull(value: string): number | null {
  const parsed = parseOptionalDecimal(value);
  return parsed != null && Number.isFinite(parsed) ? parsed : null;
}

export function validateAdminWineDraft(draft: AdminWineDraft): AdminWineDraftError[] {
  const errors: AdminWineDraftError[] = [];
  const name = draft.name.trim();
  if (!name) errors.push({ field: "name", code: "nameRequired" });
  else if (name.length > ADMIN_WINE_LIMITS.name) errors.push({ field: "name", code: "nameTooLong" });
  if (!draft.wineryId) errors.push({ field: "wineryId", code: "wineryRequired" });
  if (draft.style.trim().length > ADMIN_WINE_LIMITS.style) errors.push({ field: "style", code: "styleTooLong" });
  if (draft.grapes.length > ADMIN_WINE_LIMITS.grapes) errors.push({ field: "grapes", code: "tooManyGrapes" });
  const alcohol = parseOptionalDecimal(draft.alcoholContent);
  if (alcohol != null && !(Number.isFinite(alcohol) && alcohol >= 0 && alcohol <= 100))
    errors.push({ field: "alcoholContent", code: "alcoholInvalid" });
  const prices = (["priceMin", "priceMax"] as const).map((field) => {
    const price = parseOptionalDecimal(draft[field]);
    const valid = price == null || (Number.isFinite(price) && price >= 0);
    if (!valid) errors.push({ field, code: "priceInvalid" });
    return valid ? price : null;
  });
  const [min, max] = prices;
  if (min != null && max != null && min > max) errors.push({ field: "priceMax", code: "priceRange" });
  if (draft.imageUrl.trim().length > ADMIN_WINE_LIMITS.imageUrl)
    errors.push({ field: "imageUrl", code: "imageUrlTooLong" });
  return errors;
}

/** The request body for POST /admin/wines and PATCH /admin/wines/{id}. */
export function toAdminWinePayload(draft: AdminWineDraft): AdminWinePayload {
  return {
    name: draft.name.trim(),
    wineType: draft.wineType,
    wineryId: draft.wineryId,
    vintage: draft.vintage,
    style: draft.style.trim() || null,
    grapes: draft.grapes,
    allergens: draft.allergens,
    alcoholContent: numberOrNull(draft.alcoholContent),
    descriptionEs: draft.descriptionEs.trim() || null,
    descriptionEn: draft.descriptionEn.trim() || null,
    imageUrl: draft.imageUrl.trim() || null,
    priceMin: numberOrNull(draft.priceMin),
    priceMax: numberOrNull(draft.priceMax),
    isFeatured: draft.isFeatured,
    isActive: draft.isActive,
    acidityScore: draft.acidityScore,
    tanninScore: draft.tanninScore,
    bodyScore: draft.bodyScore,
    sweetnessScore: draft.sweetnessScore,
  };
}
