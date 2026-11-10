import { notificationsApiClient } from "@/infrastructure/api/clients/notifications.client";
import type { EventAreaDto, NotificationPreferencesDto } from "@/infrastructure/api/dto/notifications.dto";
import { locationService, type LocationFailure } from "@/application/services/location.service";
import { geocodingService } from "@/application/services/geocoding.service";
import {
  isEventAreaKind,
  toApproximateCoordinate,
  type EventArea,
  type EventAreaRegion,
} from "@/domain/notification/eventArea";
import {
  isNotificationCategory,
  type NotificationCategory,
  type NotificationCategoryKind,
  type NotificationChannel,
  type NotificationPreferences,
} from "@/domain/notification/notificationPreferences";

const KINDS: readonly string[] = ["TRANSACTIONAL", "OPTIONAL", "PROMOTIONAL"];

function toDomain(dto: NotificationPreferencesDto): NotificationPreferences {
  return {
    marketingConsent: {
      granted: dto.marketingConsent.granted,
      decidedAt: dto.marketingConsent.decidedAt ?? null,
      source: dto.marketingConsent.source ?? null,
    },
    categories: dto.categories
      .filter((item) => isNotificationCategory(item.category) && KINDS.includes(item.kind))
      .map((item) => ({
        category: item.category as NotificationCategory,
        kind: item.kind as NotificationCategoryKind,
        email: item.email,
        push: item.push,
        editable: item.editable,
        emailAvailable: item.emailAvailable ?? true,
        pushAvailable: item.pushAvailable ?? true,
      })),
  };
}

export type ApproximateEventAreaResult = { ok: true; area: EventArea } | { ok: false; reason: LocationFailure };

export type PlaceSearchFailure = "not_found" | "unavailable";

/** A point on the map; `name` is known only when it came from a place search. */
export interface MapPoint {
  latitude: number;
  longitude: number;
  name?: string;
}

export type PlaceSearchResult = { ok: true; place: MapPoint } | { ok: false; reason: PlaceSearchFailure };

function toEventArea(dto: EventAreaDto | null): EventArea | null {
  if (!dto || !isEventAreaKind(dto.kind)) return null;
  if (dto.kind === "APPROXIMATE") return { kind: "APPROXIMATE" };
  return dto.regionId && dto.regionName ? { kind: "REGION", regionId: dto.regionId, regionName: dto.regionName } : null;
}

export const notificationsService = {
  async getPreferences(): Promise<NotificationPreferences> {
    return toDomain(await notificationsApiClient.getPreferences());
  },

  async setChannel(
    category: NotificationCategory,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreferences> {
    return toDomain(
      await notificationsApiClient.updatePreferences({
        source: "MOBILE",
        categories: [{ category, [channel]: enabled }],
      }),
    );
  },

  async setMarketingConsent(granted: boolean): Promise<NotificationPreferences> {
    return toDomain(
      await notificationsApiClient.updatePreferences({ source: "MOBILE", marketingConsent: granted, categories: [] }),
    );
  },

  async getEventArea(): Promise<EventArea | null> {
    return toEventArea(await notificationsApiClient.getEventArea());
  },

  async setEventAreaRegion(region: EventAreaRegion): Promise<EventArea> {
    await notificationsApiClient.setEventArea({ regionId: region.id });
    return { kind: "REGION", regionId: region.id, regionName: region.name };
  },

  /** Asks for the location only now; the server rounds the position and never returns it. */
  async setApproximateEventArea(): Promise<ApproximateEventAreaResult> {
    const location = await locationService.getCurrentLocation();
    if (!location.ok) return { ok: false, reason: location.reason };
    await notificationsApiClient.setEventArea({
      latitude: toApproximateCoordinate(location.latitude),
      longitude: toApproximateCoordinate(location.longitude),
    });
    return { ok: true, area: { kind: "APPROXIMATE" } };
  },

  /** Looks a place up on the map so the user can check the pin before saving it; nothing leaves the device. */
  async findPlace(query: string): Promise<PlaceSearchResult> {
    const result = await geocodingService.geocodeAddress(query.trim());
    if (!result.ok || !result.location) {
      return { ok: false, reason: result.status === "ZERO_RESULTS" ? "not_found" : "unavailable" };
    }
    const { latitude, longitude, formattedAddress } = result.location;
    return { ok: true, place: { latitude, longitude, name: formattedAddress } };
  },

  /**
   * A point picked on the map for a place missing from the region catalogue, sent rounded like the approximate
   * location, so only a point about 11 km wide leaves the device.
   */
  async setEventAreaPoint(point: MapPoint): Promise<EventArea> {
    await notificationsApiClient.setEventArea({
      latitude: toApproximateCoordinate(point.latitude),
      longitude: toApproximateCoordinate(point.longitude),
    });
    return point.name ? { kind: "APPROXIMATE", placeName: point.name } : { kind: "APPROXIMATE" };
  },

  async clearEventArea(): Promise<void> {
    await notificationsApiClient.clearEventArea();
  },
};
