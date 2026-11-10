import type { ReactNode } from "react";
import { Alert, type AlertButton } from "react-native";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import type { EventRegistration } from "@/domain/event/event.types";
import type { OrganizerPayment } from "@/domain/event/organizerPayment";
import { EventRegistrationsManagerSheet } from "./EventRegistrationsManagerSheet";

const mockReview = jest.fn();
const mockRefetch = jest.fn();
let mockRegistrations: EventRegistration[] = [];
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => (options?.name ? `${key}:${options.name}` : key),
    i18n: { language: "en" },
  }),
}));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
    BottomSheetModal: forwardRef(({ children }: { children: ReactNode }, ref: unknown) => {
      useImperativeHandle(ref, () => ({ present: jest.fn() }));
      return children;
    }),
  };
});
jest.mock("@/presentation/components/ui/TextField", () => {
  const { TextInput } = jest.requireActual("react-native");
  return {
    TextField: ({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) => (
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} />
    ),
  };
});
jest.mock("@/presentation/components/ui/MotionPressable", () => ({
  MotionPressable: jest.requireActual("react-native").Pressable,
}));
jest.mock("@/presentation/components/ui/Button", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    Button: ({ children, onPress, loading, disabled }: {
      children: string; onPress?: () => void; loading?: boolean; disabled?: boolean;
    }) => (
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
        accessibilityState={{ busy: !!loading, disabled: !!disabled }}><Text>{children}</Text></Pressable>
    ),
  };
});
jest.mock("@/presentation/features/admin/AdminPaginationBar", () => ({ AdminPaginationBar: () => null }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));
jest.mock("@/presentation/hooks/queries/event", () => ({
  useEventRegistrations: () => ({
    data: { registrations: mockRegistrations, pagination: { totalPages: 1, totalItems: mockRegistrations.length } },
    refetch: mockRefetch,
  }),
  useReviewEventRegistration: () => ({ mutateAsync: mockReview, isPending: false }),
}));
const mockRefund = jest.fn();
let mockPayments: OrganizerPayment[] = [];
jest.mock("@/presentation/hooks/queries/event/useOrganizerPayments", () => ({
  useOrganizerPayments: () => ({ currentData: mockPayments, isError: false, refetch: jest.fn() }),
  useRequestPaymentRefund: () => ({ mutateAsync: mockRefund, isPending: false }),
}));

const registration = (id: string, contactName: string) =>
  ({ id, contactName, contactEmail: `${id}@example.com`, contactPhone: null, status: "REQUESTED",
    totalAmount: 0, currency: "ARS", attendeeCount: 1, paymentStatus: "NOT_REQUIRED",
    companionNames: [], note: null, organizerNote: null, expiresAt: null }) as unknown as EventRegistration;

const alertSpy = jest.spyOn(Alert, "alert");
beforeEach(() => {
  jest.clearAllMocks();
  mockReview.mockResolvedValue(undefined);
  mockRefetch.mockResolvedValue(undefined);
  mockRegistrations = [registration("ana", "Ana"), registration("bruno", "Bruno")];
  mockPayments = [];
  mockRefund.mockResolvedValue(undefined);
});

const renderSheet = () => render(<EventRegistrationsManagerSheet eventId="event" eventTitle="Tasting" onClose={jest.fn()} />);
const firstAction = (label: string) => {
  const [first] = screen.getAllByText(label);
  if (!first) throw new Error(`Missing action ${label}`);
  return first;
};
const pressAlertButton = (label: string) => {
  const buttons = alertSpy.mock.calls.at(-1)?.[2] as AlertButton[];
  act(() => buttons.find((button) => button.text === label)?.onPress?.());
};

