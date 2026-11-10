import { describe, expect, it } from "@jest/globals";
import { mapWineComparison } from "../wine.mappers.compare";

const richContent = {
  tastingNotes: {
    wineA: {
      identity: "A Gualtallary Malbec at 1,400 m.",
      appearance: "Deep violet",
      nose: "Violets and graphite",
      palate: "Chalky tannins",
      finish: "Long and mineral",
    },
    wineB: {
      identity: "A warm Lunlunta Malbec.",
      appearance: "Ruby",
      nose: "Ripe plum",
      palate: "Round",
      finish: "Medium",
    },
  },
  chooseIf: [
    { pick: "A", situation: "A slow dinner", why: "Its tannins need food." },
    { pick: "B", situation: "A weeknight", why: "It is ready now." },
  ],
  pairings: {
    wineA: [{ dish: "Braised short ribs", why: "Fat softens the tannin." }],
    wineB: [{ dish: "Mushroom risotto", why: "Earthy match." }],
    shared: { dish: "Grilled provoleta", why: "Works with both." },
  },
  serving: {
    wineA: { temperature: "16-17 °C", decanting: "45 minutes" },
    wineB: { temperature: "15-16 °C", decanting: "Not needed" },
  },
  aging: { wineA: "Drink 2026-2034", wineB: "Drink now to 2028" },
  value: "Wine B costs less for a similar quality.",
};

describe("mapWineComparison rich fields", () => {
  it("maps every new top-level field and keeps attribute keys", () => {
    const mapped = mapWineComparison({
      cached: false,
      summary: "Two Malbecs",
      attributeComparison: {
        attributes: [{ key: "body", name: "Body", wineAValue: "Full", wineBValue: "Medium", wineAScore: 80, wineBScore: 60 }],
      },
      ...richContent,
    });

    expect(mapped.tastingNotes).toEqual(richContent.tastingNotes);
    expect(mapped.chooseIf).toEqual(richContent.chooseIf);
    expect(mapped.pairings).toEqual(richContent.pairings);
    expect(mapped.serving).toEqual(richContent.serving);
    expect(mapped.aging).toEqual(richContent.aging);
    expect(mapped.value).toBe("Wine B costs less for a similar quality.");
    expect(mapped.attributeComparison?.attributes[0]?.key).toBe("body");
  });

  it("falls back to comparisonContent when the top-level fields are absent or malformed", () => {
    const mapped = mapWineComparison({
      cached: true,
      tastingNotes: "not an object",
      chooseIf: [],
      comparisonContent: { summary: "Nested", ...richContent },
    });

    expect(mapped.tastingNotes).toEqual(richContent.tastingNotes);
    expect(mapped.chooseIf).toEqual(richContent.chooseIf);
    expect(mapped.pairings).toEqual(richContent.pairings);
    expect(mapped.serving).toEqual(richContent.serving);
    expect(mapped.aging).toEqual(richContent.aging);
    expect(mapped.value).toBe("Wine B costs less for a similar quality.");
  });

  it("drops invalid items and keeps only A or B picks", () => {
    const mapped = mapWineComparison({
      cached: false,
      tastingNotes: { wineA: { identity: "  ", nose: 4 }, wineB: { palate: " Round " } },
      chooseIf: [
        { pick: "C", situation: "Never" },
        { pick: "A", situation: "" },
        "loose text",
        null,
        { pick: "B", situation: "Pizza night" },
      ],
      pairings: {
        wineA: [{ why: "No dish" }, { dish: "Lentil stew" }, 7],
        wineB: "not a list",
        shared: null,
      },
      serving: { wineA: { temperature: 16 }, wineB: { decanting: "1 hour" } },
      aging: { wineA: 2030, wineB: "Until 2027" },
      value: "   ",
    });

    expect(mapped.tastingNotes).toEqual({ wineB: { palate: "Round" } });
    expect(mapped.chooseIf).toEqual([{ pick: "B", situation: "Pizza night" }]);
    expect(mapped.pairings).toEqual({ wineA: [{ dish: "Lentil stew" }], wineB: [] });
    expect(mapped.serving).toEqual({ wineB: { decanting: "1 hour" } });
    expect(mapped.aging).toEqual({ wineB: "Until 2027" });
    expect(mapped.value).toBeUndefined();
  });

  it("leaves every new field undefined for empty or legacy payloads", () => {
    const mapped = mapWineComparison({
      cached: true,
      tastingNotes: { wineA: null, wineB: "x" },
      chooseIf: "nope",
      pairings: { wineA: [], wineB: [], shared: { why: "no dish" } },
      serving: [],
      aging: { wineA: "" },
      comparisonContent: { summary: "Legacy", recommendation: "Pick A" },
    });

    expect(mapped.summary).toBe("Legacy");
    expect(mapped.recommendation).toBe("Pick A");
    expect(mapped.tastingNotes).toBeUndefined();
    expect(mapped.chooseIf).toBeUndefined();
    expect(mapped.pairings).toBeUndefined();
    expect(mapped.serving).toBeUndefined();
    expect(mapped.aging).toBeUndefined();
    expect(mapped.value).toBeUndefined();
  });
});
