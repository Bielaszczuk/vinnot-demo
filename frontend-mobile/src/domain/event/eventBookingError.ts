/** Translate known domain outcomes without exposing provider/transport details. */
export function eventBookingErrorKey(code: string | undefined, fallback = "events.registerError"): string {
  switch (code) {
    case "INVALID_PHONE_NUMBER": return "contactPhone.invalid";
    case "EVENT_PAYMENTS_UNAVAILABLE": return "eventBooking.paymentsUnavailable";
    case "PAYMENT_PILOT_RESTRICTED":
    case "PAYMENT_LIVE_PILOT_LIMIT":
    case "PAYMENT_CURRENCY_UNSUPPORTED": return "eventBooking.pilotRestricted";
    case "PAYMENT_PROVIDER_VERIFICATION_REQUIRED": return "eventBooking.providerVerification";
    case "PAID_REGISTRATION_REQUIRES_ORGANIZER": return "events.registration.paidRequiresOrganizer";
    default: return fallback;
  }
}
