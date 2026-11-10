import { configureStore } from "@reduxjs/toolkit";
import { act, cleanup, renderHook } from "@testing-library/react-native";
import { createElement, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import { Provider } from "react-redux";
import { executeQueryOperation, type QueryRequest } from "@/application/operations";
import type { PaginatedResult, WineSummary } from "@/domain/wine/wine.types";
import { appApi } from "@/presentation/store/api";
import { useWinesBrowseViewModel } from "../useWinesBrowseViewModel";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useGeolocation } from "@/presentation/hooks/ui";
import { locationService } from "@/application/services/location.service";

jest.mock("@/application/operations", () => ({
  ...jest.requireActual("@/application/operations/types"),
  executeQueryOperation: jest.fn(),
  executeMutationOperation: jest.fn(),
}));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({}) }));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("@/presentation/hooks/ui", () => ({
  ...jest.requireActual("@/presentation/hooks/ui"),
  useGeolocation: jest.fn(),
}));

jest.mock("@/application/services/location.service", () => ({
  locationService: { resolveCountry: jest.fn() },
}));

function wine(id: string): WineSummary {
  return {
    id,
    name: id,
    winery: "Winery",
    type: "red",
    region: "Mendoza",
    country: "Argentina",
    grapeVarieties: ["Malbec"],
    vintage: null,
    price: null,
    rating: null,
    reviewCount: 0,
    imageUrl: null,
    isNatural: false,
    bottleImageUrl: null,
    seoName: null,
  };
}
function page(index: number, ids: string[], hasNext = true): PaginatedResult<WineSummary> {
  return {
    items: ids.map(wine),
    page: index,
    size: 20,
    total: 60,
    totalPages: 3,
    isFirst: index === 0,
    isLast: !hasNext,
    hasNext,
    hasPrevious: index > 0,
  };
}
type Pending = {
  request: QueryRequest;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};
let pending: Pending[];
let stores: ReturnType<typeof makeStore>[];
function makeStore() {
  return configureStore({
    reducer: { [appApi.reducerPath]: appApi.reducer },
    middleware: (gdm) => gdm().concat(appApi.middleware),
  });
}
function mount() {
  const store = makeStore();
  stores.push(store);
  const wrapper = ({ children }: PropsWithChildren) => createElement(Provider, { store, children });
  return { ...renderHook(useWinesBrowseViewModel, { wrapper }), store };
}
function requestAt(index: number): Pending {
  const request = pending[index];
  if (!request) throw new Error(`Missing wine request ${index}`);
  return request;
}
async function respond(index: number, value: PaginatedResult<WineSummary>) {
  await act(async () => {
    requestAt(index).resolve(value);
    await jest.advanceTimersByTimeAsync(0);
  });
}
async function fail(index: number) {
  await act(async () => {
    requestAt(index).reject(new Error("offline"));
    await jest.advanceTimersByTimeAsync(0);
  });
}
async function debounce() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(400);
  });
}
const ids = (wines: WineSummary[]) => wines.map((item) => item.id);

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useGeolocation).mockReturnValue({ latitude: null, longitude: null, loading: false, error: "permission_denied" });
  jest.mocked(locationService.resolveCountry).mockResolvedValue(null);
  pending = [];
  stores = [];
  jest
    .mocked(useAuth)
    .mockReturnValue({ isAuthenticated: true, user: { id: "reader" } } as ReturnType<
      typeof useAuth
    >);
  jest
    .mocked(executeQueryOperation)
    .mockImplementation((request) =>
      request.key === "wine.list"
        ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
        : Promise.resolve([]),
    );
});
afterEach(() => {
  cleanup();
  stores.forEach((store) => store.dispatch(appApi.util.resetApiState()));
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

it("keeps page zero once while page one is delayed, then appends only page one", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a"]));
  act(() => result.current.loadMore());
  expect(ids(result.current.wines)).toEqual(["a"]);
  await respond(1, page(1, ["b"]));
  expect(ids(result.current.wines)).toEqual(["a", "b"]);
});

it("does not skip a page when the list emits two end-reached events in one frame", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a"]));
  act(() => {
    result.current.loadMore();
    result.current.loadMore();
  });
  expect(pending.map(({ request }) => request.params?.page)).toEqual([0, 1]);
});

it("replaces a refetched page instead of duplicating it on app focus", async () => {
  const { result, store } = mount();
  await respond(0, page(0, ["a"]));
  act(() => result.current.loadMore());
  await respond(1, page(1, ["b"]));
  act(() => {
    store.dispatch(appApi.internalActions.onFocus());
  });
  await respond(2, page(1, ["b", "c"]));
  expect(ids(result.current.wines)).toEqual(["a", "b", "c"]);
});

