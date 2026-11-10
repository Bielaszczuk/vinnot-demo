import { act, renderHook } from "@testing-library/react-native";
import { useNotificationHistoryViewModel } from "./useNotificationHistoryViewModel";

const mockMetricsArgs = jest.fn();
const mockEngagementArgs = jest.fn();
const mockDetailArgs = jest.fn();
const record = { id: "a1", title: "Vendimia", completedAt: null };
const mockDetail = {
  data: undefined as unknown,
  isFetching: false,
  isError: false,
  error: undefined as unknown,
  refetch: jest.fn(),
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAnnouncementHistory: () => ({ data: [record], isLoading: false, isError: false, refetch: jest.fn() }),
  usePushMetrics: (days: number) => {
    mockMetricsArgs(days);
    return { data: undefined, isFetching: false, isError: false, refetch: jest.fn() };
  },
  usePushEngagement: (days: number) => {
    mockEngagementArgs(days);
    return { data: undefined, isFetching: false, isError: false, refetch: jest.fn() };
  },
  useAnnouncementDetail: (id: string | null) => {
    mockDetailArgs(id);
    return mockDetail;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDetail.data = undefined;
  mockDetail.isError = false;
  mockDetail.error = undefined;
});

it("reads the per-type metrics and the engagement of one shared window, 7 days first", () => {
  const { result } = renderHook(() => useNotificationHistoryViewModel());
  expect(result.current.days).toBe(7);
  expect(mockMetricsArgs).toHaveBeenLastCalledWith(7);
  expect(mockEngagementArgs).toHaveBeenLastCalledWith(7);

  act(() => result.current.setDays(30));

  expect(mockMetricsArgs).toHaveBeenLastCalledWith(30);
  expect(mockEngagementArgs).toHaveBeenLastCalledWith(30);
});

it("opens one announcement with its list data until its detail arrives, then closes it", () => {
  const { result, rerender } = renderHook(() => useNotificationHistoryViewModel());
  expect(mockDetailArgs).toHaveBeenLastCalledWith(null);
  expect(result.current.selected).toBeNull();

  act(() => result.current.open("a1"));
  expect(mockDetailArgs).toHaveBeenLastCalledWith("a1");
  expect(result.current.selected).toBe(record);

  const fresh = { ...record, completedAt: "2026-11-02T10:00:00Z" };
  mockDetail.data = fresh;
  rerender({});
  expect(result.current.selected).toBe(fresh);
  expect(result.current.detailMissing).toBe(false);

  act(() => result.current.close());
  expect(result.current.selected).toBeNull();
  expect(mockDetailArgs).toHaveBeenLastCalledWith(null);
});

it("tells a removed announcement from a failure worth retrying", () => {
  const { result, rerender } = renderHook(() => useNotificationHistoryViewModel());
  act(() => result.current.open("a1"));

  mockDetail.isError = true;
  mockDetail.error = { message: "x", status: 404, code: "NOT_FOUND" };
  rerender({});
  expect(result.current.detailMissing).toBe(true);
  expect(result.current.detailFailed).toBe(false);

  mockDetail.error = { message: "x", status: 500 };
  rerender({});
  expect(result.current.detailMissing).toBe(false);
  expect(result.current.detailFailed).toBe(true);
});

it("labels a push type, or shows its code when this build does not know it", () => {
  const { result } = renderHook(() => useNotificationHistoryViewModel());
  expect(result.current.typeLabel("EVENT_REMINDER")).toBe(
    'admin.notifications.pushTypes.EVENT_REMINDER:{"defaultValue":"EVENT_REMINDER"}',
  );
});
