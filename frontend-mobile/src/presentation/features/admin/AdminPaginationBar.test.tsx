import { fireEvent, render, screen } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/shared/i18n/locales/en-US.json";
import es from "@/shared/i18n/locales/es-AR.json";
import { AdminPaginationBar } from "./AdminPaginationBar";
import { AdminSearchBar } from "./AdminSearchBar";

jest.mock("@/presentation/components/ui/MotionPressable", () => ({
  MotionPressable: jest.requireActual("react-native").Pressable,
}));

async function i18n(lng: "es-AR" | "en-US") {
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    resources: { "en-US": { translation: en }, "es-AR": { translation: es } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

it("names one item in the singular with the list's own noun", async () => {
  const instance = await i18n("es-AR");
  render(
    <I18nextProvider i18n={instance}>
      <AdminPaginationBar page={0} totalPages={1} totalItems={1} countKey="admin.users.count" onPageChange={jest.fn()} />
    </I18nextProvider>,
  );
  expect(screen.getByText("1 usuario")).toBeTruthy();
});

it("formats a large total with the app language", async () => {
  const instance = await i18n("es-AR");
  render(
    <I18nextProvider i18n={instance}>
      <AdminPaginationBar page={0} totalPages={86075} totalItems={1721494} countKey="admin.wines.count" onPageChange={jest.fn()} />
      <AdminSearchBar value="" onChangeText={jest.fn()} resultCount={1721494} />
    </I18nextProvider>,
  );
  expect(screen.getByText("1.721.494 vinos")).toBeTruthy();
  expect(screen.getByText("1.721.494 resultados")).toBeTruthy();
});

it("keeps counting results and paging when no noun is given", async () => {
  const instance = await i18n("en-US");
  const onPageChange = jest.fn();
  render(
    <I18nextProvider i18n={instance}>
      <AdminPaginationBar page={0} totalPages={3} totalItems={1} onPageChange={onPageChange} />
    </I18nextProvider>,
  );
  expect(screen.getByText("1 result")).toBeTruthy();
  fireEvent.press(screen.getByLabelText(en.common.next));
  expect(onPageChange).toHaveBeenCalledWith(1);
});
