import type { ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import WinesScreen from "../../../../../app/(app)/(tabs)/wines/index";

const mockPush = jest.fn();
const mockClearFilters = jest.fn();
let mockViewModel: Record<string, unknown>;

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.formatted ? `${key}:${String(options.formatted)}${options.country ? `:${String(options.country)}` : ""}` : key,
    i18n: { language: "es-AR" },
  }),
}));
jest.mock("@/presentation/hooks/ui/useFormatters", () => ({
  useFormatters: () => ({ formatNumber: (value: number) => String(value) }),
}));
jest.mock("@/presentation/features/wine/useWinesBrowseViewModel", () => ({
  useWinesBrowseViewModel: () => mockViewModel,
}));
jest.mock("@/presentation/features/wine", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    WinesBrowseHeader: ({ totalLabel }: { totalLabel: string }) =>
      React.createElement(Text, { testID: "total-label" }, totalLabel),
    // Each wine stands in as its card body and its review count.
    WineResultsList: ({
      wines,
      ListHeaderComponent,
      ListEmptyComponent,
      ListFooterComponent,
      onWinePress,
      onWineReviewsPress,
    }: {
      wines: { id: string }[];
      ListHeaderComponent: ReactNode;
      ListEmptyComponent: ReactNode;
      ListFooterComponent?: ReactNode;
      onWinePress: (wine: { id: string }) => void;
      onWineReviewsPress?: (wine: { id: string }) => void;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        ListHeaderComponent,
        wines.length ? null : ListEmptyComponent,
        ...wines.flatMap((wine) => [
          React.createElement(Text, { key: `card-${wine.id}`, onPress: () => onWinePress(wine) }, `card ${wine.id}`),
          React.createElement(Text, { key: `count-${wine.id}`, onPress: () => onWineReviewsPress?.(wine) }, `count ${wine.id}`),
        ]),
        ListFooterComponent ?? null,
      ),
  };
});

function viewModel(overrides: Record<string, unknown> = {}) {
  return {
    search: "",
    setSearch: jest.fn(),
    selectedType: null,
    setSelectedType: jest.fn(),
    selectedGrape: "",
    setSelectedGrape: jest.fn(),
    selectedCountry: "",
    selectedRegion: "",
    setSelectedRegion: jest.fn(),
    openFilter: null,
    setOpenFilter: jest.fn(),
    filtersExpanded: false,
    toggleFilters: jest.fn(),
    page: 0,
    wines: [],
    data: { total: 0 },
    isLoading: false,
    totalLabel: "wines.catalogCountExact",
    isError: false,
    error: null,
    isSearching: false,
    isRefreshing: false,
    cellarWineIds: new Set(),
    grapeTypes: [],
    wineTypes: [],
    countryOptions: [],
    regionOptions: [],
    hasActiveFilters: false,
    clearFilters: mockClearFilters,
    selectCountry: jest.fn(),
    loadMore: jest.fn(),
    refresh: jest.fn(),
    retry: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockViewModel = viewModel();
});

describe("wines search without results", () => {
  it("opens the scanner to add the searched wine", () => {
    mockViewModel = viewModel({ search: "Gran Enemigo ", hasActiveFilters: true });
    const screen = render(<WinesScreen />);

    fireEvent.press(screen.getByText("wines.addYourWine"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/(tabs)/wines/scan",
      params: { returnTo: "/(app)/(tabs)/wines", intent: "add", wineName: "Gran Enemigo" },
    });
  });

  it("keeps clearing the filters as a second option", () => {
    mockViewModel = viewModel({ hasActiveFilters: true });
    const screen = render(<WinesScreen />);

    fireEvent.press(screen.getByText("common.clear"));

    expect(mockClearFilters).toHaveBeenCalledTimes(1);
  });

  it("does not offer clearing when nothing is filtered", () => {
    const screen = render(<WinesScreen />);
    expect(screen.queryByText("common.clear")).toBeNull();
  });
});

describe("wine results", () => {
  it("opens the wine on its information tab from the card", () => {
    mockViewModel = viewModel({ wines: [{ id: "wine-1" }] });
    const screen = render(<WinesScreen />);

    fireEvent.press(screen.getByText("card wine-1"));

    expect(mockPush).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/wines/[id]", params: { id: "wine-1" } });
  });

  it("opens the wine straight on its reviews from the review count", () => {
    mockViewModel = viewModel({ wines: [{ id: "wine-1" }] });
    const screen = render(<WinesScreen />);

    fireEvent.press(screen.getByText("count wine-1"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: { id: "wine-1", tab: "reviews" },
    });
  });
});

/** Text of every rendered text node, in screen order. */
function textsInOrder(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(textsInOrder);
  if (node && typeof node === "object" && "children" in node) {
    return textsInOrder((node as { children: unknown }).children ?? []);
  }
  return [];
}

describe("wines search failure", () => {
  const serverError = Object.assign(new Error("Request failed"), { response: { status: 500 } });

  it("shows the error below the search header, never above it", () => {
    mockViewModel = viewModel({ isError: true, error: serverError, totalLabel: "wines.loadError" });
    const screen = render(<WinesScreen />);

    const texts = textsInOrder(screen.toJSON());
    const header = texts.indexOf("wines.loadError");
    const errorTitle = texts.indexOf("illustratedState.server.title");
    expect(header).toBeGreaterThanOrEqual(0);
    expect(errorTitle).toBeGreaterThan(header);
    expect(screen.queryByText("wines.noWines")).toBeNull();
  });

  it("retries from the error state", () => {
    const retry = jest.fn();
    mockViewModel = viewModel({ isError: true, error: serverError, retry });
    const screen = render(<WinesScreen />);

    fireEvent.press(screen.getByText("common.retry"));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps the loaded wines and shows the error after them when a later page fails", () => {
    mockViewModel = viewModel({ isError: true, error: serverError, wines: [{ id: "wine-1" }] });
    const screen = render(<WinesScreen />);

    const texts = textsInOrder(screen.toJSON());
    expect(texts.indexOf("illustratedState.server.title")).toBeGreaterThan(texts.indexOf("card wine-1"));
  });
});

describe("wines count subtitle", () => {
  it("shows the subtitle the view model computed", () => {
    mockViewModel = viewModel({ totalLabel: "wines.countInCountry:12:Argentina" });
    const screen = render(<WinesScreen />);
    expect(screen.getByTestId("total-label").props.children).toBe("wines.countInCountry:12:Argentina");
  });
});
