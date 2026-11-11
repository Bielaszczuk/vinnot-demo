import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModerationReport } from "@domain/community/community.types";
import { CommunityModerationPage } from "./CommunityModerationPage";

const report: ModerationReport = {
  id: "case-1",
  target: { type: "REVIEW", id: "5e0b1c3d-0000-4111-8222-833344445555" },
  status: "IN_REVIEW",
  createdAt: new Date("2026-10-02T15:00:00Z"),
  authorId: "6f1c2a4e-1111-4222-8333-944455556666",
  reason: "HATE",
  description: "Details",
  excerpt: "Reported text",
  reviewerId: "7a2d3b5f-2222-4333-8444-a55566667777",
  decision: null,
  authorUsername: null,
  reviewerUsername: null,
  targetLabel: null,
  relatedTargetId: null,
  relatedTargetLabel: null,
};
const state = vi.hoisted(() => ({
  reports: {
    data: { items: [] as ModerationReport[], totalPages: 1 },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  },
  decide: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown },
  remove: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown },
  user: { id: "moderator", roles: ["ROLE_MODERATOR"] },
}));
vi.mock("@hooks/queries/community/useCommunity", () => ({
  useCommunityModeration: () => state,
}));
vi.mock("@components/features/community/CommunityOverview", () => ({
  CommunityOverviewPanel: () => null,
  ReportStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));
const confirmMock = vi.hoisted(() => vi.fn());
vi.mock("@hooks/useConfirm", () => ({ useConfirm: () => ({ confirm: confirmMock }) }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en-US" } }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.reports.data.items = [{ ...report }];
});
function renderPage() {
  return render(
    <MemoryRouter>
      <CommunityModerationPage />
    </MemoryRouter>,
  );
}
it("shows who wrote the case, what it is about and who reviews it", () => {
  state.reports.data.items = [
    {
      ...report,
      authorUsername: "ana_wines",
      reviewerUsername: "mod_lu",
      targetLabel: "Malbec Reserva",
    },
  ];
  renderPage();
  expect(screen.getByText("community.authorLabel")).toBeVisible();
  expect(screen.getByText("ana_wines")).toBeVisible();
  expect(screen.getByText("community.aboutLabel")).toBeVisible();
  expect(
    screen.getByText("community.targets.REVIEW · Malbec Reserva"),
  ).toBeVisible();
  expect(screen.getByText("community.reviewedByLabel")).toBeVisible();
  expect(screen.getByText("mod_lu")).toBeVisible();
  expect(screen.queryByText(/5e0b1c3d|6f1c2a4e|7a2d3b5f/)).toBeNull();
});
it("hides each name the server could not resolve and never falls back to ids", () => {
  renderPage();
  expect(screen.getByText("Reported text")).toBeVisible();
  expect(screen.queryByText("community.authorLabel")).toBeNull();
  expect(screen.queryByText("community.aboutLabel")).toBeNull();
  expect(screen.queryByText("community.reviewedByLabel")).toBeNull();
  expect(screen.queryByText(/5e0b1c3d|6f1c2a4e|7a2d3b5f/)).toBeNull();
});

describe("catalog quality reports", () => {
  const catalog: ModerationReport = {
    ...report,
    status: "OPEN",
    target: { type: "WINE", id: "matched-wine" },
    authorId: null,
    reviewerId: null,
    reason: "CATALOG_QUALITY",
    description: "Scan exact match corrected by a member: possible duplicate, wrong winery or wrong image",
    excerpt: "Malbec 2020 (Bodega A) → Malbec 2020",
    targetLabel: "Malbec",
    relatedTargetId: "chosen-wine",
    relatedTargetLabel: "Malbec Reserva",
  };
  beforeEach(() => {
    state.reports.data.items = [{ ...catalog }];
  });

  it("names the automatic reporter, the reason and both wines in the moderator's language", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "community.targets.WINE · community.reasons.CATALOG_QUALITY" }),
    ).toBeVisible();
    expect(screen.getByText("community.reportedByLabel")).toBeVisible();
    expect(screen.getByText("community.automaticReporter")).toBeVisible();
    expect(screen.getByText("community.targets.WINE · Malbec")).toBeVisible();
    expect(screen.getByText("community.relatedWineLabel")).toBeVisible();
    expect(screen.getByText("Malbec Reserva")).toBeVisible();
    expect(screen.getByText("Malbec 2020 (Bodega A) → Malbec 2020")).toBeVisible();
    expect(screen.getByText("community.catalogQualityDescription")).toBeVisible();
    expect(screen.queryByText(/Scan exact match corrected/)).toBeNull();
  });

  it("links to both wines", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "community.openMatchedWine" })).toHaveAttribute("href", "/wines/matched-wine");
    expect(screen.getByRole("link", { name: "community.openChosenWine" })).toHaveAttribute("href", "/wines/chosen-wine");
  });

  it("decides the report but never offers removing the wine", () => {
    renderPage();
    const outcomes = screen.getByRole("radiogroup", { name: "community.outcomeLabel" });
    expect(within(outcomes).getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["RESOLVED", "DISMISSED"]);
    fireEvent.click(screen.getByRole("button", { name: "community.resolve" }));
    expect(state.decide.mutate).toHaveBeenCalledWith({
      id: "case-1", status: "RESOLVED", decision: "community.decisionReasons.RESOLVED.CATALOG_FIXED",
    });
    expect(screen.queryByRole("radio", { name: "community.decisionReasons.RESOLVED.AUTHOR_WARNED" })).toBeNull();
  });

  it("does not call a member report automatic", () => {
    state.reports.data.items = [{ ...report }];
    renderPage();
    expect(screen.queryByText("community.automaticReporter")).toBeNull();
    expect(screen.queryByRole("link", { name: "community.openChosenWine" })).toBeNull();
  });
});

