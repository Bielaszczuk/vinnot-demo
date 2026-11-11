/**
 * Admin domain mappers.
 * @contract: keep in sync with frontend-react/src/domain/admin/admin.mappers.ts
 */
import type { AdminEvent, AdminReview, AdminStats, AdminUser, AdminWine } from "./admin.types";
import { parseBadgeTier } from "@/domain/points/badgeTiers";

export interface AdminStatsRaw {
  users?: number;
  wines?: number;
  wineries?: number;
  events?: number;
  reviews?: number;
  routes?: number;
  totalUsers?: number;
  totalWines?: number;
  totalWineries?: number;
  totalEvents?: number;
  totalReviews?: number;
  totalRoutes?: number;
  activeUsers?: number;
  publishedEvents?: number;
  publishedRoutes?: number;
}

export function mapAdminStatsFromRaw(raw: AdminStatsRaw): AdminStats {
  return {
    users: raw.users ?? raw.totalUsers ?? 0,
    wines: raw.wines ?? raw.totalWines ?? 0,
    wineries: raw.wineries ?? raw.totalWineries ?? 0,
    events: raw.events ?? raw.totalEvents ?? 0,
    reviews: raw.reviews ?? raw.totalReviews ?? 0,
    routes: raw.routes ?? raw.totalRoutes ?? 0,
    activeUsers: raw.activeUsers ?? null,
    publishedEvents: raw.publishedEvents ?? null,
    publishedRoutes: raw.publishedRoutes ?? null,
  };
}

export function mapAdminUserFromRaw(raw: Record<string, unknown>): AdminUser {
  const firstName = (raw.firstName ?? null) as string | null;
  const lastName = (raw.lastName ?? null) as string | null;
  const rawName = (raw.name ?? null) as string | null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || rawName || null;

  // GET /admin/users sends "role" as comma-separated names; older payloads send "roles".
  const rawRoles = raw.roles ?? raw.role;
  const rolesArray = Array.isArray(rawRoles)
    ? rawRoles.map((r) => String(r))
    : typeof rawRoles === "string"
      ? rawRoles
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : [];

  const normalizedRoles = rolesArray.map((role) =>
    role.startsWith("ROLE_") ? role : `ROLE_${role.toUpperCase()}`,
  );

  return {
    id: String(raw.id),
    username: String(raw.username ?? ""),
    email: String(raw.email ?? ""),
    name: fullName,
    firstName,
    lastName,
    roles: normalizedRoles.length > 0 ? normalizedRoles : ["ROLE_USER"],
    enabled: Boolean(raw.enabled ?? raw.active ?? false),
    locked: Boolean(raw.locked ?? false),
    lockReason: (raw.lockReason ?? null) as string | null,
    lastLoginAt: (raw.lastLoginAt ?? null) as string | null,
    createdAt: String(raw.createdAt ?? ""),
    points: typeof raw.points === "number" ? raw.points : 0,
    badgeTier: parseBadgeTier(raw.badgeTier),
    avatarUrl: typeof raw.avatarUrl === "string" && raw.avatarUrl ? raw.avatarUrl : null,
  };
}

export function mapAdminWineFromRaw(raw: Record<string, unknown>): AdminWine {
  return {
    id: raw.id as string,
    name: raw.name as string,
    vintage: (raw.vintage ?? null) as number | null,
    wineType: (raw.wineType ?? "RED") as string,
    wineryId: (raw.wineryId ?? "") as string,
    wineryName: (raw.wineryName ?? "") as string,
    region: (raw.region ?? raw.regionName ?? "") as string,
    country: (raw.country ?? raw.countryName ?? "") as string,
    style: (raw.style ?? null) as string | null,
    grapes: (raw.grapes ?? []) as string[],
    allergens: (raw.allergens ?? []) as string[],
    alcoholContent: (raw.alcoholContent ?? null) as number | null,
    descriptionEn: (raw.descriptionEn ?? null) as string | null,
    descriptionEs: (raw.descriptionEs ?? null) as string | null,
    imageUrl: (raw.imageUrl ?? null) as string | null,
    priceMin: (raw.priceMin ?? null) as number | null,
    priceMax: (raw.priceMax ?? null) as number | null,
    ratingAverage: (raw.ratingAverage ?? null) as number | null,
    isFeatured: (raw.isFeatured ?? raw.featured ?? false) as boolean,
    isActive: (raw.isActive ?? raw.active ?? true) as boolean,
    createdAt: (raw.createdAt ?? "") as string,
    acidityScore: (raw.acidityScore ?? null) as number | null,
    tanninScore: (raw.tanninScore ?? null) as number | null,
    bodyScore: (raw.bodyScore ?? null) as number | null,
    sweetnessScore: (raw.sweetnessScore ?? null) as number | null,
  };
}

