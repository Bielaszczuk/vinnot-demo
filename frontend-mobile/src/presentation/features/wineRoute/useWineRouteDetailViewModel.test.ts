import { renderHook } from "@testing-library/react-native";
import { useWineRouteDetailViewModel } from "./useWineRouteDetailViewModel";

const mockShareLink = jest.fn();
let mockRoute: Record<string, unknown> | undefined;
jest.mock("@/presentation/hooks/queries/wineRoute", () => ({
  useWineRoute: () => ({ data: mockRoute, isLoading: false }),
}));
jest.mock("@/presentation/hooks/useShareLink", () => ({ useShareLink: () => mockShareLink }));
jest.mock("./useRouteNavigation", () => ({ useRouteNavigation: () => ({ openRoute: jest.fn() }) }));

const route = (isPublished: boolean) => ({
  id: "route-1", name: "Valle de Uco", isPublished, stops: [], duration: 0, estimatedDays: null,
});

const mockTrackView = jest.fn();
jest.mock("@/presentation/hooks/useDetailViewTracking", () => ({
  useDetailViewTracking: (...args: unknown[]) => mockTrackView(...args),
}));

beforeEach(() => jest.clearAllMocks());

it("records a view of the route for the engagement signals", () => {
  mockRoute = route(true);
  renderHook(() => useWineRouteDetailViewModel("route-1"));
  expect(mockTrackView).toHaveBeenCalledWith("ROUTE", "route-1");
});

it("shares a published route", () => {
  mockRoute = route(true);
  const { result } = renderHook(() => useWineRouteDetailViewModel("route-1"));
  expect(result.current.canShare).toBe(true);
  result.current.share();
  expect(mockShareLink).toHaveBeenCalledWith({ kind: "wine-routes", id: "route-1", title: "Valle de Uco" });
});

it("does not offer or send a link for a draft or archived route", () => {
  mockRoute = route(false);
  const { result } = renderHook(() => useWineRouteDetailViewModel("route-1"));
  expect(result.current.canShare).toBe(false);
  result.current.share();
  expect(mockShareLink).not.toHaveBeenCalled();
});
