export interface MarketingConsentDto {
  granted: boolean;
  decidedAt: string | null;
  source: string | null;
}

export interface NotificationCategoryDto {
  category: string;
  kind: string;
  email: boolean;
  push: boolean;
  editable: boolean;
  /** Whether the category sends emails at all; absent on older APIs. */
  emailAvailable?: boolean;
  /** Whether the category sends pushes at all; absent on older APIs. */
  pushAvailable?: boolean;
}

export interface NotificationPreferencesDto {
  marketingConsent: MarketingConsentDto;
  categories: NotificationCategoryDto[];
}

export interface UpdateNotificationPreferencesRequestDto {
  source: "MOBILE";
  marketingConsent?: boolean;
  categories: { category: string; email?: boolean; push?: boolean }[];
}

export interface RegisterPushDeviceRequestDto {
  token: string;
  platform: "IOS" | "ANDROID";
  locale: "es" | "en";
  /** Sent once the device created the Android notification channels the server targets per category. */
  channels?: true;
}

export interface UnregisterPushDeviceRequestDto {
  token: string;
}

/** Body of POST /users/me/push-opens: the `ref` and `type` the tapped push carried. */
export interface PushOpenRequestDto {
  ref: string;
  type: string;
}

/** 200 body of GET /users/me/event-area; it never carries a location. */
export interface EventAreaDto {
  kind: string;
  regionId: string | null;
  regionName: string | null;
}

/** Either a catalogue region or a location the server rounds before storing it. */
export type SetEventAreaRequestDto = { regionId: string } | { latitude: number; longitude: number };
