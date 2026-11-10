import { describe, expect, it } from "@jest/globals";
import React from "react";
import { render } from "@testing-library/react-native";
import { Bell, CalendarDays, LayoutDashboard, Share2, Wine } from "lucide-react-native";
import { AdminPageHero } from "../AdminPageHero";

describe("admin page hero", () => {
  it.each([
    ["wines", Wine],
    ["events", CalendarDays],
    ["notifications", Bell],
    ["dashboard", LayoutDashboard],
  ] as const)("shows the %s section icon in the hero mark", (section, Icon) => {
    const screen = render(<AdminPageHero title="Admin" section={section} />);
    expect(screen.UNSAFE_getAllByType(Icon)).toHaveLength(1);
  });

  it("shows the icon passed by a screen that has no section", () => {
    const screen = render(<AdminPageHero title="Social posts" icon={Share2} />);
    expect(screen.UNSAFE_getAllByType(Share2)).toHaveLength(1);
  });

  it("keeps the title, the subtitle and the New button", () => {
    const screen = render(
      <AdminPageHero title="Wines" subtitle="Catalog" section="wines" onNew={() => undefined} newLabel="New wine" />,
    );
    expect(screen.getByText("Wines")).toBeTruthy();
    expect(screen.getByText("Catalog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New wine" })).toBeTruthy();
  });
});
