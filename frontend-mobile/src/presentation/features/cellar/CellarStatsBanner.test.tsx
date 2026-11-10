import { fireEvent, render } from "@testing-library/react-native";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { CellarStatsBanner } from "./CellarStatsBanner";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es-AR" } }),
}));

function entry(id: string, type: string, region: string, rating: number | null, price: number | null): CellarEntry {
  return {
    id,
    wine: {
      id: `wine-${id}`, name: id, winery: "Winery", wineryId: null, type, vintage: null,
      imageUrl: null, region, country: "Argentina", price: null, rating: null,
    },
    rating, purchasePrice: price, notes: null, vintage: null, addedAt: new Date("2026-10-01T00:00:00Z"),
  };
}

const entries = [
  entry("a", "RED", "Mendoza", 4, 12000),
  entry("b", "RED", "mendoza ", 3, 8000),
  entry("c", "WHITE", "Salta", null, null),
];

it("shows wines, average rating and regions, and never the money spent", () => {
  const view = render(<CellarStatsBanner entries={entries} onAddPress={jest.fn()} />);

  expect(view.getByText("cellar.stats.wines")).toBeTruthy();
  expect(view.getByText("3")).toBeTruthy();
  expect(view.getByText("cellar.stats.average")).toBeTruthy();
  expect(view.getByText("cellar.stats.regions")).toBeTruthy();
  expect(view.getByText("2")).toBeTruthy();
  expect(view.queryByText("cellar.totalInvested")).toBeNull();
  expect(view.queryByText(/20[.,]?000/)).toBeNull();
});

it("shows the cellar illustration and the mix of wine types", () => {
  const view = render(<CellarStatsBanner entries={entries} onAddPress={jest.fn()} />);

  expect(view.getByTestId("cellar-banner-illustration")).toBeTruthy();
  expect(view.getByTestId("cellar-type-mix-RED")).toBeTruthy();
  expect(view.getByTestId("cellar-type-mix-WHITE")).toBeTruthy();
  expect(view.getByText("wines.types.red · 2")).toBeTruthy();
  expect(view.getByText("wines.types.white · 1")).toBeTruthy();
});

it("keeps only the title and the add button while the cellar is empty", () => {
  const onAddPress = jest.fn();
  const view = render(<CellarStatsBanner entries={[]} onAddPress={onAddPress} />);

  expect(view.getByText("cellar.title")).toBeTruthy();
  expect(view.queryByTestId("cellar-banner-illustration")).toBeNull();
  expect(view.queryByText("cellar.stats.wines")).toBeNull();
  fireEvent.press(view.getByLabelText("cellar.addWine"));
  expect(onAddPress).toHaveBeenCalled();
});
