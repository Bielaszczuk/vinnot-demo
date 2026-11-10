/** Backend contracts of `/admin/notifications/**` (#310, mobile #327). */

export interface PushTypeSettingDto {
  type: string;
  category: string;
  transactional: boolean;
  enabled: boolean;
}

export interface PushSwitchChangeDto {
  type: string;
  previousEnabled: boolean;
  enabled: boolean;
  changedBy: string;
  changedAt: string;
}

export interface PushSettingsDto {
  provider: string;
  types: PushTypeSettingDto[];
  recentChanges: PushSwitchChangeDto[];
}

export interface PushMetricsDto {
  days: number;
  from: string;
  types: Array<{ type: string; counts: Record<string, number> }>;
}

/** Engagement pushes per type (#405); `types` is null when nothing was measured yet. */
export interface PushEngagementDto {
  days: number;
  since: string;
  types: Array<{
    type: string;
    category: string;
    enabled: boolean;
    sent: number;
    opened: number;
    optedOut: number;
    heldOut: number;
    openRate: number;
    optOutRate: number;
  }> | null;
}

export interface AnnouncementPreviewRequestDto {
  kind: string;
  locale: string;
  title: string;
  body: string;
}

export interface AnnouncementPreviewDto {
  subject: string;
  html: string;
  text: string;
  pushTitle: string;
  pushBody: string;
}

export interface AnnouncementVersionDto {
  title: string;
  body: string;
}

export interface AnnouncementAudienceDto {
  email: boolean;
  push: boolean;
  language: string | null;
  countryId: string | null;
  regionId: string | null;
  role: string | null;
}

export interface AnnouncementRequestDto {
  kind: string;
  es: AnnouncementVersionDto | null;
  en: AnnouncementVersionDto | null;
  audience: AnnouncementAudienceDto;
  destination: string;
  /** Client-generated id of a send: a repeated request returns the first send instead of sending again. */
  requestId?: string;
}

export interface AnnouncementReachDto {
  email: number;
  push: number;
  accounts: number;
}

export interface AnnouncementRecordDto {
  id: string;
  kind: string;
  test: boolean;
  email: boolean;
  push: boolean;
  language: string | null;
  countryId?: string | null;
  regionId: string | null;
  role: string | null;
  destination: string;
  title: string;
  recipients: number;
  sentBy: string;
  createdAt: string;
  completedAt: string | null;
  /** Delivery counts so far (#490); absent from servers older than that. */
  stats?: AnnouncementStatsDto | null;
}

/**
 * Emails the provider accepted and emails that will not arrive; accounts a push reached and push messages that
 * failed, late receipts included; accounts that opened the push.
 */
export interface AnnouncementStatsDto {
  emailsSent: number;
  emailsFailed: number;
  pushesSent: number;
  pushesFailed: number;
  pushesOpened: number;
}
