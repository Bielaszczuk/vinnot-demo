import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import draftsReducer from "@/presentation/store/draftsSlice";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ReviewComments } from "@/presentation/features/wine/ReviewComments";

const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockCreate = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockSuccess, showError: mockError }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "reader", username: "reader" }, isAuthenticated: true, hasAnyRole: () => false }),
}));
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useReviewComments: () => ({ data: [], isLoading: false }),
  useCreateReviewComment: () => ({ mutateAsync: mockCreate, isPending: false }),
  useDeleteReviewComment: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const draftsWrapper = (store = configureStore({ reducer: { drafts: draftsReducer } })) =>
  function DraftsProvider({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };

beforeEach(() => {
  mockSuccess.mockReset();
  mockCreate.mockReset().mockResolvedValue(undefined);
});

it("posts a comment that is published at once, without a review notice", async () => {
  const screen = render(<ReviewComments wineId="wine" reviewId="review" />, { wrapper: draftsWrapper() });

  expect(screen.queryByText("community.publicationPolicy")).toBeNull();
  fireEvent.changeText(screen.getByPlaceholderText("wines.commentPlaceholder"), " Great pick ");
  fireEvent.press(screen.getByText("common.send"));

  await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("community.commentPublished"));
  expect(mockCreate).toHaveBeenCalledWith({ wineId: "wine", reviewId: "review", content: "Great pick" });
});
