import { eventBookingErrorKey } from "./eventBookingError";

it("tells the attendee to contact the organizer when a paid registration cannot be self-cancelled", () => {
  expect(eventBookingErrorKey("PAID_REGISTRATION_REQUIRES_ORGANIZER", "events.registration.cancelError"))
    .toBe("events.registration.paidRequiresOrganizer");
});

it("keeps the known booking outcomes and the caller fallback", () => {
  expect(eventBookingErrorKey("EVENT_PAYMENTS_UNAVAILABLE")).toBe("eventBooking.paymentsUnavailable");
  expect(eventBookingErrorKey(undefined)).toBe("events.registerError");
  expect(eventBookingErrorKey("SOMETHING_ELSE", "events.registration.cancelError")).toBe("events.registration.cancelError");
});