it("starts the existing selected country at page zero without requesting its old page", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a"]));
  act(() => result.current.loadMore());
  await respond(1, page(1, ["b"]));
  act(() => result.current.selectCountry("Chile"));
  expect(pending.slice(2).map(({ request }) => request.params)).toEqual([
    { filter: { country: "Chile" }, page: 0, pageSize: 20 },
  ]);
});

it("deduplicates overlapping pages by ID without changing server order", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a", "b"]));
  act(() => result.current.loadMore());
  const next = page(1, ["b", "c"], false);
  next.items[0]!.reviewCount = 2;
  await respond(1, next);
  expect(ids(result.current.wines)).toEqual(["a", "b", "c"]);
  expect(result.current.wines[1]!.reviewCount).toBe(2);
  act(() => result.current.loadMore());
  expect(pending).toHaveLength(2);
});

it("keeps loaded results on a page error and retries that page instead of page zero", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a"]));
  act(() => result.current.loadMore());
  await fail(1);
  expect(result.current.isError).toBe(true);
  expect(ids(result.current.wines)).toEqual(["a"]);
  act(() => result.current.loadMore());
  expect(pending).toHaveLength(2);
  act(() => result.current.retry());
  expect(requestAt(2).request.params?.page).toBe(1);
  await respond(2, page(1, ["b"]));
  expect(result.current.isError).toBe(false);
  expect(ids(result.current.wines)).toEqual(["a", "b"]);
});

it("retries initial failure without rendering it as an empty successful result", async () => {
  const { result } = mount();
  expect(result.current.isLoading).toBe(true);
  await fail(0);
  expect(result.current.isError).toBe(true);
  expect(result.current.data).toBeUndefined();
  act(() => result.current.retry());
  await respond(1, { ...page(0, [], false), total: 0, totalPages: 0 });
  expect(result.current.isError).toBe(false);
  expect(result.current.data?.total).toBe(0);
  expect(result.current.wines).toEqual([]);
});

it("keeps the complete list during refresh, makes one request and replaces it on success", async () => {
  const { result } = mount();
  const first = page(0, ["a"]);
  await respond(0, first);
  act(() => result.current.loadMore());
  await respond(1, page(1, ["b"]));
  act(() => {
    void result.current.refresh();
    void result.current.refresh();
    result.current.loadMore();
  });
  expect(pending).toHaveLength(3);
  expect(requestAt(2).request.params?.page).toBe(0);
  expect(ids(result.current.wines)).toEqual(["a", "b"]);
  expect(result.current.isRefreshing).toBe(true);
  // The identical response object must still reset the accumulated pages.
  await respond(2, first);
  expect(ids(result.current.wines)).toEqual(["a"]);
  expect(result.current.page).toBe(0);
  expect(result.current.isRefreshing).toBe(false);
  act(() => result.current.loadMore());
  expect(ids(result.current.wines)).toEqual(["a", "b"]);
  expect(pending).toHaveLength(3); // legitimate page-one cache remains usable
});

it("ignores an in-flight next page after a successful first-page refresh", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a"]));
  act(() => result.current.loadMore());
  act(() => { void result.current.refresh(); });
  await respond(2, page(0, ["fresh"]));
  await respond(1, page(1, ["late"]));
  expect(ids(result.current.wines)).toEqual(["fresh"]);
  expect(result.current.page).toBe(0);
});

it("preserves all loaded pages after refresh failure and retries the refresh explicitly", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a"]));
  act(() => result.current.loadMore());
  await respond(1, page(1, ["b"]));
  act(() => {
    void result.current.refresh();
  });
  await fail(2);
  expect(result.current.isRefreshing).toBe(false);
  expect(result.current.isError).toBe(true);
  expect(result.current.error).toMatchObject({ message: "offline" });
  expect(ids(result.current.wines)).toEqual(["a", "b"]);
  expect(result.current.page).toBe(1);
  act(() => result.current.retry());
  expect(requestAt(3).request.params?.page).toBe(0);
  await respond(3, page(0, ["fresh"]));
  expect(result.current.isError).toBe(false);
  expect(ids(result.current.wines)).toEqual(["fresh"]);
});

