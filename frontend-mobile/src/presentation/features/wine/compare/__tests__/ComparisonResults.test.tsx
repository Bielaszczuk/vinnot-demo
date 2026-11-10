import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ComparisonResults } from "../ComparisonResults";
import type { WineComparison } from "@/domain/wine/wine.types";
import mockEn from "@/shared/i18n/locales/en-US.json";
import mockEs from "@/shared/i18n/locales/es-AR.json";

let mockLanguage: "es" | "en" = "es";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: string | Record<string, unknown>) => {
      const dictionary = mockLanguage === "en" ? mockEn : mockEs;
      const found = key.split(".").reduce<unknown>(
        (value, part) => (value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined),
        dictionary,
      );
      const vars = typeof options === "object" ? options : {};
      const fallback = typeof options === "string" ? options : (vars.defaultValue as string | undefined);
      const template = typeof found === "string" ? found : (fallback ?? key);
      return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ""));
    },
  }),
}));

jest.mock("@/presentation/components/ui/Card", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Card: ({ children }: { children: React.ReactNode }) => mockReact.createElement("View", null, children),
  };
});

const legacy: WineComparison = {
  wines: [],
  attributes: [],
  aiSummary: "Two Malbecs from different altitudes.",
  summary: "Two Malbecs from different altitudes.",
  keyDifferences: ["Altitude"],
  similarities: ["Same grape"],
  attributeComparison: {
    attributes: [{ name: "Cuerpo", wineAValue: "Pleno", wineBValue: "Medio", wineAScore: 80, wineBScore: 55 }],
  },
  recommendationWineA: "Open it with a long dinner.",
  recommendationWineB: "Open it on a weeknight.",
  recommendation: "Both are good, Alto wins on structure.",
};

const rich: WineComparison = {
  ...legacy,
  bestFor: { wineA: ["Slow dinners"], wineB: ["Weeknight pizza"] },
  tastingNotes: {
    wineA: { identity: "A Gualtallary Malbec at 1,400 m.", appearance: "Deep violet", nose: "Violets", palate: "Chalky", finish: "Long" },
    wineB: { identity: "A warm Lunlunta Malbec.", nose: "Ripe plum" },
  },
  chooseIf: [
    { pick: "A", situation: "A slow dinner", why: "Its tannins need food." },
    { pick: "B", situation: "A weeknight", why: "It is ready now." },
  ],
  pairings: {
    wineA: [{ dish: "Braised short ribs", why: "Fat softens the tannin." }],
    wineB: [{ dish: "Mushroom risotto" }],
    shared: { dish: "Grilled provoleta", why: "Works with both." },
  },
  serving: { wineA: { temperature: "16-17 °C", decanting: "45 minutes" }, wineB: { temperature: "15 °C" } },
  aging: { wineA: "Drink 2026-2034", wineB: "Drink now" },
  value: "Bajo costs less for a similar quality.",
};

function renderResults(comparison: WineComparison) {
  return render(<ComparisonResults comparison={comparison} wineAName="Alto Malbec" wineBName="Bajo Malbec" />);
}

