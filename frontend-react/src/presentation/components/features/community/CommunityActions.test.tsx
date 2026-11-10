import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommunityActions } from "./CommunityActions";

/** Shape of a transport failure as the API layer rejects it. */
const apiError = (status: number, code: string, message: string) => Object.assign(new Error(message), { status, code })
const state = vi.hoisted(() => ({
  user: { id: "reader" } as { id: string } | null,
  report: {
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null as unknown,
  },
  block: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown },
  confirm: vi.fn(),
  addToast: vi.fn(),
}));
vi.mock("@hooks/queries/community/useCommunity", () => ({
  useCommunityActions: () => state,
}));
vi.mock("@hooks/useConfirm", () => ({
  useConfirm: () => ({ confirm: state.confirm }),
}));
vi.mock("@hooks/useToast", () => ({
  useToast: () => ({ addToast: state.addToast }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: "reader" };
  state.report.isError = false;
  state.report.error = null;
  state.block.isError = false;
  state.block.error = null;
  state.report.isPending = false;
  state.report.isSuccess = false;
});
describe("contextual community actions", () => {
  it("hides actions from the owner of a shared item without offering to report a person", () => {
    state.user = { id: "organizer" };
    const view = render(<CommunityActions targetType="EVENT" targetId="event" ownerId="organizer" allowBlock={false} />);
    expect(screen.queryByRole("button")).toBeNull();

    state.user = { id: "reader" };
    view.rerender(<CommunityActions targetType="EVENT" targetId="event" ownerId="organizer" allowBlock={false} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["community.report"]);
  });
  it("requires a session and hides actions on own content", () => {
    state.user = null;
    const view = render(
      <CommunityActions
        targetType="REVIEW"
        targetId="review"
        authorId="author"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    state.user = { id: "author" };
    view.rerender(
      <CommunityActions
        targetType="REVIEW"
        targetId="review"
        authorId="author"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("preserves a failed report draft, retries with context and can cancel without sending", async () => {
    state.report.mutateAsync
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ id: "receipt" });
    render(
      <CommunityActions
        targetType="COMMENT"
        targetId="comment"
        authorId="author"
      />,
    );
    fireEvent.click(screen.getByText("community.report"));
    fireEvent.change(screen.getByLabelText("community.reason"), {
      target: { value: "OTHER" },
    });
    expect(screen.getByText("community.send")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("community.details"), {
      target: { value: "Context" },
    });
    fireEvent.click(screen.getByText("community.send"));
    await waitFor(() =>
      expect(state.report.mutateAsync).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByLabelText("community.details")).toHaveValue("Context");
    fireEvent.click(screen.getByText("community.send"));
    await waitFor(() =>
      expect(screen.queryByLabelText("community.details")).toBeNull(),
    );
    expect(state.report.mutateAsync).toHaveBeenLastCalledWith({
      targetType: "COMMENT",
      targetId: "comment",
      reason: "OTHER",
      description: "Context",
    });
    fireEvent.click(screen.getByText("community.report"));
    fireEvent.click(screen.getByText("community.cancel"));
    expect(state.report.mutateAsync).toHaveBeenCalledTimes(2);
  });
  it("reports the author identity separately and only blocks after confirmation", async () => {
    state.report.mutateAsync.mockResolvedValue({ id: "receipt" });
    state.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(
      <CommunityActions
        targetType="REVIEW"
        targetId="review"
        authorId="author"
      />,
    );
    fireEvent.click(screen.getByText("community.reportUser"));
    fireEvent.click(screen.getByText("community.send"));
    await waitFor(() =>
      expect(state.report.mutateAsync).toHaveBeenCalledWith({
        targetType: "USER",
        targetId: "author",
        reason: "SPAM",
        description: "",
      }),
    );
    fireEvent.click(screen.getByText("community.block"));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.block.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("community.block"));
    await waitFor(() =>
      expect(state.block.mutate).toHaveBeenCalledWith("author"),
    );
  });
  it("keeps events reportable without offering a block action", () => {
    render(
      <CommunityActions
        targetType="EVENT"
        targetId="event"
        allowBlock={false}
      />,
    );
    expect(screen.getByText("community.report")).toBeVisible();
    expect(screen.queryByText("community.block")).toBeNull();
  });
  it("says why a report failed instead of a generic error", () => {
    state.report.isError = true;
    state.report.error = apiError(422, "REPORT_LIMIT", "Daily report limit reached");
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getByRole("alert")).toHaveTextContent("community.errors.reportLimit");
  });
  it("says when a block was rate limited", () => {
    state.block.isError = true;
    state.block.error = apiError(429, "RATE_LIMIT_EXCEEDED", "Too many requests");
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getByRole("alert")).toHaveTextContent("community.errors.rateLimited");
  });
  it("keeps the generic error for unexpected failures", () => {
    state.report.isError = true;
    state.report.error = new Error("offline");
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getByRole("alert")).toHaveTextContent("community.error");
  });
  it("keeps the inline links as the default presentation", () => {
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "community.report",
      "community.reportUser",
      "community.block",
    ]);
    expect(screen.queryByRole("button", { name: "community.moreOptions" })).toBeNull();
  });
  it("confirms a received report inline in the links presentation", () => {
    state.report.isSuccess = true;
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getByRole("status")).toHaveTextContent("community.sent");
  });
});