it("preserves the 400 ms debounce, two-character threshold and existing combined filter params", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a"]));
  act(() => result.current.setSearch(" m "));
  await debounce();
  expect(pending).toHaveLength(1);
  act(() => result.current.setSearch("  mural  "));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(399);
  });
  expect(pending).toHaveLength(1);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1);
  });
  expect(requestAt(1).request.params).toEqual({
    filter: { search: "mural" },
    page: 0,
    pageSize: 20,
  });
  await respond(1, page(0, ["mural"]));
  act(() => {
    result.current.setSelectedType("red");
    result.current.setSelectedGrape("Malbec");
    result.current.selectCountry("Argentina");
  });
  act(() => result.current.setSelectedRegion("Mendoza"));
  expect(pending.at(-1)?.request.params).toEqual({
    page: 0,
    pageSize: 20,
    filter: {
      search: "mural",
      type: "red",
      grapeVariety: "Malbec",
      country: "Argentina",
      region: "Mendoza",
    },
  });
});

it("ignores a late previous page and restores only page zero when returning to a cached search", async () => {
  const { result } = mount();
  await respond(0, page(0, ["a"]));
  act(() => result.current.loadMore());
  act(() => result.current.setSearch("mural"));
  await debounce();
  expect(result.current.wines).toEqual([]);
  expect(requestAt(2).request.params?.page).toBe(0);
  await respond(2, page(0, ["mural"]));
  await respond(1, page(1, ["late"]));
  expect(ids(result.current.wines)).toEqual(["mural"]);
  act(() => result.current.setSearch(""));
  await debounce();
  expect(ids(result.current.wines)).toEqual(["a"]);
  expect(result.current.page).toBe(0);
  expect(pending).toHaveLength(3);
});

it("does not let an old refresh overwrite a newer search or keep that search subscribed", async () => {
  const { result, store } = mount();
  await respond(0, page(0, ["a"]));
  act(() => {
    void result.current.refresh();
  });
  act(() => result.current.setSearch("mural"));
  await debounce();
  expect(result.current.isRefreshing).toBe(false);
  await respond(2, page(0, ["mural"]));
  await respond(1, page(0, ["late"]));
  expect(ids(result.current.wines)).toEqual(["mural"]);
  act(() => {
    store.dispatch(appApi.internalActions.onFocus());
  });
  expect(pending.slice(3).map(({ request }) => request.params?.filter)).toEqual([
    { search: "mural" },
  ]);
});

it("ignores a late refresh after unmount without dropping the cached result", async () => {
  const { result, unmount, store } = mount();
  await respond(0, page(0, ["a"]));
  act(() => {
    void result.current.refresh();
  });
  unmount();
  await respond(1, page(0, ["fresh"]));
  // Inspect the real store without mounting another subscriber.
  const cached = appApi.endpoints.executeQuery.select(requestAt(0).request)(store.getState()).data;
  expect(cached).toMatchObject({ items: [{ id: "fresh" }] });
});

it("skips private cellar/catalog while anonymous and clears badges and pages on logout", async () => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ isAuthenticated: false, user: null } as ReturnType<typeof useAuth>);
  const { result, rerender, store } = mount();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  expect(
    jest.mocked(executeQueryOperation).mock.calls.map(([request]) => request.key),
  ).not.toContain("cellar.list");
  expect(pending).toHaveLength(0);
  act(() => {
    result.current.loadMore();
    void result.current.refresh();
    result.current.retry();
  });
  expect(pending).toHaveLength(0);
  jest
    .mocked(useAuth)
    .mockReturnValue({ isAuthenticated: true, user: { id: "reader" } } as ReturnType<
      typeof useAuth
    >);
  jest
    .mocked(executeQueryOperation)
    .mockImplementation((request) =>
      request.key === "wine.list"
        ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
        : Promise.resolve(request.key === "cellar.list" ? [{ wine: { id: "a" } }] : []),
    );
  rerender({});
  await respond(0, page(0, ["a"]));
  expect(result.current.cellarWineIds.has("a")).toBe(true);
  act(() => {
    void result.current.refresh();
  });
  jest
    .mocked(useAuth)
    .mockReturnValue({ isAuthenticated: false, user: null } as ReturnType<typeof useAuth>);
  // Auth already resets RTK cache on logout; exercise that same boundary here.
  act(() => {
    store.dispatch(appApi.util.resetApiState());
  });
  rerender({});
  expect(result.current.cellarWineIds.size).toBe(0);
  expect(result.current.wines).toEqual([]);
  await respond(1, page(0, ["late"]));
  expect(result.current.wines).toEqual([]);
  expect(result.current.isRefreshing).toBe(false);
});


