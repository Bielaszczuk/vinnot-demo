import { fireEvent, render } from "@testing-library/react-native";
import { AdminDashboardScreen } from "./AdminDashboardScreen";

const mockPush = jest.fn();
let mockIsAdmin = true;

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es" } }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("@/presentation/features/community/CommunityOverview", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return { ModerationShortcuts: () => <Text>moderation-workload-panel</Text> };
});
jest.mock("./AdminPageHero", () => ({ AdminPageHero: () => null }));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminStats: () => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ hasRole: (role: string) => (role === "ROLE_ADMIN" ? mockIsAdmin : true) }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAdmin = true;
});

it("offers the notifications section to administrators", () => {
  const view = render(<AdminDashboardScreen />);

  fireEvent.press(view.getByText("admin.actions.manageNotifications"));

  expect(view.getByText("admin.actions.manageNotificationsDesc")).toBeTruthy();
  expect(mockPush).toHaveBeenCalledWith("/(app)/admin/notifications");
});

it("hides the administrator-only sections from moderators", () => {
  mockIsAdmin = false;
  const view = render(<AdminDashboardScreen />);

  expect(view.queryByText("admin.actions.manageNotifications")).toBeNull();
  expect(view.queryByText("admin.actions.manageUsers")).toBeNull();
  expect(view.getByText("admin.actions.moderateReviews")).toBeTruthy();
});

it("offers the social posts module to administrators only", () => {
  const view = render(<AdminDashboardScreen />);

  fireEvent.press(view.getByText("admin.actions.manageSocialPosts"));

  expect(view.getByText("admin.actions.manageSocialPostsDesc")).toBeTruthy();
  expect(mockPush).toHaveBeenCalledWith("/(app)/admin/social-posts");

  mockIsAdmin = false;
  view.rerender(<AdminDashboardScreen />);
  expect(view.queryByText("admin.actions.manageSocialPosts")).toBeNull();
});

it("opens the moderation workload from a quick action instead of showing it at the top", () => {
  for (const admin of [true, false]) {
    mockIsAdmin = admin;
    mockPush.mockClear();
    const view = render(<AdminDashboardScreen />);

    expect(view.queryByText("moderation-workload-panel")).toBeNull();
    fireEvent.press(view.getByText("admin.actions.moderation"));
    expect(view.getByText("admin.actions.moderationDesc")).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith("/(app)/admin/community");
    view.unmount();
  }
});
