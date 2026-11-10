import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import WineCompareScreen from "../../../../../app/(app)/(tabs)/wines/compare";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import type {
  Wine,
  WineComparison,
  WineSummary,
} from "@/domain/wine/wine.types";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockStartComparisonJourney = jest.fn();
const mockCompleteComparisonJourney = jest.fn();
const mockCancelComparisonJourney = jest.fn();
const mockRefetchComparison = jest.fn();
const mockScrollTo = jest.fn();
let mockJourneyVisible = false;

jest.mock("react-native", () => {
  const actual = jest.requireActual<typeof import("react-native")>("react-native");
  const React = jest.requireActual<typeof import("react")>("react");
  return Object.defineProperty(Object.create(actual), "ScrollView", {
    value: React.forwardRef((props: import("react-native").ScrollViewProps, ref) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return React.createElement("ScrollView", props, props.children);
    }),
  });
});

let mockNextSearch = "wine b";
let mockComparisonFails = false;

const mockWineSummaries: Record<string, WineSummary> = {
  "wine-a": wineSummary("wine-a", "Wine A"),
  "wine-b": wineSummary("wine-b", "Wine B"),
  "wine-c": wineSummary("wine-c", "Wine C"),
  "wine-d": wineSummary("wine-d", "Wine D"),
};

const mockWines: Record<string, Wine> = Object.fromEntries(
  Object.values(mockWineSummaries).map((wine) => [wine.id, wineDetail(wine)]),
);

const mockComparisons: Record<string, WineComparison> = {
  "wine-a:wine-b": comparison("Comparison A-B"),
  "wine-a:wine-c": comparison("Comparison A-C"),
  "wine-d:wine-c": comparison("Comparison D-C"),
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ wineAId: "wine-a" }),
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
}));

jest.mock("@/presentation/hooks/useProcessJourneyVisibility", () => ({
  useProcessJourneyVisibility: () => ({
    visible: mockJourneyVisible,
    start: mockStartComparisonJourney,
    complete: mockCompleteComparisonJourney,
    cancel: mockCancelComparisonJourney,
  }),
}));

jest.mock("@/presentation/hooks/queries/wine", () => ({
  useWineDetail: (id?: string) => ({ data: id ? mockWines[id] : undefined }),
  useWines: (filter?: { search?: string }) => {
    const result = Object.values(mockWineSummaries).find(
      (wine) => wine.name.toLowerCase() === filter?.search?.toLowerCase(),
    );
    return {
      data: {
        items: result ? [result] : [],
      },
      isFetching: false,
    };
  },
  useWineComparison: (wineAId?: string, wineBId?: string) => ({
    currentData:
      wineAId && wineBId && !mockComparisonFails
        ? mockComparisons[`${wineAId}:${wineBId}`]
        : undefined,
    isFetching: false,
    isSuccess: Boolean(wineAId && wineBId && !mockComparisonFails),
    isError: Boolean(wineAId && wineBId && mockComparisonFails),
    error: mockComparisonFails ? { code: "TIMEOUT", message: "Timed out" } : undefined,
    refetch: mockRefetchComparison,
  }),
}));

jest.mock("@/presentation/components/ui/Atoms", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Badge: ({ label }: { label: string }) =>
      mockReact.createElement("Text", null, label),
    RatingGlasses: () => null,
  };
});

jest.mock("@/presentation/components/ui/Button", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Button: ({
      children,
      disabled,
      onPress,
    }: {
      children: React.ReactNode;
      disabled?: boolean;
      onPress?: () => void;
    }) =>
      mockReact.createElement(
        "Text",
        {
          accessibilityState: { disabled: !!disabled },
          onPress: disabled ? undefined : onPress,
          testID: "compare-action",
        },
        children,
      ),
  };
});

jest.mock("@/presentation/components/ui/Card", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Card: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement("View", null, children),
  };
});

jest.mock("@/presentation/components/ui/Feedback", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Spinner: () => mockReact.createElement("Text", null, "loading"),
  };
});

jest.mock("@/presentation/components/ui/ImageWithFallback", () => ({
  ImageWithFallback: () => null,
}));

jest.mock("@/presentation/components/ui/TextField", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    SearchField: ({ onChangeText }: { onChangeText: (value: string) => void }) =>
      mockReact.createElement(
        "Text",
        {
          onPress: () => onChangeText(mockNextSearch),
          testID: "comparison-search",
        },
        "search",
      ),
  };
});

jest.mock("@/presentation/features/wine", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    CompareLoadingSteps: ({ firstType, secondType }: { firstType?: string; secondType?: string }) =>
      mockReact.createElement("Text", { testID: "comparison-scenes" }, `${firstType}/${secondType}`),
    WINE_COMPARISON_JOURNEY_MINIMUM_DURATION_MS: 5250,
    WineComparisonErrorState: ({ onRetry }: { onRetry: () => void }) =>
      mockReact.createElement(
        "Text",
        { onPress: onRetry, testID: "retry-comparison" },
        "comparison-error",
      ),
  };
});

