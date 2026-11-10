import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { NotificationPreferencesSheet } from "./NotificationPreferencesSheet";
import type { NotificationPreferences } from "@/domain/notification/notificationPreferences";
import es from "@/shared/i18n/locales/es-AR.json";
import en from "@/shared/i18n/locales/en-US.json";

const mockQuery: { data: NotificationPreferences | undefined; isLoading: boolean; error: unknown; refetch: jest.Mock } = {
  data: undefined,
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
};
const mockChannel = { mutate: jest.fn(), isPending: false };
const mockConsent = { mutate: jest.fn(), isPending: false };
const mockShowError = jest.fn();
jest.mock("@/presentation/hooks/queries/user", () => ({
  useNotificationPreferences: () => mockQuery,
  useSetNotificationChannel: () => mockChannel,
  useSetMarketingConsent: () => mockConsent,
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
    BottomSheetModal: forwardRef(({ children }: { children: ReactNode }, ref: unknown) => {
      useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return children;
    }),
  };
});
jest.mock("./EventAreaSection", () => {
  const { Text } = jest.requireActual("react-native");
  return { EventAreaSection: ({ visible }: { visible: boolean }) => <Text>{`event-area:${visible}`}</Text> };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20 }),
}));
const mockDevicePush: { status: string | null; busy: boolean; enable: jest.Mock; openSettings: jest.Mock } = {
  status: "granted",
  busy: false,
  enable: jest.fn(),
  openSettings: jest.fn(),
};
jest.mock("@/presentation/features/notifications/useDevicePush", () => ({
  useDevicePush: () => mockDevicePush,
}));

function preferences(consent: boolean): NotificationPreferences {
  return {
    marketingConsent: { granted: consent, decidedAt: null, source: null },
    categories: [
      { category: "SECURITY", kind: "TRANSACTIONAL", email: true, push: true, editable: false,
        emailAvailable: true, pushAvailable: true },
      { category: "EVENTS_NEARBY", kind: "OPTIONAL", email: true, push: true, editable: true,
        emailAvailable: true, pushAvailable: true },
      { category: "NEWSLETTER", kind: "PROMOTIONAL", email: false, push: false, editable: true,
        emailAvailable: true, pushAvailable: true },
    ],
  };
}

const label = (category: string, channel: string) =>
  `notificationPreferences.categories.${category}.name: notificationPreferences.channels.${channel}`;
const close = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.data = preferences(false);
  mockDevicePush.status = "granted";
  mockDevicePush.busy = false;
});

it("asks the system for permission when push is turned on and this phone was never asked", () => {
  const data = preferences(false);
  data.categories[1] = { ...data.categories[1]!, push: false };
  mockQuery.data = data;
  mockDevicePush.status = "undetermined";
  render(<NotificationPreferencesSheet visible onClose={close} />);

  fireEvent(screen.getByLabelText(label("EVENTS_NEARBY", "push")), "valueChange", true);

  expect(mockChannel.mutate).toHaveBeenCalledWith(
    { category: "EVENTS_NEARBY", channel: "push", enabled: true },
    expect.any(Object),
  );
  expect(mockDevicePush.enable).toHaveBeenCalledTimes(1);
});

it("does not ask the system for an email change or when the system already decided", () => {
  mockDevicePush.status = "undetermined";
  const { unmount } = render(<NotificationPreferencesSheet visible onClose={close} />);
  fireEvent(screen.getByLabelText(label("EVENTS_NEARBY", "email")), "valueChange", false);
  expect(mockDevicePush.enable).not.toHaveBeenCalled();
  unmount();

  const data = preferences(false);
  data.categories[1] = { ...data.categories[1]!, push: false };
  mockQuery.data = data;
  mockDevicePush.status = "denied";
  render(<NotificationPreferencesSheet visible onClose={close} />);
  fireEvent(screen.getByLabelText(label("EVENTS_NEARBY", "push")), "valueChange", true);
  expect(mockDevicePush.enable).not.toHaveBeenCalled();
});

it("explains when this phone cannot show pushes yet and how to fix it", () => {
  mockDevicePush.status = "undetermined";
  const { rerender } = render(<NotificationPreferencesSheet visible onClose={close} />);
  expect(screen.getByText("notificationPreferences.devicePush.undetermined")).toBeTruthy();
  fireEvent.press(screen.getByText("notificationPreferences.devicePush.allow"));
  expect(mockDevicePush.enable).toHaveBeenCalledTimes(1);

  mockDevicePush.status = "denied";
  rerender(<NotificationPreferencesSheet visible onClose={close} />);
  expect(screen.getByText("notificationPreferences.devicePush.denied")).toBeTruthy();
  fireEvent.press(screen.getByText("notificationPreferences.devicePush.openSettings"));
  expect(mockDevicePush.openSettings).toHaveBeenCalledTimes(1);

  for (const status of ["granted", "unsupported", null]) {
    mockDevicePush.status = status;
    rerender(<NotificationPreferencesSheet visible onClose={close} />);
    expect(screen.queryByText("notificationPreferences.devicePush.undetermined")).toBeNull();
    expect(screen.queryByText("notificationPreferences.devicePush.denied")).toBeNull();
  }
});

