import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ReviewPublicationsPage } from "./ReviewPublicationsPage";
const state = vi.hoisted(() => ({
  publications: {
    data: {
      items: [
        {
          type: "REVIEW",
          id: "review",
          wineId: "wine",
          authorId: "author",
          rating: 4,
          title: "Read before deciding",
          content: "Current text",
          createdAt: new Date("2026-09-30T15:00:00Z"),
          revision: "2026-09-30T15:00:00.123456Z",
          authorUsername: null as string | null,
          wineName: null as string | null,
        },
      ],
      totalPages: 1,
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  },
  decide: { mutate: vi.fn(), isPending: false, isError: false },
}));
vi.mock("@hooks/queries/community/useCommunity", () => ({
  useReviewPublications: () => state,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en-US" } }),
}));
const baseItem = { ...state.publications.data.items[0]! };
beforeEach(() => {
  vi.clearAllMocks();
  state.publications.data.items = [{ ...baseItem }];
  state.decide.isPending = false;
  state.decide.isError = false;
});
function renderPage() {
  return render(
    <MemoryRouter>
      <ReviewPublicationsPage />
    </MemoryRouter>,
  );
}
const target = {
  type: "REVIEW",
  id: "review",
  expectedRevision: "2026-09-30T15:00:00.123456Z",
};
it("rejects with the preselected offensive reason without typing and sends the exact revision displayed", () => {
  renderPage();
  expect(screen.getByText("Current text")).toBeVisible();
  expect(
    screen.getByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" }),
  ).toBeChecked();
  expect(screen.queryByLabelText("community.publicationNote")).toBeNull();
  const reject = screen.getByRole("button", { name: "community.reject" });
  expect(reject).toBeEnabled();
  fireEvent.click(reject);
  expect(state.decide.mutate).toHaveBeenCalledWith({
    ...target,
    status: "REJECTED",
    reasonCode: "OFFENSIVE",
  });
});
it("offers every preset reason as one-tap choices and sends the one picked", () => {
  renderPage();
  expect(
    screen.getByRole("group", { name: "community.publicationReason" }),
  ).toBeVisible();
  expect(screen.getAllByRole("radio")).toHaveLength(5);
  fireEvent.click(
    screen.getByRole("radio", { name: "community.rejectionReasons.SPAM" }),
  );
  expect(
    screen.getByRole("radio", { name: "community.rejectionReasons.SPAM" }),
  ).toBeChecked();
  expect(screen.queryByLabelText("community.publicationNote")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "community.reject" }));
  expect(state.decide.mutate).toHaveBeenCalledWith({
    ...target,
    status: "REJECTED",
    reasonCode: "SPAM",
  });
});
it("shows the optional detail for the author only under other and sends it as the reason", () => {
  renderPage();
  fireEvent.click(
    screen.getByRole("radio", { name: "community.rejectionReasons.OTHER" }),
  );
  fireEvent.change(screen.getByLabelText("community.publicationNote"), {
    target: { value: "  Duplicate of another review  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "community.reject" }));
  expect(state.decide.mutate).toHaveBeenCalledWith({
    ...target,
    status: "REJECTED",
    reasonCode: "OTHER",
    reason: "Duplicate of another review",
  });
  fireEvent.click(
    screen.getByRole("radio", { name: "community.rejectionReasons.OFF_TOPIC" }),
  );
  expect(screen.queryByLabelText("community.publicationNote")).toBeNull();
});
it("approves without sending a reason code", () => {
  renderPage();
  fireEvent.click(
    screen.getByRole("radio", { name: "community.rejectionReasons.PERSONAL_DATA" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "community.approve" }));
  expect(state.decide.mutate).toHaveBeenCalledWith({
    ...target,
    status: "APPROVED",
  });
  expect(state.decide.mutate.mock.calls[0]![0]).not.toHaveProperty("reasonCode");
});
it("prevents duplicate decisions while saving and allows reloading after a conflict", () => {
  state.decide.isPending = true;
  const view = render(
    <MemoryRouter>
      <ReviewPublicationsPage />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("button", { name: "community.approve" }),
  ).toBeDisabled();
  state.decide.isPending = false;
  state.decide.isError = true;
  view.rerender(
    <MemoryRouter>
      <ReviewPublicationsPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("alert")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
  expect(state.publications.refetch).toHaveBeenCalledOnce();
});
it("shows the rating as glasses and hides pagination with a single page", () => {
  renderPage();
  expect(screen.getByRole("img", { name: "common.rating.glassesSummary" })).toBeVisible();
  expect(screen.queryByRole("navigation")).toBeNull();
});
it("shows the calm community state when nothing waits for review", () => {
  const items = state.publications.data.items;
  state.publications.data.items = [];
  renderPage();
  expect(screen.getByRole("heading", { name: "community.queueClear" })).toBeVisible();
  expect(screen.getByText("community.queueClearHelp")).toBeVisible();
  state.publications.data.items = items;
});
it("shows the author and the wine instead of their ids", () => {
  state.publications.data.items = [
    {
      ...baseItem,
      id: "5e0b1c3d-0000-4111-8222-833344445555",
      authorId: "6f1c2a4e-1111-4222-8333-944455556666",
      wineId: "7a2d3b5f-2222-4333-8444-a55566667777",
      authorUsername: "ana_wines",
      wineName: "Malbec Reserva",
    },
  ];
  renderPage();
  expect(screen.getByText("community.authorLabel")).toBeVisible();
  expect(screen.getByText("ana_wines")).toBeVisible();
  expect(screen.getByText("community.wineLabel")).toBeVisible();
  expect(screen.getByText("Malbec Reserva")).toBeVisible();
  expect(screen.queryByText(/5e0b1c3d|6f1c2a4e|7a2d3b5f/)).toBeNull();
});
it("hides the author and the wine when the server could not name them", () => {
  state.publications.data.items = [
    { ...baseItem, id: "5e0b1c3d-0000-4111-8222-833344445555" },
  ];
  renderPage();
  expect(screen.queryByText("community.authorLabel")).toBeNull();
  expect(screen.queryByText("community.wineLabel")).toBeNull();
  expect(screen.queryByText(/5e0b1c3d/)).toBeNull();
});
