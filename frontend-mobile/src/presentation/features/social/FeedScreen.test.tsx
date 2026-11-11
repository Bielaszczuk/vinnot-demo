import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { FlatList } from "react-native";
import FeedRoute from "../../../../app/(app)/feed";

type Request = { key: string; params?: Record<string, unknown> };
const mockPush = jest.fn();
const mockRequests: Request[] = [];
let mockEmpty = false;

const mockReview = (id: string) => ({
  id,
  rating: 4,
  title: `Title ${id}`,
  comment: null,
  vintage: null,
  createdAt: new Date("2026-11-01"),
  reviewer: { id: `author-${id}`, username: "bruno", displayName: `Author ${id}`, avatarUrl: null, tier: null },
  wine: { id: `wine-${id}`, name: `Wine ${id}`, imageUrl: null, type: "red", wineryName: null },
});
// Stable page objects, as RTK Query keeps them until the data changes.
const mockPages = [
  { items: [mockReview("r-1"), mockReview("r-2")], page: 0, totalItems: 3, totalPages: 2, hasMore: true },
  { items: [mockReview("r-3")], page: 1, totalItems: 3, totalPages: 2, hasMore: false },
];
const mockEmptyPage = { items: [], page: 0, totalItems: 0, totalPages: 0, hasMore: false };

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => (options?.name ? `${key}:${options.name}` : key),
    i18n: { language: "es-AR" },
  }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
jest.mock("@/presentation/components/layout", () => {
  const { Text } = jest.requireActual("react-native");
  return { AppHeader: ({ title }: { title: string }) => <Text>{title}</Text> };
});
jest.mock("@/presentation/features/points/NameBadge", () => ({ NameBadge: () => null }));
jest.mock("@/presentation/store/api", () => {
  const { skipToken } = jest.requireActual("@reduxjs/toolkit/query");
  return {
    useTypedQuery: (request: Request | symbol) => {
      const idle = { data: undefined, isLoading: false, isFetching: false, isError: false, refetch: jest.fn() };
      if (request === skipToken) return idle;
      mockRequests.push(request as Request);
      const page = Number((request as Request).params?.page ?? 0);
      return { ...idle, data: mockEmpty ? mockEmptyPage : mockPages[page] };
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRequests.length = 0;
  mockEmpty = false;
});

it("pages the reviews of the people the user follows", () => {
  render(<FeedRoute />);
  expect(screen.getByText("social.feedTitle")).toBeTruthy();
  expect(mockRequests[0]).toEqual({ key: "social.feed", params: { page: 0 } });
  expect(screen.getByText("Wine r-1")).toBeTruthy();
  expect(screen.queryByText("Wine r-3")).toBeNull();
  act(() => screen.UNSAFE_getByType(FlatList).props.onEndReached());
  expect(mockRequests.at(-1)).toEqual({ key: "social.feed", params: { page: 1 } });
  expect(screen.getByText("Wine r-1")).toBeTruthy();
  expect(screen.getByText("Wine r-3")).toBeTruthy();
});

it("opens the author's profile and the reviewed wine", () => {
  render(<FeedRoute />);
  fireEvent.press(screen.getByLabelText("social.openProfileA11y:Author r-1"));
  fireEvent.press(screen.getByLabelText("Wine r-2"));
  expect(mockPush.mock.calls.map((call) => call[0])).toEqual([
    { pathname: "/(app)/users/[id]", params: { id: "author-r-1" } },
    { pathname: "/(app)/(tabs)/wines/[id]", params: { id: "wine-r-2" } },
  ]);
});

it("explains the empty feed", () => {
  mockEmpty = true;
  render(<FeedRoute />);
  expect(screen.getByText("social.feedEmptyTitle")).toBeTruthy();
});

it("shows each author's @username under their name", () => {
  render(<FeedRoute />);
  expect(screen.getByText("Author r-1")).toBeTruthy();
  expect(screen.getAllByText("@bruno")).toHaveLength(2);
});
