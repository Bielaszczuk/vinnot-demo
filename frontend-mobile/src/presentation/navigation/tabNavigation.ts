import type { CommonNavigationAction, NavigationState } from "expo-router";

export const TAB_NAMES = ["home", "wines", "events", "routes", "profile"] as const;
export type MainTab = (typeof TAB_NAMES)[number];
type TabNavigation = {
  getState(): NavigationState;
  dispatch(action: CommonNavigationAction): void;
  navigate(name: MainTab): void;
};

/** Reset only the selected tab's nested stack; retain the root list and its filters. */
export function openTabRoot(navigation: TabNavigation, tab: MainTab): void {
  const stack = navigation.getState().routes.find((route) => route.name === tab)?.state;
  // Only a rendered stack (complete state, stale: false) can be reset; the router ignores partial payloads.
  if (stack?.stale === false && stack.type === "stack") {
    const existingRoot = stack.routes.find((route) => route.name === "index");
    const root = { name: "index", key: existingRoot?.key, params: existingRoot?.params };
    navigation.dispatch({
      type: "RESET",
      payload: { ...stack, history: undefined, index: 0, routes: [root] },
      target: stack.key,
    });
  }
  navigation.navigate(tab);
}
