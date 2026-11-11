import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import draftsReducer from "@/presentation/store/draftsSlice";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { ReviewComments } from "./ReviewComments";

const mockDelete = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockRefetch = jest.fn();
const mockComments = { failed: false, anonymous: false };
const mockAuth = { user: { id: "reader" }, roles: [] as string[] };
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es-AR" } }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockAuth.user,
    isAuthenticated: true,
    hasAnyRole: (roles: string[]) => roles.some((role) => mockAuth.roles.includes(role)),
  }),
}));
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useReviewComments: () => ({
    data: mockComments.failed ? undefined : [
      { id: "c1", content: "Nice", reviewer: mockComments.anonymous ? {} : { id: "author", username: "ana_vino", displayName: "Ana", badgeTier: "RACIMO" } },
      { id: "c2", content: "Mine", reviewer: { id: "reader", displayName: "Reader" } },
    ],
    isLoading: false,
    isError: mockComments.failed,
    error: mockComments.failed ? { code: "NETWORK_ERROR" } : undefined,
    refetch: mockRefetch,
  }),
  useCreateReviewComment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteReviewComment: () => ({ mutate: mockDelete }),
}));
jest.mock("../community/PublicationStatus", () => ({ PublicationStatus: () => null }));
jest.mock("../community/CommunityActions", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    CommunityActions: (props: { variant?: string; targetId: string; authorId?: string }) => (
      <Text testID="community-actions">{`${props.variant}:${props.targetId}:${props.authorId}`}</Text>
    ),
  };
});

const draftsWrapper = (store = configureStore({ reducer: { drafts: draftsReducer } })) =>
  function DraftsProvider({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.roles = [];
  mockComments.failed = false;
  mockComments.anonymous = false;
});

it("places a three-dots menu next to each comment author", () => {
  render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper: draftsWrapper() });
  const menus = screen.getAllByTestId("community-actions").map((menu) => menu.props.children);
  expect(menus).toEqual(["menu:c1:author", "menu:c2:reader"]);
  expect(screen.queryByText("community.report")).toBeNull();
});

it("keeps deleting the comments the viewer may remove", () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper: draftsWrapper() });
  const deletes = screen.getAllByRole("button", { name: "wines.deleteComment" });
  expect(deletes).toHaveLength(1);
  fireEvent.press(deletes[0]!);
  act(() => alert.mock.calls[0]![2]![1]!.onPress?.());
  expect(mockDelete).toHaveBeenCalledWith({ wineId: "wine", reviewId: "review", commentId: "c2" }, expect.any(Object));
  alert.mockRestore();
});

it("confirms a deleted comment, explains a failure and blocks a second delete meanwhile", () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper: draftsWrapper() });
  fireEvent.press(screen.getByRole("button", { name: "wines.deleteComment" }));
  act(() => alert.mock.calls[0]![2]![1]!.onPress?.());
  expect(screen.getByRole("button", { name: "wines.deleteComment" }).props.accessibilityState)
    .toMatchObject({ disabled: true });
  const callbacks = mockDelete.mock.calls[0]![1] as { onSuccess: () => void; onError: () => void };
  act(() => callbacks.onError());
  expect(mockShowError).toHaveBeenCalledWith("reviews.comments.errorDelete");
  expect(screen.getByRole("button", { name: "wines.deleteComment" }).props.accessibilityState)
    .toMatchObject({ disabled: false });
  act(() => callbacks.onSuccess());
  expect(mockShowSuccess).toHaveBeenCalledWith("reviews.comments.deleted");
  alert.mockRestore();
});

it("offers a retry when the comments fail to load", () => {
  mockComments.failed = true;
  render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper: draftsWrapper() });
  fireEvent.press(screen.getByText("common.retry"));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

it("names an author without a profile with translated text and accepts multi-line comments", () => {
  mockComments.anonymous = true;
  render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper: draftsWrapper() });
  expect(screen.getByText("reviews.user")).toBeTruthy();
  expect(screen.queryByText("Usuario")).toBeNull();
  expect(screen.getByPlaceholderText("wines.commentPlaceholder").props.multiline).toBe(true);
});

it("keeps an unsent comment after the comments are collapsed and opened again", () => {
  const wrapper = draftsWrapper();
  const first = render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper });
  fireEvent.changeText(first.getByPlaceholderText("wines.commentPlaceholder"), "Sin enviar");
  first.unmount();
  const again = render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper });
  expect(again.getByPlaceholderText("wines.commentPlaceholder").props.value).toBe("Sin enviar");
});
it("shows the commenter's seal after the name only when they have one", () => {
  mockComments.failed = false;
  mockComments.anonymous = false;
  render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper: draftsWrapper() });
  expect(screen.getAllByRole("button", { name: "points.badgeLabel" })).toHaveLength(1);
});

it("shows the commenter's @username under their name only when they have one", () => {
  render(<ReviewComments wineId="w1" reviewId="r1" />, { wrapper: draftsWrapper() });
  expect(screen.getByText("@ana_vino")).toBeTruthy();
  expect(screen.getAllByText(/^@/)).toHaveLength(1);
});
