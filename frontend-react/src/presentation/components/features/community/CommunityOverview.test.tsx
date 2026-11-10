import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi, beforeEach } from "vitest";
import { CommunityOverviewPanel } from "./CommunityOverview";
const state = vi.hoisted(() => ({
  data: {
    reports: { open: 23, inReview: 1, resolved: 2, dismissed: 3 },
    blockedUsers: 4,
  },
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));
vi.mock("@hooks/queries/community/useCommunity", () => ({
  useCommunityOverview: () => state,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
beforeEach(() => {
  state.isError = false;
  state.isPending = false;
  state.refetch.mockClear();
});
it("shows total pending, closed and blocked activity", () => {
  render(<CommunityOverviewPanel />);
  expect(screen.getByText("24")).toBeTruthy();
  expect(screen.getByText("5")).toBeTruthy();
  expect(screen.getByText("4")).toBeTruthy();
});
it("does not display successful counts while loading or after failure and offers retry", () => {
  state.isPending = true;
  const view = render(<CommunityOverviewPanel />);
  expect(screen.queryByText("24")).toBeNull();
  expect(screen.getByRole("status", { name: "common.loading" })).toBeTruthy();
  state.isPending = false;
  state.isError = true;
  view.rerender(<CommunityOverviewPanel />);
  expect(screen.queryByText("24")).toBeNull();
  fireEvent.click(screen.getByRole("button"));
  expect(state.refetch).toHaveBeenCalledTimes(1);
});
