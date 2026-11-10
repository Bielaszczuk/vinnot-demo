import { fireEvent, render } from "@testing-library/react-native";
import { WineryWineGrid } from "./WineryWineGrid";
import type { WineSummary } from "@/domain/wine/wine.types";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/wineries/winery-1",
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
// The card stands in as its body and, when wired, its review count.
jest.mock("@/presentation/features/wine", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    WineCard: ({ wine, onPress, onReviewsPress }: { wine: { id: string }; onPress: () => void; onReviewsPress?: () => void }) => (
      <>
        <Text onPress={onPress}>{`card ${wine.id}`}</Text>
        {onReviewsPress ? <Text onPress={onReviewsPress}>{`count ${wine.id}`}</Text> : null}
      </>
    ),
  };
});

const wines = [{ id: "wine-1" }] as WineSummary[];

beforeEach(() => jest.clearAllMocks());

it("opens a winery wine on its information tab, coming back to the winery", () => {
  const view = render(<WineryWineGrid wines={wines} />);
  fireEvent.press(view.getByText("card wine-1"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(app)/(tabs)/wines/[id]",
    params: { id: "wine-1", returnTo: "/wineries/winery-1" },
  });
});

it("opens a winery wine straight on its reviews from the review count", () => {
  const view = render(<WineryWineGrid wines={wines} />);
  fireEvent.press(view.getByText("count wine-1"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(app)/(tabs)/wines/[id]",
    params: { id: "wine-1", returnTo: "/wineries/winery-1", tab: "reviews" },
  });
});
