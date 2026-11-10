import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, expect, it, jest } from "@jest/globals";
import { useAdminDetailEditor } from "./useAdminDetailEditor";

const mockLoad = jest.fn();
const mockError = jest.fn();
jest.mock("@/presentation/store/api", () => ({ useLazyExecuteQueryQuery: () => [mockLoad] }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockError }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

beforeEach(() => {
  jest.clearAllMocks();
});
function deferred() {
  let resolve!: (value: { id: string }) => void;
  const promise = new Promise<{ id: string }>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

it("opens only complete detail and preserves the newest selection", async () => {
  const first = deferred(),
    second = deferred();
  mockLoad
    .mockReturnValueOnce({ unwrap: () => first.promise })
    .mockReturnValueOnce({ unwrap: () => second.promise });
  const { result } = renderHook(() => useAdminDetailEditor<{ id: string }>("wine"));
  act(() => {
    void result.current.openEdit({ id: "first" });
  });
  expect(result.current.visible).toBe(false);
  act(() => {
    void result.current.openEdit({ id: "second" });
  });
  await act(async () => {
    second.resolve({ id: "second" });
  });
  await act(async () => {
    first.resolve({ id: "first" });
  });
  expect(result.current.editing?.id).toBe("second");
  expect(result.current.visible).toBe(true);
});

it("does not open a stale request after cancel or present an error as editable summary", async () => {
  const cancelled = deferred();
  mockLoad.mockReturnValueOnce({ unwrap: () => cancelled.promise });
  const { result } = renderHook(() => useAdminDetailEditor<{ id: string }>("route"));
  act(() => {
    void result.current.openEdit({ id: "route" });
    result.current.close();
  });
  await act(async () => {
    cancelled.resolve({ id: "route" });
  });
  expect(result.current.visible).toBe(false);
  mockLoad.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error("offline")) });
  await act(async () => {
    await result.current.openEdit({ id: "route" });
  });
  expect(result.current.editing).toBeNull();
  expect(mockError).toHaveBeenCalledWith("admin.feedback.loadError");
});
