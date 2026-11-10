import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CommunityReportForm } from "./CommunityReportForm";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const handlers = () => ({
  onReasonChange: vi.fn(),
  onDescriptionChange: vi.fn(),
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
});

describe("community report form", () => {
  it("edits the draft and submits it through the owner", () => {
    const props = handlers();
    render(<CommunityReportForm reason="SPAM" description="" pending={false} {...props} />);
    expect(screen.getByText("community.privacy")).toBeVisible();
    fireEvent.change(screen.getByLabelText("community.reason"), { target: { value: "HATE" } });
    expect(props.onReasonChange).toHaveBeenCalledWith("HATE");
    fireEvent.change(screen.getByLabelText("community.details"), { target: { value: "Context" } });
    expect(props.onDescriptionChange).toHaveBeenCalledWith("Context");
    fireEvent.click(screen.getByText("community.send"));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("community.cancel"));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
  it("requires details for another reason and locks the fields while sending", () => {
    const props = handlers();
    const view = render(<CommunityReportForm reason="OTHER" description=" " pending={false} {...props} />);
    expect(screen.getByText("community.send")).toBeDisabled();
    expect(screen.getByLabelText("community.details")).toBeRequired();
    view.rerender(<CommunityReportForm reason="OTHER" description="Context" pending {...props} />);
    expect(screen.getByText("community.pending")).toBeDisabled();
    expect(screen.getByLabelText("community.reason")).toBeDisabled();
    expect(screen.getByText("community.cancel")).toBeDisabled();
  });
});
