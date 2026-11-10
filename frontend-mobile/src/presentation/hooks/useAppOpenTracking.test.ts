import { act, renderHook } from "@testing-library/react-native";
import { activityService } from "@/application/services/activity.service";
import { useAppOpenTracking } from "./useAppOpenTracking";

const fixture = { auth: { user: null as { id: string } | null, accessToken: null as string | null } };
let mockFocus: () => void = () => undefined;
const mockUnsubscribe = jest.fn();

jest.mock("@/presentation/store/auth.store", () => ({
  useAuthStore: (selector: (state: typeof fixture.auth) => unknown) => selector(fixture.auth),
}));
jest.mock("@/application/services/activity.service", () => ({
  activityService: { recordAppOpen: jest.fn(), forgetAppOpen: jest.fn() },
}));
jest.mock("@/application/services/applicationLifecycle.service", () => ({
  applicationLifecycleService: {
    subscribe: (handlers: { onFocus: () => void; onFocusLost: () => void }) => {
      mockFocus = handlers.onFocus;
      handlers.onFocusLost();
      return mockUnsubscribe;
    },
  },
}));

const activity = activityService as jest.Mocked<typeof activityService>;

beforeEach(() => {
  jest.clearAllMocks();
  fixture.auth = { user: null, accessToken: null };
  mockFocus = () => undefined;
});

it("records nothing while signed out", () => {
  renderHook(useAppOpenTracking);
  act(() => mockFocus());

  expect(activity.recordAppOpen).not.toHaveBeenCalled();
  expect(activity.forgetAppOpen).toHaveBeenCalled();
});

it("records the cold start of a signed-in member and every return to the foreground (the service throttles)", () => {
  fixture.auth = { user: { id: "u1" }, accessToken: "access" };
  renderHook(useAppOpenTracking);
  expect(activity.recordAppOpen).toHaveBeenCalledTimes(1);

  act(() => mockFocus());
  act(() => mockFocus());
  expect(activity.recordAppOpen).toHaveBeenCalledTimes(3);
});

it("stops listening and forgets the last open on sign-out", () => {
  fixture.auth = { user: { id: "u1" }, accessToken: "access" };
  const view = renderHook(useAppOpenTracking);

  fixture.auth = { user: null, accessToken: null };
  view.rerender({});

  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  expect(activity.forgetAppOpen).toHaveBeenCalledTimes(1);
});
