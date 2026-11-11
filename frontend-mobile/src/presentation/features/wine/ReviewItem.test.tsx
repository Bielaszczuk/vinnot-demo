import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, StyleSheet } from "react-native";
import { ReviewItem } from "./ReviewItem";
import type { WineReview } from "@/domain/wine/wine.types";
const mockAuth = { user: { id: "reader" }, roles: [] as string[] };
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockAuth.user,
    hasAnyRole: (roles: string[]) => roles.some((role) => mockAuth.roles.includes(role)),
  }),
}));
type Callbacks = { onSuccess?: () => void; onError?: () => void };
const mockDelete = jest.fn<void, [unknown, Callbacks]>();
const mockLike = jest.fn<void, [unknown, Callbacks]>();
const mockPending = { like: false, remove: false };
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useDeleteWineReview: () => ({ mutate: mockDelete, isPending: mockPending.remove }),
  useToggleReviewLike: () => ({ mutate: mockLike, isPending: mockPending.like }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));
jest.mock("../community/CommunityActions", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    CommunityActions: (props: { variant?: string; targetType: string; targetId: string; authorId?: string }) => (
      <Text testID="community-actions">{`${props.variant}:${props.targetType}:${props.targetId}:${props.authorId}`}</Text>
    ),
  };
});
jest.mock("../community/PublicationStatus", () => ({ PublicationStatus: () => null }));
jest.mock("./ReviewComments", () => ({ ReviewComments: () => null }));
jest.mock("@/presentation/components/ui/Atoms", () => ({
  ...jest.requireActual("@/presentation/components/ui/Atoms"),
  Avatar: () => null,
  RatingGlasses: () => null,
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { year?: number; count?: number }) =>
      options?.year ? `${key}:${options.year}` : options?.count !== undefined ? `${key}:${options.count}` : key,
  }),
}));
const review = {
  id: "review",
  userId: "author",
  userName: "Author",
  rating: 4,
  createdAt: new Date("2026-10-01"),
  likesCount: 0,
  commentsCount: 0,
} as WineReview;
it.each([
  ["ROLE_MODERATOR", "reader", false, true],
  ["ROLE_ADMIN", "reader", true, true],
  ["ROLE_USER", "reader", false, false],
  ["ROLE_MODERATOR", "author", true, true],
  ["ROLE_USER", "author", true, true],
])("renders only permitted actions for %s as %s", (role, id, edit, remove) => {
  mockAuth.user = { id };
  mockAuth.roles = [role];
  const onEdit = jest.fn();
  render(<ReviewItem wineId="wine" review={review} onToggleComments={jest.fn()} onEdit={onEdit} />);
  expect(!!screen.queryByText("common.edit")).toBe(edit);
  expect(!!screen.queryByLabelText("wines.deleteReview")).toBe(remove);
  if (edit) {
    fireEvent.press(screen.getByText("common.edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  }
});
it("shows the tasted vintage as a pill when the review has one", () => {
  render(<ReviewItem wineId="wine" review={{ ...review, vintage: 2018 }} onToggleComments={jest.fn()} onEdit={jest.fn()} />);
  expect(screen.getByText("vintage.pill:2018")).toBeTruthy();
});
it("shows no vintage pill when the review has none", () => {
  render(<ReviewItem wineId="wine" review={{ ...review, vintage: null }} onToggleComments={jest.fn()} onEdit={jest.fn()} />);
  expect(screen.queryByText(/vintage\.pill/)).toBeNull();
  expect(screen.getByText("Author")).toBeTruthy();
});
it("offers community actions from a three-dots menu in the review header", () => {
  mockAuth.user = { id: "reader" };
  mockAuth.roles = ["ROLE_USER"];
  render(<ReviewItem wineId="wine" review={review} onToggleComments={jest.fn()} onEdit={jest.fn()} />);
  const actions = screen.getAllByTestId("community-actions");
  expect(actions).toHaveLength(1);
  expect(actions[0]!.props.children).toBe("menu:REVIEW:review:author");
});

describe("review feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPending.like = false;
    mockPending.remove = false;
    mockAuth.user = { id: "author" };
    mockAuth.roles = ["ROLE_USER"];
  });
  const renderReview = (overrides: Partial<WineReview> = {}) =>
    render(<ReviewItem wineId="wine" review={{ ...review, likesCount: 3, commentsCount: 2, ...overrides }}
      onToggleComments={jest.fn()} onEdit={jest.fn()} />);
  const confirmDeletion = () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    fireEvent.press(screen.getByLabelText("wines.deleteReview"));
    alert.mock.calls[0]![2]![1]!.onPress?.();
    alert.mockRestore();
  };

  it("confirms a deleted review and explains a failed deletion", () => {
    renderReview();
    confirmDeletion();
    mockDelete.mock.calls[0]![1].onSuccess?.();
    expect(mockShowSuccess).toHaveBeenCalledWith("reviews.deleted");
    mockDelete.mock.calls[0]![1].onError?.();
    expect(mockShowError).toHaveBeenCalledWith("reviews.errorDelete");
  });

  it("disables deleting while the deletion is pending", () => {
    mockPending.remove = true;
    renderReview();
    expect(screen.getByLabelText("wines.deleteReview").props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("labels the like and comment toggles with their count and state", () => {
    renderReview({ likedByCurrentUser: true });
    const like = screen.getByRole("button", { name: "reviews.likeLabel:3" });
    expect(like.props.accessibilityState).toMatchObject({ selected: true });
    expect(StyleSheet.flatten(like.props.style)).toMatchObject({ minHeight: 44, minWidth: 44 });
    expect(screen.getByRole("button", { name: "reviews.commentsLabel:2" })).toBeTruthy();
  });

  it("does not toggle twice while a like is saving, and explains a failed like", () => {
    mockPending.like = true;
    const pending = renderReview();
    const like = screen.getByRole("button", { name: "reviews.likeLabel:3" });
    expect(like.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(like);
    expect(mockLike).not.toHaveBeenCalled();
    pending.unmount();

    mockPending.like = false;
    renderReview();
    fireEvent.press(screen.getByRole("button", { name: "reviews.likeLabel:3" }));
    expect(mockLike).toHaveBeenCalledWith({ wineId: "wine", reviewId: "review", liked: undefined }, expect.any(Object));
    mockLike.mock.calls[0]![1].onError?.();
    expect(mockShowError).toHaveBeenCalledWith("reviews.errorLike");
  });
});
it("shows the reviewer's seal after the name and keeps the name when there is none", () => {
  const { rerender } = render(<ReviewItem wineId="wine" review={{ ...review,
    reviewer: { id: "author", username: "a", displayName: "Author", avatarUrl: null, totalReviews: 1, badgeTier: "VENDIMIA" } }}
    onToggleComments={jest.fn()} onEdit={jest.fn()} />);
  expect(screen.getByRole("button", { name: "points.badgeLabel" })).toBeTruthy();
  rerender(<ReviewItem wineId="wine" review={review} onToggleComments={jest.fn()} onEdit={jest.fn()} />);
  expect(screen.queryByRole("button", { name: "points.badgeLabel" })).toBeNull();
  expect(screen.getByText("Author")).toBeTruthy();
});

it("opens the author's public profile from the avatar and the name", () => {
  mockAuth.user = { id: "reader" };
  mockAuth.roles = [];
  mockPush.mockClear();
  render(<ReviewItem wineId="wine" review={review} onToggleComments={jest.fn()} onEdit={jest.fn()} />);
  fireEvent.press(screen.getByLabelText("social.openProfileA11y"));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/(app)/users/[id]", params: { id: "author" } });
});
it("shows the reviewer's @username under their name", () => {
  render(
    <ReviewItem
      wineId="wine"
      review={{ ...review, reviewer: { id: "author", username: "author_handle", displayName: "Author", avatarUrl: null, totalReviews: 3, badgeTier: null } }}
      onToggleComments={jest.fn()}
      onEdit={jest.fn()}
    />,
  );
  expect(screen.getByText("Author")).toBeTruthy();
  expect(screen.getByText("@author_handle")).toBeTruthy();
});
it("shows no @username when the reviewer has none", () => {
  render(<ReviewItem wineId="wine" review={{ ...review, reviewer: null }} onToggleComments={jest.fn()} onEdit={jest.fn()} />);
  expect(screen.queryByText(/^@/)).toBeNull();
});
