import {
  ROUTE_DIFFICULTIES,
  ROUTE_STATUSES,
  ROUTE_STOP_TYPES,
  ROUTE_WINE_TYPES,
  emptyManualStop,
  normalizeStops,
  toAdminRouteDraft,
  type AdminRouteDraft,
  type AdminRouteSection,
  type ManualStopDraft,
} from "@/domain/admin/adminRouteDraft";

export const DIFFICULTIES = ROUTE_DIFFICULTIES;
export const STATUSES = ROUTE_STATUSES;
export const STOP_TYPES = ROUTE_STOP_TYPES;
export const WINE_TYPES = ROUTE_WINE_TYPES;

export type EditableRoute = AdminRouteDraft;
export type ManualStop = ManualStopDraft;
export const toEditable = toAdminRouteDraft;
export { emptyManualStop, normalizeStops };

/** Sections open when the sheet appears: a new route starts from its details, place and stops. */
export const CREATE_ROUTE_SECTIONS: readonly AdminRouteSection[] = ["details", "location", "stops"];
export const EDIT_ROUTE_SECTIONS: readonly AdminRouteSection[] = ["details", "stops"];

/** Minimum letters before the stop winery search asks the backend. */
export const STOP_WINERY_MIN_QUERY = 2;
