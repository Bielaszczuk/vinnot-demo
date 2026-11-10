export interface MarketingConsentDto {
  granted: boolean
  decidedAt: string | null
  source: string | null
}

export interface NotificationCategoryDto {
  category: string
  kind: string
  email: boolean
  push: boolean
  editable: boolean
  /** Absent on older APIs, which means the channel is offered. */
  emailAvailable?: boolean
  pushAvailable?: boolean
}

export interface NotificationPreferencesDto {
  marketingConsent: MarketingConsentDto
  categories: NotificationCategoryDto[]
}

export interface UpdateNotificationPreferencesRequestDto {
  source: 'WEB'
  marketingConsent?: boolean
  categories: { category: string; email?: boolean; push?: boolean }[]
}

export interface UnsubscribeResponseDto {
  category: string
}

/** `GET /users/me/event-area`; the backend answers 204 when the user has no area. */
export interface EventAreaDto {
  kind: string
  regionId: string | null
  regionName: string | null
}

export interface SetEventAreaRequestDto {
  regionId: string
}
