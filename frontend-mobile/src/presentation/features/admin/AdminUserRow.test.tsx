import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/shared/i18n/locales/en-US.json";
import es from "@/shared/i18n/locales/es-AR.json";
import type { AdminUser } from "@/domain/admin/admin.types";
import { AdminUserRow } from "./AdminUserRow";

jest.mock("@/presentation/components/ui/MotionPressable", () => ({
  MotionPressable: jest.requireActual("react-native").Pressable,
}));
const user: AdminUser = {
  id: "user",
  username: "Example",
  email: "example@example.test",
  name: null,
  roles: ["ROLE_USER"],
  locked: false,
  enabled: true,
  lockReason: null,
  createdAt: "2026-10-02T15:00:00Z",
  lastLoginAt: null,
  points: 0,
  badgeTier: null,
};
async function setup(overrides: Partial<AdminUser> = {}) {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: "en-US",
    fallbackLng: false,
    resources: {
      "en-US": { translation: en },
      "es-AR": { translation: es },
    },
    interpolation: { escapeValue: false },
  });
  const onPress = jest.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <AdminUserRow user={{ ...user, ...overrides }} onPress={onPress} />
    </I18nextProvider>,
  );
  return { i18n, onPress };
}
it.each([
  [{}, "Active", "Activo"],
  [{ enabled: false }, "Disabled", "Deshabilitado"],
  [{ locked: true, enabled: false }, "Suspended", "Suspendida"],
] as const)(
  "updates status, role and missing last-access label when language changes (%s)",
  async (overrides, english, spanish) => {
    const { i18n, onPress } = await setup(overrides);
    expect(screen.getByText(english)).toBeTruthy();
    expect(screen.getByText("Never")).toBeTruthy();
    expect(screen.getByText("User")).toBeTruthy();
    fireEvent.press(screen.getByText("Example"));
    expect(onPress).toHaveBeenCalledTimes(1);
    await act(async () => {
      await i18n.changeLanguage("es-AR");
    });
    expect(screen.getByText(spanish)).toBeTruthy();
    expect(screen.getByText("Nunca")).toBeTruthy();
    expect(screen.getByText("Usuario")).toBeTruthy();
    expect(screen.queryByText(english)).toBeNull();
  },
);
it("formats last access in the selected language while preserving user content", async () => {
  const lastLoginAt = "2026-01-15T15:00:00Z";
  const { i18n } = await setup({ lastLoginAt, roles: ["ROLE_PARTNER", "CUSTOM_ROLE"] });
  const options = { day: "numeric", month: "short" } as const;
  expect(screen.getByText(new Date(lastLoginAt).toLocaleDateString("en-US", options))).toBeTruthy();
  expect(screen.getByText("Partner, CUSTOM_ROLE")).toBeTruthy();
  await act(async () => {
    await i18n.changeLanguage("es-AR");
  });
  expect(screen.getByText(new Date(lastLoginAt).toLocaleDateString("es-AR", options))).toBeTruthy();
  expect(screen.getByText("example@example.test")).toBeTruthy();
});
it("shows the user's seal after the name and their points", async () => {
  await setup({ points: 312, badgeTier: "LAGAR" });
  expect(screen.getByRole("button", { name: "Wine Press seal" })).toBeTruthy();
  expect(screen.getByText("312 points")).toBeTruthy();
});
it("hides the seal of a user without a visible tier", async () => {
  await setup({ points: 12, badgeTier: null });
  expect(screen.queryByRole("button", { name: /seal/ })).toBeNull();
  expect(screen.getByText("12 points")).toBeTruthy();
});
