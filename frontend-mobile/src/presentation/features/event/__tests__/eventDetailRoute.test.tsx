import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Alert, Linking } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import EventDetailRoute from "../../../../../app/(app)/(tabs)/events/[id]";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";

type MutateOptions = { onSuccess?: (result?: unknown) => void; onError?: (error: unknown) => void };

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockOpenExternalLink = jest.fn(async (_url: string) => true);
const mockShareLink = jest.fn(async (_input: unknown) => undefined);
const mockCheckoutStart = jest.fn(async (_eventId: string, _registrationId: string) => true);
const mockRegisterMutate = jest.fn((_vars: unknown, _options: MutateOptions) => undefined);
const mockCancelMutate = jest.fn((_id: string, _options: MutateOptions) => undefined);
const mockConfirmMutate = jest.fn((_id: string, _options: MutateOptions) => undefined);
const mockAuth = { isAuthenticated: true, user: { id: "user-1" } };
const mockEnv = { eventPaymentsEnabled: true };
let mockRegistration: { id: string; status: string; contactActionUrl?: string } | null = null;
const mockEventRefetch = jest.fn();
let mockEventFailure: { status?: number; code?: string } | null = null;
const mockEventQuery = () => ({
  data: mockEventFailure ? undefined : mockEvent,
  isLoading: false,
  isFetching: false,
  isError: !!mockEventFailure,
  error: mockEventFailure ?? undefined,
  refetch: mockEventRefetch,
});

const mockEvent = {
  id: "evt-1",
  title: "Cata de Malbec",
  description: "Evento test",
  status: "PUBLISHED",
  price: 1000,
  tags: ["malbec"],
  location: {
    name: "Bodega Norte",
    address: "Ruta 40",
    city: "Mendoza",
    region: "Mendoza",
    latitude: null,
    longitude: null,
  },
  organizer: { id: "org-1", name: "Bodega Norte", email: "org@vinnot.com", phone: null },
};
const organizerWithContact = { ...mockEvent.organizer };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "evt-1" }),
  useRouter: () => ({ push: mockPush, dismissTo: mockDismissTo }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es-AR" } }),
}));

jest.mock("react-native-maps", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const MapView = ({ children }: { children?: React.ReactNode }) =>
    mockReact.createElement("View", null, children);
  return { __esModule: true, default: MapView, Marker: () => null };
});

jest.mock("@/shared/config/env", () => {
  const actual = jest.requireActual<typeof import("@/shared/config/env")>("@/shared/config/env");
  return {
    ...actual,
    env: new Proxy(actual.env, {
      get: (target, key) =>
        key === "eventPaymentsEnabled" ? mockEnv.eventPaymentsEnabled : target[key as keyof typeof target],
    }),
  };
});
jest.mock("@/presentation/hooks/useCurrentTime", () => ({ useCurrentTime: () => Date.now() }));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => mockAuth }));
jest.mock("@/presentation/hooks/useExternalLink", () => ({
  useExternalLink: () => mockOpenExternalLink,
}));
jest.mock("@/presentation/hooks/useShareLink", () => ({ useShareLink: () => mockShareLink }));
jest.mock("@/presentation/hooks/useEventCheckout", () => ({
  useEventCheckout: () => ({ start: mockCheckoutStart, pending: false }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));
jest.mock("@/presentation/store/mutationAdapter", () => ({
  getMutationErrorCode: (error: { code?: string }) => error?.code,
}));
jest.mock("@/presentation/features/community/CommunityActions", () => ({
  CommunityActions: () => null,
}));
jest.mock("@/presentation/components/layout", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AppHeader: ({ onBack }: { onBack: () => void }) =>
      mockReact.createElement("Text", { testID: "header-back", onPress: onBack }, "header"),
  };
});
jest.mock("@/presentation/hooks/queries/event", () => ({
  useEvent: () => mockEventQuery(),
  useMyEventRegistration: () => ({ data: mockRegistration, refetch: jest.fn() }),
  useRegisterForEvent: () => ({ mutate: mockRegisterMutate, isPending: false }),
  useConfirmEventAttendance: () => ({ mutate: mockConfirmMutate, isPending: false }),
  useCancelRegistration: () => ({ mutate: mockCancelMutate, isPending: false }),
}));
jest.mock("@/presentation/features/event/EventDetailHero", () => ({
  EventDetailHero: () => null,
}));
jest.mock("@/presentation/features/event/ReserveCTA", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    ReserveCTA: (props: {
      onReserve: () => void;
      onPayNow?: () => void;
      onContactOrganizer?: () => void;
      onCancelRegistration?: () => void;
      onConfirmAttendance?: () => void;
    }) =>
      mockReact.createElement(
        "View",
        null,
        mockReact.createElement("Text", { testID: "cta-reserve", onPress: props.onReserve }, "reserve"),
        props.onPayNow
          ? mockReact.createElement("Text", { testID: "cta-pay", onPress: props.onPayNow }, "pay")
          : null,
        mockReact.createElement("Text", { testID: "cta-contact", onPress: props.onContactOrganizer }, "contact"),
        mockReact.createElement("Text", { testID: "cta-cancel", onPress: props.onCancelRegistration }, "cancel"),
        mockReact.createElement("Text", { testID: "cta-confirm", onPress: props.onConfirmAttendance }, "confirm"),
      ),
  };
});
jest.mock("@/presentation/features/event/EventRegistrationSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    EventRegistrationSheet: ({ onSubmit }: { onSubmit: (input: unknown) => void }) =>
      mockReact.createElement(
        "Text",
        { testID: "sheet-submit", onPress: () => onSubmit({ tickets: 1 }) },
        "submit",
      ),
  };
});

