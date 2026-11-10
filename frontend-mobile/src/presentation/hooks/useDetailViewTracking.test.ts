import { renderHook } from "@testing-library/react-native";
import { activityService } from "@/application/services/activity.service";
import { useDetailViewTracking } from "./useDetailViewTracking";

const fixture = { auth: { user: null as { id: string } | null, accessToken: null as string | null } };

jest.mock("@/presentation/store/auth.store", () => ({
  useAuthStore: (selector: (state: typeof fixture.auth) => unknown) => selector(fixture.auth),
}));
jest.mock("@/application/services/activity.service", () => ({
  activityService: { recordView: jest.fn() },
}));

const activity = activityService as jest.Mocked<typeof activityService>;

beforeEach(() => {
  jest.clearAllMocks();
  fixture.auth = { user: { id: "u1" }, accessToken: "access" };
});

it("records one view per detail screen mount of a signed-in member", () => {
  const view = renderHook(({ id }) => useDetailViewTracking("WINE", id), { initialProps: { id: "w1" as string | undefined } });
  view.rerender({ id: "w1" });
  view.rerender({ id: "w1" });

  expect(activity.recordView).toHaveBeenCalledTimes(1);
  expect(activity.recordView).toHaveBeenCalledWith("WINE", "w1");

  view.rerender({ id: "w2" });
  expect(activity.recordView).toHaveBeenLastCalledWith("WINE", "w2");
});

it("records nothing without an id or while signed out", () => {
  renderHook(() => useDetailViewTracking("EVENT", undefined));
  fixture.auth = { user: null, accessToken: null };
  renderHook(() => useDetailViewTracking("EVENT", "e1"));

  expect(activity.recordView).not.toHaveBeenCalled();
});
