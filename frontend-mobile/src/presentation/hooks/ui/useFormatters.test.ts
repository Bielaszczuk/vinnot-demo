import { renderHook } from "@testing-library/react-native";
import { useFormatters } from "./useFormatters";

const mockI18n: { language?: string; resolvedLanguage?: string } = {};
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: mockI18n }) }));

const date = new Date(2026, 9, 2, 15, 30);

beforeEach(() => {
  delete mockI18n.language;
  delete mockI18n.resolvedLanguage;
});

it("formats with the language the user picked in the app", () => {
  mockI18n.language = "en-US";
  const { result } = renderHook(() => useFormatters());
  expect(result.current.language).toBe("en-US");
  expect(result.current.formatDate(date)).toBe("Oct 02, 2026");
  expect(result.current.formatPrice(1500, "ARS").replace(/\s/g, " ")).toBe("ARS 1,500.00");
  expect(result.current.formatNumber(12345)).toBe("12,345");
  expect(result.current.formatTime(date).replace(/\s/g, " ")).toBe("03:30 PM");
  expect(result.current.formatDateTime(date).replace(/\s/g, " ")).toBe("Oct 2, 2026, 3:30 PM");
});

it("prefers the resolved language and falls back to Spanish without one", () => {
  mockI18n.language = "en";
  mockI18n.resolvedLanguage = "es-AR";
  expect(renderHook(() => useFormatters()).result.current.formatDate(date)).toBe("02 de oct de 2026");
  delete mockI18n.language;
  delete mockI18n.resolvedLanguage;
  expect(renderHook(() => useFormatters()).result.current.language).toBe("es-AR");
});
