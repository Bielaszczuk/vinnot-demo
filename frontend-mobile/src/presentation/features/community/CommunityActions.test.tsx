import { act, render, screen, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";
import { CommunityActions } from "./CommunityActions";
const mockState = {
  user: { id: "reader" } as { id: string } | null,
  report: {
    mutateAsync: jest.fn(),
    reset: jest.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: undefined as unknown,
  },
  block: { mutate: jest.fn(), isPending: false, isError: false, error: undefined as unknown },
};
jest.mock("@/presentation/hooks/queries/community/useCommunity", () => ({
  useCommunityActions: () => mockState,
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => {
  jest.clearAllMocks();
  mockState.user = { id: "reader" };
  Object.assign(mockState.report, { isError: false, isSuccess: false, error: undefined });
  Object.assign(mockState.block, { isError: false, error: undefined });
});
describe("native community actions", () => {
  it("keeps the inline links by default, without a three-dots menu", () => {
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getByText("community.report")).toBeTruthy();
    expect(screen.getByText("community.reportUser")).toBeTruthy();
    expect(screen.getByText("community.block")).toBeTruthy();
    expect(screen.queryByLabelText("community.moreOptions")).toBeNull();
    expect(screen.queryByLabelText("community.details")).toBeNull();
  });
  it("confirms a sent report inline", () => {
    Object.assign(mockState.report, { isSuccess: true });
    render(<CommunityActions targetType="EVENT" targetId="event" allowBlock={false} />);
    expect(screen.getByText("community.sent")).toBeTruthy();
  });
  it("hides actions from the owner of a shared item without offering to report a person", () => {
    mockState.user = { id: "organizer" };
    const view = render(<CommunityActions targetType="EVENT" targetId="event" ownerId="organizer" allowBlock={false} />);
    expect(screen.queryByText("community.report")).toBeNull();

    mockState.user = { id: "reader" };
    view.rerender(<CommunityActions targetType="EVENT" targetId="event" ownerId="organizer" allowBlock={false} />);
    expect(screen.getByText("community.report")).toBeTruthy();
    expect(screen.queryByText("community.reportUser")).toBeNull();
  });
  it("requires a session and hides actions on own content", () => {
    mockState.user = null;
    const view = render(
      <CommunityActions targetType="REVIEW" targetId="review" authorId="author" />,
    );
    expect(screen.queryByText("community.report")).toBeNull();
    mockState.user = { id: "author" };
    view.rerender(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.queryByText("community.report")).toBeNull();
  });
  it("preserves the draft on failure and sends the contextual target on retry", async () => {
    mockState.report.mutateAsync
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ id: "receipt" });
    render(<CommunityActions targetType="COMMENT" targetId="comment" authorId="author" />);
    fireEvent.press(screen.getByText("community.report"));
    fireEvent.press(screen.getByText("community.reasons.OTHER"));
    fireEvent.changeText(screen.getByLabelText("community.details"), "Context");
    await act(async () => {
      fireEvent.press(screen.getByText("community.send"));
    });
    expect(mockState.report.mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("community.details").props.value).toBe("Context");
    await act(async () => {
      fireEvent.press(screen.getByText("community.send"));
    });
    expect(mockState.report.mutateAsync).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText("community.details")).toBeNull();
    expect(mockState.report.mutateAsync).toHaveBeenLastCalledWith({
      targetType: "COMMENT",
      targetId: "comment",
      reason: "OTHER",
      description: "Context",
    });
  });
  it("cancels reports and requires confirmation before blocking", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    fireEvent.press(screen.getByText("community.report"));
    fireEvent.press(screen.getByText("community.cancel"));
    expect(mockState.report.mutateAsync).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("community.block"));
    expect(mockState.block.mutate).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]![2]!;
    expect(buttons[0]!.style).toBe("cancel");
    buttons[1]!.onPress?.();
    expect(mockState.block.mutate).toHaveBeenCalledWith("author");
    alert.mockRestore();
  });
  it.each([
    [{ status: 422, code: "REPORT_LIMIT", message: "Daily report limit reached" }, "community.errors.reportLimit"],
    [{ status: 429, code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" }, "community.errors.rateLimited"],
    [{ status: 422, code: "SELF_REPORT", message: "You cannot report your own content" }, "community.errors.selfReport"],
    [{ status: 404, code: "NOT_FOUND", message: "Content not found" }, "community.errors.notFound"],
    [{ status: 500, code: "INTERNAL_ERROR", message: "Failure" }, "community.error"],
  ])("explains why a report failed: %p", (error, message) => {
    Object.assign(mockState.report, { isError: true, error });
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getByRole("alert").props.children).toBe(message);
  });
  it("explains why a block failed", () => {
    Object.assign(mockState.block, { isError: true, error: { status: 422, code: "SELF_BLOCK", message: "x" } });
    render(<CommunityActions targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.getByRole("alert").props.children).toBe("community.errors.selfBlock");
  });
});
