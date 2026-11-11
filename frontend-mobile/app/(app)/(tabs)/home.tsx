/**
 * Home tab container.
 * Orchestrates queries and navigation, delegating UI rendering to feature view.
 */
import {
  CELLAR_ROUTE,
  FEED_ROUTE,
  WINE_ROUTES_ROUTE,
  createUserProfileRoute,
  createWineRouteDetailRoute,
} from "@/presentation/navigation/discoveryNavigation";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useWineHighlights } from "@/presentation/hooks/queries/wine/useWines";
import { useNearbyEvents } from "@/presentation/hooks/queries/event";
import { useWineRoutes } from "@/presentation/hooks/queries/wineRoute";
import { useGeolocation, useHaptics } from "@/presentation/hooks/ui";
import { HomeScreenView } from "@/presentation/features/home";
import { useHomeSocial } from "@/presentation/features/social/useHomeSocial";
import {
  EVENT_DISCOVERY_RADIUS_KM,
  HOME_EVENT_PREVIEW_LIMIT,
} from "@/presentation/features/event/eventDiscoveryConfig";
import {
  createWineDetailRoute,
  createWineScanRoute,
  HOME_ROUTE,
} from "@/presentation/navigation/wineNavigation";

type WineTypeKey = "red" | "white" | "rose" | "sparkling";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { isAuthenticated } = useAuth();
  const geo = useGeolocation();

  const hasLocation = typeof geo.latitude === "number" && typeof geo.longitude === "number";

  const winesQuery = useWineHighlights(4);
  const nearbyEventsQuery = useNearbyEvents(
    {
      latitude: geo.latitude ?? 0,
      longitude: geo.longitude ?? 0,
      radiusKm: EVENT_DISCOVERY_RADIUS_KM,
    },
    hasLocation,
  );
  const routesQuery = useWineRoutes(undefined, 0, 3);
  const social = useHomeSocial(isAuthenticated);

  const homeEvents = hasLocation
    ? (nearbyEventsQuery.data?.events ?? []).slice(0, HOME_EVENT_PREVIEW_LIMIT)
    : [];
  const isEventsLoading = hasLocation && nearbyEventsQuery.isLoading && !nearbyEventsQuery.data;
  const isRefreshing =
    winesQuery.isFetching ||
    nearbyEventsQuery.isFetching ||
    routesQuery.isFetching ||
    !!social?.isFetching;

  const refreshHome = () => {
    void Promise.all([
      winesQuery.refetch(),
      routesQuery.refetch(),
      ...(hasLocation ? [nearbyEventsQuery.refetch()] : []),
    ]);
    social?.refresh();
  };

  const tap = (cb: () => void) => {
    haptics.selection();
    cb();
  };

  const goToType = (type: WineTypeKey) => {
    tap(() => router.push(`/(app)/(tabs)/wines?type=${type}` as Href));
  };

  const goToGrape = (grape: string) => {
    tap(() => router.push(`/(app)/(tabs)/wines?grape=${encodeURIComponent(grape)}` as Href));
  };

  return (
    <HomeScreenView
      insetsTop={insets.top}
      isAuthenticated={isAuthenticated}
      winesLoading={winesQuery.isLoading}
      winesError={winesQuery.isError ? winesQuery.error : undefined}
      onRetryWines={() => void winesQuery.refetch()}
      eventsError={hasLocation && nearbyEventsQuery.isError ? nearbyEventsQuery.error ?? {} : undefined}
      onRetryEvents={() => void nearbyEventsQuery.refetch()}
      routesError={routesQuery.isError ? routesQuery.error ?? {} : undefined}
      onRetryRoutes={() => void routesQuery.refetch()}
      featuredWines={winesQuery.data ?? []}
      eventsLoading={isEventsLoading}
      homeEvents={homeEvents}
      routesLoading={routesQuery.isLoading}
      routes={routesQuery.data?.routes ?? []}
      refreshing={isRefreshing}
      onRefresh={refreshHome}
      onExploreWines={() => tap(() => router.push("/(app)/(tabs)/wines"))}
      onScanWine={() => tap(() => router.push(createWineScanRoute(HOME_ROUTE)))}
      onCellar={() => tap(() => router.push(CELLAR_ROUTE))}
      onRegister={() => tap(() => router.push("/(auth)/register" as Href))}
      onWineTypePress={goToType}
      onGrapePress={goToGrape}
      onCtaPress={() =>
        tap(() => {
          if (isAuthenticated) {
            router.push("/(app)/(tabs)/wines");
          } else {
            router.push("/(auth)/register" as Href);
          }
        })
      }
      onSeeAllWines={() => router.push("/(app)/(tabs)/wines")}
      onWinePress={(id) => router.push(createWineDetailRoute(id, "/(app)/(tabs)/home"))}
      onWineReviewsPress={(id) =>
        router.push(createWineDetailRoute(id, "/(app)/(tabs)/home", { tab: "reviews" }))
      }
      onSeeAllEvents={() => router.push("/(app)/(tabs)/events")}
      onEventPress={(id) => router.push(`/(app)/(tabs)/events/${id}`)}
      onSeeAllRoutes={() => router.navigate(WINE_ROUTES_ROUTE)}
      onRoutePress={(id) => router.push(createWineRouteDetailRoute(id, "home"))}
      social={
        social && {
          feed: social.feed,
          feedLoading: social.feedLoading,
          feedError: social.feedError,
          onRetryFeed: social.onRetryFeed,
          suggestions: social.suggestions,
          suggestionsLoading: social.suggestionsLoading,
          onSeeAllFeed: () => tap(() => router.push(FEED_ROUTE)),
          onUserPress: (id) => router.push(createUserProfileRoute(id)),
          onWinePress: (id) => router.push(createWineDetailRoute(id, "/(app)/(tabs)/home")),
        }
      }
    />
  );
}
