import { fireEvent, render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vitest";
import en from "@i18n/locales/en-US.json";
import { EventDetailsSidebar } from "./EventDetailsSidebar";
import type { Event, EventRegistration } from "@domain/event/event.types";

async function mount(overrides: Partial<Event>, registration: EventRegistration | null = null, cancelRegistration = vi.fn()) {
  const i18n = createInstance();
  await i18n.init({ lng: "en-US", resources: { "en-US": { translation: en } } });
  const event = {
    id: "event",
    title: "Harvest tasting",
    type: "TASTING",
    startDate: new Date("2026-11-20T18:00:00Z"),
    endDate: new Date("2026-11-20T21:00:00Z"),
    location: { name: "Cellar", address: "", city: "Mendoza", region: "", country: "AR", latitude: null, longitude: null },
    price: null,
    maxAttendees: 10,
    currentAttendees: 2,
    availableSpots: 8,
    status: "PUBLISHED",
    isAvailable: true,
    tags: [],
    ...overrides,
  } as Event;
  return render(
    <I18nextProvider i18n={i18n}>
    <EventDetailsSidebar
      event={event}
      t={i18n.t}
      registerPending={false}
      handleRegister={vi.fn()}
      registration={registration}
      confirmAttendance={vi.fn()}
      cancelRegistration={cancelRegistration}
      registrationActionPending={false}
      isSoldOut={event.maxAttendees !== null && event.currentAttendees >= event.maxAttendees}
      capacityPercent={20}
      capacityColor="bg-success"
      isUpcoming
    />
    </I18nextProvider>,
  );
}

it("invites to register while registration is open", async () => {
  await mount({});
  expect(screen.getByRole("button", { name: "Register" })).toBeEnabled();
});

it("says registration is closed when unavailable with free capacity", async () => {
  await mount({ isAvailable: false });
  expect(screen.getByRole("button", { name: "Registration closed" })).toBeDisabled();
  expect(screen.queryByText(en.events.soldOut)).toBeNull();
});

it("keeps sold out only when capacity is full", async () => {
  await mount({ isAvailable: false, currentAttendees: 10, availableSpots: 0 });
  expect(screen.getByRole("button", { name: en.events.soldOut })).toBeDisabled();
});

it("says the organizer cancelled the event and does not offer to sign up again", async () => {
  const cancelledRegistration = { id: "reg", status: "CANCELLED", attendeeCount: 1, organizerNote: null, contactActionUrl: null, totalAmount: 0 } as unknown as EventRegistration;
  await mount({ status: "CANCELLED", isAvailable: false }, cancelledRegistration);

  expect(screen.getByRole("status")).toHaveTextContent(en.events.cancelledNotice);
  expect(screen.getByText(en.events.statusLabels.cancelled)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: en.eventBooking.registerAgain })).toBeNull();
});

it("still offers to sign up again after a cancelled registration while the event is open", async () => {
  const cancelledRegistration = { id: "reg", status: "CANCELLED", attendeeCount: 1, organizerNote: null, contactActionUrl: null, totalAmount: 0 } as unknown as EventRegistration;
  await mount({}, cancelledRegistration);

  expect(screen.getByRole("button", { name: en.eventBooking.registerAgain })).toBeEnabled();
  expect(screen.queryByRole("status")).toBeNull();
});

it("lets the attendee cancel an active registration", async () => {
  const confirmed = { id: "reg", status: "CONFIRMED", attendeeCount: 1, organizerNote: null, contactActionUrl: null, totalAmount: 0, paymentStatus: "NOT_REQUIRED" } as unknown as EventRegistration;
  const cancelRegistration = vi.fn();
  await mount({}, confirmed, cancelRegistration);

  fireEvent.click(screen.getByRole("button", { name: en.events.registration.cancelRegistration }));
  expect(cancelRegistration).toHaveBeenCalledOnce();
});

it("does not offer to cancel a registration that is already closed", async () => {
  for (const status of ["CANCELLED", "REJECTED", "EXPIRED"]) {
    const closed = { id: "reg", status, attendeeCount: 1, organizerNote: null, contactActionUrl: null, totalAmount: 0 } as unknown as EventRegistration;
    const view = await mount({}, closed);
    expect(screen.queryByRole("button", { name: en.events.registration.cancelRegistration })).toBeNull();
    view.unmount();
  }
});

it("shows the price in the event currency and the app language, with translated date labels", async () => {
  await mount({ price: 1500, registration: { currency: "USD" } as Event["registration"] });
  expect(screen.getAllByText("$1,500")).toHaveLength(2);
  expect(screen.queryByText(/\$1500/)).toBeNull();
  expect(screen.getByText(en.events.dateAndTime)).toBeInTheDocument();
});

it("scrolls the price card with the page so it never covers Quick info below it", async () => {
  const { container } = await mount({ tags: ["Malbec"] });
  expect(screen.getByText(en.events.quickInfo)).toBeInTheDocument();
  expect(container.querySelector('[class*="sticky"]')).toBeNull();
});

it("fills the capacity bar over time, except under reduced motion", async () => {
  await mount({});
  expect(document.querySelector(".bg-success[style*='width']")).toHaveClass("transition-all", "duration-700", "motion-reduce:transition-none");
});
