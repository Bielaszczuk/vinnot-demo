import { render, screen } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/shared/i18n/locales/en-US.json";
import es from "@/shared/i18n/locales/es-AR.json";
import { WineSubmissionsScreen } from "../WineSubmissionsScreen";

let mockItems: unknown[] = [];
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useMyWineSubmissions: () => ({ data: { items: mockItems }, isLoading: false, isError: false }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/presentation/components/ui/BackButton", () => ({ BackButton: () => null }));

const base = {
  id: "s1", wineName: "Reserva", wineryName: "Bodega", status: "NEEDS_REVIEW", grapes: [],
  createdAt: new Date(2026, 0, 1), updatedAt: new Date(2026, 0, 1), reviewedAt: null,
  matchedWineId: null, createdWineId: null,
};

async function renderScreen(lng: "es-AR" | "en-US") {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    resources: { "en-US": { translation: en }, "es-AR": { translation: es } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <WineSubmissionsScreen />
    </I18nextProvider>,
  );
}

it("explains an automatic review in the user's language, not the stored English text", async () => {
  mockItems = [{ ...base, reasonCode: "MODERATION_UNAVAILABLE", reviewReason: "Content moderation was unavailable" }];
  await renderScreen("es-AR");
  expect(screen.getByText("La revisión automática de contenido no estaba disponible.")).toBeTruthy();
  expect(screen.queryByText("Content moderation was unavailable")).toBeNull();
});

it("keeps a moderator's own reason as written", async () => {
  mockItems = [{ ...base, reasonCode: null, reviewReason: "La foto está borrosa" }];
  await renderScreen("en-US");
  expect(screen.getByText("La foto está borrosa")).toBeTruthy();
});
