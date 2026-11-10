import { notificationsClient } from '@api/clients/notifications.client'
import { isHttpError } from '@infrastructure/http/errors'
import type { EventAreaDto, NotificationPreferencesDto } from '@api/dto/notifications.dto'
import { isEventAreaKind, type EventArea } from '@domain/notification/eventArea'
import {
  isNotificationCategory,
  type NotificationCategory,
  type NotificationCategoryKind,
  type NotificationChannel,
  type NotificationPreferences,
} from '@domain/notification/notificationPreferences'

const KINDS: readonly string[] = ['TRANSACTIONAL', 'OPTIONAL', 'PROMOTIONAL']

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
  }
}

/** An area this build cannot read is treated as no area rather than guessed at. */
function toEventArea(dto: EventAreaDto | null): EventArea | null {
  if (!dto || !isEventAreaKind(dto.kind)) return null
  if (dto.kind === 'APPROXIMATE') return { kind: 'APPROXIMATE' }
  return dto.regionId ? { kind: 'REGION', regionId: dto.regionId, regionName: dto.regionName ?? null } : null
}

export const notificationsService = {
  async getPreferences(): Promise<NotificationPreferences> {
    return toDomain(await notificationsClient.getPreferences())
  },

  async setChannel(category: NotificationCategory, channel: NotificationChannel, enabled: boolean): Promise<NotificationPreferences> {
    return toDomain(await notificationsClient.updatePreferences({
      source: 'WEB', categories: [{ category, [channel]: enabled }],
    }))
  },

  async setMarketingConsent(granted: boolean): Promise<NotificationPreferences> {
    return toDomain(await notificationsClient.updatePreferences({ source: 'WEB', marketingConsent: granted, categories: [] }))
  },

  async getEventArea(): Promise<EventArea | null> {
    return toEventArea(await notificationsClient.getEventArea())
  },

  async setEventAreaRegion(regionId: string): Promise<void> {
    const trimmed = regionId.trim()
    if (!trimmed) throw new Error('INVALID_EVENT_AREA_REGION')
    await notificationsClient.setEventArea({ regionId: trimmed })
  },

  async clearEventArea(): Promise<void> {
    await notificationsClient.clearEventArea()
  },

  async unsubscribe(token: string): Promise<string> {
    const trimmed = token.trim()
    if (!trimmed) throw new Error('INVALID_UNSUBSCRIBE_LINK')
    return (await notificationsClient.unsubscribe(trimmed)).category
  },
}

const INVALID_UNSUBSCRIBE_LINK = 'INVALID_UNSUBSCRIBE_LINK'

/** True when the unsubscribe link itself was refused; network and server failures are worth a retry instead. */
export function isRejectedUnsubscribeLink(error: unknown): boolean {
  if (isHttpError(error)) return error.code === INVALID_UNSUBSCRIBE_LINK
  return error instanceof Error && error.message === INVALID_UNSUBSCRIBE_LINK
}
