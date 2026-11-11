import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { WineReviewComment } from "@domain/wine/wine.types";
import { ReviewComments } from "./ReviewComments";

const state = vi.hoisted(() => ({
  addToast: vi.fn(),
  mutateAsync: vi.fn(),
  deleteComment: vi.fn(),
  confirm: vi.fn(),
  comments: [] as WineReviewComment[],
}));

vi.mock("@hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "reader", username: "reader" }, isAuthenticated: true, hasAnyRole: () => false }),
}));
vi.mock("@hooks/useToast", () => ({ useToast: () => ({ addToast: state.addToast }) }));
vi.mock("@hooks/useConfirm", () => ({ useConfirm: () => ({ confirm: state.confirm }) }));
vi.mock("../community/CommunityActions", () => ({
  CommunityActions: (props: { variant?: string; targetType: string; targetId: string; authorId?: string }) => (
    <span data-testid="community-actions">{[props.variant, props.targetType, props.targetId, props.authorId].join(":")}</span>
  ),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es-AR" } }),
}));
vi.mock("@hooks/queries/wine/useReviewComments", () => ({
  useReviewComments: () => ({ data: state.comments, isLoading: false }),
}));
vi.mock("@hooks/queries/wine/useCreateReviewComment", () => ({
  useCreateReviewComment: () => ({ mutateAsync: state.mutateAsync, isPending: false }),
}));
vi.mock("@hooks/queries/wine/useDeleteReviewComment", () => ({
  useDeleteReviewComment: () => ({ mutateAsync: state.deleteComment, isPending: false }),
}));

beforeEach(() => {
  state.addToast.mockReset();
  state.mutateAsync.mockReset().mockResolvedValue(undefined);
  state.deleteComment.mockReset().mockResolvedValue(undefined);
  state.confirm.mockReset().mockResolvedValue(true);
  state.comments = [];
});

const comment = (id: string, authorId: string): WineReviewComment => ({
  id,
  reviewId: "review",
  content: `Note ${id}`,
  publicationStatus: "APPROVED",
  createdAt: new Date("2026-10-01"),
  updatedAt: new Date("2026-10-01"),
  reviewer: { id: authorId, username: authorId, displayName: authorId, avatarUrl: null },
});

it("posts a comment that is published at once, without a review notice", async () => {
  render(<ReviewComments wineId="wine" reviewId="review" />);

  expect(screen.queryByText("community.publicationPolicy")).toBeNull();
  fireEvent.change(screen.getByPlaceholderText("reviews.comments.placeholder"), { target: { value: " Great pick " } });
  fireEvent.click(screen.getByText("reviews.comments.send"));

  await waitFor(() => expect(state.addToast).toHaveBeenCalledWith({ type: "success", message: "community.commentPublished" }));
  expect(state.mutateAsync).toHaveBeenCalledWith({ wineId: "wine", reviewId: "review", content: "Great pick" });
});

it("places the actions menu at the top right of each comment bubble and keeps deleting own comments", async () => {
  state.comments = [comment("c1", "other"), comment("c2", "reader")];
  render(<ReviewComments wineId="wine" reviewId="review" />);

  const [first, second] = screen.getAllByTestId("community-actions");
  expect(first).toHaveTextContent("menu:COMMENT:c1:other");
  expect(second).toHaveTextContent("menu:COMMENT:c2:reader");
  const bubble = screen.getByText("Note c1").closest(".rounded-xl");
  expect(bubble?.firstElementChild?.lastElementChild).toBe(first);
  expect(screen.getAllByText("common.delete")).toHaveLength(1);
  // The delete control is always visible, never revealed only on hover.
  const remove = screen.getByRole("button", { name: "common.delete" });
  expect(remove.className).not.toMatch(/opacity-0|group-hover/);

  fireEvent.click(remove);
  await waitFor(() => expect(state.deleteComment).toHaveBeenCalledWith({ wineId: "wine", reviewId: "review", commentId: "c2" }));
});

it("falls back to the default avatar when a commenter photo fails to load", () => {
  state.comments = [{ ...comment("c1", "other"), reviewer: { id: "other", username: "other", displayName: "Other", avatarUrl: "https://cdn.invalid/o.png" } }];
  render(<ReviewComments wineId="wine" reviewId="review" />);
  // The name is shown next to the photo, so the photo itself is decorative.
  const photo = document.querySelector<HTMLImageElement>('img[src="https://cdn.invalid/o.png"]')!;
  expect(photo).toHaveAttribute("alt", "");
  fireEvent.error(photo);
  expect(document.querySelector('img[src="https://cdn.invalid/o.png"]')).toBeNull();
  expect(screen.getByText("Note c1")).toBeInTheDocument();
});

it("shows the commenter seal after the name and nothing when there is none", async () => {
  state.comments = [
    { ...comment("c1", "ana"), reviewer: { id: "ana", username: "ana", displayName: "Ana", avatarUrl: null, badgeTier: "VENDIMIA" } },
    comment("c2", "bob"),
  ];
  render(<ReviewComments wineId="wine" reviewId="review" />);
  const seal = screen.getByRole("img", { name: "points.emblemLabel" });
  expect(seal).toHaveAttribute("data-tier", "VENDIMIA");
  expect(screen.getByText("Ana")).toContainElement(seal);
  expect(screen.getByText("bob").querySelector(".vinnot-seal")).toBeNull();
});

it("shows each comment author's @username in muted text, and nothing when it is missing", () => {
  state.comments = [comment("c1", "lucia"), { ...comment("c2", "anon"), reviewer: { id: "anon", username: "", displayName: "Anon", avatarUrl: null } }];
  render(<ReviewComments wineId="wine" reviewId="review" />);
  const handle = screen.getByText("@lucia");
  expect(handle).toHaveClass("text-gray-500");
  expect(screen.getAllByText(/^@/)).toHaveLength(1);
});
