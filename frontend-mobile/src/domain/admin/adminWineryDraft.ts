/**
 * Admin winery draft — the editable shape of a catalog winery, its validation rules and the
 * payload it becomes. Limits mirror CreateWineryAdminRequest / UpdateWineryAdminRequest so
 * the form catches what the backend would reject.
 */
import type { AdminWinery, AdminWineryPayload } from "./admin.types";
import { parseOptionalDecimal } from "./adminWineDraft";

export const ADMIN_WINERY_LIMITS = {
  name: 255,
  description: 20000,
  subregion: 100,
  address: 500,
  email: 255,
  phone: 50,
  website: 500,
  year: 4,
} as const;
export const ADMIN_WINERY_MIN_YEAR = 1000;

export interface AdminWineryDraft {
  name: string;
  descriptionEs: string;
  descriptionEn: string;
  establishedYear: string;
  countryId: string;
  countryName: string;
  regionId: string;
  regionName: string;
  subregion: string;
  address: string;
  /** Typed with a dot or a comma; blank means no coordinate. */
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  imageUrl: string;
}

export type AdminWineryDraftErrorCode =
  | "nameRequired"
  | "nameTooLong"
  | "countryRequired"
  | "descriptionTooLong"
  | "yearInvalid"
  | "subregionTooLong"
  | "addressTooLong"
  | "latitudeInvalid"
  | "longitudeInvalid"
  | "phoneTooLong"
  | "phoneInvalid"
  | "emailInvalid"
  | "websiteTooLong"
  | "websiteInvalid";

export type AdminWineryDraftError = { field: keyof AdminWineryDraft; code: AdminWineryDraftErrorCode };

/** Form sections of the winery sheet; validation errors open the section that holds them. */
export type AdminWinerySection = "identity" | "location" | "contact" | "images";

const LOCATION_FIELDS = ["countryId", "regionId", "subregion", "address", "latitude", "longitude"];
const CONTACT_FIELDS = ["phone", "email", "website"];
const IMAGE_FIELDS = ["logoUrl", "imageUrl"];

export function adminWinerySection(field: string): AdminWinerySection {
  if (LOCATION_FIELDS.includes(field)) return "location";
  if (CONTACT_FIELDS.includes(field)) return "contact";
  if (IMAGE_FIELDS.includes(field)) return "images";
  return "identity";
}

function coordinateText(value: number | null | undefined): string {
  return value != null ? String(value) : "";
}

export function toAdminWineryDraft(winery?: AdminWinery | null): AdminWineryDraft {
  return {
    name: winery?.name ?? "",
    descriptionEs: winery?.descriptionEs ?? winery?.description ?? "",
    descriptionEn: winery?.descriptionEn ?? "",
    establishedYear: winery?.establishedYear ? String(winery.establishedYear) : "",
    countryId: winery?.countryId ?? "",
    countryName: winery?.countryName ?? "",
    regionId: winery?.regionId ?? "",
    regionName: winery?.regionName ?? "",
    subregion: winery?.subregion ?? "",
    address: winery?.address ?? "",
    latitude: coordinateText(winery?.latitude),
    longitude: coordinateText(winery?.longitude),
    phone: winery?.phone ?? "",
    email: winery?.email ?? "",
    website: winery?.website ?? "",
    logoUrl: winery?.logoUrl ?? "",
    imageUrl: winery?.imageUrl ?? "",
  };
}

/** Null when blank, NaN when not a number or out of range. */
function coordinate(value: string, limit: number): number | null {
  const parsed = parseOptionalDecimal(value);
  if (parsed == null) return null;
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : NaN;
}

/** The point the map shows: only when both coordinates are valid. */
export function draftCoordinates(draft: Pick<AdminWineryDraft, "latitude" | "longitude">): {
  latitude: number | null;
  longitude: number | null;
} {
  const latitude = coordinate(draft.latitude, 90);
  const longitude = coordinate(draft.longitude, 180);
  return latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude)
    ? { latitude, longitude }
    : { latitude: null, longitude: null };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