it("shows transactional categories as always on and locks promotion until consent", () => {
  render(<NotificationPreferencesSheet visible onClose={close} />);

  expect(screen.getByLabelText(label("SECURITY", "email")).props.value).toBe(true);
  expect(screen.getByLabelText(label("SECURITY", "email")).props.disabled).toBe(true);
  expect(screen.getByText("notificationPreferences.alwaysOn")).toBeTruthy();
  expect(screen.getByLabelText(label("NEWSLETTER", "email")).props.disabled).toBe(true);
  expect(screen.getByText("notificationPreferences.needsConsent")).toBeTruthy();
  expect(screen.getByLabelText(label("EVENTS_NEARBY", "push")).props.disabled).toBe(false);
});

it("lists the reminders category, on by default and changeable, with its copy in both languages", () => {
  mockQuery.data = {
    ...preferences(false),
    categories: [
      { category: "REMINDERS", kind: "OPTIONAL", email: true, push: true, editable: true,
        emailAvailable: true, pushAvailable: true },
    ],
  };
  render(<NotificationPreferencesSheet visible onClose={close} />);

  expect(screen.getByText("notificationPreferences.categories.REMINDERS.name")).toBeTruthy();
  expect(screen.getByText("notificationPreferences.categories.REMINDERS.description")).toBeTruthy();
  expect(screen.getByLabelText(label("REMINDERS", "push")).props.value).toBe(true);
  expect(screen.getByLabelText(label("REMINDERS", "push")).props.disabled).toBe(false);
  expect(es.notificationPreferences.categories.REMINDERS).toEqual({
    name: "Recordatorios",
    description: "Vinos que miraste, tu bodega y tus eventos.",
  });
  expect(en.notificationPreferences.categories.REMINDERS).toEqual({
    name: "Reminders",
    description: "Wines you viewed, your cellar and your events.",
  });
});

it("shows a channel change at once and keeps what the server saved", () => {
  render(<NotificationPreferencesSheet visible onClose={close} />);

  fireEvent(screen.getByLabelText(label("EVENTS_NEARBY", "push")), "valueChange", false);

  expect(mockChannel.mutate).toHaveBeenCalledWith(
    { category: "EVENTS_NEARBY", channel: "push", enabled: false },
    expect.any(Object),
  );
  expect(screen.getByLabelText(label("EVENTS_NEARBY", "push")).props.value).toBe(false);
  const saved = preferences(false);
  saved.categories[1] = { ...saved.categories[1]!, push: false };
  act(() => mockChannel.mutate.mock.calls[0]![1].onSuccess(saved));
  expect(screen.getByLabelText(label("EVENTS_NEARBY", "push")).props.value).toBe(false);
});

it("granting consent unlocks the promotional categories", () => {
  render(<NotificationPreferencesSheet visible onClose={close} />);

  fireEvent.press(screen.getByRole("switch", { name: "notificationPreferences.consentTitle" }));
  act(() => mockConsent.mutate.mock.calls[0]![1].onSuccess(preferences(true)));

  expect(mockConsent.mutate).toHaveBeenCalledWith(true, expect.any(Object));
  expect(screen.getByLabelText(label("NEWSLETTER", "email")).props.disabled).toBe(false);
});

it("restores the previous choice and reports a failed save", () => {
  render(<NotificationPreferencesSheet visible onClose={close} />);

  fireEvent(screen.getByLabelText(label("EVENTS_NEARBY", "email")), "valueChange", false);
  act(() => mockChannel.mutate.mock.calls[0]![1].onError());

  expect(mockShowError).toHaveBeenCalledWith("notificationPreferences.saveError");
  expect(screen.getByLabelText(label("EVENTS_NEARBY", "email")).props.value).toBe(true);
});

it("shows the events-near-you area once, with that category", () => {
  render(<NotificationPreferencesSheet visible onClose={close} />);

  expect(screen.getAllByText("event-area:true")).toHaveLength(1);
});

it("hides the area while the preferences are loading", () => {
  mockQuery.data = undefined;
  mockQuery.isLoading = true;
  render(<NotificationPreferencesSheet visible onClose={close} />);

  expect(screen.queryByText("event-area:true")).toBeNull();
  mockQuery.isLoading = false;
});

it("hides the switch of a channel the category does not support", () => {
  const data = preferences(true);
  data.categories[1] = { ...data.categories[1]!, emailAvailable: false };
  mockQuery.data = data;
  render(<NotificationPreferencesSheet visible onClose={close} />);

  expect(screen.queryByLabelText(label("EVENTS_NEARBY", "email"))).toBeNull();
  expect(screen.getByLabelText(label("EVENTS_NEARBY", "push"))).toBeTruthy();
  expect(screen.getByLabelText(label("NEWSLETTER", "email"))).toBeTruthy();
  expect(screen.getByLabelText(label("SECURITY", "email"))).toBeTruthy();
});
