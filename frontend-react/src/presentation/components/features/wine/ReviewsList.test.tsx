import { MemoryRouter } from 'react-router-dom'
import { render, screen } from "@testing-library/react";
import { beforeEach, it, expect, vi } from "vitest";
import { ReviewsList } from "./ReviewsList";
const state = vi.hoisted(() => ({
  id: "reader",
  roles: [] as string[],
  ownReviews: [] as { id: string; reviewer: { id: string; displayName: string }; rating: number; createdAt: Date; updatedAt: Date; likesCount: number; commentsCount: number }[],
  ownLoading: false,
  reviews: [
    {
      id: "review",
      reviewer: { id: "author", displayName: "Author" },
      rating: 4,
      createdAt: new Date("2026-10-01"),
      updatedAt: new Date("2026-10-01"),
      likesCount: 0,
      commentsCount: 0,
    },
  ],
}));
vi.mock("@hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: state.id },
    isAuthenticated: true,
    hasAnyRole: (roles: string[]) =>
      roles.some((role) => state.roles.includes(role)),
  }),
}));
vi.mock('@hooks/useAuthReturnPath', () => ({ useAuthReturnPath: () => ({ currentLoginPath: '/login' }) }))
vi.mock("@hooks/useToast", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock("@hooks/useConfirm", () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "es-AR" },
  }),
}));
vi.mock("@hooks/queries/wine/useReviews", () => ({
  useReviews: (id: string | undefined, _page: number, _size: number, filter: string) => ({
    isLoading: !!id && filter === 'mine' && state.ownLoading,
    data: !id ? undefined : {
      reviews: filter === 'mine' ? state.ownReviews : state.reviews,
      pagination: { totalItems: 1, totalPages: 1 },
    },
    refetch: vi.fn(),
  }),
}));
vi.mock("@hooks/queries/wine/useMyReviewStatus", () => ({
  useMyReviewStatus: () => ({ data: { hasReview: false } }),
}));
vi.mock("@hooks/queries/wine/useCreateReview", () => ({
  useCreateReview: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@hooks/queries/wine/useUpdateReview", () => ({
  useUpdateReview: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@hooks/queries/wine/useDeleteReview", () => ({
  useDeleteReview: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@hooks/queries/wine/useToggleReviewLike", () => ({
  useToggleReviewLike: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("./ReviewsComposer", () => ({
  ReviewsComposer: ({ showReviewForm }: { showReviewForm: boolean }) => (showReviewForm ? "Review form open" : null),
}));
vi.mock("../community/CommunityActions", () => ({
  CommunityActions: () => null,
}));
vi.mock("../community/PublicationStatus", () => ({
  PublicationStatus: () => null,
}));
beforeEach(() => {
  state.ownReviews = []
  state.ownLoading = false
  state.id = 'reader'
  state.roles = []
})
it.each([
  ["ROLE_MODERATOR", "reader", false, true],
  ["ROLE_ADMIN", "reader", true, true],
  ["ROLE_USER", "reader", false, false],
  ["ROLE_MODERATOR", "author", true, true],
])(
  "shows the server-permitted review actions for %s as %s",
  async (role, id, edit, remove) => {
    state.id = id;
    state.roles = [role];
    render(<MemoryRouter><ReviewsList wineId="wine" /></MemoryRouter>);
    await screen.findByText("Author");
    expect(!!screen.queryByRole("button", { name: "common.edit" })).toBe(edit);
    expect(!!screen.queryByRole("button", { name: "common.delete" })).toBe(
      remove,
    );
  },
);

it('pins an older own review missing from the recent page and preserves its edit action', async () => {
  state.ownReviews = [{ ...state.reviews[0]!, id: 'older-own-review', reviewer: { id: 'reader', displayName: 'Own author' } }]
  const scroll = vi.fn()
  HTMLElement.prototype.scrollIntoView = scroll
  render(<MemoryRouter><ReviewsList wineId="wine" focusOwnReview /></MemoryRouter>)
  await screen.findByText('Own author')
  await screen.findByText('Author')
  expect(screen.getAllByText('Own author')).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument()
  await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(1))
})
it('does not pin an own review during an ordinary visit or show a composer while locating it', async () => {
  state.ownReviews = [{ ...state.reviews[0]!, id: 'older-own-review', reviewer: { id: 'reader', displayName: 'Own author' } }]
  const view = render(<MemoryRouter><ReviewsList wineId="wine" /></MemoryRouter>)
  await screen.findByText('Author')
  expect(screen.queryByText('Own author')).toBeNull()
  state.ownLoading = true
  view.rerender(<MemoryRouter><ReviewsList wineId="wine" focusOwnReview /></MemoryRouter>)
  expect(screen.getByRole('status', { name: 'reviews.loading' })).toBeInTheDocument()
})

it('opens the review form when the hero shortcut asks to write one', async () => {
  const view = render(<MemoryRouter><ReviewsList wineId="wine" /></MemoryRouter>)
  await screen.findByText('Author')
  expect(screen.queryByText('Review form open')).toBeNull()
  view.rerender(<MemoryRouter><ReviewsList wineId="wine" writeRequest={1} /></MemoryRouter>)
  expect(screen.getByText('Review form open')).toBeInTheDocument()
})
it('pins the own review instead of opening the form for a reader who already reviewed', async () => {
  state.ownReviews = [{ ...state.reviews[0]!, id: 'older-own-review', reviewer: { id: 'reader', displayName: 'Own author' } }]
  const scroll = vi.fn()
  HTMLElement.prototype.scrollIntoView = scroll
  const view = render(<MemoryRouter><ReviewsList wineId="wine" /></MemoryRouter>)
  await screen.findByText('Author')
  expect(screen.queryByText('Own author')).toBeNull()
  view.rerender(<MemoryRouter><ReviewsList wineId="wine" writeRequest={1} pinOwnReview /></MemoryRouter>)
  await screen.findByText('Own author')
  expect(screen.queryByText('Review form open')).toBeNull()
  // The page glides to the reviews card itself; pinning does not jump on top of it.
  expect(scroll).not.toHaveBeenCalled()
})
