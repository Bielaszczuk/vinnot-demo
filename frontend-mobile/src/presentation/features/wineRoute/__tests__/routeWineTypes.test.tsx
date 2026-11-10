import { render, screen } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/shared/i18n/locales/en-US.json";
import es from "@/shared/i18n/locales/es-AR.json";
import type { WineRoute } from "@/domain/route/route.types";
import { WineRouteCard } from "../WineRouteCard";

jest.mock("../RouteCoverImage", () => ({ RouteCoverImage: () => null }));

const route: WineRoute = {
  id: "route",
  name: "Ruta del Malbec",
  description: "",
  region: "Mendoza",
  country: "Argentina",
  difficulty: null,
  duration: 0,
  estimatedDays: 1,
  distance: 0,
  stops: [],
  imageUrl: null,
  mapEmbedUrl: null,
  rating: null,
  reviewCount: 0,
  tags: ["RED", "WHITE"],
  isPublished: true,
  createdBy: "",
  createdAt: new Date(2026, 0, 1),
  updatedAt: new Date(2026, 0, 1),
};

async function renderCard(lng: "es-AR" | "en-US") {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    resources: { "en-US": { translation: en }, "es-AR": { translation: es } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <WineRouteCard route={route} onPress={jest.fn()} />
    </I18nextProvider>,
  );
}

it("shows recommended wine types by name (pills are upper case), never by code", async () => {
  await renderCard("es-AR");
  expect(screen.getByText("TINTO")).toBeTruthy();
  expect(screen.getByText("BLANCO")).toBeTruthy();
  expect(screen.queryByText("RED")).toBeNull();
});

it("keeps the route length in days, in the singular for one day", async () => {
  await renderCard("en-US");
  expect(screen.getByText("1 day")).toBeTruthy();
});
