import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { Event } from "@/domain/event/event.types";
import type { User } from "@/domain/user/user.types";
import { EventRegistrationSheet } from "./EventRegistrationSheet";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { title?: string }) => (options?.title ? `${key}:${options.title}` : key),
    i18n: { language: "es" },
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
jest.mock("@/presentation/components/ui/PhoneNumberField", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    PhoneNumberField: ({ value, disabled }: { value: string; disabled?: boolean }) => (
      <Text>{`phone:${value}:${disabled ? "locked" : "editable"}`}</Text>
    ),
  };
});
jest.mock("@/presentation/components/ui/MotionPressable", () => ({
  MotionPressable: jest.requireActual("react-native").Pressable,
}));
jest.mock("@/presentation/components/ui/Button", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    Button: ({ children, onPress }: { children: string; onPress?: () => void }) => (
      <Pressable onPress={onPress}><Text>{children}</Text></Pressable>
    ),
  };
});

const event = (price: number | null, approvalMode: "MANUAL" | "AUTOMATIC") =>
  ({ id: "event", title: "Malbec night", price, maxAttendees: null,
    registration: { approvalMode, maxTicketsPerRegistration: 4, holdMinutes: 15, deadline: null,
      attendeeConfirmationRequired: false, currency: "ARS" } }) as unknown as Event;
const user = { name: "Ana", email: "ana@example.com", phoneNumber: "+5491122334455" } as User;
const props = { submitting: false, onClose: jest.fn(), onSubmit: jest.fn() };

beforeEach(() => jest.clearAllMocks());

it("titles the sheet with the event name", () => {
  render(<EventRegistrationSheet event={event(null, "MANUAL")} user={user} {...props} />);
  expect(screen.getByText("eventBooking.title:Malbec night")).toBeTruthy();
});

it.each([
  [null, "MANUAL", "eventBooking.submit"],
  [null, "AUTOMATIC", "eventBooking.confirmRegistration"],
  [1500, "AUTOMATIC", "eventBooking.continueToPayment"],
] as const)("labels the submit action for price %s and %s approval", (price, mode, label) => {
  render(<EventRegistrationSheet event={event(price, mode)} user={user} {...props} />);
  expect(screen.getByText(label)).toBeTruthy();
});

it("offers a way to the profile when the account is incomplete", () => {
  render(<EventRegistrationSheet event={event(null, "MANUAL")} user={{ ...user, name: "" }} {...props} />);
  fireEvent.press(screen.getByText("eventBooking.submit"));
  expect(screen.getByText("eventBooking.incompleteAccount")).toBeTruthy();
  fireEvent.press(screen.getByText("eventBooking.goToProfile"));
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith("/(app)/(tabs)/profile");
  expect(props.onSubmit).not.toHaveBeenCalled();
});

it("keeps a remembered phone switched on and locked until the user taps change", () => {
  render(<EventRegistrationSheet event={event(null, "MANUAL")} user={user} {...props} />);
  expect(screen.getByRole("switch", { name: "contactPhone.remember" }).props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByText("phone:+5491122334455:locked")).toBeTruthy();
  fireEvent.press(screen.getByText("contactPhone.change"));
  expect(screen.getByText("phone:+5491122334455:editable")).toBeTruthy();
  expect(screen.queryByText("contactPhone.change")).toBeNull();
});

it("starts editable and switched off when no phone was remembered", () => {
  render(<EventRegistrationSheet event={event(null, "MANUAL")} user={{ ...user, phoneNumber: null } as User} {...props} />);
  expect(screen.getByRole("switch", { name: "contactPhone.remember" }).props.accessibilityState).toMatchObject({ checked: false });
  expect(screen.getByText("phone::editable")).toBeTruthy();
  expect(screen.queryByText("contactPhone.change")).toBeNull();
});
