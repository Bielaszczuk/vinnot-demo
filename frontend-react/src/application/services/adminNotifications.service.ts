import { adminNotificationsClient } from '@api/clients/adminNotifications.client'
import { isHttpError } from '@infrastructure/http/errors'
import type {
  AnnouncementAudienceDto,
  AnnouncementRecordDto,
  AnnouncementRequestDto,
  PushEngagementDto,
  PushMetricsDto,
  PushSettingsDto,
} from '@api/dto/adminNotifications.dto'
import {
  ANNOUNCEMENT_DESTINATIONS,
  ANNOUNCEMENT_ERROR_CODES,
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_LANGUAGES,
  ANNOUNCEMENT_ROLES,
  isVersionWritten,
  type AnnouncementAudience,
  type AnnouncementDraft,
  type AnnouncementErrorCode,
  type AnnouncementKind,
  type AnnouncementLanguage,
  type AnnouncementPreview,
  type AnnouncementReach,
  type AnnouncementRecord,
  type AnnouncementVersion,
} from '@domain/admin/announcement'
import { emptyAnnouncementStats } from '@domain/admin/announcementStats'
import {
  completeCounts,
  engagementOpenRate,
  type PushEngagement,
  type PushMetrics,
  type PushSettings,
} from '@domain/admin/pushAdministration'

function oneOf<T extends string>(values: readonly T[], value: string | null | undefined): T | null {
  return values.find((candidate) => candidate === value) ?? null
}

function toAudienceDto(audience: AnnouncementAudience): AnnouncementAudienceDto {
  return {
    email: audience.email,
    push: audience.push,
    language: audience.language,
    countryId: audience.countryId,
    regionId: audience.regionId,
    role: audience.role,
  }
}

function toVersionDto(version: AnnouncementVersion) {
  return isVersionWritten(version) ? { title: version.title.trim(), body: version.body.trim() } : null
}

/** Only the languages the administrator wrote are sent; each recipient gets theirs, or the other one. */
export function toAnnouncementRequest(draft: AnnouncementDraft): AnnouncementRequestDto {
  return {
    kind: draft.kind,
    es: toVersionDto(draft.versions.es),
    en: toVersionDto(draft.versions.en),
    audience: toAudienceDto(draft.audience),
    destination: draft.destination,
  }
}

/** Records with a kind or destination this build does not know are left out instead of guessed at. */
function toRecords(dtos: AnnouncementRecordDto[]): AnnouncementRecord[] {
  return dtos.flatMap((dto) => {
    const kind = oneOf(ANNOUNCEMENT_KINDS, dto.kind)
    const destination = oneOf(ANNOUNCEMENT_DESTINATIONS, dto.destination)
    if (!kind || !destination) return []
    return [{
      id: dto.id,
      kind,
      test: dto.test,
      audience: {
        email: dto.email,
        push: dto.push,
        language: oneOf(ANNOUNCEMENT_LANGUAGES, dto.language),
        countryId: dto.countryId ?? null,
        regionId: dto.regionId ?? null,
        role: oneOf(ANNOUNCEMENT_ROLES, dto.role),
      },
      destination,
      title: dto.title,
      recipients: dto.recipients,
      sentBy: dto.sentBy,
      createdAt: dto.createdAt,
      completedAt: dto.completedAt ?? null,
      stats: dto.stats ? { ...dto.stats } : emptyAnnouncementStats(),
    }]
  })
}

function toPushSettings(dto: PushSettingsDto): PushSettings {
  return {
    provider: dto.provider,
    types: dto.types.map((type) => ({ ...type })),
    recentChanges: dto.recentChanges.map((change) => ({ ...change })),
  }
}

function toPushMetrics(dto: PushMetricsDto): PushMetrics {
  return {
    days: dto.days,
    from: dto.from,
    types: dto.types.map((type) => ({ type: type.type, counts: completeCounts(type.counts) })),
  }
}

function toPushEngagement(dto: PushEngagementDto): PushEngagement {
  return {
    days: dto.days,
    since: dto.since,
    types: (dto.types ?? []).map((type) => ({
      type: type.type,
      category: type.category,
      sent: type.sent,
      opened: type.opened,
      openRate: engagementOpenRate(type.sent, type.openRate),
      optedOut: type.optedOut,
      heldOut: type.heldOut,
      paused: !type.enabled,
    })),
  }
}

/** The backend refusal behind a failed test or send, when the composer can explain it. */
export function announcementErrorCode(error: unknown): AnnouncementErrorCode | null {
  return isHttpError(error) ? oneOf(ANNOUNCEMENT_ERROR_CODES, error.code) : null
}

export const adminNotificationsService = {
  async getPushSettings(): Promise<PushSettings> {
    return toPushSettings(await adminNotificationsClient.getPushSettings())
  },

  async setPushTypeEnabled(type: string, enabled: boolean): Promise<PushSettings> {
    return toPushSettings(await adminNotificationsClient.setPushTypeEnabled(type, enabled))
  },

  async getPushMetrics(days: number): Promise<PushMetrics> {
    return toPushMetrics(await adminNotificationsClient.getPushMetrics(days))
  },

  async getPushEngagement(days: number): Promise<PushEngagement> {
    return toPushEngagement(await adminNotificationsClient.getPushEngagement(days))
  },

  async previewAnnouncement(kind: AnnouncementKind, language: AnnouncementLanguage,
    version: AnnouncementVersion): Promise<AnnouncementPreview> {
    return adminNotificationsClient.previewAnnouncement({
      kind,
      locale: language,
      title: version.title.trim(),
      body: version.body.trim(),
    })
  },

  async getAnnouncementReach(kind: AnnouncementKind, audience: AnnouncementAudience): Promise<AnnouncementReach> {
    return adminNotificationsClient.getAnnouncementReach(kind, toAudienceDto(audience))
  },

  async testAnnouncement(draft: AnnouncementDraft): Promise<AnnouncementReach> {
    return adminNotificationsClient.testAnnouncement(toAnnouncementRequest(draft))
  },

  /** {@code requestId} identifies this send: retrying it with the same id never sends the announcement twice. */
  async sendAnnouncement(draft: AnnouncementDraft, requestId: string): Promise<AnnouncementRecord | null> {
    const request = { ...toAnnouncementRequest(draft), requestId }
    return toRecords([await adminNotificationsClient.sendAnnouncement(request)])[0] ?? null
  },

  async getAnnouncementHistory(): Promise<AnnouncementRecord[]> {
    return toRecords(await adminNotificationsClient.getAnnouncementHistory())
  },

  /** One send or test with its latest results; null when it no longer exists. */
  async getAnnouncement(id: string): Promise<AnnouncementRecord | null> {
    try {
      return toRecords([await adminNotificationsClient.getAnnouncement(id)])[0] ?? null
    } catch (error) {
      if (isHttpError(error) && error.status === 404) return null
      throw error
    }
  },
}
