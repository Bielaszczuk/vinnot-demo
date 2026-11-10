import type { WineType } from "@/domain/wine/wine.types";
import { POUR_COLORS, pourBottle, wineSceneLook } from "./wineSceneLook";

describe("wineSceneLook", () => {
  it.each<[WineType, object]>([
    ["red", { glass: "bordeaux", wine: "red", bottle: "dark", grapes: "red" }],
    ["fortified", { glass: "bordeaux", wine: "ruby", bottle: "dark", grapes: "red" }],
    ["rose", { glass: "rose", wine: "rose", bottle: "clear", grapes: "red" }],
    ["white", { glass: "tulip", wine: "white", bottle: "clear", grapes: "white" }],
    ["orange", { glass: "tulip", wine: "amber", bottle: "clear", grapes: "white" }],
    ["dessert", { glass: "tulip", wine: "amber", bottle: "clear", grapes: "white" }],
    ["sparkling", { glass: "flute", wine: "sparkling", bottle: "sparkling", grapes: "white" }],
  ])("draws a %s wine with its own glass, colour, bottle and grapes", (type, look) => {
    expect(wineSceneLook(type)).toEqual(look);
  });

  it("draws a red wine while the type is not known yet", () => {
    expect(wineSceneLook(undefined)).toEqual(wineSceneLook("red"));
    expect(wineSceneLook(null)).toEqual(wineSceneLook("red"));
  });

  it("pours every wine in a colour of its own", () => {
    const colors = Object.values(POUR_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("pourBottle", () => {
  it("picks the rating bottle for each wine look", () => {
    expect(pourBottle(wineSceneLook("red"))).toBe("dark");
    expect(pourBottle(wineSceneLook("fortified"))).toBe("dark");
    expect(pourBottle(wineSceneLook("rose"))).toBe("clear-rose");
    expect(pourBottle(wineSceneLook("white"))).toBe("clear-white");
    expect(pourBottle(wineSceneLook("orange"))).toBe("clear-amber");
    expect(pourBottle(wineSceneLook("dessert"))).toBe("clear-amber");
    expect(pourBottle(wineSceneLook("sparkling"))).toBe("sparkling");
    expect(pourBottle(wineSceneLook(null))).toBe("dark");
  });
});