export function mapAdminEventFromRaw(raw: Record<string, unknown>): AdminEvent {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: (raw.description ?? null) as string | null,
    type: String(raw.type ?? "OTHER"),
    startDate: String(raw.startDate ?? ""),
    endDate: String(raw.endDate ?? ""),
    locationName: (raw.locationName ?? null) as string | null,
    locationAddress: (raw.locationAddress ?? null) as string | null,
    locationCity: (raw.locationCity ?? null) as string | null,
    locationRegion: (raw.locationRegion ?? null) as string | null,
    locationCountry: (raw.locationCountry ?? null) as string | null,
    latitude: (raw.latitude ?? null) as number | null,
    longitude: (raw.longitude ?? null) as number | null,
    price: (raw.price ?? null) as number | null,
    maxAttendees: (raw.maxAttendees ?? null) as number | null,
    currency: String(raw.currency ?? "ARS"),
    registrationDeadline: (raw.registrationDeadline ?? null) as string | null,
    maxTicketsPerRegistration: Number(raw.maxTicketsPerRegistration ?? 6),
    approvalMode: raw.approvalMode === "AUTOMATIC" ? "AUTOMATIC" : "MANUAL",
    attendeeConfirmationRequired: raw.attendeeConfirmationRequired !== false,
    registrationHoldMinutes: Number(raw.registrationHoldMinutes ?? 60),
    paymentAlias: (raw.paymentAlias ?? null) as string | null,
    paymentQrUrl: (raw.paymentQrUrl ?? null) as string | null,
    paymentInstructions: (raw.paymentInstructions ?? null) as string | null,
    currentAttendees: Number(raw.currentAttendees ?? 0),
    status: String(raw.status ?? "DRAFT"),
    imageUrl: (raw.imageUrl ?? null) as string | null,
    organizerId: String(raw.organizerId ?? ""),
    organizerType: String(raw.organizerType ?? "ADMIN"),
    contactEmail: (raw.contactEmail ?? null) as string | null,
    contactPhone: (raw.contactPhone ?? null) as string | null,
    websiteUrl: (raw.websiteUrl ?? null) as string | null,
    createdAt: String(raw.createdAt ?? ""),
  };
}

export function mapAdminWineryFromRaw(
  raw: Record<string, unknown>,
): import("./admin.types").AdminWinery {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    countryName: (raw.countryName ?? null) as string | null,
    countryId: (raw.countryId ?? null) as string | null,
    regionName: (raw.regionName ?? null) as string | null,
    regionId: (raw.regionId ?? null) as string | null,
    winesCount: Number(raw.winesCount ?? 0),
    createdAt: String(raw.createdAt ?? ""),
    subregion: (raw.subregion ?? null) as string | null,
    description: (raw.description ?? null) as string | null,
    descriptionEs: (raw.descriptionEs ?? null) as string | null,
    descriptionEn: (raw.descriptionEn ?? null) as string | null,
    address: (raw.address ?? null) as string | null,
    email: (raw.email ?? null) as string | null,
    phone: (raw.phone ?? null) as string | null,
    website: (raw.website ?? null) as string | null,
    logoUrl: (raw.logoUrl ?? null) as string | null,
    imageUrl: (raw.imageUrl ?? null) as string | null,
    latitude: (raw.latitude ?? null) as number | null,
    longitude: (raw.longitude ?? null) as number | null,
    establishedYear: (raw.establishedYear ?? null) as number | null,
  };
}

export function mapAdminReviewFromRaw(raw: Record<string, unknown>): AdminReview {
  const reviewer = raw.reviewer as Record<string, unknown> | null | undefined;
  const wine = raw.wine as { id: string; name: string; vintage?: number | null } | null | undefined;
  return {
    id: String(raw.id),
    wineId: String(raw.wineId ?? ""),
    rating: typeof raw.rating === "number" ? raw.rating : 0,
    title: (raw.title ?? null) as string | null,
    comment: (raw.comment ?? null) as string | null,
    likesCount: typeof raw.likesCount === "number" ? raw.likesCount : 0,
    isVerified: raw.isVerified === true,
    createdAt: String(raw.createdAt ?? ""),
    reviewer: reviewer
      ? {
          id: String(reviewer.id),
          username: String(reviewer.username ?? ""),
          displayName: String(reviewer.displayName ?? reviewer.username ?? ""),
          avatarUrl: (reviewer.avatarUrl ?? null) as string | null,
          badgeTier: parseBadgeTier(reviewer.badgeTier),
        }
      : null,
    wine: wine ? { id: wine.id, name: wine.name, vintage: wine.vintage ?? null } : null,
  };
}
