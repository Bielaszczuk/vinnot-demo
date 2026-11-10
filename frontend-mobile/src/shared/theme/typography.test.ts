import { fontSizes, textStyles } from "./typography";

describe("textStyles", () => {
  it.each(Object.entries(textStyles))("%s leaves room for its glyphs (line height at least the font size)", (_name, style) => {
    expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
  });

  it("gives the wine name a line height from its own size", () => {
    expect(textStyles.wineName.fontSize).toBe(fontSizes["2xl"]);
    expect(textStyles.wineName.lineHeight).toBe(30);
  });

  it("names the in-between sizes used by meta text and compact labels", () => {
    expect(fontSizes.meta).toBe(11);
    expect(fontSizes.ui).toBe(14);
  });
});
