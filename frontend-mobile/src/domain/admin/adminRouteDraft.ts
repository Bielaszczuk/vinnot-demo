/**
 * Admin route draft — the editable shape of a wine route, its validation rules, its stops
 * and the payload it becomes. Limits mirror CreateRouteAdminRequest / UpdateRouteAdminRequest
 * and AddStopAdminRequest so the form catches what the backend would reject.
 */
import type { AdminRoute, AdminRoutePayload, AdminRouteStop } from "./admin.types";
import { parseOptionalDecimal } from "./adminWineDraft";

export const ROUTE_DIFFICULTIES = ["short", "medium", "long"] as const;
export const ROUTE_STATUSES = ["draft", "active", "archived"] as const;
export const ROUTE_STOP_TYPES = ["winery", "restaurant", "viewpoint", "attraction", "accommodation"] as const;
export const ROUTE_WINE_TYPES = ["RED", "WHITE", "ROSE", "SPARKLING", "DESSERT", "FORTIFIED"] as const;

export const ADMIN_ROUTE_LIMITS = {
  name: 255,
  description: 20000,
  subregion: 100,
  mapEmbedUrl: 1000,
  stopName: 255,
  stopAddress: 500,
} as const;

/** Minutes a manual stop takes when the editor leaves the duration blank. */
export const DEFAULT_STOP_MINUTES = 30;

export interface AdminRouteDraft {
  name: string;
  description: string;
  /** Country name, as the route stores it. */
  country: string;
  /** Region name, as the route stores it. */
  region: string;
  subregion: string;
  status: string;
  difficulty: string;
  estimatedDays: string;
  estimatedDuration: string;
  totalDistance: string;
  imageUrl: string;
  mapEmbedUrl: string;
  recommendedWineTypes: string[];
}

export type AdminRouteDraftErrorCode =
  | "nameRequired"
  | "nameTooLong"
  | "countryRequired"
  | "descriptionTooLong"
  | "subregionTooLong"
  | "daysInvalid"
  | "distanceInvalid"
  | "mapEmbedUrlTooLong";

export type AdminRouteDraftError = { field: keyof AdminRouteDraft; code: AdminRouteDraftErrorCode };

/** Form sections of the route sheet; validation errors open the section that holds them. */
export type AdminRouteSection = "details" | "location" | "stops" | "media";

const LOCATION_FIELDS = ["country", "region", "subregion"];
const MEDIA_FIELDS = ["imageUrl", "mapEmbedUrl"];

export function adminRouteSection(field: string): AdminRouteSection {
  if (LOCATION_FIELDS.includes(field)) return "location";
  if (MEDIA_FIELDS.includes(field)) return "media";
  return "details";
}

const numberText = (value: number | null | undefined) => (value != null ? String(value) : "");

export function toAdminRouteDraft(route?: AdminRoute | null): AdminRouteDraft {
  return {
    name: route?.name ?? "",
    description: route?.description ?? "",
    country: route?.country ?? "",
    region: route?.region ?? "",
    subregion: route?.subregion ?? "",
    status: route?.status ?? "draft",
    difficulty: route?.difficulty ?? "medium",
    estimatedDays: numberText(route?.estimatedDays),
    estimatedDuration: numberText(route?.estimatedDuration),
    totalDistance: numberText(route?.totalDistance),
    imageUrl: route?.imageUrl ?? "",
    mapEmbedUrl: route?.mapEmbedUrl ?? "",
    recommendedWineTypes: route?.recommendedWineTypes ?? [],
  };
}

function numberOrNull(value: string): number | null {
  const parsed = parseOptionalDecimal(value);
  return parsed != null && Number.isFinite(parsed) ? parsed : null;
}

const isPositiveInteger = (value: string) => /^\d+$/.test(value) && Number(value) > 0;

