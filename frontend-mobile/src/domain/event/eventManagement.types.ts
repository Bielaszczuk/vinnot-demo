/** Event management contracts shared by authorized organizer and administration flows. */
export interface ManagedEvent {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  locationCity: string | null;
  price: number | null;
  currentAttendees: number;
  maxAttendees: number | null;
  currency: string;
  registrationDeadline: string | null;
  maxTicketsPerRegistration: number;
  approvalMode: "MANUAL" | "AUTOMATIC";
  attendeeConfirmationRequired: boolean;
  registrationHoldMinutes: number;
  paymentAlias: string | null;
  paymentQrUrl: string | null;
  paymentInstructions: string | null;
  description: string | null;
  locationName: string | null;
  locationAddress: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
}

export interface EventEditorInput {
  title: string;
  description: string | null;
  type: string;
  /** Omitted when unchanged; the server keeps the current status. */
  status?: string;
  startDate: string;
  endDate: string;
  locationName: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  maxAttendees: number | null;
  currency: string;
  registrationDeadline: string | null;
  maxTicketsPerRegistration: number;
  approvalMode: "MANUAL" | "AUTOMATIC";
  attendeeConfirmationRequired: boolean;
  registrationHoldMinutes: number;
  /** Not shown by the app editor: left out so a save never clears what the web set. */
  paymentAlias?: string | null;
  paymentQrUrl?: string | null;
  paymentInstructions?: string | null;
  imageUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
}
