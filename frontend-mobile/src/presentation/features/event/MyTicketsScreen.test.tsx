import { fireEvent, render, screen } from "@testing-library/react-native";
import type { EventTicket } from "@/domain/event/eventTicket";
import { MyTicketDetailsScreen, MyTicketsScreen } from "./MyTicketsScreen";

const mockRefetch = jest.fn();
let mockList: Record<string, unknown> = {};
let mockDetail: Record<string, unknown> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => ({ id: "ticket" }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
jest.mock("@/presentation/hooks/queries/event/useMyTickets", () => ({
  useMyTickets: () => mockList,
  useMyTicket: () => mockDetail,
}));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("@/presentation/components/features/media/CoverImage", () => ({ CoverImage: () => null }));
jest.mock("@/presentation/components/ui/Button", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    Button: ({ children, onPress }: { children: string; onPress?: () => void }) => (
      <Pressable onPress={onPress}><Text>{children}</Text></Pressable>
    ),
  };
});

const ticket = { id: "ticket-123456789012", eventId: "event", title: "Tasting", description: null,
  imageUrl: null, eventStatus: "PUBLISHED", startDate: new Date("2030-01-01T20:00:00Z"),
  endDate: new Date("2030-01-01T22:00:00Z"), locationName: null, locationAddress: null,
  locationCity: null, contactEmail: null, contactPhone: null, status: "AWAITING_ATTENDEE_CONFIRMATION",
  paymentStatus: "NOT_REQUIRED", attendeeCount: 1, totalAmount: 0, currency: "ARS", expiresAt: null } as EventTicket;

beforeEach(() => {
  mockRefetch.mockReset();
  mockList = { currentData: { tickets: [ticket], totalPages: 1 }, refetch: mockRefetch };
  mockDetail = { currentData: ticket, refetch: mockRefetch };
});

describe("my tickets status labels", () => {
  it("uses the attendee wording in the list and the detail", () => {
    render(<MyTicketsScreen />);
    expect(screen.getByText("events.registration.statuses.AWAITING_ATTENDEE_CONFIRMATION")).toBeTruthy();
    render(<MyTicketDetailsScreen />);
    expect(screen.queryByText("events.registrationManager.statuses.AWAITING_ATTENDEE_CONFIRMATION")).toBeNull();
  });
});

describe("my tickets load errors", () => {
  it("offers a retry when the list fails to load", () => {
    mockList = { isError: true, refetch: mockRefetch };
    render(<MyTicketsScreen />);
    expect(screen.getByText("tickets.error")).toBeTruthy();
    fireEvent.press(screen.getByText("common.retry"));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
  it("shows a retryable error instead of not found when the ticket fails to load", () => {
    mockDetail = { isError: true, error: { status: 500, message: "boom" }, refetch: mockRefetch };
    render(<MyTicketDetailsScreen />);
    expect(screen.getByText("tickets.detailError")).toBeTruthy();
    expect(screen.queryByText("tickets.unavailable")).toBeNull();
    fireEvent.press(screen.getByText("common.retry"));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["a 404 response", { isError: true, error: { status: 404, message: "missing" } }],
    ["an empty response", { currentData: undefined }],
  ])("keeps the not found message for %s", (_case, state) => {
    mockDetail = { ...state, refetch: mockRefetch };
    render(<MyTicketDetailsScreen />);
    expect(screen.getByText("tickets.unavailable")).toBeTruthy();
    expect(screen.queryByText("common.retry")).toBeNull();
  });
});
