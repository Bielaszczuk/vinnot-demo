import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { CommunityActions } from "./CommunityActions";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
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
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockSuccess, showError: mockError }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
    BottomSheetModal: forwardRef(
      ({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }, ref: unknown) => {
        useImperativeHandle(ref, () => ({
          present: mockPresent,
          dismiss: () => {
            mockDismiss();
            onDismiss?.();
          },
        }));
        return children;
      },
    ),
  };
});

const MORE = "community.moreOptions";

beforeEach(() => {
  jest.clearAllMocks();
  mockState.user = { id: "reader" };
  Object.assign(mockState.report, { isPending: false, isError: false, error: undefined });
  Object.assign(mockState.block, { isPending: false, isError: false, error: undefined });
});

function openMenu() {
  fireEvent.press(screen.getByRole("button", { name: MORE }));
}

describe("community actions menu", () => {
  it("replaces the inline links with one three-dots button that opens the sheet", () => {
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);

    const trigger = screen.getByRole("button", { name: MORE });
    expect(trigger.props.hitSlop).toBe(4);
    openMenu();

    expect(mockState.report.reset).toHaveBeenCalled();
    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(screen.getByText("community.report")).toBeTruthy();
    expect(screen.getByText("community.reportUser")).toBeTruthy();
    expect(screen.getByText("community.block")).toBeTruthy();
    expect(screen.getByText("community.cancel")).toBeTruthy();
    expect(screen.queryByLabelText("community.details")).toBeNull();
  });

  it.each([
    ["without an author", { targetType: "EVENT", authorId: undefined, allowBlock: true }, false, false],
    ["for a user target", { targetType: "USER", authorId: "author", allowBlock: true }, false, true],
    ["when blocking is not allowed", { targetType: "COMMENT", authorId: "author", allowBlock: false }, true, false],
  ] as const)("lists only the permitted options %s", (_case, props, reportUser, blockUser) => {
    render(<CommunityActions variant="menu" targetId="target" {...props} />);

    expect(screen.getByText("community.report")).toBeTruthy();
    expect(!!screen.queryByText("community.reportUser")).toBe(reportUser);
    expect(!!screen.queryByText("community.block")).toBe(blockUser);
  });

  it("hides the menu from anonymous visitors, the author and the owner", () => {
    mockState.user = null;
    const view = render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.queryByRole("button", { name: MORE })).toBeNull();

    mockState.user = { id: "author" };
    view.rerender(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    expect(screen.queryByRole("button", { name: MORE })).toBeNull();

    mockState.user = { id: "organizer" };
    view.rerender(<CommunityActions variant="menu" targetType="EVENT" targetId="event" ownerId="organizer" />);
    expect(screen.queryByRole("button", { name: MORE })).toBeNull();
  });

  it("reports the content from the sheet, then dismisses it and confirms with a toast", async () => {
    mockState.report.mutateAsync.mockResolvedValueOnce({ id: "receipt" });
    render(<CommunityActions variant="menu" targetType="COMMENT" targetId="comment" authorId="author" />);
    openMenu();
    fireEvent.press(screen.getByText("community.report"));

    expect(screen.getByText("community.privacy")).toBeTruthy();
    fireEvent.press(screen.getByText("community.reasons.HARASSMENT"));
    fireEvent.changeText(screen.getByLabelText("community.details"), "Insults");
    await act(async () => {
      fireEvent.press(screen.getByText("community.send"));
    });

    expect(mockState.report.mutateAsync).toHaveBeenCalledWith({
      targetType: "COMMENT",
      targetId: "comment",
      reason: "HARASSMENT",
      description: "Insults",
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockSuccess).toHaveBeenCalledWith("community.sent");
    expect(screen.queryByLabelText("community.details")).toBeNull();
  });

  it("reports the author as a user target", async () => {
    mockState.report.mutateAsync.mockResolvedValueOnce({ id: "receipt" });
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    openMenu();
    fireEvent.press(screen.getByText("community.reportUser"));
    await act(async () => {
      fireEvent.press(screen.getByText("community.send"));
    });

    expect(mockState.report.mutateAsync).toHaveBeenCalledWith({
      targetType: "USER",
      targetId: "author",
      reason: "SPAM",
      description: "",
    });
  });

  it("keeps the sheet and the draft open when the report fails", async () => {
    mockState.report.mutateAsync.mockImplementationOnce(async () => {
      Object.assign(mockState.report, { isError: true, error: { status: 422, code: "REPORT_LIMIT" } });
      throw new Error("limit");
    });
    const ui = () => <CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />;
    const view = render(ui());
    openMenu();
    fireEvent.press(screen.getByText("community.report"));
    fireEvent.press(screen.getByText("community.reasons.OTHER"));
    expect(screen.getByText("community.send")).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText("community.details"), "Context");
    await act(async () => {
      fireEvent.press(screen.getByText("community.send"));
    });
    view.rerender(ui());

    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText("community.details").props.value).toBe("Context");
    expect(screen.getByRole("alert").props.children).toBe("community.errors.reportLimit");
  });

  it("returns to the option list when the report is cancelled", () => {
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    openMenu();
    fireEvent.press(screen.getByText("community.report"));
    fireEvent.press(screen.getByText("community.cancel"));

    expect(screen.queryByLabelText("community.details")).toBeNull();
    expect(screen.getByText("community.reportUser")).toBeTruthy();
    fireEvent.press(screen.getByText("community.cancel"));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockState.report.mutateAsync).not.toHaveBeenCalled();
  });

  it("dismisses the sheet before confirming a block, then blocks and reports the outcome", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<CommunityActions variant="menu" targetType="REVIEW" targetId="review" authorId="author" />);
    openMenu();
    fireEvent.press(screen.getByText("community.block"));

    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockDismiss.mock.invocationCallOrder[0]).toBeLessThan(alert.mock.invocationCallOrder[0]!);
    expect(mockState.block.mutate).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]![2]!;
    expect(buttons[0]!.style).toBe("cancel");
    buttons[1]!.onPress?.();

    expect(mockState.block.mutate).toHaveBeenCalledWith("author", expect.any(Object));
    const callbacks = mockState.block.mutate.mock.calls[0]![1] as {
      onSuccess: () => void;
      onError: (error: unknown) => void;
    };
    callbacks.onSuccess();
    expect(mockSuccess).toHaveBeenCalledWith("community.blocked");
    callbacks.onError({ status: 422, code: "SELF_BLOCK" });
    expect(mockError).toHaveBeenCalledWith("community.errors.selfBlock");
    alert.mockRestore();
  });
});