describe("registration review", () => {
  const noteFor = (name: string) => screen.getByLabelText(`events.registrationManager.noteForAttendee:${name}`);
  const confirmButton = (label: string, id = "ana") =>
    within(screen.getByTestId(`registration-confirm-${id}`)).getByText(label);

  it("has no shared note box above the attendee list", () => {
    renderSheet();
    expect(screen.queryByLabelText(/noteForAttendee/)).toBeNull();
    expect(screen.queryByLabelText(/organizerNoteLabel/)).toBeNull();
  });

  const reason = (code: string, action = "REJECT") =>
    screen.getByRole("radio", { name: `events.registrationManager.reasons.${action}.${code}` });

  it("asks for confirmation before rejecting and keeps the request without a reason unchanged", async () => {
    renderSheet();
    fireEvent.press(firstAction("events.registrationManager.actions.REJECT"));
    expect(mockReview).not.toHaveBeenCalled();
    expect(screen.getByText("events.registrationManager.rejectConfirm:Ana")).toBeTruthy();
    expect(reason("NONE").props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.queryByLabelText(/noteForAttendee/)).toBeNull();
    fireEvent.press(confirmButton("events.registrationManager.actions.REJECT"));
    await waitFor(() => expect(mockReview).toHaveBeenCalledWith({ eventId: "event", registrationId: "ana",
      action: "REJECT", organizerNote: undefined }));
  });

  it("rejects with one tap on a preset reason", async () => {
    renderSheet();
    fireEvent.press(firstAction("events.registrationManager.actions.REJECT"));
    fireEvent.press(reason("EVENT_FULL"));
    fireEvent.press(confirmButton("events.registrationManager.actions.REJECT"));
    await waitFor(() => expect(mockReview).toHaveBeenCalledWith({ eventId: "event", registrationId: "ana",
      action: "REJECT", organizerNote: "events.registrationManager.reasons.REJECT.EVENT_FULL" }));
  });

  it("writes a free note only under Other and sends it as before", async () => {
    renderSheet();
    fireEvent.press(firstAction("events.registrationManager.actions.REJECT"));
    fireEvent.press(reason("OTHER"));
    fireEvent.changeText(noteFor("Ana"), "Sin cupo para grupos");
    fireEvent.press(confirmButton("events.registrationManager.actions.REJECT"));
    await waitFor(() => expect(mockReview).toHaveBeenCalledWith({ eventId: "event", registrationId: "ana",
      action: "REJECT", organizerNote: "Sin cupo para grupos" }));
  });

  it("offers waitlist presets of its own", async () => {
    renderSheet();
    fireEvent.press(firstAction("events.registrationManager.actions.WAITLIST"));
    expect(screen.queryByRole("radio", { name: "events.registrationManager.reasons.REJECT.EVENT_FULL" })).toBeNull();
    fireEvent.press(reason("CONFIRMING_AVAILABILITY", "WAITLIST"));
    fireEvent.press(confirmButton("events.registrationManager.actions.WAITLIST"));
    await waitFor(() => expect(mockReview).toHaveBeenCalledWith(expect.objectContaining({
      action: "WAITLIST", organizerNote: "events.registrationManager.reasons.WAITLIST.CONFIRMING_AVAILABILITY" })));
  });

  it("confirms an approval for that attendee only and never carries its note to the next one", async () => {
    renderSheet();
    fireEvent.press(firstAction("events.registrationManager.actions.APPROVE"));
    expect(screen.getByText("events.registrationManager.approveConfirm:Ana")).toBeTruthy();
    fireEvent.changeText(noteFor("Ana"), "See you there");
    fireEvent.press(confirmButton("events.registrationManager.actions.APPROVE"));
    await waitFor(() => expect(mockReview).toHaveBeenCalledWith(expect.objectContaining({
      registrationId: "ana", organizerNote: "See you there" })));
    await waitFor(() => expect(screen.queryByLabelText(/noteForAttendee/)).toBeNull());

    const [, brunoApprove] = screen.getAllByText("events.registrationManager.actions.APPROVE");
    fireEvent.press(brunoApprove!);
    expect(noteFor("Bruno").props.value).toBe("");
    fireEvent.press(confirmButton("events.registrationManager.actions.APPROVE", "bruno"));
    await waitFor(() => expect(mockReview).toHaveBeenLastCalledWith(expect.objectContaining({
      registrationId: "bruno", organizerNote: undefined })));
  });

  it("closes the confirmation without sending anything on Back", () => {
    renderSheet();
    fireEvent.press(firstAction("events.registrationManager.actions.WAITLIST"));
    expect(screen.getByText("events.registrationManager.waitlistConfirm:Ana")).toBeTruthy();
    fireEvent.press(screen.getByText("common.goBack"));
    expect(screen.queryByLabelText(/noteForAttendee/)).toBeNull();
    expect(mockReview).not.toHaveBeenCalled();
  });

  it("keeps the note when the review fails so the organizer can retry", async () => {
    mockReview.mockRejectedValue(new Error("boom"));
    renderSheet();
    fireEvent.press(firstAction("events.registrationManager.actions.APPROVE"));
    fireEvent.changeText(noteFor("Ana"), "Retry me");
    fireEvent.press(confirmButton("events.registrationManager.actions.APPROVE"));
    await waitFor(() => expect(mockReview).toHaveBeenCalled());
    await waitFor(() => expect(noteFor("Ana").props.value).toBe("Retry me"));
  });

  it("shows the pending state only on the attendee being saved", async () => {
    let finish!: () => void;
    mockReview.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    renderSheet();
    fireEvent.press(firstAction("events.registrationManager.actions.APPROVE"));
    fireEvent.press(confirmButton("events.registrationManager.actions.APPROVE"));
    await waitFor(() => expect(mockReview).toHaveBeenCalledTimes(1));
    const busy = screen.getAllByRole("button").filter((button) => button.props.accessibilityState?.busy);
    expect(busy).toHaveLength(1);
    // Bruno's actions stay usable while Ana's decision is saving.
    const brunoActions = screen.getAllByText("events.registrationManager.actions.WAITLIST");
    expect(brunoActions).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "events.registrationManager.actions.WAITLIST" })[0]!
      .props.accessibilityState).toMatchObject({ disabled: false });
    await act(async () => finish());
  });
});