it("requests the initial catalog only once, after the automatic country has resolved", async () => {
  jest.mocked(useGeolocation).mockReturnValue({
    latitude: null, longitude: null, loading: true, error: null,
  });
  jest.mocked(executeQueryOperation).mockImplementation((request) =>
    request.key === "wine.list"
      ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
      : Promise.resolve(request.key === "ref.countries"
        ? [{ id: "ar", code: "AR", name: "Argentina" }] : []),
  );
  let finishCountry!: (value: { country: string; countryCode: string }) => void;
  jest.mocked(locationService.resolveCountry).mockReturnValue(new Promise(resolve => {
    finishCountry = resolve;
  }));
  const { result, rerender } = mount();
  await act(async () => { await jest.advanceTimersByTimeAsync(0); });
  expect(result.current.isLoading).toBe(true);
  expect(pending).toHaveLength(0);
  jest.mocked(useGeolocation).mockReturnValue({
    latitude: -34.6, longitude: -58.4, loading: false, error: null,
  });
  rerender({});
  expect(pending).toHaveLength(0);
  await act(async () => {
    finishCountry({ country: "Argentina", countryCode: "AR" });
    await jest.advanceTimersByTimeAsync(0);
  });
  expect(pending.map(({ request }) => request.params)).toEqual([
    { filter: { country: "Argentina" }, page: 0, pageSize: 20 },
  ]);
  await respond(0, page(0, ["a"]));
  rerender({});
  expect(ids(result.current.wines)).toEqual(["a"]);
  expect(pending).toHaveLength(1);
});


it.each([null, { country: "Unknown", countryCode: "XX" }])(
  "falls back to one global catalog request when the country cannot be matched: %p",
  async (place) => {
    jest.mocked(useGeolocation).mockReturnValue({ latitude: 0, longitude: 0, loading: false, error: null });
    jest.mocked(locationService.resolveCountry).mockResolvedValue(place);
    jest.mocked(executeQueryOperation).mockImplementation((request) =>
      request.key === "wine.list"
        ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
        : Promise.resolve(request.key === "ref.countries"
          ? [{ id: "ar", code: "AR", name: "Argentina" }] : []),
    );
    const { result } = mount();
    await act(async () => { await jest.advanceTimersByTimeAsync(0); });
    expect(pending.map(({ request }) => request.params)).toEqual([
      { filter: {}, page: 0, pageSize: 20 },
    ]);
    await respond(0, page(0, ["a"]));
    expect(result.current.isLoading).toBe(false);
    expect(locationService.resolveCountry).toHaveBeenCalledWith({ latitude: 0, longitude: 0 });
  },
);

it("preserves the iOS deadline and ignores a late country instead of querying the catalog again", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  jest.mocked(useGeolocation).mockReturnValue({ latitude: -34.6, longitude: -58.4, loading: false, error: null });
  jest.mocked(executeQueryOperation).mockImplementation((request) =>
    request.key === "wine.list"
      ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
      : Promise.resolve(request.key === "ref.countries"
        ? [{ id: "ar", code: "AR", name: "Argentina" }] : []),
  );
  let finishCountry!: (value: { country: string; countryCode: string }) => void;
  jest.mocked(locationService.resolveCountry).mockReturnValue(new Promise(resolve => { finishCountry = resolve; }));
  const { result } = mount();
  await act(async () => { await jest.advanceTimersByTimeAsync(9_999); });
  expect(pending).toHaveLength(0);
  expect(result.current.isLoading).toBe(true);
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  expect(pending).toHaveLength(1);
  await respond(0, page(0, ["a"]));
  await act(async () => {
    finishCountry({ country: "Argentina", countryCode: "AR" });
    await jest.advanceTimersByTimeAsync(0);
  });
  expect(result.current.selectedCountry).toBe("");
  expect(ids(result.current.wines)).toEqual(["a"]);
  expect(pending).toHaveLength(1);
  jest.restoreAllMocks();
});

