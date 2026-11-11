import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { HomeScreenView } from "./HomeScreenView";
import { Image } from "expo-image";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";

jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/features/auth", () => ({ VinnotBrand: () => null }));
jest.mock("@/presentation/components/layout/FocusAwareStatusBar", () => ({ FocusAwareStatusBar: () => null }));
jest.mock("@/presentation/features/event", () => ({ EventCard: () => null }));
// A featured wine stands in as its review count, when one is wired.
jest.mock("@/presentation/features/wine", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    WineCard: ({ wine, onReviewsPress }: { wine: { id: string }; onReviewsPress?: () => void }) =>
      onReviewsPress ? <Text onPress={onReviewsPress}>{`count ${wine.id}`}</Text> : null,
  };
});
jest.mock("@/presentation/features/wineRoute", () => {
  const { Text } = jest.requireActual("react-native");
  return { WineRouteCard: () => <Text>route card</Text> };
});
jest.mock("@/presentation/features/social/HomeSocialSections", () => {
  const { Text } = jest.requireActual("react-native");
  return { HomeSocialSections: ({ feed }: { feed: unknown[] }) => <Text>{`social sections ${feed.length}`}</Text> };
});

function renderHome(
  featuredWines: { id: string }[] = [],
  social?: Record<string, unknown>,
  routes: { id: string }[] = [],
) {
  const handlers = {
    onRefresh: jest.fn(),
    onExploreWines: jest.fn(),
    onScanWine: jest.fn(),
    onCellar: jest.fn(),
    onRegister: jest.fn(),
    onWineTypePress: jest.fn(),
    onGrapePress: jest.fn(),
    onCtaPress: jest.fn(),
    onSeeAllWines: jest.fn(),
    onWinePress: jest.fn(),
    onSeeAllEvents: jest.fn(),
    onEventPress: jest.fn(),
    onSeeAllRoutes: jest.fn(),
    onRoutePress: jest.fn(),
    onWineReviewsPress: jest.fn(),
  };
  const screen = render(
    <HomeScreenView
      insetsTop={0}
      isAuthenticated
      winesLoading={false}
      featuredWines={featuredWines as never}
      eventsLoading={false}
      homeEvents={[]}
      routesLoading={false}
      routes={routes as never}
      refreshing={false}
      social={social as never}
      {...handlers}
    />,
  );
  return { screen, handlers };
}

describe("HomeScreenView feature cards", () => {
  it.each([
    ["home.featureDiscover", "onExploreWines"],
    ["home.featureScan", "onScanWine"],
    ["home.featureEvents", "onSeeAllEvents"],
    ["home.featureRoutes", "onSeeAllRoutes"],
  ] as const)("opens the section of %s", (label, handler) => {
    const { screen, handlers } = renderHome();
    fireEvent.press(screen.getByRole("button", { name: label }));
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
  });
});

describe("HomeScreenView popular grapes", () => {
  it("still filters the catalog by the tapped grape", () => {
    const { screen, handlers } = renderHome();
    fireEvent.press(screen.getByRole("button", { name: "Malbec" }));
    expect(handlers.onGrapePress).toHaveBeenCalledWith("Malbec");
  });
});

describe("HomeScreenView featured wines", () => {
  it("opens a featured wine's reviews from its review count", () => {
    const { screen, handlers } = renderHome([{ id: "wine-1" }]);
    fireEvent.press(screen.getByText("count wine-1"));
    expect(handlers.onWineReviewsPress).toHaveBeenCalledWith("wine-1");
    expect(handlers.onWinePress).not.toHaveBeenCalled();
  });
});

describe("HomeScreenView wine type images", () => {
  afterEach(() => jest.mocked(useReduceMotionEnabled).mockReturnValue(false));
  const fadingImages = (screen: ReturnType<typeof renderHome>["screen"]) =>
    screen.UNSAFE_getAllByType(Image).filter((image) => image.props.transition !== undefined);

  it("fades the wine type images in when Reduce Motion is off", () => {
    const images = fadingImages(renderHome().screen);
    expect(images.length).toBeGreaterThan(0);
    images.forEach((image) => expect(image.props.transition).toBe(180));
  });

  it("shows the wine type images at once under Reduce Motion", () => {
    jest.mocked(useReduceMotionEnabled).mockReturnValue(true);
    const images = fadingImages(renderHome().screen);
    expect(images.length).toBeGreaterThan(0);
    images.forEach((image) => expect(image.props.transition).toBe(0));
  });
});

describe("HomeScreenView social sections", () => {
  it("shows the social sections at the very end of Home, after the routes", () => {
    const { screen } = renderHome([], { feed: [{ id: "r-1" }], suggestions: [] }, [{ id: "route-1" }]);
    const texts = screen
      .UNSAFE_getAllByType(Text)
      .map((node) => node.props.children)
      .filter((child): child is string => typeof child === "string");
    expect(texts.indexOf("route card")).toBeGreaterThan(-1);
    expect(texts.indexOf("social sections 1")).toBeGreaterThan(texts.indexOf("route card"));
  });

  it("leaves them out without social data, as for a signed-out visitor", () => {
    const { screen } = renderHome();
    expect(screen.queryByText(/social sections/)).toBeNull();
  });
});
