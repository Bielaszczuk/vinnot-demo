import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, expect, it, jest } from "@jest/globals";
import { useWineRoutesListViewModel } from "./useWineRoutesListViewModel";

const mockData = {
  routes: [{ id: "route-1", name: "Tunuyan", tags: [] }],
  pagination: { hasNext: false, totalItems: 1 },
};
const mockRefetch = jest.fn<() => Promise<{ data?: typeof mockData }>>();
jest.mock("@/presentation/hooks/queries/wineRoute", () => ({
  useWineRoutes: () => ({ data: mockData, refetch: mockRefetch, isFetching: false }),
}));
jest.mock("@/presentation/hooks/queries/wine", () => ({
  useCountries: () => ({}),
  useRegions: () => ({}),
}));
jest.mock("@/presentation/hooks/ui", () => ({ useDebounce: (value: string) => value }));
beforeEach(() => {
  jest.clearAllMocks();
});

it("retains the route after refreshing unchanged cached data", async () => {
  mockRefetch.mockResolvedValue({ data: mockData });
  const { result } = renderHook(() => useWineRoutesListViewModel());
  expect(result.current.filteredRoutes).toHaveLength(1);
  await act(async () => {
    result.current.refresh();
  });
  expect(result.current.filteredRoutes[0]?.id).toBe("route-1");
  expect(result.current.isRefreshing).toBe(false);
});

it("retains visible routes if refreshing fails", async () => {
  mockRefetch.mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => useWineRoutesListViewModel());
  await act(async () => {
    result.current.refresh();
  });
  expect(result.current.filteredRoutes).toHaveLength(1);
  expect(result.current.isRefreshing).toBe(false);
});