describe("Android country detection after reopening", () => {
  beforeEach(() => jest.replaceProperty(Platform, "OS", "android"));
  afterEach(() => jest.restoreAllMocks());

  it.each(["coordinates", "geocoding"])("applies late %s after the catalog wait expires", async stage => {
    jest.mocked(useGeolocation).mockReturnValue(stage === "coordinates"
      ? { latitude: null, longitude: null, loading: true, error: null }
      : { latitude: -34.6, longitude: -58.4, loading: false, error: null });
    jest.mocked(executeQueryOperation).mockImplementation(request =>
      request.key === "wine.list"
        ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
        : Promise.resolve(request.key === "ref.countries"
          ? [{ id: "ar", code: "AR", name: "Argentina" }] : []));
    let finishCountry!: (value: { country: string; countryCode: string }) => void;
    jest.mocked(locationService.resolveCountry).mockReturnValue(new Promise(resolve => { finishCountry = resolve; }));
    const { result, rerender } = mount();
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    expect(pending).toHaveLength(1);
    await respond(0, page(0, ["global"]));
    expect(ids(result.current.wines)).toEqual(["global"]);
    jest.mocked(useGeolocation).mockReturnValue({ latitude: -34.6, longitude: -58.4, loading: false, error: null });
    rerender({});
    await act(async () => {
      finishCountry({ country: "Argentina", countryCode: "AR" });
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(result.current.selectedCountry).toBe("Argentina");
    expect(requestAt(1).request.params).toEqual({ filter: { country: "Argentina" }, page: 0, pageSize: 20 });
    expect(locationService.resolveCountry).toHaveBeenCalledTimes(1);
    await respond(1, page(0, ["argentina"]));
    expect(ids(result.current.wines)).toEqual(["argentina"]);
    rerender({});
    expect(pending).toHaveLength(2);
  });

  it.each(["Chile", ""])("preserves an explicit country choice %p after the deadline", async country => {
    jest.mocked(useGeolocation).mockReturnValue({ latitude: -34.6, longitude: -58.4, loading: false, error: null });
    jest.mocked(executeQueryOperation).mockImplementation(request =>
      request.key === "wine.list"
        ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
        : Promise.resolve(request.key === "ref.countries"
          ? [{ id: "ar", code: "AR", name: "Argentina" }] : []));
    let finishCountry!: (value: { country: string; countryCode: string }) => void;
    jest.mocked(locationService.resolveCountry).mockReturnValue(new Promise(resolve => { finishCountry = resolve; }));
    const { result } = mount();
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    act(() => { if (country) result.current.selectCountry(country); else result.current.clearFilters(); });
    const requestCount = pending.length;
    await act(async () => {
      finishCountry({ country: "Argentina", countryCode: "AR" });
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(result.current.selectedCountry).toBe(country);
    expect(pending).toHaveLength(requestCount);
  });
});

it.each(["Chile", ""])("uses the manual country %p once and ignores a late location", async (country) => {
  jest.mocked(useGeolocation).mockReturnValue({ latitude: -34.6, longitude: -58.4, loading: false, error: null });
  jest.mocked(executeQueryOperation).mockImplementation((request) =>
    request.key === "wine.list"
      ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
      : Promise.resolve(request.key === "ref.countries"
        ? [{ id: "ar", code: "AR", name: "Argentina" }] : []),
  );
  let finishCountry!: (value: { country: string; countryCode: string }) => void;
  jest.mocked(locationService.resolveCountry).mockReturnValue(new Promise(resolve => { finishCountry = resolve; }));
  const { result } = mount();
  await act(async () => { await jest.advanceTimersByTimeAsync(0); });
  expect(pending).toHaveLength(0);
  act(() => {
    if (country) result.current.selectCountry(country);
    else result.current.clearFilters();
  });
  expect(pending).toHaveLength(1);
  expect(requestAt(0).request.params).toEqual({ filter: country ? { country } : {}, page: 0, pageSize: 20 });
  await act(async () => {
    finishCountry({ country: "Argentina", countryCode: "AR" });
    await jest.advanceTimersByTimeAsync(0);
  });
  expect(result.current.selectedCountry).toBe(country);
  expect(pending).toHaveLength(1);
});

it("offers the wine types read from the reference catalog, orange included", async () => {
  jest.mocked(executeQueryOperation).mockImplementation((request) =>
    request.key === "wine.list"
      ? new Promise((resolve, reject) => pending.push({ request, resolve, reject }))
      : Promise.resolve(request.key === "ref.wineTypes"
        ? [
          { value: "red", nameEs: "Tinto", nameEn: "Red" },
          { value: "orange", nameEs: "Naranja", nameEn: "Orange" },
        ]
        : []),
  );
  const { result } = mount();
  await act(async () => { await jest.advanceTimersByTimeAsync(0); });
  expect(result.current.wineTypes.map((type) => type.value)).toEqual(["red", "orange"]);
  act(() => result.current.setSelectedType("orange"));
  expect(pending.at(-1)?.request.params).toEqual({ filter: { type: "orange" }, page: 0, pageSize: 20 });
});
