/** Backend contracts of `/admin/notifications/**` (#310). */

export interface PushTypeSettingDto {
  type: string
  category: string
  transactional: boolean
  enabled: boolean
}

export interface PushSwitchChangeDto {
  type: string
  previousEnabled: boolean
  enabled: boolean
  changedBy: string
  changedAt: string
}

export interface PushSettingsDto {
  provider: string
  types: PushTypeSettingDto[]
  recentChanges: PushSwitchChangeDto[]
}

export interface PushMetricsDto {
  days: number
  from: string
  types: Array<{ type: string; counts: Record<string, number> }>
}

/** `GET /admin/notifications/push/engagement` (#405). */
export interface PushEngagementDto {
  days: number
  since: string
  types: Array<{
    type: string
    category: string
    enabled: boolean
    sent: number
    opened: number
    optedOut: number
    heldOut: number
    openRate: number
    optOutRate: number
  }> | null
}

export interface AnnouncementPreviewRequestDto {
  kind: string
  locale: string
  title: string
  body: string
}

export interface AnnouncementPreviewDto {
  subject: string
  html: string
  text: string
  pushTitle: string
  pushBody: string
}

export interface AnnouncementVersionDto {
  title: string
  body: string
}

export interface AnnouncementAudienceDto {
  email: boolean
  push: boolean
  language: string | null
  countryId: string | null
  regionId: string | null
  role: string | null
}

export interface AnnouncementRequestDto {
  kind: string
  es: AnnouncementVersionDto | null
  en: AnnouncementVersionDto | null
  audience: AnnouncementAudienceDto
  destination: string
  /** Client-generated id of a send: a repeated request returns the first send instead of sending again. */
  requestId?: string
}

export interface AnnouncementReachDto {
  email: number
  push: number
  accounts: number
}

/** What happened to one announcement's messages so far (#490). */
export interface AnnouncementStatsDto {
  emailsSent: number
  emailsFailed: number
  /** Accounts with at least one accepted push. */
  pushesSent: number
  /** Push messages (one per device) that failed, late receipts included. */
  pushesFailed: number
  /** Accounts that opened the push. */
  pushesOpened: number
}

/** One send or test: an item of `GET /admin/notifications/announcements` and the body of `GET …/announcements/{id}`. */
export interface AnnouncementRecordDto {
  id: string
  kind: string
  test: boolean
  email: boolean
  push: boolean
  language: string | null
  countryId?: string | null
  regionId: string | null
  role: string | null
  destination: string
  title: string
  recipients: number
  sentBy: string
  createdAt: string
  completedAt: string | null
  stats?: AnnouncementStatsDto | null
}