describe("community actions menu", () => {
  const openMenu = () => {
    const trigger = screen.getByRole("button", { name: "community.moreOptions" });
    fireEvent.click(trigger);
    return trigger;
  };
  const menuItems = () => screen.getAllByRole("menuitem").map((item) => item.textContent);

  it("folds every action behind one accessible three-dot button", () => {
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    const trigger = screen.getByRole("button", { name: "community.moreOptions" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("community.report")).toBeNull();

    openMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeVisible();
    expect(menuItems()).toEqual(["community.report", "community.reportUser", "community.block"]);
  });
  it("offers only the actions the target allows", () => {
    const view = render(<CommunityActions variant="menu" targetType="EVENT" targetId="event" allowBlock={false} />);
    openMenu();
    expect(menuItems()).toEqual(["community.report"]);
    view.unmount();

    render(<CommunityActions variant="menu" targetType="USER" targetId="author" authorId="author" allowBlock={false} />);
    openMenu();
    expect(menuItems()).toEqual(["community.report"]);
  });
  it("is hidden from visitors, the author and the owner", () => {
    state.user = null;
    const view = render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.queryByRole("button")).toBeNull();
    state.user = { id: "author" };
    view.rerender(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.queryByRole("button")).toBeNull();
    state.user = { id: "organizer" };
    view.rerender(<CommunityActions variant="menu" targetType="EVENT" targetId="event" ownerId="organizer" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("closes on Escape and on an outside click", async () => {
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    const trigger = openMenu();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    openMenu();
    // Radix starts listening for outside presses one tick after the menu mounts.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
  it("moves between items with the keyboard", async () => {
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    openMenu();
    const menu = screen.getByRole("menu");
    const [report, reportUser, block] = screen.getAllByRole("menuitem");
    await waitFor(() => expect(report).toHaveFocus());
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(reportUser).toHaveFocus();
    fireEvent.keyDown(menu, { key: "End" });
    expect(block).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(report).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(block).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(reportUser).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Home" });
    expect(report).toHaveFocus();
    fireEvent.keyDown(menu, { key: "a" });
    expect(report).toHaveFocus();
  });
  it("reports content from a dialog, keeps the draft on failure and confirms when received", async () => {
    state.report.mutateAsync
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ id: "receipt" });
    const view = render(<CommunityActions variant="menu" targetType="COMMENT" targetId="comment" authorId="author" />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "community.report" }));
    expect(state.report.reset).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
    const dialog = screen.getByRole("dialog", { name: "community.report" });
    expect(dialog).toHaveTextContent("community.privacy");
    fireEvent.change(screen.getByLabelText("community.reason"), { target: { value: "OTHER" } });
    expect(screen.getByText("community.send")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("community.details"), { target: { value: "Context" } });
    fireEvent.click(screen.getByText("community.send"));
    await waitFor(() => expect(state.report.mutateAsync).toHaveBeenCalledTimes(1));
    state.report.isError = true;
    state.report.error = apiError(422, "REPORT_LIMIT", "Daily report limit reached");
    view.rerender(<CommunityActions variant="menu" targetType="COMMENT" targetId="comment" authorId="author" />);
    expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toHaveTextContent("community.errors.reportLimit");
    expect(screen.getByLabelText("community.details")).toHaveValue("Context");
    expect(state.addToast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("community.send"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(state.report.mutateAsync).toHaveBeenLastCalledWith({
      targetType: "COMMENT",
      targetId: "comment",
      reason: "OTHER",
      description: "Context",
    });
    expect(state.addToast).toHaveBeenCalledWith({ type: "success", message: "community.sent" });
  });
  it("reports the author identity and can cancel the dialog without sending", async () => {
    state.report.mutateAsync.mockResolvedValue({ id: "receipt" });
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "community.reportUser" }));
    expect(screen.getByRole("dialog", { name: "community.reportUser" })).toBeVisible();
    fireEvent.click(screen.getByText("community.send"));
    await waitFor(() =>
      expect(state.report.mutateAsync).toHaveBeenCalledWith({
        targetType: "USER",
        targetId: "author",
        reason: "SPAM",
        description: "",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "community.report" }));
    fireEvent.click(screen.getByText("community.cancel"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.report.mutateAsync).toHaveBeenCalledTimes(1);
  });
  it("reports a profile by its own identifier when no author is given", async () => {
    state.report.mutateAsync.mockResolvedValue({ id: "receipt" });
    render(<CommunityActions variant="menu" targetType="USER" targetId="profile" />);
    openMenu();
    expect(menuItems()).toEqual(["community.report"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "community.report" }));
    expect(screen.getByRole("dialog", { name: "community.reportUser" })).toBeVisible();
    fireEvent.click(screen.getByText("community.send"));
    await waitFor(() =>
      expect(state.report.mutateAsync).toHaveBeenCalledWith({
        targetType: "USER",
        targetId: "profile",
        reason: "SPAM",
        description: "",
      }),
    );
  });
  it("disables the menu while an action is in flight", () => {
    state.report.isPending = true;
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getByRole("button", { name: "community.moreOptions" })).toBeDisabled();
  });
  it("blocks only after confirmation and tells the outcome", async () => {
    state.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "community.block" }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.block.mutate).not.toHaveBeenCalled();

    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "community.block" }));
    await waitFor(() => expect(state.block.mutate).toHaveBeenCalledTimes(1));
    const [authorId, options] = state.block.mutate.mock.calls[0] as [
      string,
      { onSuccess: () => void; onError: (error: unknown) => void },
    ];
    expect(authorId).toBe("author");
    options.onSuccess();
    expect(state.addToast).toHaveBeenLastCalledWith({ type: "success", message: "community.blocked" });
    options.onError(apiError(429, "RATE_LIMIT_EXCEEDED", "Too many requests"));
    expect(state.addToast).toHaveBeenLastCalledWith({ type: "error", message: "community.errors.rateLimited" });
  });
});
