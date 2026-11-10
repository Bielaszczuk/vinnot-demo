import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WineColorSwatch } from "./WineColorSwatch";

describe("WineColorSwatch", () => {
  it("paints the core color turning into the rim color", () => {
    render(<WineColorSwatch tone="RED_GARNET" rim="RED_TAWNY" label="Rojo granate con ribete teja." />);
    const swatch = screen.getByRole("img", { name: "Rojo granate con ribete teja." });
    expect(swatch).toHaveAttribute("data-tone", "RED_GARNET");
    expect(swatch).toHaveAttribute("data-rim", "RED_TAWNY");
    const stroke = screen.getByTestId("wine-swatch-stroke");
    expect(stroke.style.backgroundImage).toContain("rgb(122, 42, 30)");
    expect(stroke.style.backgroundImage).toContain("rgb(142, 68, 36)");
    expect(swatch).toHaveClass("wine-swatch-paint");
  });

  it("thins the core color at the rim when the text names no rim", () => {
    render(<WineColorSwatch tone="RED_GARNET" label="Rojo granate." />);
    const swatch = screen.getByRole("img", { name: "Rojo granate." });
    expect(swatch).not.toHaveAttribute("data-rim");
    expect(screen.getByTestId("wine-swatch-stroke").style.backgroundImage).toContain("rgb(169, 117, 109)");
  });

  it("runs a wash of each named reflection along the lower edge, one tone per pass", () => {
    vi.useFakeTimers();
    render(
      <WineColorSwatch tone="RED_RUBY_DEEP" reflections={["RED_PURPLE", "RED_TAWNY"]} highlights
        label="Rojo rubí profundo con reflejos violáceos y matices teja." />,
    );
    const swatch = screen.getByRole("img", { name: "Rojo rubí profundo con reflejos violáceos y matices teja." });
    const sheen = () => screen.getByTestId("wine-swatch-sheen");
    expect(swatch).toHaveAttribute("data-reflections", "RED_PURPLE RED_TAWNY");
    expect(swatch.style.backgroundImage).not.toContain("rgb(142, 63, 168)");
    expect(sheen()).toHaveClass("wine-swatch-sheen");
    expect(sheen().style.backgroundImage).toContain("rgb(176, 121, 194)");
    expect(sheen().style.mixBlendMode).toBe("soft-light");
    act(() => { vi.advanceTimersByTime(900 + 4200); });
    expect(sheen().style.backgroundImage).toContain("rgb(196, 106, 50)");
    expect(sheen().style.mixBlendMode).toBe("color");
    act(() => { vi.advanceTimersByTime(4200); });
    expect(sheen().style.backgroundImage).toContain("rgb(176, 121, 194)");
    vi.useRealTimers();
  });

  it("shows a greenish reflection on a straw stroke in green, not in the wine's own color", () => {
    render(<WineColorSwatch tone="WHITE_STRAW" reflections={["WHITE_GREEN"]} highlights
      label="Amarillo pálido con reflejos verdosos." />);
    expect(screen.getByTestId("wine-swatch-sheen").style.backgroundImage).toContain("rgb(157, 191, 58)");
    expect(screen.getByTestId("wine-swatch-stroke").style.backgroundImage).toContain("rgb(230, 207, 116)");
  });

  it("washes a lighter core when the line names brightness but no other tone", () => {
    render(<WineColorSwatch tone="RED_RUBY" highlights label="Rojo rubí brillante." />);
    expect(screen.getByTestId("wine-swatch-sheen").style.backgroundImage).toContain("rgb(229, 128, 154)");
    expect(screen.getByTestId("wine-swatch-sheen").style.mixBlendMode).toBe("soft-light");
  });

  it("keeps the stroke still when the color line names no reflections", () => {
    render(<WineColorSwatch tone="RED_RUBY_DEEP" label="Rojo rubí intenso." />);
    expect(screen.getByRole("img", { name: "Rojo rubí intenso." })).not.toHaveAttribute("data-reflections");
    expect(screen.queryByTestId("wine-swatch-sheen")).toBeNull();
  });

  it("shows nothing when the color line names no hue", () => {
    const { container } = render(<WineColorSwatch tone={null} label="Brillante" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("paints with the stroke that matches the depth the color line names", () => {
    const { rerender } = render(<WineColorSwatch tone="RED_PURPLE" intensity="DEEP" label="Púrpura casi opaco." />);
    expect(screen.getByRole("img")).toHaveAttribute("data-stroke", "dense");
    expect(screen.getByTestId("wine-swatch-stroke").style.maskImage).toContain("stroke-dense");

    rerender(<WineColorSwatch tone="RED_PURPLE" intensity="PALE" label="Púrpura pálido." />);
    expect(screen.getByRole("img")).toHaveAttribute("data-stroke", "light");

    rerender(<WineColorSwatch tone="RED_BRICK" intensity="DEEP" label="Ladrillo profundo." />);
    expect(screen.getByRole("img")).toHaveAttribute("data-stroke", "dense");
  });

  it("keeps the base stroke when the line names no depth", () => {
    render(<WineColorSwatch tone="RED_RUBY" label="Rubí." />);
    expect(screen.getByRole("img")).toHaveAttribute("data-stroke", "medium");
  });
});
