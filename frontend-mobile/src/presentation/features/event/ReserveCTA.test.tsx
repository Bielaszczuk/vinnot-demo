import { render, screen } from "@testing-library/react-native";
import type { Event, EventRegistration } from "@/domain/event/event.types";
import { ReserveCTA } from "./ReserveCTA";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
jest.mock("lucide-react-native", () => {
  const { Text } = jest.requireActual("react-native");
  return new Proxy({}, { get: (_target, name: string) => () => <Text>{`icon:${name}`}</Text> });
});
jest.mock("@/presentation/components/ui/Card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/presentation/components/ui/Button", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    Button: ({ children, disabled }: { children: string; disabled?: boolean }) => (
      <Text accessibilityState={{ disabled: !!disabled }}>{children}</Text>
    ),
  };
});

const event = (overrides: Partial<Event> = {}) =>
  ({
    id: "event",
    price: null,
    startDate: new Date("2030-01-01T20:00:00Z"),
    location: { name: "Venue", city: "Mendoza", address: "" },
    currentAttendees: 2,
    maxAttendees: 20,
    availableSpots: 18,
    status: "PUBLISHED",
    isAvailable: true,
    ...overrides,
  }) as Event;
const registration = (status: EventRegistration["status"]) =>
  ({ status, attendeeCount: 1, expiresAt: null, organizerNote: null, contactActionUrl: null,
    totalAmount: 0, paymentStatus: "NOT_REQUIRED" }) as unknown as EventRegistration;

it("formats the event price with its currency", () => {
  render(<ReserveCTA event={event({ price: 12000, registration: { currency: "ARS" } } as Partial<Event>)} onReserve={jest.fn()} />);
  const expected = new Intl.NumberFormat("en", { style: "currency", currency: "ARS" }).format(12000).replace(/\s+/g, " ");
  expect(screen.getByText(expected)).toBeTruthy();
});

describe("ReserveCTA availability", () => {
  it("keeps the register action for open events", () => {
    render(<ReserveCTA event={event()} onReserve={jest.fn()} />);
    expect(screen.getByText("events.register")).toBeTruthy();
  });
  it("shows sold out only when capacity is full", () => {
    render(<ReserveCTA event={event({ availableSpots: 0, isAvailable: false })} onReserve={jest.fn()} />);
    expect(screen.getByText("events.soldOut")).toBeDisabled();
  });
  it("shows closed registration when the event is unavailable with spots left", () => {
    render(<ReserveCTA event={event({ isAvailable: false })} onReserve={jest.fn()} />);
    expect(screen.getByText("events.registrationClosed")).toBeDisabled();
    expect(screen.queryByText("events.soldOut")).toBeNull();
  });
});

describe("ReserveCTA registration status icon", () => {
  it.each([
    ["CONFIRMED", "icon:CircleCheck"],
    ["REQUESTED", "icon:Clock3"],
    ["WAITLISTED", "icon:Clock3"],
    ["REJECTED", "icon:CircleX"],
    ["CANCELLED", "icon:CircleX"],
  ] as const)("uses a %s icon matching the status", (status, icon) => {
    render(<ReserveCTA event={event()} registration={registration(status)} onReserve={jest.fn()} />);
    expect(screen.getByText(icon)).toBeTruthy();
    if (icon !== "icon:CircleCheck") expect(screen.queryByText("icon:CircleCheck")).toBeNull();
  });
});

describe("ReserveCTA for a cancelled event", () => {
  it("says the organizer cancelled it and does not offer to sign up again", () => {
    render(<ReserveCTA event={event({ status: "CANCELLED", isAvailable: false })} registration={registration("CANCELLED")} onReserve={jest.fn()} />);
    expect(screen.getByText("events.cancelledNotice")).toBeTruthy();
    expect(screen.queryByText("eventBooking.registerAgain")).toBeNull();
  });
  it("still offers to sign up again after a cancelled registration while the event is open", () => {
    render(<ReserveCTA event={event()} registration={registration("CANCELLED")} onReserve={jest.fn()} />);
    expect(screen.getByText("eventBooking.registerAgain")).toBeTruthy();
    expect(screen.queryByText("events.cancelledNotice")).toBeNull();
  });
});
