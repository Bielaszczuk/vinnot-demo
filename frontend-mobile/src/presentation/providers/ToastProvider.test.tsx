import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, Button, View } from "react-native";
import { ModalScreenToastHost, ToastProvider, useToast } from "./ToastProvider";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key === "common.close" ? "Cerrar" : key }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }) }));
function Harness() {
  const { showSuccess, showError, showInfo, showToast } = useToast();
  return <>
    <Button title="Success" onPress={() => showSuccess("Bienvenido de nuevo")} />
    <Button title="Error" onPress={() => showError("No pudimos guardar")} />
    <Button title="Info" onPress={() => showInfo("Información")} />
    <Button title="Warning" onPress={() => showToast("Revisá los datos", "warning")} />
  </>;
}
const advance = async (ms: number) => { await act(async () => { jest.advanceTimersByTime(ms); }); };
async function show(label: string) { await act(async () => { fireEvent.press(screen.getByText(label)); }); }
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(false);
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.useRealTimers(); });

it("uses branded typography, preserves messages and allows localized dismissal", async () => {
  render(<ToastProvider><Harness /></ToastProvider>);
  await show("Success");
  expect(screen.getByText("Bienvenido de nuevo")).toHaveStyle({ fontFamily: "Poppins_400Regular" });
  await act(async () => { fireEvent.press(screen.getByLabelText("Cerrar")); });
  expect(screen.queryByText("Bienvenido de nuevo")).toBeNull();
  await show("Error");
  expect(screen.getByRole("alert")).toHaveTextContent("No pudimos guardar");
});
it("keeps independent lifetimes, extends errors and clears timers on unmount", async () => {
  const view = render(<ToastProvider><Harness /></ToastProvider>);
  await show("Success"); await advance(3000); await show("Error"); await advance(1000);
  expect(screen.queryByText("Bienvenido de nuevo")).toBeNull();
  expect(screen.getByText("No pudimos guardar")).toBeTruthy();
  await advance(5000);
  expect(screen.queryByText("No pudimos guardar")).toBeNull();
  const schedule = jest.spyOn(global, "setTimeout");
  const cancel = jest.spyOn(global, "clearTimeout");
  await show("Info");
  const expiryIndex = schedule.mock.calls.findIndex(([, delay]) => delay === 4000);
  expect(expiryIndex).toBeGreaterThanOrEqual(0);
  const expiry = schedule.mock.results[expiryIndex]!.value;
  view.unmount();
  expect(cancel).toHaveBeenCalledWith(expiry);
});
it("keeps notices until dismissed for screen readers and limits visible messages", async () => {
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockResolvedValue(true);
  render(<ToastProvider><Harness /></ToastProvider>);
  await show("Success"); await advance(10000);
  expect(screen.getByText("Bienvenido de nuevo")).toBeTruthy();
  await show("Error"); await show("Info"); await show("Warning");
  expect(screen.queryByText("Bienvenido de nuevo")).toBeNull();
  expect(screen.getAllByLabelText("Cerrar")).toHaveLength(3);
});

it("runs a bounded entrance and exit without restarting when another notice arrives", async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  const stop = jest.fn();
  const animate = jest.spyOn(Animated, "parallel").mockImplementation(() => ({
    start: (callback) => callback?.({ finished: true }), stop, reset: jest.fn(),
  }));
  const view = render(<ToastProvider><Harness /></ToastProvider>);
  await show("Success");
  expect(animate).toHaveBeenCalledTimes(1);
  await show("Info");
  expect(animate).toHaveBeenCalledTimes(2);
  await act(async () => { fireEvent.press(screen.getAllByLabelText("Cerrar")[0]!); });
  expect(animate).toHaveBeenCalledTimes(3);
  expect(screen.queryByText("Bienvenido de nuevo")).toBeNull();
  view.unmount();
  expect(stop).toHaveBeenCalled();
});

it("falls back to static, dismissible feedback when accessibility preferences cannot be read", async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockRejectedValue(new Error("unavailable"));
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockRejectedValue(new Error("unavailable"));
  render(<ToastProvider><Harness /></ToastProvider>);
  await show("Info"); await advance(10000);
  expect(screen.getByText("Información")).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByLabelText("Cerrar")); });
  expect(screen.queryByText("Información")).toBeNull();
});

it("renders toasts from a screen inside a native modal within that modal", async () => {
  render(<ToastProvider>
    <View testID="root-screen" />
    <View testID="native-modal"><ModalScreenToastHost inModal><Harness /></ModalScreenToastHost></View>
  </ToastProvider>);
  await show("Error");
  expect(within(screen.getByTestId("native-modal")).getByText("No pudimos guardar")).toBeTruthy();
});
it("keeps using the root host outside a modal", async () => {
  render(<ToastProvider><View testID="screen"><ModalScreenToastHost inModal={false}><Harness /></ModalScreenToastHost></View></ToastProvider>);
  await show("Success");
  expect(screen.getByText("Bienvenido de nuevo")).toBeTruthy();
  expect(within(screen.getByTestId("screen")).queryByText("Bienvenido de nuevo")).toBeNull();
});