/** The website as it is saved: trimmed, with https:// added when the scheme is missing. */
export function normalizeWinerySite(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;
  return SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// http(s), a dotted host with no spaces, then an optional port and path.
const WEB_ADDRESS = /^https?:\/\/[^\s/?#:@]+\.[^\s/?#:@]+(:\d+)?([/?#]\S*)?$/i;

/** Imported wineries keep local formats such as (0261) 412-3456, so only the characters are checked. */
const PHONE_CHARACTERS = /^[0-9 +()-]*$/;

function isWebAddress(website: string): boolean {
  return WEB_ADDRESS.test(website);
}

export function validateAdminWineryDraft(
  draft: AdminWineryDraft,
  currentYear: number = new Date().getFullYear(),
): AdminWineryDraftError[] {
  const errors: AdminWineryDraftError[] = [];
  const tooLong = (field: keyof AdminWineryDraft, limit: number, code: AdminWineryDraftErrorCode) => {
    if (draft[field].trim().length > limit) errors.push({ field, code });
  };
  const name = draft.name.trim();
  if (!name) errors.push({ field: "name", code: "nameRequired" });
  else tooLong("name", ADMIN_WINERY_LIMITS.name, "nameTooLong");
  tooLong("descriptionEs", ADMIN_WINERY_LIMITS.description, "descriptionTooLong");
  tooLong("descriptionEn", ADMIN_WINERY_LIMITS.description, "descriptionTooLong");
  const year = draft.establishedYear.trim();
  if (year && !(/^\d{4}$/.test(year) && Number(year) >= ADMIN_WINERY_MIN_YEAR && Number(year) <= currentYear))
    errors.push({ field: "establishedYear", code: "yearInvalid" });
  if (!draft.countryId) errors.push({ field: "countryId", code: "countryRequired" });
  tooLong("subregion", ADMIN_WINERY_LIMITS.subregion, "subregionTooLong");
  tooLong("address", ADMIN_WINERY_LIMITS.address, "addressTooLong");
  if (Number.isNaN(coordinate(draft.latitude, 90))) errors.push({ field: "latitude", code: "latitudeInvalid" });
  if (Number.isNaN(coordinate(draft.longitude, 180))) errors.push({ field: "longitude", code: "longitudeInvalid" });
  if (draft.phone.trim().length > ADMIN_WINERY_LIMITS.phone) errors.push({ field: "phone", code: "phoneTooLong" });
  else if (!PHONE_CHARACTERS.test(draft.phone.trim())) errors.push({ field: "phone", code: "phoneInvalid" });
  const email = draft.email.trim();
  if (email && !(EMAIL.test(email) && email.length <= ADMIN_WINERY_LIMITS.email))
    errors.push({ field: "email", code: "emailInvalid" });
  const website = normalizeWinerySite(draft.website);
  if (draft.website.trim().length > ADMIN_WINERY_LIMITS.website) errors.push({ field: "website", code: "websiteTooLong" });
  else if (website && !isWebAddress(website)) errors.push({ field: "website", code: "websiteInvalid" });
  return errors;
}

function nullable(value: string): string | null {
  return value.trim() || null;
}

function coordinateOrNull(value: string): number | null {
  const parsed = parseOptionalDecimal(value);
  return parsed != null && Number.isFinite(parsed) ? parsed : null;
}

/** The request body for POST /admin/wineries and PATCH /admin/wineries/{id}. */
export function toAdminWineryPayload(draft: AdminWineryDraft): AdminWineryPayload {
  return {
    name: draft.name.trim(),
    countryId: draft.countryId,
    regionId: draft.regionId || null,
    subregion: nullable(draft.subregion),
    descriptionEs: nullable(draft.descriptionEs),
    descriptionEn: nullable(draft.descriptionEn),
    address: nullable(draft.address),
    latitude: coordinateOrNull(draft.latitude),
    longitude: coordinateOrNull(draft.longitude),
    establishedYear: draft.establishedYear.trim() ? Number(draft.establishedYear) : null,
    email: nullable(draft.email),
    phone: nullable(draft.phone),
    website: normalizeWinerySite(draft.website),
    logoUrl: nullable(draft.logoUrl),
    imageUrl: nullable(draft.imageUrl),
  };
}
