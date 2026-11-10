import { render } from "@testing-library/react-native";
import { StackRouter } from "expo-router";
import TabsLayout from "../../../app/(app)/(tabs)/_layout";
import { openTabRoot, TAB_NAMES } from "./tabNavigation";
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  dispatch: mockDispatch,
  getState: () => ({ routes: [] }),
};
let mockListeners: (context: { route: { name: string }; navigation: typeof mockNavigation }) => {
  tabPress: (event: { preventDefault: () => void }) => void;
};
jest.mock("expo-router", () => {
  const Tabs = ({ screenListeners }: { screenListeners: typeof mockListeners }) => {
    mockListeners = screenListeners;
    return null;
  };
  Tabs.Screen = () => null;
  return { Tabs, StackRouter: jest.requireActual<typeof import("expo-router")>("expo-router").StackRouter };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34 }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => jest.clearAllMocks());
it.each(TAB_NAMES)("tab %s selects its own root instead of restoring arbitrary detail", (tab) => {
  render(<TabsLayout />);
  const preventDefault = jest.fn();
  mockListeners({ route: { name: tab }, navigation: mockNavigation }).tabPress({ preventDefault });
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith(tab);
  expect(mockDispatch).not.toHaveBeenCalled();
});
const routeNames = ["index", "[id]"];
const routerOptions = { routeNames, routeGetIdList: {} };
type StackRoute = { name: string; key: string; params?: object };
const stackState = (routes: StackRoute[]) => ({
  key: "stack-key", type: "stack" as const, stale: false as const, routeKeySeq: routes.length,
  index: routes.length - 1, routeNames, routes,
});
const tabState = (tab: string, state: ReturnType<typeof stackState>) => ({
  key: "tabs-key", type: "tab", stale: false as const, routeKeySeq: 1, index: 0, routeNames: [tab],
  routes: [{ name: tab, key: tab, state }],
});
it.each(["wines", "events", "routes"] as const)(
  "clears nested %s details and duplicate roots without touching other tabs",
  (tab) => {
    const router = StackRouter({ initialRouteName: "index" });
    const root = { name: "index", key: "list-root", params: { search: "retained" } };
    const state = stackState([root, { name: "[id]", key: "detail" }, { name: "index", key: "duplicate" }]);
    openTabRoot({ getState: () => tabState(tab, state), navigate: mockNavigate, dispatch: mockDispatch }, tab);
    const action = mockDispatch.mock.calls[0][0];
    expect(action.target).toBe(state.key);
    const result = router.getStateForAction(state, action, routerOptions);
    if (!result || typeof result !== "object") throw new Error("RESET was not handled");
    expect(result.state.routes).toEqual([root]);
    expect(result.state.index).toBe(0);
    expect(mockNavigate).toHaveBeenCalledWith(tab);
  },
);
it("creates a list root when a direct ticket/deep link opened only a detail", () => {
  const router = StackRouter({ initialRouteName: "index" });
  const state = stackState([{ name: "[id]", key: "detail" }]);
  openTabRoot({ getState: () => tabState("events", state), navigate: mockNavigate, dispatch: mockDispatch }, "events");
  const result = router.getStateForAction(state, mockDispatch.mock.calls[0][0], routerOptions);
  if (!result || typeof result !== "object") throw new Error("RESET was not handled");
  expect(result.state.routes).toEqual([{ name: "index", key: expect.any(String), params: undefined }]);
});
it("only switches tabs while the tab stack is still a partial (unrendered) state", () => {
  const partial = { routes: [{ name: "[id]" }], type: "stack" };
  openTabRoot({
    getState: () => ({ ...tabState("wines", stackState([])), routes: [{ name: "wines", key: "wines", state: partial }] }),
    navigate: mockNavigate,
    dispatch: mockDispatch,
  }, "wines");
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith("wines");
});
