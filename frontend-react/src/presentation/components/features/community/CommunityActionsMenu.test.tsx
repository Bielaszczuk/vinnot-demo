import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommunityActionsMenu } from "./CommunityActionsMenu";

describe("community actions menu button", () => {
  it("runs the chosen item, closes and returns focus to the trigger", async () => {
    const report = vi.fn();
    const block = vi.fn();
    render(
      <CommunityActionsMenu
        label="More options"
        items={[
          { id: "report", label: "Report", onSelect: report },
          { id: "block", label: "Block", onSelect: block, danger: true },
        ]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "More options" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu", { name: "More options" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Block" })).toHaveClass("text-danger");
    fireEvent.click(screen.getByRole("menuitem", { name: "Report" }));
    expect(report).toHaveBeenCalledTimes(1);
    expect(block).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
  it("cannot be opened while disabled", () => {
    render(<CommunityActionsMenu label="More options" items={[]} disabled />);
    const trigger = screen.getByRole("button", { name: "More options" });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
