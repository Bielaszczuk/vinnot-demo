import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { HomeEventsSection, HomeFeaturedWinesSection, HomeRoutesSection } from "./HomeScreenView.parts";
import type { WineSummary } from "@/domain/wine/wine.types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es-AR" } }),
}));
jest.mock("@/presentation/features/event", () => ({ EventCard: () => null }));
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
jest.mock("@/presentation/features/wineRoute", () => ({ WineRouteCard: () => null }));
jest.mock("@/presentation/components/ui/QueryErrorState", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    QueryErrorState: ({ onRetry }: { onRetry: () => void }) => (
      <Pressable onPress={onRetry}><Text>Retry</Text></Pressable>
    ),
  };
});

const common = { title: "T", actionLabel: "All", onSeeAll: jest.fn() };

it("shows a retry instead of an empty events section when nearby events fail", () => {
  const onRetry = jest.fn();
  const view = render(<HomeEventsSection {...common} eventsLoading={false} homeEvents={[]}
    error={{ code: "NETWORK_ERROR" }} onRetry={onRetry} onEventPress={jest.fn()} />);
  expect(view.queryByText("home.events.emptyTitle")).toBeNull();
  fireEvent.press(view.getByText("Retry"));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it("keeps the empty events message when there is simply nothing nearby", () => {
  const view = render(<HomeEventsSection {...common} eventsLoading={false} homeEvents={[]} onEventPress={jest.fn()} />);
  expect(view.getByText("home.events.emptyTitle")).toBeTruthy();
  expect(view.queryByText("Retry")).toBeNull();
});

it("shows a retry when wine routes fail to load", () => {
  const onRetry = jest.fn();
  const view = render(<HomeRoutesSection {...common} routesLoading={false} routes={[]}
    error={{ status: 500 }} onRetry={onRetry} onRoutePress={jest.fn()} />);
  fireEvent.press(view.getByText("Retry"));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

describe("featured wines", () => {
  const wines = [{ id: "wine-1" }] as WineSummary[];

  it("opens the wine from its card and its reviews from the review count", () => {
    const onWinePress = jest.fn();
    const onWineReviewsPress = jest.fn();
    const view = render(<HomeFeaturedWinesSection {...common} winesLoading={false} featuredWines={wines}
      onWinePress={onWinePress} onWineReviewsPress={onWineReviewsPress} />);

    fireEvent.press(view.getByText("count wine-1"));
    expect(onWineReviewsPress).toHaveBeenCalledWith("wine-1");
    expect(onWinePress).not.toHaveBeenCalled();
    fireEvent.press(view.getByText("card wine-1"));
    expect(onWinePress).toHaveBeenCalledWith("wine-1");
  });

  it("leaves the review count plain when no reviews handler is given", () => {
    const view = render(<HomeFeaturedWinesSection {...common} winesLoading={false} featuredWines={wines}
      onWinePress={jest.fn()} />);
    expect(view.queryByText("count wine-1")).toBeNull();
  });
});
