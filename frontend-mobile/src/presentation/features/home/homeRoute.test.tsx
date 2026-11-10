import { fireEvent, render } from "@testing-library/react-native";
import HomeScreen from "../../../../app/(app)/(tabs)/home";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, navigate: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
jest.mock("@/presentation/hooks/ui", () => ({
  useGeolocation: () => ({ latitude: undefined, longitude: undefined }),
  useHaptics: () => ({ selection: jest.fn() }),
}));
const mockIdleQuery = { isLoading: false, isFetching: false, isError: false, data: undefined, refetch: jest.fn() };
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({ useWineHighlights: () => mockIdleQuery }));
jest.mock("@/presentation/hooks/queries/event", () => ({ useNearbyEvents: () => mockIdleQuery }));
jest.mock("@/presentation/hooks/queries/wineRoute", () => ({ useWineRoutes: () => mockIdleQuery }));
// The view stands in as a featured wine's card body and its review count.
jest.mock("@/presentation/features/home", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    HomeScreenView: ({ onWinePress, onWineReviewsPress }: {
      onWinePress: (id: string) => void; onWineReviewsPress?: (id: string) => void;
    }) => (
      <>
        <Text onPress={() => onWinePress("wine-1")}>card wine-1</Text>
        <Text onPress={() => onWineReviewsPress?.("wine-1")}>count wine-1</Text>
      </>
    ),
  };
});

beforeEach(() => jest.clearAllMocks());

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
