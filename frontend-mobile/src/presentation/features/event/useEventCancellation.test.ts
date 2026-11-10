import { act, renderHook } from "@testing-library/react-native";
import { useEventCancellation } from "./useEventCancellation";

const event = { id: "evt-1", title: "Cata de Malbec" };

function setup(cancel: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  const onSuccess = jest.fn();
  const onError = jest.fn();
  const hook = renderHook(() => useEventCancellation({ cancel, onSuccess, onError }));
  return { hook, cancel, onSuccess, onError };
}

it("opens the sheet for the requested event and closes it without cancelling", () => {
  const { hook, cancel } = setup();

  act(() => hook.result.current.request(event));
  expect(hook.result.current.sheet).toMatchObject({ visible: true, eventTitle: "Cata de Malbec", busy: false });

  act(() => hook.result.current.sheet.onClose());
  expect(hook.result.current.sheet.visible).toBe(false);
  expect(hook.result.current.sheet.eventTitle).toBe("Cata de Malbec");
  expect(cancel).not.toHaveBeenCalled();
});

it("cancels with the chosen reason and closes on success", async () => {
  const { hook, cancel, onSuccess, onError } = setup();

  act(() => hook.result.current.request(event));
  await act(async () => hook.result.current.sheet.onConfirm({ reason: "WEATHER" }));

  expect(cancel).toHaveBeenCalledWith({ id: "evt-1", cancellation: { reason: "WEATHER" } });
  expect(onSuccess).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
  expect(hook.result.current.sheet.visible).toBe(false);
});

it("keeps the sheet open to retry after a failure", async () => {
  const { hook, onSuccess, onError } = setup(jest.fn().mockRejectedValue(new Error("offline")));

  act(() => hook.result.current.request(event));
  await act(async () => hook.result.current.sheet.onConfirm({ reason: "UNFORESEEN_CIRCUMSTANCES" }));

  expect(onError).toHaveBeenCalledTimes(1);
  expect(onSuccess).not.toHaveBeenCalled();
  expect(hook.result.current.sheet.visible).toBe(true);
});

it("ignores a confirmation when no event was requested", async () => {
  const { hook, cancel } = setup();

  await act(async () => hook.result.current.sheet.onConfirm({ reason: "OTHER" }));

  expect(cancel).not.toHaveBeenCalled();
});

it("ignores new requests while a cancellation is in flight, and a dismissed sheet stays closed", async () => {
  let finish: () => void = () => undefined;
  const cancel = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const { hook } = setup(cancel);

  act(() => hook.result.current.request(event));
  act(() => hook.result.current.sheet.onConfirm({ reason: "WEATHER" }));
  expect(hook.result.current.sheet.busy).toBe(true);
  act(() => hook.result.current.request({ id: "evt-2", title: "Otro" }));
  expect(hook.result.current.sheet).toMatchObject({ visible: true, eventTitle: "Cata de Malbec" });
  act(() => hook.result.current.sheet.onClose());
  expect(hook.result.current.sheet.visible).toBe(false);

  await act(async () => finish());
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(hook.result.current.sheet.visible).toBe(false);
});
