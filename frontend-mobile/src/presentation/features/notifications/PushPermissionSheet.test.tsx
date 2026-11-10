import { fireEvent, render } from "@testing-library/react-native";
import { PushPermissionSheet } from "./PushPermissionSheet";
import es from "@/shared/i18n/locales/es-AR.json";
import en from "@/shared/i18n/locales/en-US.json";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();
let mockSheetProps: Record<string, unknown> = {};

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    BottomSheetModal: mockReact.forwardRef(
      ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }, ref) => {
        mockSheetProps = props;
        mockReact.useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: mockDismiss }));
        return mockReact.createElement(mockReact.Fragment, null, children);
      },
    ),
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement(mockReact.Fragment, null, children),
    BottomSheetBackdrop: () => null,
  };
});

beforeEach(() => jest.clearAllMocks());

it("asks after a ticket with a title, one short line and allow or later", () => {
  const onAllow = jest.fn();
  const onDismiss = jest.fn();
  const screen = render(<PushPermissionSheet visible onAllow={onAllow} onDismiss={onDismiss} />);

  expect(mockPresent).toHaveBeenCalled();
  expect(screen.getByText("pushNotifications.prompt.title")).toBeTruthy();
  expect(screen.getByText("pushNotifications.prompt.body")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("pushNotifications.prompt.allow"));
  fireEvent.press(screen.getByLabelText("pushNotifications.prompt.later"));
  expect(onAllow).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it("closes when hidden", () => {
  render(<PushPermissionSheet visible={false} onAllow={jest.fn()} onDismiss={jest.fn()} />);

  expect(mockDismiss).toHaveBeenCalled();
});

it("opens at half height, without a back button, down to the bottom edge", () => {
  render(<PushPermissionSheet visible variant="intro" onAllow={jest.fn()} onDismiss={jest.fn()} />);

  expect(mockSheetProps.showBackButton).toBe(false);
  expect(mockSheetProps.snapPoints).toEqual(["50%"]);
  // The shared sheet owns the bottom edge and the fixed sizing; this prompt does not override them.
  expect(mockSheetProps.bottomInset).toBeUndefined();
  expect(mockSheetProps.enableDynamicSizing).toBeUndefined();
});

it("on the first launch shows only the title, one short line and the two buttons", () => {
  const onAllow = jest.fn();
  const screen = render(<PushPermissionSheet visible variant="intro" onAllow={onAllow} onDismiss={jest.fn()} />);

  expect(screen.getByText("pushNotifications.launch.title")).toBeTruthy();
  expect(screen.getByText("pushNotifications.launch.body")).toBeTruthy();
  expect(screen.getAllByText(/^pushNotifications\./)).toHaveLength(4);
  fireEvent.press(screen.getByLabelText("pushNotifications.launch.allow"));
  expect(onAllow).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("pushNotifications.launch.later")).toBeTruthy();
});

it("reminds that notifications are off, offering the prompt or the system settings", () => {
  const enable = render(<PushPermissionSheet visible variant="enable" onAllow={jest.fn()} onDismiss={jest.fn()} />);
  expect(enable.getByText("pushNotifications.launch.title")).toBeTruthy();
  expect(enable.getByText("pushNotifications.launch.body")).toBeTruthy();
  expect(enable.getByLabelText("pushNotifications.launch.allow")).toBeTruthy();
  enable.unmount();

  const onDismiss = jest.fn();
  const settings = render(<PushPermissionSheet visible variant="settings" onAllow={jest.fn()} onDismiss={onDismiss} />);
  expect(settings.getByText("pushNotifications.launch.title")).toBeTruthy();
  expect(settings.getByText("pushNotifications.reminder.settingsBody")).toBeTruthy();
  expect(settings.getByLabelText("pushNotifications.reminder.openSettings")).toBeTruthy();
  fireEvent.press(settings.getByLabelText("pushNotifications.launch.later"));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it("keeps the copy short and the same in both languages", () => {
  for (const group of ["prompt", "launch", "reminder"] as const) {
    expect(Object.keys(es.pushNotifications[group]).sort()).toEqual(Object.keys(en.pushNotifications[group]).sort());
    for (const text of [...Object.values(es.pushNotifications[group]), ...Object.values(en.pushNotifications[group])]) {
      expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}!]/u);
      expect(text.length).toBeLessThanOrEqual(60);
    }
  }
  expect(es.pushNotifications).not.toHaveProperty("benefits");
  expect(es.pushNotifications.launch).toEqual({
    title: "Activá las notificaciones",
    body: "Para que no te pierdas nada sobre eventos y vinos.",
    allow: "Activar",
    later: "Ahora no",
  });
  expect(es.pushNotifications.reminder).toEqual({
    settingsBody: "En Ajustes, activá las notificaciones de Vinnot.",
    openSettings: "Abrir ajustes",
  });
  expect(es.pushNotifications.channels.default.name).toBe("Vinnot");
});
