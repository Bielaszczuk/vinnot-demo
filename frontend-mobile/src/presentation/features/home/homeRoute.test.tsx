import { fireEvent, render } from "@testing-library/react-native";
import HomeScreen from "../../../../app/(app)/(tabs)/home";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, navigate: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
const mockAuth = { isAuthenticated: true };
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => mockAuth }));
jest.mock("@/presentation/hooks/ui", () => ({
  useGeolocation: () => ({ latitude: undefined, longitude: undefined }),
  useHaptics: () => ({ selection: jest.fn() }),
}));
const mockIdleQuery = { isLoading: false, isFetching: false, isError: false, data: undefined, refetch: jest.fn() };
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({ useWineHighlights: () => mockIdleQuery }));
jest.mock("@/presentation/hooks/queries/event", () => ({ useNearbyEvents: () => mockIdleQuery }));
jest.mock("@/presentation/hooks/queries/wineRoute", () => ({ useWineRoutes: () => mockIdleQuery }));
const mockFeedEnabled = jest.fn();
const mockSuggestionsEnabled = jest.fn();
jest.mock("@/presentation/hooks/queries/social", () => ({
  useFeedPreview: (enabled: boolean) => {
    mockFeedEnabled(enabled);
    return { ...mockIdleQuery, data: { items: [{ id: "r-1" }], page: 0, totalItems: 1, totalPages: 1, hasMore: false } };
  },
  useSuggestions: (enabled: boolean) => {
    mockSuggestionsEnabled(enabled);
    return { ...mockIdleQuery, data: [] };
  },
}));
// The view stands in as a featured wine's card body and its review count.
jest.mock("@/presentation/features/home", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    HomeScreenView: ({ onWinePress, onWineReviewsPress, social }: {
      onWinePress: (id: string) => void; onWineReviewsPress?: (id: string) => void;
      social?: { feed: unknown[]; onSeeAllFeed: () => void; onUserPress: (id: string) => void; onWinePress: (id: string) => void };
    }) => (
      <>
        <Text onPress={() => onWinePress("wine-1")}>card wine-1</Text>
        <Text onPress={() => onWineReviewsPress?.("wine-1")}>count wine-1</Text>
        {social ? (
          <>
            <Text>{`feed ${social.feed.length}`}</Text>
            <Text onPress={social.onSeeAllFeed}>see all feed</Text>
            <Text onPress={() => social.onUserPress("u-2")}>author u-2</Text>
            <Text onPress={() => social.onWinePress("wine-9")}>feed wine-9</Text>
          </>
        ) : null}
      </>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.isAuthenticated = true;
});

it("opens a featured wine on its information tab, coming back to home", () => {
  const screen = render(<HomeScreen />);
  fireEvent.press(screen.getByText("card wine-1"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(app)/(tabs)/wines/[id]",
    params: { id: "wine-1", returnTo: "/(app)/(tabs)/home" },
  });
});

it("opens a featured wine straight on its reviews from the review count", () => {
  const screen = render(<HomeScreen />);
  fireEvent.press(screen.getByText("count wine-1"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(app)/(tabs)/wines/[id]",
    params: { id: "wine-1", returnTo: "/(app)/(tabs)/home", tab: "reviews" },
  });
});

it("hands the social sections to a signed-in user and opens the feed, a profile and a wine", () => {
  const screen = render(<HomeScreen />);
  expect(screen.getByText("feed 1")).toBeTruthy();
  fireEvent.press(screen.getByText("see all feed"));
  fireEvent.press(screen.getByText("author u-2"));
  fireEvent.press(screen.getByText("feed wine-9"));
  expect(mockPush.mock.calls.map((call) => call[0])).toEqual([
    "/(app)/feed",
    { pathname: "/(app)/users/[id]", params: { id: "u-2" } },
    { pathname: "/(app)/(tabs)/wines/[id]", params: { id: "wine-9", returnTo: "/(app)/(tabs)/home" } },
  ]);
});

it("asks for no social data and shows no social sections when signed out", () => {
  mockAuth.isAuthenticated = false;
  const screen = render(<HomeScreen />);
  expect(screen.queryByText(/^feed /)).toBeNull();
  expect(mockFeedEnabled).toHaveBeenLastCalledWith(false);
  expect(mockSuggestionsEnabled).toHaveBeenLastCalledWith(false);
});
