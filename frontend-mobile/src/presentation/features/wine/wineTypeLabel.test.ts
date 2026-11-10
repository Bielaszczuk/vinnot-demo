import { wineTypeLabel } from "./wineTypeLabel";

it("looks up the lowercase type key and falls back to the code", () => {
  const t = jest.fn((key: string, options?: { defaultValue?: string }) =>
    key === "wines.types.red" ? "Tinto" : options?.defaultValue ?? key);
  expect(wineTypeLabel(t, "RED")).toBe("Tinto");
  expect(wineTypeLabel(t, "AMBER")).toBe("AMBER");
});