describe("refund retry", () => {
  it("shows a refund Mercado Pago rejected and confirms before requesting it again", async () => {
    mockRegistrations = [{ ...registration("ana", "Ana"), status: "CANCELLED", paymentStatus: "APPROVED",
      externallyManagedPayment: true } as unknown as EventRegistration];
    mockPayments = [{ registrationId: "ana", attemptId: "attempt", amount: 50, currency: "ARS", paymentStatus: "APPROVED",
      refundStatus: "REJECTED", canRefund: true }];
    renderSheet();
    expect(screen.getByText("events.refund.REJECTED")).toBeTruthy();
    expect(screen.queryByText("events.refund.action")).toBeNull();
    fireEvent.press(screen.getByText("events.refund.retry"));
    expect(alertSpy).toHaveBeenCalledWith("events.refund.title", "events.refund.retryConfirm:Ana", [
      { text: "common.goBack", style: "cancel" },
      expect.objectContaining({ text: "events.refund.retry", style: "destructive" }),
    ]);
    pressAlertButton("events.refund.retry");
    await waitFor(() => expect(mockRefund).toHaveBeenCalledWith("attempt"));
  });

  it("keeps the first refund wording for a payment never refunded", () => {
    mockRegistrations = [{ ...registration("ana", "Ana"), status: "CONFIRMED", paymentStatus: "APPROVED",
      externallyManagedPayment: true } as unknown as EventRegistration];
    mockPayments = [{ registrationId: "ana", attemptId: "attempt", amount: 50, currency: "ARS", paymentStatus: "APPROVED",
      refundStatus: "NONE", canRefund: true }];
    renderSheet();
    fireEvent.press(screen.getByText("events.refund.action"));
    expect(alertSpy).toHaveBeenCalledWith("events.refund.title", "events.refund.confirm:Ana", expect.anything());
  });
});
