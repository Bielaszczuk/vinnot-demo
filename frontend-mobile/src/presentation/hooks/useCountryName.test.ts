import { act, renderHook } from "@testing-library/react-native";
import i18n from "@/shared/i18n";
import { useCountryName } from "./useCountryName";

describe("useCountryName", () => {
  const previous = i18n.language;

  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("es-AR");
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage(previous);
    });
  });

  it("follows the active UI language", async () => {
    const { result, rerender } = renderHook(() => useCountryName());
    expect(result.current("Estados Unidos")).toBe("Estados Unidos");

    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
    rerender({});
    expect(result.current("Estados Unidos")).toBe("United States");
    expect(result.current(null)).toBe("");
  });
});
