import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StatsRow } from "./StatsRow";
import { hasAnyRole, ROLES } from "@/shared/config/roles";
import mockEn from "@/shared/i18n/locales/en-US.json";
import mockEs from "@/shared/i18n/locales/es-AR.json";
let mockLanguage = "es";
jest.mock("react-native-reanimated", () => jest.requireActual("react-native-reanimated/mock"));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key
        .split(".")
        .reduce<unknown>(
          (v, k) => (v as Record<string, unknown>)?.[k],
          mockLanguage === "es" ? mockEs : mockEn,
        ),
  }),
}));
const stats = {
  cellarSize: 0,
  totalReviews: 2,
  totalWinesTasted: 0,
  totalEventsAttended: 3,
  totalRoutesCompleted: 0,
  averageRating: 4,
};

it.each([[ROLES.USER], [ROLES.MODERATOR], [ROLES.USER, ROLES.MODERATOR]])(
  "hides organizer statistics for %p and keeps the empty cellar actionable",
  (...roles) => {
    mockLanguage = "es";
    const open = jest.fn();
    const view = render(
      <StatsRow
        stats={stats}
        showOrganizerStats={hasAnyRole(roles, [ROLES.PARTNER, ROLES.ADMIN])}
        onCellarPress={open}
      />,
    );
    expect(view.queryByText("Eventos")).toBeNull();
    expect(view.queryByText("Rutas")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Abrir mi bodega" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(view.getByText("Reseñas")).toBeTruthy();
  },
);

it.each([[ROLES.PARTNER], [ROLES.ADMIN], [ROLES.USER, ROLES.PARTNER]])(
  "keeps the existing metrics for %p without changing their meaning",
  (...roles) => {
    mockLanguage = "en";
    const view = render(
      <StatsRow
        stats={stats}
        showOrganizerStats={hasAnyRole(roles, [ROLES.PARTNER, ROLES.ADMIN])}
        onCellarPress={jest.fn()}
      />,
    );
    expect(view.getByText("Events")).toBeTruthy();
    expect(view.getByText("Routes")).toBeTruthy();
    expect(view.getByRole("button", { name: "Open my cellar" })).toBeTruthy();
    view.rerender(<StatsRow stats={stats} showOrganizerStats={false} onCellarPress={jest.fn()} />);
    expect(view.queryByText("Events")).toBeNull();
    expect(view.queryByText("Routes")).toBeNull();
  },
);

it("shows a loading placeholder without disabling cellar navigation", () => {
  mockLanguage = "en";
  const open = jest.fn();
  const view = render(<StatsRow loading onCellarPress={open} />);
  expect(view.getAllByText("—")).toHaveLength(2);
  fireEvent.press(view.getByRole("button", { name: "Open my cellar" }));
  expect(open).toHaveBeenCalledTimes(1);
});

it("counts the events an organizer runs, not the ones they attended", () => {
  mockLanguage = "es";
  const view = render(
    <StatsRow stats={stats} showOrganizerStats organizedEvents={5} onCellarPress={jest.fn()} />,
  );
  expect(view.getByText("Eventos organizados")).toBeTruthy();
  expect(view.getByText("5")).toBeTruthy();
  expect(view.queryByText("3")).toBeNull();
});