describe("wine comparison route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockNextSearch = "wine b";
    mockComparisonFails = false;
    mockJourneyVisible = false;
    mockStartComparisonJourney.mockImplementation(() => {});
  });

  it("scrolls to the newly laid out animation once after pressing compare", () => {
    mockStartComparisonJourney.mockImplementation(() => { mockJourneyVisible = true; });
    const screen = render(<WineCompareScreen />);
    selectSearchResult(screen, "Wine B");
    expect(mockScrollTo).not.toHaveBeenCalled();
    // The search field scrolls above the keyboard, and the screen ref still reaches the scroll.
    expect(screen.UNSAFE_getByType(KeyboardAwareScrollView)).toBeTruthy();
    fireEvent.press(screen.getByTestId("compare-action"));
    fireEvent(screen.getByTestId("comparison-journey"), "layout", { nativeEvent: { layout: { y: 620 } } });
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 608, animated: true });
    fireEvent(screen.getByTestId("comparison-journey"), "layout", { nativeEvent: { layout: { y: 650 } } });
    expect(mockScrollTo).toHaveBeenCalledTimes(1);
  });

  it("draws each glass of the comparison with its own wine's type", () => {
    mockWines["wine-b"] = { ...mockWines["wine-b"]!, type: "sparkling" };
    mockStartComparisonJourney.mockImplementation(() => { mockJourneyVisible = true; });
    const screen = render(<WineCompareScreen />);
    selectSearchResult(screen, "Wine B");
    fireEvent.press(screen.getByTestId("compare-action"));
    expect(screen.getByTestId("comparison-scenes").props.children).toBe("red/sparkling");
    mockWines["wine-b"] = { ...mockWines["wine-b"]!, type: "red" };
  });

  it("returns through history without pushing another wine detail", () => {
    const screen = render(<WineCompareScreen />);

    fireEvent.press(screen.getByText("common.back"));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("discards the previous result and compares every newly selected pair", () => {
    const screen = render(<WineCompareScreen />);

    selectSearchResult(screen, "Wine B");
    expect(screen.queryByTestId("comparison-search")).toBeNull();
    fireEvent.press(screen.getByTestId("compare-action"));
    expect(screen.getByText("Comparison A-B")).toBeTruthy();

    fireEvent.press(screen.getByTestId("remove-wine-B"));
    expect(screen.getByTestId("comparison-search")).toBeTruthy();
    mockNextSearch = "wine c";
    selectSearchResult(screen, "Wine C");
    expect(screen.queryByText("Comparison A-B")).toBeNull();

    fireEvent.press(screen.getByTestId("compare-action"));
    expect(screen.getByText("Comparison A-C")).toBeTruthy();

    fireEvent.press(screen.getByTestId("remove-wine-A"));
    expect(screen.getByTestId("comparison-search")).toBeTruthy();
    mockNextSearch = "wine d";
    selectSearchResult(screen, "Wine D");
    expect(screen.queryByText("Comparison A-C")).toBeNull();

    fireEvent.press(screen.getByTestId("compare-action"));
    expect(screen.getByText("Comparison D-C")).toBeTruthy();
    expect(mockStartComparisonJourney).toHaveBeenCalledTimes(3);
  });

  it("only reopens the active search after removing a selected wine", () => {
    const screen = render(<WineCompareScreen />);

    expect(screen.getByTestId("comparison-search")).toBeTruthy();
    selectSearchResult(screen, "Wine B");

    expect(screen.queryByTestId("comparison-search")).toBeNull();
    expect(screen.getByTestId("remove-wine-A")).toBeTruthy();
    expect(screen.getByTestId("remove-wine-B")).toBeTruthy();
    // The remove action is translated, never hard-coded Spanish.
    expect(screen.getByTestId("remove-wine-B").props.accessibilityLabel).toEqual({ label: expect.any(String) });

    fireEvent.press(screen.getByTestId("remove-wine-B"));

    expect(screen.getByTestId("comparison-search")).toBeTruthy();
    expect(screen.getByText("Buscar vino B")).toBeTruthy();
    expect(screen.queryByTestId("remove-wine-B")).toBeNull();
  });

  it("closes the journey after a timeout and retries the same comparison", () => {
    mockComparisonFails = true;
    const screen = render(<WineCompareScreen />);

    selectSearchResult(screen, "Wine B");
    fireEvent.press(screen.getByTestId("compare-action"));

    expect(screen.getByText("comparison-error")).toBeTruthy();
    expect(mockCancelComparisonJourney).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("retry-comparison"));

    expect(mockStartComparisonJourney).toHaveBeenCalledTimes(2);
    expect(mockRefetchComparison).toHaveBeenCalledTimes(1);
  });
});

function selectSearchResult(
  screen: ReturnType<typeof render>,
  wineName: string,
) {
  fireEvent.press(screen.getByTestId("comparison-search"));
  fireEvent.press(screen.getByText(wineName));
}

function wineSummary(id: string, name: string): WineSummary {
  return {
    id,
    name,
    winery: "Vinnot Winery",
    type: "red",
    region: "Mendoza",
    country: "Argentina",
    grapeVarieties: ["Malbec"],
    vintage: 2024,
    price: null,
    rating: null,
    reviewCount: 0,
    imageUrl: null,
    isNatural: false,
    bottleImageUrl: null,
    seoName: null,
  };
}

function wineDetail(wine: WineSummary): Wine {
  return {
    ...wine,
    wineryId: null,
    alcoholContent: null,
    style: null,
    allergens: [],
    description: "",
    externalUrl: null,
    foodPairing: null,
    bestVintageYear: null,
    bestVintageRating: null,
    regionId: null,
    regionName: wine.region,
    countryId: null,
    countryName: wine.country,
    acidityScore: null,
    tanninScore: null,
    bodyScore: null,
    sweetnessScore: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function comparison(summary: string): WineComparison {
  return {
    wines: [],
    attributes: [],
    aiSummary: summary,
    summary,
  };
}
