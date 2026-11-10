import { fireEvent, render, screen } from "@testing-library/react-native";
import { CommunityReportForm, toReportInput } from "./CommunityReportForm";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const onSubmit = jest.fn();
const onCancel = jest.fn();
beforeEach(() => jest.clearAllMocks());

describe("toReportInput", () => {
  const draft = { reason: "SPAM" as const, description: "x" };
  it("targets the content for content reports", () => {
    expect(toReportInput("REVIEW", "review", "author", draft)).toEqual({
      targetType: "REVIEW",
      targetId: "review",
      reason: "SPAM",
      description: "x",
    });
  });
  it("targets the author for user reports, falling back to the target id", () => {
    expect(toReportInput("USER", "review", "author", draft).targetId).toBe("author");
    expect(toReportInput("USER", "user", undefined, draft).targetId).toBe("user");
  });
});

describe("CommunityReportForm", () => {
  it.each(["inline", "sheet"] as const)("requires details for OTHER and submits the draft (%s)", (layout) => {
    render(<CommunityReportForm layout={layout} pending={false} onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText("community.privacy")).toBeTruthy();
    fireEvent.press(screen.getByText("community.reasons.OTHER"));
    expect(screen.getByRole("radio", { name: "community.reasons.OTHER" }).props.accessibilityState)
      .toMatchObject({ checked: true });
    fireEvent.press(screen.getByText("community.send"));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText("community.details"), "Context");
    fireEvent.press(screen.getByText("community.send"));
    expect(onSubmit).toHaveBeenCalledWith({ reason: "OTHER", description: "Context" });
    fireEvent.press(screen.getByText("community.cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows the pending label inline and the error only in the sheet layout", () => {
    const view = render(
      <CommunityReportForm pending error="community.error" onSubmit={onSubmit} onCancel={onCancel} />,
    );
    expect(screen.getByText("community.pending")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    view.rerender(
      <CommunityReportForm layout="sheet" pending={false} error="community.error" onSubmit={onSubmit} onCancel={onCancel} />,
    );
    expect(screen.getByRole("alert").props.children).toBe("community.error");
  });
});
