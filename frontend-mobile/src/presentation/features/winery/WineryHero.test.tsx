import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { WineryHero } from "./WineryHero";
import type { Winery } from "@/domain/winery/winery.types";

let mockLanguage = "en-US";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: mockLanguage, language: mockLanguage } }),
}));
jest.mock("@/presentation/hooks/useExternalLink", () => ({ useExternalLink: () => jest.fn() }));

const winery = (descriptions: Partial<Pick<Winery, "descriptionEs" | "descriptionEn">>) =>
  ({ id: "w1", name: "Bodega", descriptionEs: null, descriptionEn: null, ...descriptions }) as unknown as Winery;

describe("WineryHero description", () => {
  beforeEach(() => {
    mockLanguage = "en-US";
  });

  it("shows the English description to an English user", () => {
    render(<WineryHero winery={winery({ descriptionEs: "Bodega familiar", descriptionEn: "Family winery" })} />);
    expect(screen.getByText("Family winery")).toBeTruthy();
    expect(screen.queryByText("Bodega familiar")).toBeNull();
  });

  it("shows the Spanish description to a Spanish user", () => {
    mockLanguage = "es-AR";
    render(<WineryHero winery={winery({ descriptionEs: "Bodega familiar", descriptionEn: "Family winery" })} />);
    expect(screen.getByText("Bodega familiar")).toBeTruthy();
    expect(screen.queryByText("Family winery")).toBeNull();
  });

  it("falls back to the other language when the preferred one is missing", () => {
    const { rerender } = render(<WineryHero winery={winery({ descriptionEs: "Bodega familiar", descriptionEn: " " })} />);
    expect(screen.getByText("Bodega familiar")).toBeTruthy();
    mockLanguage = "es-AR";
    rerender(<WineryHero winery={winery({ descriptionEn: "Family winery" })} />);
    expect(screen.getByText("Family winery")).toBeTruthy();
  });
});
