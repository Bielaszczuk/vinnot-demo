import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { RouteStopTimeline } from "../RouteStopTimeline";
import { routeNavigationService } from "@/application/services/routeNavigation.service";
import type { RouteStop } from "@/domain/route/route.types";
import mockEn from "@/shared/i18n/locales/en-US.json";
import mockEs from "@/shared/i18n/locales/es-AR.json";
let mockLanguage = "es";
const mockShowError = jest.fn();
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const dictionary = mockLanguage === "en" ? mockEn : mockEs;
      return (
        key
          .split(".")
          .reduce<unknown>(
            (value, part) =>
              value && typeof value === "object"
                ? (value as Record<string, unknown>)[part]
                : undefined,
            dictionary,
          ) ??
        fallback ??
        key
      );
    },
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError }),
}));
jest.mock("@/application/services/routeNavigation.service", () => ({
  routeNavigationService: { openStop: jest.fn(), openRoute: jest.fn() },
}));
const first: RouteStop = {
  id: "first",
  name: "Contra Corriente Bodega",
  type: "winery",
  order: 1,
  description: "Bodega en Patagonia",
  location: { address: "RP71, Trevelin", city: "", latitude: null, longitude: null },
  duration: 60,
  winery: {
    id: "winery",
    name: "Contra Corriente Bodega",
    wines: [],
    phone: "+549000000000",
    email: "contacto@bodega.example",
  },
};
const second = {
  ...first,
  id: "second",
  name: "Viñas del Nant y Fall",
  description: "Segunda parada",
  winery: null,
};
afterEach(() => {
  jest.resetAllMocks();
  mockLanguage = "es";
});
it("expands one stop at a time, keeps contact details readable and supports collapsing", () => {
  const view = render(<RouteStopTimeline stops={[first, second]} />);
  expect(view.getByText(first.winery!.email!)).toBeTruthy();
  expect(view.getByRole("button", { name: first.name }).props.accessibilityState.expanded).toBe(
    true,
  );
  fireEvent.press(view.getByRole("button", { name: second.name }));
  expect(view.queryByText(first.winery!.email!)).toBeNull();
  expect(view.getByText("Segunda parada")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: second.name }));
  expect(view.queryByText("Segunda parada")).toBeNull();
});
it("opens Maps without toggling the expanded header or firing another navigation", async () => {
  (routeNavigationService.openStop as jest.Mock).mockResolvedValue(true);
  const view = render(<RouteStopTimeline stops={[first]} />);
  fireEvent.press(view.getByRole("link", { name: "Abrir en Maps" }));
  expect(routeNavigationService.openStop).toHaveBeenCalledTimes(1);
  expect(routeNavigationService.openStop).toHaveBeenCalledWith(first);
  expect(view.getByRole("button", { name: first.name }).props.accessibilityState.expanded).toBe(
    true,
  );
});
it("uses English UI labels and supports an empty itinerary", () => {
  mockLanguage = "en";
  const view = render(<RouteStopTimeline stops={[first]} />);
  expect(view.getByText("Route stops")).toBeTruthy();
  expect(view.getByText("Winery")).toBeTruthy();
  expect(view.getByRole("link", { name: "Open in Maps" })).toBeTruthy();
  view.rerender(<RouteStopTimeline stops={[]} />);
  expect(view.toJSON()).toBeNull();
});
