import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ScrollView } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";
import WineDetailRoute from "../../../../../app/(app)/(tabs)/wines/[id]";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";

let mockParams: Record<string, string | undefined>;
let mockWineFailure: { status?: number; code?: string } | null = null;
let mockWineStats: { rating?: number; reviewCount: number } = { reviewCount: 0 };
let mockWineryId: string | null = null;
let mockTasteScores: Partial<Record<"bodyScore" | "tanninScore" | "sweetnessScore" | "acidityScore", number>> = {};
let mockAuthenticated = true;
let mockHasReview = false;
const mockPush = jest.fn();
const mockShare = jest.fn();
const mockWineRefetch = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, push: mockPush, replace: jest.fn(), canGoBack: () => true }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === "string" ? fallback : key),
    i18n: { language: "en" },
  }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement("View", { testID: "screen-sheet-host" }, children),
  };
});

jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: mockAuthenticated }),
}));

jest.mock("@/presentation/hooks/useShareLink", () => ({
  useShareLink: () => mockShare,
}));

const mockIdleQuery = { isLoading: false, isFetching: false, refetch: jest.fn() };

jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useWineDetail: () => ({
    ...mockIdleQuery,
    isError: !!mockWineFailure,
    error: mockWineFailure ?? undefined,
    refetch: mockWineRefetch,
    data: mockWineFailure ? undefined : {
      id: "wine-1",
      name: "Reserva",
      type: "RED",
      winery: "Bodega",
      wineryId: mockWineryId,
      grapeVarieties: ["Malbec"],
      ...mockWineStats,
      ...mockTasteScores,
    },
  }),
  useAiProfileStatus: () => ({ ...mockIdleQuery, data: { status: "NONE" } }),
  useAiWineProfile: () => ({ ...mockIdleQuery, data: undefined }),
  useMyReviewStatus: (wineId?: string) => ({ data: wineId ? { hasReview: mockHasReview } : undefined }),
}));

jest.mock("@/presentation/hooks/queries/cellar", () => ({
  useCellar: () => ({ ...mockIdleQuery, data: [] }),
}));

jest.mock("@/presentation/features/cellar", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    CellarAddSheet: ({ visible }: { visible: boolean }) =>
      visible ? mockReact.createElement("Text", null, "Cellar sheet") : null,
  };
});

jest.mock("@/presentation/features/wine", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AiProfileSections: () => null,
    // Pressing the stand-in reports that the pinned own review has laid out.
    ReviewsList: ({ focusOwnReview, onOwnReviewLayout, onWriteReview, onEditReview }: {
      focusOwnReview?: boolean; onOwnReviewLayout?: () => void;
      onWriteReview: () => void; onEditReview: (review: { id: string }) => void;
    }) =>
      mockReact.createElement("View", null,
        mockReact.createElement("Text", { onPress: onOwnReviewLayout },
          focusOwnReview ? "Reviews pinned to own review" : "Reviews list"),
        mockReact.createElement("Text", { onPress: onWriteReview }, "List write button"),
        mockReact.createElement("Text", { onPress: () => onEditReview({ id: "own-review" }) }, "List edit button")),
    WineTasteProfile: () => null,
  };
});

jest.mock("@/presentation/features/wine/ReviewFormSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    ReviewFormSheet: ({ visible, review, onClose }: { visible: boolean; review?: { id: string } | null; onClose: () => void }) =>
      visible
        ? mockReact.createElement("Text", { onPress: onClose }, `Review sheet ${review?.id ?? "new"}`)
        : null,
  };
});

jest.mock("@/presentation/features/wine/WineImage", () => ({
  WineImage: () => null,
}));

const mockTrackView = jest.fn();
jest.mock("@/presentation/hooks/useDetailViewTracking", () => ({
  useDetailViewTracking: (...args: unknown[]) => mockTrackView(...args),
}));

