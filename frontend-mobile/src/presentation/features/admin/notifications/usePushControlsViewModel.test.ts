import { act, renderHook } from "@testing-library/react-native";
import { usePushControlsViewModel } from "./usePushControlsViewModel";

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockToggle = { mutateAsync: jest.fn(), isPending: false };
const transactional = { type: "EVENT_REMINDER", category: "TICKETS", transactional: true, enabled: true };
const optional = { type: "EVENT_NEARBY", category: "EVENTS_NEARBY", transactional: false, enabled: true };
const mockSettings = {
  data: { provider: "expo", types: [transactional, optional], recentChanges: [] } as
    | { provider: string; types: (typeof transactional)[]; recentChanges: never[] }
    | undefined,
  isError: false,
  refetch: jest.fn(),
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  usePushSettings: () => mockSettings,
  useSetPushTypeEnabled: () => mockToggle,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockToggle.mutateAsync.mockResolvedValue(undefined);
  mockSettings.data = { provider: "expo", types: [transactional, optional], recentChanges: [] };
});

it("tells whether the server provider sends pushes", () => {
  const { result, rerender } = renderHook(() => usePushControlsViewModel());
  expect(result.current.sending).toBe(true);

  mockSettings.data = { provider: "log", types: [], recentChanges: [] };
  rerender({});
  expect(result.current.sending).toBe(false);
});

it("turns an optional type off at once and confirms it", async () => {
  const { result } = renderHook(() => usePushControlsViewModel());

  await act(async () => {
    await result.current.toggle(optional);
  });

  expect(mockToggle.mutateAsync).toHaveBeenCalledWith({ type: "EVENT_NEARBY", enabled: false });
  expect(mockShowSuccess).toHaveBeenCalledWith(
    'admin.notifications.push.turnedOff:{"type":"admin.notifications.pushTypes.EVENT_NEARBY:{\\"defaultValue\\":\\"EVENT_NEARBY\\"}"}',
  );
  expect(result.current.switching).toBeNull();
});

it("asks before turning a transactional type off and only switches once confirmed", async () => {
  const { result } = renderHook(() => usePushControlsViewModel());

  await act(async () => {
    await result.current.toggle(transactional);
  });
  expect(result.current.pendingOff).toEqual(transactional);
  expect(mockToggle.mutateAsync).not.toHaveBeenCalled();

  act(() => result.current.cancelOff());
  expect(result.current.pendingOff).toBeNull();

  await act(async () => {
    await result.current.toggle(transactional);
  });
  await act(async () => {
    await result.current.confirmOff();
  });

  expect(mockToggle.mutateAsync).toHaveBeenCalledWith({ type: "EVENT_REMINDER", enabled: false });
  expect(result.current.pendingOff).toBeNull();
});

it("turns a switched-off transactional type back on without asking", async () => {
  const { result } = renderHook(() => usePushControlsViewModel());

  await act(async () => {
    await result.current.toggle({ ...transactional, enabled: false });
  });

  expect(result.current.pendingOff).toBeNull();
  expect(mockToggle.mutateAsync).toHaveBeenCalledWith({ type: "EVENT_REMINDER", enabled: true });
  expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining("admin.notifications.push.turnedOn"));
});

it("keeps the confirmation open and explains a refused switch", async () => {
  mockToggle.mutateAsync.mockRejectedValue({ message: "x", code: "NOT_A_PUSH_TYPE" });
  const { result } = renderHook(() => usePushControlsViewModel());

  await act(async () => {
    await result.current.toggle(transactional);
  });
  await act(async () => {
    await result.current.confirmOff();
  });

  expect(mockShowError).toHaveBeenCalledWith("admin.notifications.errors.NOT_A_PUSH_TYPE");
  expect(result.current.pendingOff).toEqual(transactional);
  expect(result.current.switching).toBeNull();
});

it("shows which type is switching and ignores other switches meanwhile", async () => {
  let resolve!: () => void;
  mockToggle.mutateAsync.mockReturnValue(new Promise<void>((done) => (resolve = done)));
  const { result } = renderHook(() => usePushControlsViewModel());

  let first!: Promise<void>;
  act(() => {
    first = result.current.toggle(optional);
  });
  expect(result.current.switching).toBe("EVENT_NEARBY");
  await act(async () => {
    await result.current.toggle({ ...transactional, enabled: false });
  });
  expect(mockToggle.mutateAsync).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolve();
    await first;
  });
  expect(result.current.switching).toBeNull();
});

it("does nothing when confirming without a pending switch", async () => {
  const { result } = renderHook(() => usePushControlsViewModel());

  await act(async () => {
    await result.current.confirmOff();
  });

  expect(mockToggle.mutateAsync).not.toHaveBeenCalled();
});