describe("report decisions", () => {
  const open = { ...report, status: "OPEN" as const, reviewerId: null };
  beforeEach(() => {
    state.reports.data.items = [{ ...open }];
    state.decide = { mutate: vi.fn(), isPending: false, isError: false, error: null };
    state.remove = { mutate: vi.fn(), isPending: false, isError: false, error: null };
    confirmMock.mockResolvedValue(true);
  });

  it("offers resolving, dismissing and removing a review as labelled choices", () => {
    renderPage();
    const outcomes = screen.getByRole("radiogroup", { name: "community.outcomeLabel" });
    expect(within(outcomes).getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["RESOLVED", "DISMISSED", "REMOVE_CONTENT"]);
    expect(within(outcomes).getByRole("radio", { name: "community.resolve" })).toBeChecked();
  });

  it("never offers content removal for an account report", () => {
    state.reports.data.items = [{ ...open, target: { type: "USER", id: "u" } }];
    renderPage();
    expect(screen.queryByRole("radio", { name: "community.removeContent" })).toBeNull();
  });

  it("resolves with the preselected preset without typing", () => {
    renderPage();
    const reasons = screen.getByRole("group", { name: "community.decisionReasonLabel" });
    expect(within(reasons).getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["AUTHOR_WARNED", "CONTENT_FIXED", "ACCOUNT_ACTION", "OTHER"]);
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "community.resolve" }));
    expect(state.decide.mutate).toHaveBeenCalledWith({
      id: "case-1", status: "RESOLVED", decision: "community.decisionReasons.RESOLVED.AUTHOR_WARNED",
    });
  });

  it("dismisses with the presets of a dismissal", () => {
    renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "community.dismiss" }));
    fireEvent.click(screen.getByRole("radio", { name: "community.decisionReasons.DISMISSED.DUPLICATE_REPORT" }));
    fireEvent.click(screen.getByRole("button", { name: "community.dismiss" }));
    expect(state.decide.mutate).toHaveBeenCalledWith({
      id: "case-1", status: "DISMISSED", decision: "community.decisionReasons.DISMISSED.DUPLICATE_REPORT",
    });
  });

  it("confirms before removing the content and sends the removal reason", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "community.removeContent" }));
    fireEvent.click(screen.getByRole("radio", { name: "community.decisionReasons.REMOVE_CONTENT.SPAM" }));
    fireEvent.click(screen.getByRole("button", { name: "community.removeContent" }));
    await waitFor(() => expect(state.remove.mutate).toHaveBeenCalledWith({
      id: "case-1", decision: "community.decisionReasons.REMOVE_CONTENT.SPAM",
    }));
    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "danger" }));
    expect(state.decide.mutate).not.toHaveBeenCalled();
  });

  it("asks for free text only under Other and sends it trimmed", () => {
    renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "community.decisionReasons.RESOLVED.OTHER" }));
    const note = screen.getByRole("textbox", { name: "community.decisionNote" });
    expect(note).toHaveAttribute("maxLength", "2000");
    const resolve = screen.getByRole("button", { name: "community.resolve" });
    expect(resolve).toBeDisabled();
    fireEvent.change(note, { target: { value: "  Spoke with the author  " } });
    fireEvent.click(resolve);
    expect(state.decide.mutate).toHaveBeenCalledWith({ id: "case-1", status: "RESOLVED", decision: "Spoke with the author" });
  });

  it("keeps the previous claim payload", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "community.claim" }));
    expect(state.decide.mutate).toHaveBeenCalledWith({ id: "case-1", status: "IN_REVIEW", decision: "" });
  });

  it("locks the decision while it is saved", () => {
    state.decide = { ...state.decide, isPending: true };
    renderPage();
    expect(screen.getByRole("button", { name: "community.resolve" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "community.dismiss" })).toBeDisabled();
  });

  it.each([
    ["REPORT_ASSIGNED", 422, "community.assignedElsewhere"],
    ["REPORT_TRANSITION", 422, "community.moderationErrors.closed"],
    ["REPORT_CONFLICT_OF_INTEREST", 422, "community.moderationErrors.conflict"],
    ["REPORT_DECISION_REQUIRED", 422, "community.moderationErrors.decisionRequired"],
    ["REPORT_REMOVAL_TARGET", 422, "community.moderationErrors.removalTarget"],
    ["NOT_FOUND", 404, "community.errors.notFound"],
    ["NETWORK_ERROR", 0, "errors.api.network"],
    ["UNKNOWN", 500, "community.error"],
  ])("explains why the decision failed (%s) and offers to reload the cases", (code, status, message) => {
    state.decide = { ...state.decide, isError: true, error: { status, code, message: "backend text" } as never };
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    fireEvent.click(screen.getByRole("button", { name: "community.reloadQueue" }));
    expect(state.reports.refetch).toHaveBeenCalled();
  });

  it("explains a failed removal too", () => {
    state.remove = { ...state.remove, isError: true, error: { status: 422, code: "REPORT_REMOVAL_TARGET", message: "x" } as never };
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("community.moderationErrors.removalTarget");
  });
});
