import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import WineryDetailRoute from "../../../../../app/(app)/wineries/[id]";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
const mockRefetch = jest.fn(async () => undefined);
let mockFailure: { status?: number; code?: string } | null = null;
let mockWinery: Record<string, unknown> | undefined;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "winery-1" }),
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es-AR" } }),
}));
jest.mock("react-native-maps", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const MapView = ({ children }: { children?: React.ReactNode }) =>
    mockReact.createElement("View", null, children);
  return { __esModule: true, default: MapView, Marker: () => null };
});
jest.mock("@/presentation/features/winery", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    WineryHero: ({ winery }: { winery: { name: string } }) =>
      mockReact.createElement("Text", null, winery.name),
    WineryWineGrid: () => null,
  };
});
jest.mock("@/presentation/hooks/useGeocoding", () => ({
  useGeocoding: () => ({ geocodeAddress: jest.fn(async () => ({ ok: false })) }),
}));
jest.mock("@/presentation/hooks/queries/winery", () => ({
  useWinery: () => ({
    data: mockWinery,
    isLoading: false,
    isFetching: false,
    isError: !!mockFailure,
    error: mockFailure ?? undefined,
    refetch: mockRefetch,
  }),
  useWineryWines: () => ({ data: { items: [] }, isLoading: false, isFetching: false, refetch: mockRefetch }),
  useUpdateWineryCoordinates: () => ({ mutateAsync: jest.fn(async () => undefined) }),
}));

const mockTrackView = jest.fn();
jest.mock("@/presentation/hooks/useDetailViewTracking", () => ({
  useDetailViewTracking: (...args: unknown[]) => mockTrackView(...args),
}));

describe("winery detail route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFailure = null;
    mockCanGoBack = true;
    mockWinery = { id: "winery-1", name: "Bodega Norte", latitude: -32.9, longitude: -68.8 };
  });

  it("records a view of the winery for the engagement signals", () => {
    render(<WineryDetailRoute />);
    expect(mockTrackView).toHaveBeenCalledWith("WINERY", "winery-1");
  });

  it("offers a retry when the winery fails to load", () => {
    mockWinery = undefined;
    mockFailure = { code: "NETWORK_ERROR" };
    const screen = render(<WineryDetailRoute />);

    expect(screen.queryByText("wineries.notFound")).toBeNull();
    fireEvent.press(screen.getByText("common.retry"));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the not-found state for a winery that does not exist", () => {
    mockWinery = undefined;
    mockFailure = { status: 404 };
    const screen = render(<WineryDetailRoute />);

    expect(screen.getByText("wineries.notFound")).toBeTruthy();
    expect(screen.queryByText("common.retry")).toBeNull();
  });

  it("keeps showing a loaded winery and goes back to the list without history", () => {
    mockCanGoBack = false;
    const screen = render(<WineryDetailRoute />);

    expect(screen.getAllByText("Bodega Norte").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText("common.back"));
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(app)/wineries");
  });
});
