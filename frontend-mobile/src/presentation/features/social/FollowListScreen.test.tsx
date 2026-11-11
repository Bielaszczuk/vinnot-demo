import { fireEvent, render, screen } from "@testing-library/react-native";
import FollowersRoute from "../../../../app/(app)/users/[id]/followers";
import FollowingRoute from "../../../../app/(app)/users/[id]/following";

type Request = { key: string; params?: Record<string, unknown> };
const mockPush = jest.fn();
const mockMutate = jest.fn();
const mockRequests: Request[] = [];
const mockRow = (id: string, following: boolean) => ({
  id,
  username: id,
  displayName: `Name ${id}`,
  avatarUrl: null,
  tier: null,
  following,
});
const mockFollowersPage = {
  items: [mockRow("viewer", false), mockRow("u-2", false), mockRow("u-3", true)],
  page: 0,
  totalItems: 3,
  totalPages: 1,
  hasMore: false,
};
const mockEmptyPage = { items: [], page: 0, totalItems: 0, totalPages: 0, hasMore: false };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "u-1" }),
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => (options?.name ? `${key}:${options.name}` : key),
    i18n: { language: "es-AR" },
  }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "viewer" } }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({ useToast: () => ({ showError: jest.fn() }) }));
jest.mock("@/presentation/components/layout", () => {
  const { Text } = jest.requireActual("react-native");
  return { AppHeader: ({ title }: { title: string }) => <Text>{title}</Text> };
});
jest.mock("@/presentation/features/points/NameBadge", () => ({ NameBadge: () => null }));
jest.mock("@/presentation/store/mutationAdapter", () => ({
  useOperationMutation: (factory: (arg: unknown) => Request) => ({
    mutate: (arg: unknown) => mockMutate(factory(arg)),
    isPending: false,
  }),
}));
jest.mock("@/presentation/store/api", () => {
  const { skipToken } = jest.requireActual("@reduxjs/toolkit/query");
  return {
    useTypedQuery: (request: Request | symbol) => {
      const idle = { data: undefined, isLoading: false, isFetching: false, isError: false, refetch: jest.fn() };
      if (request === skipToken) return idle;
      mockRequests.push(request as Request);
      const { key } = request as Request;
      return { ...idle, data: key === "social.followers" ? mockFollowersPage : mockEmptyPage };
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRequests.length = 0;
});

it("lists the followers with a Follow button on every row but the viewer's own", () => {
  render(<FollowersRoute />);
  expect(screen.getByText("social.followersTitle")).toBeTruthy();
  expect(mockRequests).toContainEqual({ key: "social.followers", params: { userId: "u-1", page: 0 } });
  expect(screen.getByText("Name u-2")).toBeTruthy();
  expect(screen.getAllByTestId("follow-button")).toHaveLength(2);
  fireEvent.press(screen.getByText("social.follow"));
  expect(mockMutate).toHaveBeenCalledWith({ key: "social.follow", params: { userId: "u-2" } });
  // The row flips at once, so both rows now read Following.
  expect(screen.getAllByText("social.following")).toHaveLength(2);
  fireEvent.press(screen.getByLabelText("social.unfollowA11y:Name u-3"));
  expect(mockMutate).toHaveBeenCalledWith({ key: "social.unfollow", params: { userId: "u-3" } });
});

it("opens a person's profile from their row", () => {
  render(<FollowersRoute />);
  fireEvent.press(screen.getByLabelText("social.openProfileA11y:Name u-2"));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(app)/users/[id]", params: { id: "u-2" } });
});

it("lists who the user follows, with an empty state", () => {
  render(<FollowingRoute />);
  expect(screen.getByText("social.followingTitle")).toBeTruthy();
  expect(mockRequests).toContainEqual({ key: "social.following", params: { userId: "u-1", page: 0 } });
  expect(mockRequests.some((request) => request.key === "social.followers")).toBe(false);
  expect(screen.getByText("social.followingEmpty")).toBeTruthy();
});