export function validateAdminRouteDraft(draft: AdminRouteDraft): AdminRouteDraftError[] {
  const errors: AdminRouteDraftError[] = [];
  const tooLong = (field: keyof AdminRouteDraft, limit: number, code: AdminRouteDraftErrorCode) => {
    const value = draft[field];
    if (typeof value === "string" && value.trim().length > limit) errors.push({ field, code });
  };
  if (!draft.name.trim()) errors.push({ field: "name", code: "nameRequired" });
  else tooLong("name", ADMIN_ROUTE_LIMITS.name, "nameTooLong");
  if (!draft.country.trim()) errors.push({ field: "country", code: "countryRequired" });
  tooLong("description", ADMIN_ROUTE_LIMITS.description, "descriptionTooLong");
  tooLong("subregion", ADMIN_ROUTE_LIMITS.subregion, "subregionTooLong");
  const days = draft.estimatedDays.trim();
  if (days && !isPositiveInteger(days)) errors.push({ field: "estimatedDays", code: "daysInvalid" });
  const distance = parseOptionalDecimal(draft.totalDistance);
  if (distance != null && !(Number.isFinite(distance) && distance >= 0))
    errors.push({ field: "totalDistance", code: "distanceInvalid" });
  tooLong("mapEmbedUrl", ADMIN_ROUTE_LIMITS.mapEmbedUrl, "mapEmbedUrlTooLong");
  return errors;
}

export function normalizeStops(stops?: readonly AdminRouteStop[] | null): AdminRouteStop[] {
  return [...(stops ?? [])].sort((a, b) => a.stopOrder - b.stopOrder);
}

/** Numbers the stops 1..n in their current order. */
export function reorderStops(stops: readonly AdminRouteStop[]): AdminRouteStop[] {
  return stops.map((stop, index) => ({ ...stop, stopOrder: index + 1 }));
}

export function routeStopsDuration(stops: readonly AdminRouteStop[]): number {
  return stops.reduce((sum, stop) => sum + (stop.estimatedDuration || 0), 0);
}

const nullable = (value: string) => value.trim() || null;

/** The request body for POST /admin/routes and PATCH /admin/routes/{id}. */
export function toAdminRoutePayload(draft: AdminRouteDraft, stops: AdminRouteStop[]): AdminRoutePayload {
  const totalDuration = routeStopsDuration(stops);
  return {
    name: draft.name.trim(),
    description: nullable(draft.description),
    country: draft.country.trim(),
    region: nullable(draft.region),
    subregion: nullable(draft.subregion),
    estimatedDuration: totalDuration > 0 ? totalDuration : numberOrNull(draft.estimatedDuration),
    estimatedDays: numberOrNull(draft.estimatedDays),
    totalDistance: numberOrNull(draft.totalDistance),
    difficulty: draft.difficulty || null,
    imageUrl: nullable(draft.imageUrl),
    mapEmbedUrl: nullable(draft.mapEmbedUrl),
    status: draft.status || "draft",
    recommendedWineTypes: draft.recommendedWineTypes,
    stops,
  };
}

export interface ManualStopDraft {
  name: string;
  description: string;
  type: string;
  address: string;
  estimatedDuration: string;
}

export type ManualStopErrorCode =
  | "stopNameRequired"
  | "stopNameTooLong"
  | "stopAddressTooLong"
  | "stopDurationInvalid";

export type ManualStopError = { field: keyof ManualStopDraft; code: ManualStopErrorCode };

export function emptyManualStop(): ManualStopDraft {
  return { name: "", description: "", type: "winery", address: "", estimatedDuration: String(DEFAULT_STOP_MINUTES) };
}

export function validateManualStop(draft: ManualStopDraft): ManualStopError[] {
  const errors: ManualStopError[] = [];
  const name = draft.name.trim();
  if (!name) errors.push({ field: "name", code: "stopNameRequired" });
  else if (name.length > ADMIN_ROUTE_LIMITS.stopName) errors.push({ field: "name", code: "stopNameTooLong" });
  if (draft.address.trim().length > ADMIN_ROUTE_LIMITS.stopAddress)
    errors.push({ field: "address", code: "stopAddressTooLong" });
  const minutes = draft.estimatedDuration.trim();
  if (minutes && !isPositiveInteger(minutes))
    errors.push({ field: "estimatedDuration", code: "stopDurationInvalid" });
  return errors;
}

export function toManualRouteStop(draft: ManualStopDraft, stopOrder: number): AdminRouteStop {
  const minutes = draft.estimatedDuration.trim();
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    type: draft.type,
    address: draft.address.trim(),
    latitude: null,
    longitude: null,
    stopOrder,
    estimatedDuration: minutes ? Number(minutes) : DEFAULT_STOP_MINUTES,
  };
}
