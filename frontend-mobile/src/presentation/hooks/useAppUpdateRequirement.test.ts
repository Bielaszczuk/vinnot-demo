import { act, renderHook } from "@testing-library/react-native";
import { useAppUpdateRequirement } from "./useAppUpdateRequirement";
import { appVersionService } from "@/application/services/appVersion.service";
import { applicationLifecycleService } from "@/application/services/applicationLifecycle.service";

jest.mock("@/application/services/appVersion.service", () => ({ appVersionService: { requirement: jest.fn() } }));
jest.mock("@/application/services/applicationLifecycle.service", () => ({
  applicationLifecycleService: { subscribe: jest.fn() },
}));

const requirement = jest.mocked(appVersionService.requirement);
const subscribe = jest.mocked(applicationLifecycleService.subscribe);
const unsubscribe = jest.fn();
const blocked = { required: true, storeUrl: "https://apps.apple.com/app/vinnot/id6817992780" };
let focus: () => void;

beforeEach(() => {
  jest.clearAllMocks();
  subscribe.mockImplementation((handlers) => {
    focus = handlers.onFocus;
    handlers.onFocusLost();
    return unsubscribe;
  });
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useAppUpdateRequirement", () => {
  it("does not block while the launch check is pending, then applies its result", async () => {
    requirement.mockResolvedValue(blocked);
    const { result } = renderHook(() => useAppUpdateRequirement());
    expect(result.current).toEqual({ required: false });
    await flush();
    expect(requirement).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual(blocked);
  });

  it("checks again when the app returns to the foreground and unblocks when the minimum drops", async () => {
    requirement.mockResolvedValueOnce(blocked).mockResolvedValueOnce({ required: false });
    const { result } = renderHook(() => useAppUpdateRequirement());
    await flush();
    expect(result.current.required).toBe(true);
    await act(async () => {
      focus();
      await Promise.resolve();
    });
    expect(requirement).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ required: false });
  });

  it("fails open when the check fails", async () => {
    requirement.mockResolvedValueOnce(blocked).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useAppUpdateRequirement());
    await flush();
    expect(result.current.required).toBe(true);
    await act(async () => {
      focus();
      await Promise.resolve();
    });
    expect(result.current).toEqual({ required: false });
  });

  it("keeps only the latest check when an older one resolves later", async () => {
    let resolveFirst: (value: typeof blocked) => void = () => undefined;
    requirement
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ required: false });
    const { result } = renderHook(() => useAppUpdateRequirement());
    await act(async () => {
      focus();
      await Promise.resolve();
    });
    await act(async () => {
      resolveFirst(blocked);
      await Promise.resolve();
    });
    expect(result.current).toEqual({ required: false });
  });

  it("stops listening and ignores pending results after unmount", async () => {
    let resolveCheck: (value: typeof blocked) => void = () => undefined;
    requirement.mockReturnValueOnce(new Promise((resolve) => { resolveCheck = resolve; }));
    const { result, unmount } = renderHook(() => useAppUpdateRequirement());
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveCheck(blocked);
      await Promise.resolve();
    });
    expect(result.current).toEqual({ required: false });
  });
});
