import { act, renderHook } from "@testing-library/react-native";
import type { PointsSummary } from "@/domain/points/points.types";
import { usePointsCelebration } from "./usePointsCelebration";

const mockSummary: { data: PointsSummary | undefined } = { data: undefined };
const mockMark = jest.fn();
const mockDismiss = jest.fn();
jest.mock("@/presentation/hooks/queries/user", () => ({
  usePointsSummary: () => mockSummary,
  useMarkTierCelebrated: () => ({ mutate: mockMark }),
  useDismissPointsWelcome: () => ({ mutate: mockDismiss }),
}));

const base: PointsSummary = {
  points: 92, tier: "RACIMO", nextTier: "VENDIMIA", nextTierAt: 160, tierFloor: 80, todayEarned: 3,
  dailyCap: 40, pendingCelebration: null, showWelcome: false, recent: [],
};

describe("usePointsCelebration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSummary.data = base;
  });

  it("celebrates a pending tier once and then marks it as celebrated", () => {
    mockSummary.data = { ...base, pendingCelebration: "RACIMO" };
    const { result, rerender } = renderHook(() => usePointsCelebration(true));
    expect(result.current.celebrating).toBe("RACIMO");
    act(() => result.current.finishCelebration());
    expect(mockMark).toHaveBeenCalledWith("RACIMO");
    // The server has not confirmed yet: the same pending tier is not shown again.
    rerender({});
    expect(result.current.celebrating).toBeNull();
    act(() => result.current.finishCelebration());
    expect(mockMark).toHaveBeenCalledTimes(1);
  });

  it("celebrates a later tier reached in the same session", () => {
    mockSummary.data = { ...base, pendingCelebration: "RACIMO" };
    const { result, rerender } = renderHook(() => usePointsCelebration(true));
    act(() => result.current.finishCelebration());
    mockSummary.data = { ...base, points: 160, tier: "VENDIMIA", pendingCelebration: "VENDIMIA" };
    rerender({});
    expect(result.current.celebrating).toBe("VENDIMIA");
  });

  it("shows the welcome card once and dismisses it on every device", () => {
    mockSummary.data = { ...base, showWelcome: true };
    const { result } = renderHook(() => usePointsCelebration(true));
    expect(result.current.welcome).toEqual({ points: 92, tier: "RACIMO" });
    act(() => result.current.dismissWelcome());
    expect(result.current.welcome).toBeNull();
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows nothing without a pending tier or a welcome", () => {
    const { result } = renderHook(() => usePointsCelebration(true));
    expect(result.current.celebrating).toBeNull();
    expect(result.current.welcome).toBeNull();
  });
});