describe("wine detail route", () => {
  beforeEach(() => {
    mockParams = { id: "wine-1" };
    mockWineFailure = null;
    mockWineStats = { reviewCount: 0 };
    mockWineryId = null;
    mockTasteScores = {};
    mockAuthenticated = true;
    mockHasReview = false;
    jest.clearAllMocks();
  });

  it("offers a retry and a way back when the wine fails to load", () => {
    mockWineFailure = { status: 500 };
    const screen = render(<WineDetailRoute />);

    expect(screen.queryByText("wineDetails.notFound")).toBeNull();
    fireEvent.press(screen.getByText("Reintentar"));
    expect(mockWineRefetch).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText("common.back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("opens the winery profile from the winery name", () => {
    mockWineryId = "winery-1";
    const screen = render(<WineDetailRoute />);

    const links = screen.getAllByRole("link", { name: "Bodega" });
    expect(links).toHaveLength(2);
    links.forEach((link) => fireEvent.press(link));
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenNthCalledWith(1, { pathname: "/(app)/wineries/[id]", params: { id: "winery-1" } });
    expect(mockPush).toHaveBeenNthCalledWith(2, { pathname: "/(app)/wineries/[id]", params: { id: "winery-1" } });
  });

  it("keeps the winery name as plain text when the wine has no winery profile", () => {
    const screen = render(<WineDetailRoute />);

    expect(screen.queryAllByRole("link", { name: "Bodega" })).toHaveLength(0);
    screen.getAllByText("Bodega").forEach((name) => fireEvent.press(name));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("counts a single rating in the singular", () => {
    mockWineStats = { rating: 4, reviewCount: 1 };
    const screen = render(<WineDetailRoute />);

    expect(mockTrackView).toHaveBeenCalledWith("WINE", "wine-1");
    expect(screen.getByText("wineDetails.ratingCount")).toBeTruthy();
    expect(screen.queryByText(/wineDetails\.ratings/)).toBeNull();
  });

  it("keeps the not-found state for a wine that does not exist", () => {
    mockWineFailure = { status: 404 };
    const screen = render(<WineDetailRoute />);

    expect(screen.getByText("wineDetails.notFound")).toBeTruthy();
    expect(screen.queryByText("Reintentar")).toBeNull();
  });

  it("opens Add to Cellar in a sheet host of its own when the scanner opened the wine", () => {
    mockParams = { id: "wine-1", scanReturnTo: "/(app)/(tabs)/wines" };
    const screen = render(<WineDetailRoute />);

    fireEvent.press(screen.getByText("wineDetails.addToCellar"));

    expect(within(screen.getByTestId("screen-sheet-host")).getByText("Cellar sheet")).toBeTruthy();
  });

  it("keeps Add to Cellar in the app-level sheet host for a regular wine detail", () => {
    const screen = render(<WineDetailRoute />);

    fireEvent.press(screen.getByText("wineDetails.addToCellar"));

    expect(screen.getByText("Cellar sheet")).toBeTruthy();
    expect(screen.queryByTestId("screen-sheet-host")).toBeNull();
  });

  it("keeps the review form above the keyboard with a keyboard-aware scroll that still refreshes", () => {
    const screen = render(<WineDetailRoute />);
    expect(screen.UNSAFE_getByType(KeyboardAwareScrollView).props.refreshControl).toBeTruthy();
  });

  it("keeps Share, Compare and Add to Cellar working beside the review shortcut", () => {
    mockAuthenticated = false;
    const screen = render(<WineDetailRoute />);

    fireEvent.press(screen.getByText("common.share"));
    expect(mockShare).toHaveBeenCalledWith({ kind: "wines", id: "wine-1", title: "Reserva" });
    fireEvent.press(screen.getByText("wines.compare"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/wines/compare", params: { wineAId: "wine-1" } });
    fireEvent.press(screen.getByText("wineDetails.addToCellar"));
    expect(mockPush).toHaveBeenLastCalledWith("/(auth)/login");
  });

  it("glides to the reviews and opens the review sheet straight from the hero", () => {
    const screen = render(<WineDetailRoute />);
    expect(screen.queryByText(/^Review sheet/)).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "reviews.writeReview" }));

    expect(screen.getByText("Reviews list")).toBeTruthy();
    expect(screen.getByText("Review sheet new")).toBeTruthy();
    const scrollTo = jest.spyOn(screen.UNSAFE_getByType(ScrollView).instance, "scrollTo");
    fireEvent(screen.getByTestId("wine-reviews-section"), "layout", { nativeEvent: { layout: { y: 640 } } });
    expect(scrollTo).toHaveBeenCalledWith({ y: 640, animated: true });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("hides the taste profile card when the wine has no taste scores", () => {
    const screen = render(<WineDetailRoute />);
    expect(screen.queryByText("wineDetails.tasteProfile")).toBeNull();
  });

  it("shows the taste profile card when the wine has a taste score", () => {
    mockTasteScores = { bodyScore: 70 };
    const screen = render(<WineDetailRoute />);
    expect(screen.getByText("wineDetails.tasteProfile")).toBeTruthy();
  });

  it("shows the reviews at the end of the information tab, without a reviews tab or a jump", () => {
    const screen = render(<WineDetailRoute />);
    expect(screen.getByText("wines.tabs.info")).toBeTruthy();
    expect(screen.getByText("wines.tabs.ai")).toBeTruthy();
    expect(screen.queryByText("wines.tabs.reviews")).toBeNull();
    expect(screen.getByText("Reviews list")).toBeTruthy();
    const scrollTo = jest.spyOn(screen.UNSAFE_getByType(ScrollView).instance, "scrollTo");
    fireEvent(screen.getByTestId("wine-reviews-section"), "layout", { nativeEvent: { layout: { y: 640 } } });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("leaves the reviews out of the profile tab and brings them back with the hero shortcut", () => {
    const screen = render(<WineDetailRoute />);
    fireEvent.press(screen.getByText("wines.tabs.ai"));
    expect(screen.queryByTestId("wine-reviews-section")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "reviews.writeReview" }));

    expect(screen.getByText("Reviews list")).toBeTruthy();
    expect(screen.getByText("Review sheet new")).toBeTruthy();
  });

  it("opens straight on the reviews and glides to them from the card's review count", () => {
    mockParams = { id: "wine-1", tab: "reviews" };
    const screen = render(<WineDetailRoute />);

    expect(screen.getByText("Reviews list")).toBeTruthy();
    const scrollTo = jest.spyOn(screen.UNSAFE_getByType(ScrollView).instance, "scrollTo");
    fireEvent(screen.getByTestId("wine-reviews-section"), "layout", { nativeEvent: { layout: { y: 640 } } });
    expect(scrollTo).toHaveBeenCalledWith({ y: 640, animated: true });
  });

  it("names the shortcut after the reader's own review and takes them to it", () => {
    mockHasReview = true;
    const screen = render(<WineDetailRoute />);
    expect(screen.queryByRole("button", { name: "reviews.writeReview" })).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "reviews.yourReview" }));
    expect(screen.queryByText(/^Review sheet/)).toBeNull();

    const scrollTo = jest.spyOn(screen.UNSAFE_getByType(ScrollView).instance, "scrollTo");
    fireEvent(screen.getByTestId("wine-reviews-section"), "layout", { nativeEvent: { layout: { y: 640 } } });
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Reviews pinned to own review"));
    expect(scrollTo).toHaveBeenCalledWith({ y: 640, animated: true });
  });

  it("asks a signed-out reader to log in before writing a review", () => {
    mockAuthenticated = false;
    mockHasReview = true;
    const screen = render(<WineDetailRoute />);

    fireEvent.press(screen.getByRole("button", { name: "reviews.writeReview" }));

    expect(mockPush).toHaveBeenCalledWith("/(auth)/login");
    expect(screen.queryByText(/^Review sheet/)).toBeNull();
  });

  it("writes and edits a review in the sheet from the reviews at the end of the information tab, and closes it", () => {
    const screen = render(<WineDetailRoute />);

    fireEvent.press(screen.getByText("List write button"));
    fireEvent.press(screen.getByText("Review sheet new"));
    expect(screen.queryByText(/^Review sheet/)).toBeNull();

    fireEvent.press(screen.getByText("List edit button"));
    expect(screen.getByText("Review sheet own-review")).toBeTruthy();
  });
});
