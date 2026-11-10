import { renderHook } from "@testing-library/react-native";
import { useWineSubmissionCatalog } from "./useWineSubmissionCatalog";

const mockUseRegions = jest.fn();
const mockUseWineries = jest.fn();

jest.mock("@/presentation/hooks/queries/wine/useCountries", () => ({
  useCountries: () => ({ data: [{ id: "ar", code: "AR", name: "Argentina" }] }),
}));
jest.mock("@/presentation/hooks/queries/wine/useGrapeTypes", () => ({
  useGrapeTypes: () => ({ data: [{ id: "m", name: "Malbec" }] }),
}));
jest.mock("@/presentation/hooks/queries/wine/useRegions", () => ({
  useRegions: (...args: unknown[]) => mockUseRegions(...args),
}));
jest.mock("@/presentation/hooks/queries/winery", () => ({
  useWineries: (...args: unknown[]) => mockUseWineries(...args),
}));
jest.mock("@/presentation/hooks/ui", () => ({ useDebounce: <T,>(value: T) => value }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRegions.mockReturnValue({
    data: [
      { id: "mza", name: "Mendoza", countryId: "ar" },
      { id: "maipo", name: "Maipo", countryId: "cl" },
    ],
  });
  mockUseWineries.mockReturnValue({
    data: { wineries: [{ id: "w", name: "Catena Zapata", slug: null }] },
    isFetching: false,
  });
});

it("links the country by name and offers only that country's regions", () => {
  const { result } = renderHook(() => useWineSubmissionCatalog({ id: null, name: "argentina" }, ""));

  expect(result.current.country).toEqual({ id: "ar", name: "Argentina" });
  expect(mockUseRegions).toHaveBeenLastCalledWith("ar", true);
  expect(result.current.regions).toEqual([{ id: "mza", name: "Mendoza" }]);
  expect(result.current.grapes).toEqual([{ id: "m", name: "Malbec" }]);
});

it("skips region and winery requests until there is a catalog country and a winery search", () => {
  const { result } = renderHook(() => useWineSubmissionCatalog({ id: null, name: "Narnia" }, "  "));

  expect(mockUseRegions).toHaveBeenLastCalledWith(undefined, false);
  expect(mockUseWineries).toHaveBeenLastCalledWith(undefined, 0, 10, false);
  expect(result.current.regions).toEqual([]);
  expect(result.current.wineries).toEqual([]);
});

it("searches catalog wineries by the typed name", () => {
  const { result } = renderHook(() => useWineSubmissionCatalog({ id: null, name: "" }, " catena "));

  expect(mockUseWineries).toHaveBeenLastCalledWith({ search: "catena" }, 0, 10, true);
  expect(result.current.wineries).toEqual([{ id: "w", name: "Catena Zapata" }]);
});