describe("ComparisonResults", () => {
  beforeEach(() => {
    mockLanguage = "es";
  });

  it("renders legacy content with the existing sections and none of the new ones", () => {
    const screen = renderResults(legacy);

    expect(screen.getByText("Resumen")).toBeTruthy();
    expect(screen.getByText("Two Malbecs from different altitudes.")).toBeTruthy();
    expect(screen.getByText("Atributos")).toBeTruthy();
    expect(screen.getByText("Diferencias clave")).toBeTruthy();
    expect(screen.getByText("Altitude")).toBeTruthy();
    expect(screen.getByText("Similitudes")).toBeTruthy();
    expect(screen.getByText("Same grape")).toBeTruthy();
    expect(screen.getByText("Recomendación de nuestro sommelier especializado")).toBeTruthy();
    expect(screen.getByText("Open it with a long dinner.")).toBeTruthy();
    expect(screen.getByText("Open it on a weeknight.")).toBeTruthy();
    expect(screen.getByText("Both are good, Alto wins on structure.")).toBeTruthy();
    for (const title of ["Notas de cata", "Para quién es", "Según tu gusto", "Maridajes", "Servicio y guarda", "Relación precio-calidad"]) {
      expect(screen.queryByText(title)).toBeNull();
    }
  });

  it("shows tasting notes per wine behind an A/B switch with the identity highlighted", () => {
    const screen = renderResults(rich);

    expect(screen.getByText("Notas de cata")).toBeTruthy();
    expect(screen.getByTestId("tasting-identity").props.children).toBe("A Gualtallary Malbec at 1,400 m.");
    expect(screen.getByText("Vista")).toBeTruthy();
    expect(screen.getByText("Violets")).toBeTruthy();
    expect(screen.getByText("Chalky")).toBeTruthy();
    expect(screen.getByText("Long")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasting-tab-B"));

    expect(screen.getByTestId("tasting-identity").props.children).toBe("A warm Lunlunta Malbec.");
    expect(screen.getByText("Ripe plum")).toBeTruthy();
    expect(screen.queryByText("Violets")).toBeNull();
    expect(screen.queryByText("Vista")).toBeNull();
  });

  it("renders the drinker profiles each wine suits", () => {
    const screen = renderResults(rich);

    expect(screen.getByText("Para quién es")).toBeTruthy();
    expect(screen.getByText("Slow dinners")).toBeTruthy();
    expect(screen.getByText("Weeknight pizza")).toBeTruthy();
  });

  it("groups choose-if items under the wine they pick", () => {
    const screen = renderResults(rich);

    expect(screen.getByText("Según tu gusto")).toBeTruthy();
    expect(screen.getByText("Andá por Alto Malbec")).toBeTruthy();
    expect(screen.getByText("Andá por Bajo Malbec")).toBeTruthy();
    expect(screen.getByText("A slow dinner")).toBeTruthy();
    expect(screen.getByText("It is ready now.")).toBeTruthy();
  });

  it("renders pairings per wine and the shared pairing", () => {
    const screen = renderResults(rich);

    expect(screen.getByText("Maridajes")).toBeTruthy();
    expect(screen.getByText("Braised short ribs")).toBeTruthy();
    expect(screen.getByText("Fat softens the tannin.")).toBeTruthy();
    expect(screen.getByText("Mushroom risotto")).toBeTruthy();
    expect(screen.getByText("Para los dos")).toBeTruthy();
    expect(screen.getByText("Grilled provoleta")).toBeTruthy();
  });

  it("renders serving, aging, the value note and the verdict callout", () => {
    const screen = renderResults(rich);

    expect(screen.getByText("Servicio y guarda")).toBeTruthy();
    expect(screen.getByText("16-17 °C")).toBeTruthy();
    expect(screen.getByText("45 minutes")).toBeTruthy();
    expect(screen.getByText("15 °C")).toBeTruthy();
    expect(screen.getByText("Drink 2026-2034")).toBeTruthy();
    expect(screen.getByText("Drink now")).toBeTruthy();
    expect(screen.getByText("Relación precio-calidad")).toBeTruthy();
    expect(screen.getByText("Bajo costs less for a similar quality.")).toBeTruthy();
    expect(screen.getByText("Veredicto")).toBeTruthy();
    expect(screen.getByText("Both are good, Alto wins on structure.")).toBeTruthy();
  });

  it("hides the tasting switch when only one wine has notes and skips empty pieces", () => {
    const screen = renderResults({
      ...legacy,
      tastingNotes: { wineB: { nose: "Ripe plum" } },
      pairings: { wineA: [], wineB: [{ dish: "Risotto" }] },
      serving: { wineB: { decanting: "No" } },
    });

    expect(screen.queryByTestId("tasting-tab-A")).toBeNull();
    expect(screen.queryByTestId("tasting-identity")).toBeNull();
    expect(screen.getByText("Ripe plum")).toBeTruthy();
    expect(screen.getByText("Risotto")).toBeTruthy();
    expect(screen.queryByText("Para los dos")).toBeNull();
    expect(screen.getByText("No")).toBeTruthy();
  });

  it("localizes the new section labels in English", () => {
    mockLanguage = "en";
    const screen = renderResults(rich);

    for (const label of ["Tasting notes", "Who it's for", "Which suits your taste", "Go for Alto Malbec", "Pairings", "Works with both", "Serving and aging", "Value for money", "Verdict"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