const mockPushPrompt = { visible: false, busy: false, offer: jest.fn(), allow: jest.fn(), dismiss: jest.fn() };
jest.mock("@/presentation/features/notifications/usePushPermissionPrompt", () => ({
  usePushPermissionPrompt: () => mockPushPrompt,
}));
jest.mock("@/presentation/features/notifications/PushPermissionSheet", () => ({ PushPermissionSheet: () => null }));

const mockTrackView = jest.fn();
jest.mock("@/presentation/hooks/useDetailViewTracking", () => ({
  useDetailViewTracking: (...args: unknown[]) => mockTrackView(...args),
}));

describe("event detail route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockEnv.eventPaymentsEnabled = true;
    mockRegistration = null;
    mockEventFailure = null;
    mockEvent.price = 1000;
    mockEvent.status = "PUBLISHED";
    mockEvent.organizer = { ...organizerWithContact };
  });

  it("offers a retry when the event fails to load", () => {
    mockEventFailure = { code: "NETWORK_ERROR" };
    const screen = render(<EventDetailRoute />);
    expect(screen.queryByText("events.notFound")).toBeNull();
    fireEvent.press(screen.getByText("common.retry"));
    expect(mockEventRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the not-found state for an event that does not exist", () => {
    mockEventFailure = { status: 404 };
    const screen = render(<EventDetailRoute />);
    expect(screen.getByText("events.notFound")).toBeTruthy();
    expect(screen.queryByText("common.retry")).toBeNull();
  });

  it("hides sharing while the event has no public page", () => {
    mockEvent.status = "DRAFT";
    const screen = render(<EventDetailRoute />);
    expect(screen.queryByText("events.share")).toBeNull();
    expect(screen.getByText("events.openMaps")).toBeTruthy();
  });

  it("shows the organizer card only when there is something to show", () => {
    const screen = render(<EventDetailRoute />);
    expect(screen.getByText("events.organizer")).toBeTruthy();
    expect(screen.getByText("org@vinnot.com")).toBeTruthy();
    expect(screen.queryByText("events.status.PUBLISHED")).toBeNull();
    expect(screen.queryByText("PUBLISHED")).toBeNull();
    screen.unmount();

    mockEvent.organizer = { id: "org-1", name: "", email: "", phone: null };
    const empty = render(<EventDetailRoute />);
    expect(empty.queryByText("events.organizer")).toBeNull();
  });

  it("renders the event and returns to the events list", () => {
    const screen = render(<EventDetailRoute />);
    expect(mockTrackView).toHaveBeenCalledWith("EVENT", "evt-1");
    expect(screen.getByText("Evento test")).toBeTruthy();
    expect(screen.getByText("events.share")).toBeTruthy();
    // Inline community report fields stay above the keyboard.
    expect(screen.UNSAFE_getByType(KeyboardAwareScrollView).props.refreshControl).toBeTruthy();
    fireEvent.press(screen.getByTestId("header-back"));
    expect(mockDismissTo).toHaveBeenCalledWith("/(app)/(tabs)/events");
  });

  it("sends anonymous visitors to login with a return path", () => {
    mockAuth.isAuthenticated = false;
    const screen = render(<EventDetailRoute />);
    fireEvent.press(screen.getByTestId("cta-reserve"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(auth)/login",
      params: { redirect: "/(app)/events/evt-1" },
    });
    expect(screen.queryByTestId("sheet-submit")).toBeNull();
  });

  it("registers and starts checkout for a registration awaiting payment", async () => {
    const screen = render(<EventDetailRoute />);
    fireEvent.press(screen.getByTestId("cta-reserve"));
    fireEvent.press(screen.getByTestId("sheet-submit"));
    expect(mockRegisterMutate).toHaveBeenCalledWith(
      { eventId: "evt-1", input: { tickets: 1 } },
      expect.any(Object),
    );
    await act(async () => {
      mockRegisterMutate.mock.calls[0]![1].onSuccess?.({ id: "reg-1", status: "AWAITING_PAYMENT" });
    });
    expect(mockCheckoutStart).toHaveBeenCalledWith("evt-1", "reg-1");
    expect(screen.queryByTestId("sheet-submit")).toBeNull();
    // Checkout leaves the app, so the push explanation waits for the confirmed ticket.
    expect(mockPushPrompt.offer).not.toHaveBeenCalled();
  });

  it("opens the organizer contact link for a free registration", async () => {
    mockEvent.price = 0;
    const screen = render(<EventDetailRoute />);
    fireEvent.press(screen.getByTestId("cta-reserve"));
    fireEvent.press(screen.getByTestId("sheet-submit"));
    await act(async () => {
      mockRegisterMutate.mock.calls[0]![1].onSuccess?.({
        id: "reg-1",
        status: "PENDING",
        contactActionUrl: "https://wa.me/123",
      });
    });
    expect(mockOpenExternalLink).toHaveBeenCalledWith("https://wa.me/123");
    expect(mockCheckoutStart).not.toHaveBeenCalled();
  });

  it("maps registration errors to booking messages", () => {
    const screen = render(<EventDetailRoute />);
    fireEvent.press(screen.getByTestId("cta-reserve"));
    fireEvent.press(screen.getByTestId("sheet-submit"));
    mockRegisterMutate.mock.calls[0]![1].onError?.({ code: "PAYMENT_PILOT_RESTRICTED" });
    expect(mockShowError).toHaveBeenCalledWith("eventBooking.pilotRestricted");
  });

  it("pays an existing registration and reports a failed checkout", async () => {
    mockRegistration = { id: "reg-2", status: "AWAITING_PAYMENT" };
    mockCheckoutStart.mockRejectedValueOnce({ code: "EVENT_PAYMENTS_UNAVAILABLE" });
    const screen = render(<EventDetailRoute />);
    await act(async () => {
      fireEvent.press(screen.getByTestId("cta-pay"));
    });
    expect(mockCheckoutStart).toHaveBeenCalledWith("evt-1", "reg-2");
    expect(mockShowError).toHaveBeenCalledWith("eventBooking.paymentsUnavailable");
  });

  it("hides the pay action when event payments are disabled", () => {
    mockEnv.eventPaymentsEnabled = false;
    mockRegistration = { id: "reg-2", status: "AWAITING_PAYMENT" };
    const screen = render(<EventDetailRoute />);
    expect(screen.queryByTestId("cta-pay")).toBeNull();
  });

  it("offers push notifications once the ticket is confirmed", () => {
    mockRegistration = { id: "reg-3", status: "CONFIRMED" };
    render(<EventDetailRoute />);
    expect(mockPushPrompt.offer).toHaveBeenCalledTimes(1);
  });

  it("cancels after confirmation and shows the paid-registration organizer message", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockRegistration = { id: "reg-3", status: "CONFIRMED" };
    const screen = render(<EventDetailRoute />);
    fireEvent.press(screen.getByTestId("cta-cancel"));
    const buttons = alertSpy.mock.calls[0]![2] as { onPress?: () => void }[];
    expect(alertSpy.mock.calls[0]![0]).toBe("events.registration.cancelRegistration");
    buttons[1]!.onPress?.();
    expect(mockCancelMutate).toHaveBeenCalledWith("evt-1", expect.any(Object));
    mockCancelMutate.mock.calls[0]![1].onError?.({ code: "PAID_REGISTRATION_REQUIRES_ORGANIZER" });
    expect(mockShowError).toHaveBeenCalledWith("events.registration.paidRequiresOrganizer");
    mockCancelMutate.mock.calls[0]![1].onSuccess?.();
    expect(mockShowSuccess).toHaveBeenCalledWith("events.registration.cancelled");
    alertSpy.mockRestore();
  });

  it("shares the event, opens maps and the registration contact link", async () => {
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    mockRegistration = { id: "reg-4", status: "PENDING", contactActionUrl: "https://wa.me/456" };
    const screen = render(<EventDetailRoute />);
    fireEvent.press(screen.getByText("events.share"));
    expect(mockShareLink).toHaveBeenCalledWith({ kind: "events", id: "evt-1", title: "Cata de Malbec" });
    fireEvent.press(screen.getByText("events.openMaps"));
    expect(openUrl).toHaveBeenCalledWith(
      `https://maps.google.com/?q=${encodeURIComponent("Bodega Norte Ruta 40 Mendoza Mendoza")}`,
    );
    fireEvent.press(screen.getByTestId("cta-contact"));
    await waitFor(() => expect(mockOpenExternalLink).toHaveBeenCalledWith("https://wa.me/456"));
    openUrl.mockRestore();
  });

  it("confirms attendance for the current registration", () => {
    mockRegistration = { id: "reg-5", status: "PENDING_CONFIRMATION" };
    const screen = render(<EventDetailRoute />);
    fireEvent.press(screen.getByTestId("cta-confirm"));
    expect(mockConfirmMutate).toHaveBeenCalledWith("reg-5", expect.any(Object));
    mockConfirmMutate.mock.calls[0]![1].onSuccess?.();
    expect(mockShowSuccess).toHaveBeenCalledWith("events.registration.attendanceConfirmed");
  });
});
