import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { it, expect, vi } from "vitest";
import { CommunityPage } from "./CommunityPage";
const state = vi.hoisted(() => ({ pages: vi.fn(), empty: false }));
vi.mock("@hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "reader", roles: ["ROLE_USER"] } }) }));
vi.mock("@components/features/community/CommunityOverview", () => ({ CommunityOverviewPanel: () => null, ModerationShortcuts: () => <p>Moderator only</p>, ReportStatusBadge: ({ status }: { status: string }) => <span>{status}</span> }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "es-AR" }, t: (key: string, options?: { title?: string; count?: number }) => options?.title ? `${options.title} (${options.count})` : key }) }));
vi.mock("@hooks/queries/community/useCommunity", () => ({
  useMyCommunity: (reportsPage: number, blocksPage: number) => {
    state.pages(reportsPage, blocksPage);
    return {
      reports: state.empty
        ? { data: { items: [], totalItems: 0, totalPages: 0 } }
        : { data: { items: [{ id: `receipt-${reportsPage}`, target: { type: "REVIEW" }, status: "OPEN", createdAt: new Date("2026-10-01") }], totalItems: 21, totalPages: 2 } },
      blocks: { data: { items: [{ userId: "author", username: "Author" }], totalItems: 1, totalPages: 1 } },
    };
  },
  useCommunityActions: () => ({ unblock: { mutate: vi.fn() } }),
}));
it("paginates private receipts independently from blocked users and keeps moderation private", () => {
  render(<BrowserRouter><CommunityPage /></BrowserRouter>);
  expect(screen.getByRole("heading", { name: "community.myReports (21)" })).toBeTruthy();
  expect(screen.queryByText("Moderator only")).toBeNull();
  expect(screen.getByRole("heading", { level: 1, name: "community.title" })).toBeTruthy();
  // The blocked users fit in one page, so only the receipts show pagination.
  expect(screen.getAllByRole("navigation")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /common.next/ }));
  expect(state.pages).toHaveBeenLastCalledWith(1, 0);
  expect(screen.getByText("Author")).toBeTruthy();
  expect(screen.getByText("community.caseId receipt-1")).toBeTruthy();
});
it("restores both list pages from the URL after going Back", () => {
  render(<MemoryRouter initialEntries={["/community?reportsPage=1&blocksPage=0"]}><CommunityPage /></MemoryRouter>);
  expect(state.pages).toHaveBeenLastCalledWith(1, 0);
  expect(screen.getByText("community.caseId receipt-1")).toBeTruthy();
});
it("shows the watercolor community state when there are no receipts, without pagination", () => {
  state.empty = true;
  render(<BrowserRouter><CommunityPage /></BrowserRouter>);
  expect(screen.getByRole("heading", { name: "community.noReportsTitle" })).toBeTruthy();
  expect(screen.getByText("community.noReports")).toBeTruthy();
  expect(document.querySelector("img")?.getAttribute("alt")).toBe("");
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(screen.getByRole("link", { name: "nav.contact" })).toHaveAttribute("href", "/contact");
  state.empty = false;
});
