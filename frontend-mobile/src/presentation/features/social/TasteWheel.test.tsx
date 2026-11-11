import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import { TASTE_ART } from "@/shared/profileArt";
import { Path } from "react-native-svg";
import { withTiming } from "react-native-reanimated";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";
import { TASTE_WEDGE_WASHES } from "@/shared/profileArt";
import { tasteWheelPalette, wineTypeSwatches } from "@/shared/theme/tokens";
import {
  TASTE_WHEEL_MAX_SIZE,
  WEDGE_DIM_OPACITY,
  centreLabelFontSize,
  centreTextWidth,
  wheelHole,
} from "./tasteWheelGeometry";
import { darkWash, lightWash } from "./tasteWheelPalette";
import { TasteWheel } from "./TasteWheel";
import type { TasteSlice } from "@/domain/social/social.types";

const mockSelection = jest.fn();
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, withTiming: jest.fn(actual.withTiming) };
});
jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));
jest.mock("@/presentation/hooks/ui", () => ({
  ...jest.requireActual("@/presentation/hooks/ui"),
  useHaptics: () => ({ impact: jest.fn(), selection: mockSelection, notification: jest.fn() }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    // A default value alone stands for a missing key, so the key reads as found.
    t: (key: string, options?: Record<string, string | number>) => {
      const values = Object.entries(options ?? {}).filter(([name]) => name !== "defaultValue");
      return values.length > 0 ? `${key}(${values.map(([, value]) => value).join("|")})` : key;
    },
    i18n: { language: "en-US" },
  }),
}));

const reduceMotion = useReduceMotionEnabled as jest.MockedFunction<typeof useReduceMotionEnabled>;
const timing = withTiming as unknown as jest.Mock;
const slice = (
  kind: TasteSlice["kind"],
  value: string,
  label: string,
  score: number,
  tone: string | null,
  ratedWines: number,
): TasteSlice => ({ kind, value, label, score, tone, ratedWines });

const slices: TasteSlice[] = [
  slice("TYPE", "RED", "RED", 4.5, "RED", 9),
  slice("TYPE", "WHITE", "WHITE", 2, "WHITE", 3),
  slice("GRAPE", "chardonnay", "Chardonnay", 3.5, "WHITE", 2),
  slice("GRAPE", "malbec", "Malbec", 4.6, "RED", 4),
  slice("GRAPE", "syrah", "Syrah", 3, "RED", 1),
  slice("REGION", "mendoza", "Mendoza", 4.2, null, 6),
];

const targets = () => screen.UNSAFE_getAllByType(Path);
const target = (value: string) => targets().find((node) => node.props.testID === `taste-slice-${value}`)!;
const view = (kind: string) => screen.getByRole("radio", { name: `social.taste.views.${kind}` });
const row = (value: string) => screen.getByTestId(`taste-row-${value}`);
/** The expo-image element itself, with the props it was given. */
const art = (testID: string) => screen.UNSAFE_getAllByType(Image).find((node) => node.props.testID === testID)!;
const style = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);
type SkiaNode = { type: unknown; props: Record<string, unknown>; findAll: (match: (node: SkiaNode) => boolean) => SkiaNode[] };
/** The painted wedges: one Skia group clipped to each slice's outline. */
const wedges = () =>
  (screen.UNSAFE_root as unknown as SkiaNode).findAll((node) => node.type === "SkiaGroup" && node.props.clip !== undefined);
/** The group around each wedge carries its opacity, a shared value. */
const wedgeOpacities = () =>
  (screen.UNSAFE_root as unknown as SkiaNode)
    .findAll((node) => node.type === "SkiaGroup" && node.props.opacity !== undefined)
    .map((node) => (node.props.opacity as { value: number }).value);

beforeEach(() => {
  timing.mockClear();
  mockSelection.mockClear();
  reduceMotion.mockReturnValue(false);
});

describe("views", () => {
  it("shows the grapes by default", () => {
    render(<TasteWheel slices={slices} />);
    expect(view("GRAPE").props.accessibilityState).toMatchObject({ checked: true });
    expect(view("TYPE").props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText("social.taste.views.GRAPE")).toBeTruthy();
    expect(screen.getByText("social.taste.views.TYPE")).toBeTruthy();
    expect(screen.getByText("social.taste.views.REGION")).toBeTruthy();
    expect(targets()).toHaveLength(3);
  });

  it("shows one kind at a time on the wheel and in the legend", () => {
    render(<TasteWheel slices={slices} />);
    expect(screen.getByText("Malbec")).toBeTruthy();
    expect(screen.queryByText("Mendoza")).toBeNull();
    expect(screen.queryByText("wines.types.RED")).toBeNull();
    fireEvent.press(view("REGION"));
    expect(targets()).toHaveLength(1);
    expect(screen.getByText("Mendoza")).toBeTruthy();
    expect(screen.queryByText("Malbec")).toBeNull();
  });

  it("hides a view without entries and opens the first one with entries when there are no grapes", () => {
    render(<TasteWheel slices={slices.filter((entry) => entry.kind !== "GRAPE")} />);
    expect(screen.queryByRole("radio", { name: "social.taste.views.GRAPE" })).toBeNull();
    expect(view("TYPE").props.accessibilityState).toMatchObject({ checked: true });
    expect(targets()).toHaveLength(2);
  });

  it("drops the selector when only one view has entries", () => {
    render(<TasteWheel slices={slices.filter((entry) => entry.kind === "GRAPE")} />);
    expect(screen.queryByTestId("taste-views")).toBeNull();
    expect(targets()).toHaveLength(3);
  });

  it("names wine styles with the wine-type words, never the raw code", () => {
    render(<TasteWheel slices={slices} />);
    fireEvent.press(view("TYPE"));
    expect(screen.getByText("wines.types.RED")).toBeTruthy();
    expect(screen.getByText("wines.types.WHITE")).toBeTruthy();
    expect(screen.queryByText("RED")).toBeNull();
  });
});

describe("centre emblem", () => {
  it("shows the emblem of the open view: grapes, wine glasses for styles, a vineyard for regions", () => {
    render(<TasteWheel slices={slices} />);
    expect(art("taste-wheel-emblem").props.source).toBe(TASTE_ART.GRAPE_CLUSTER);
    fireEvent.press(view("TYPE"));
    expect(art("taste-wheel-emblem").props.source).toBe(TASTE_ART.WINE_GLASSES);
    fireEvent.press(view("REGION"));
    expect(art("taste-wheel-emblem").props.source).toBe(TASTE_ART.VINEYARD);
  });

  it("shows the wide vineyard 25% larger than the other emblems", () => {
    render(<TasteWheel slices={slices} />);
    const width = () => art("taste-wheel-emblem").props.style.width as number;
    const grapes = width();
    fireEvent.press(view("TYPE"));
    expect(width()).toBe(grapes);
    fireEvent.press(view("REGION"));
    expect(width()).toBeCloseTo(grapes * 1.25);
  });
});

describe("selection", () => {
  it("selects a slice when it is tapped and shows its name, score and wines in the centre", () => {
    render(<TasteWheel slices={slices} />);
    expect(screen.getByTestId("taste-wheel-emblem")).toBeTruthy();
    fireEvent.press(target("malbec"));
    expect(screen.queryByTestId("taste-wheel-emblem")).toBeNull();
    expect(screen.getByTestId("taste-wheel-centre-label").props.children).toBe("Malbec");
    expect(screen.getByTestId("taste-wheel-centre-score").props.children).toBe("4.6");
    expect(screen.getByTestId("taste-wheel-centre-wines").props.children).toBe("social.taste.ratedWines(4)");
    expect(row("malbec").props.accessibilityState).toMatchObject({ selected: true });
    expect(row("syrah").props.accessibilityState).toMatchObject({ selected: false });
    expect(mockSelection).toHaveBeenCalledTimes(1);
  });

  it("selects a slice from its legend row, and clears it when tapped again", () => {
    render(<TasteWheel slices={slices} />);
    fireEvent.press(row("syrah"));
    expect(screen.getByTestId("taste-wheel-centre-label").props.children).toBe("Syrah");
    expect(row("syrah").props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.press(row("syrah"));
    expect(screen.queryByTestId("taste-wheel-centre-label")).toBeNull();
    expect(screen.getByTestId("taste-wheel-emblem")).toBeTruthy();
    expect(row("syrah").props.accessibilityState).toMatchObject({ selected: false });
  });

  it("clears the selection when the view changes", () => {
    render(<TasteWheel slices={slices} />);
    fireEvent.press(row("malbec"));
    fireEvent.press(view("TYPE"));
    expect(screen.queryByTestId("taste-wheel-centre-label")).toBeNull();
    fireEvent.press(view("GRAPE"));
    expect(screen.queryByTestId("taste-wheel-centre-label")).toBeNull();
    expect(row("malbec").props.accessibilityState).toMatchObject({ selected: false });
  });

  it("shows only the name and score when an older payload has no rated wines", () => {
    render(<TasteWheel slices={[slice("GRAPE", "malbec", "Malbec", 4, "RED", 0), slice("GRAPE", "syrah", "Syrah", 3, "RED", 0)]} />);
    fireEvent.press(row("malbec"));
    expect(screen.getByTestId("taste-wheel-centre-label").props.children).toBe("Malbec");
    expect(screen.getByTestId("taste-wheel-centre-score").props.children).toBe("4.0");
    expect(screen.queryByTestId("taste-wheel-centre-wines")).toBeNull();
    expect(row("malbec").props.accessibilityLabel).toBe("social.taste.sliceScoreA11y(Malbec|4.0)");
  });

  it("labels every slice and legend row as a button with its name, score and wines", () => {
    render(<TasteWheel slices={slices} />);
    const label = "social.taste.sliceButtonA11y(Malbec|4.6|social.taste.ratedWines(4))";
    expect(target("malbec").props.accessible).toBe(true);
    expect(target("malbec").props.accessibilityRole).toBe("button");
    expect(target("malbec").props.accessibilityLabel).toBe(label);
    expect(row("malbec").props.accessibilityRole).toBe("button");
    expect(row("malbec").props.accessibilityLabel).toBe(label);
  });
});

describe("colours and motion", () => {
  it("colours grapes by their tone, grouped, with the legend dots matching", () => {
    render(<TasteWheel slices={slices} />);
    // Reds first, then whites, each red in its own shade.
    expect(targets().map((node) => node.props.testID)).toEqual([
      "taste-slice-malbec",
      "taste-slice-syrah",
      "taste-slice-chardonnay",
    ]);
    expect(targets().map((node) => node.props.fill)).toEqual([
      tasteWheelPalette.red[0],
      tasteWheelPalette.red[1],
      tasteWheelPalette.white[0],
    ]);
    expect(art("taste-dot-malbec-wash").props.tintColor).toBe(darkWash(tasteWheelPalette.red[0]));
  });

  it("colours styles by wine type and regions in distinct hues", () => {
    render(<TasteWheel slices={slices} />);
    fireEvent.press(view("TYPE"));
    expect(targets().map((node) => node.props.fill)).toEqual([wineTypeSwatches.RED, wineTypeSwatches.WHITE]);
    fireEvent.press(view("REGION"));
    expect(targets()[0]!.props.fill).toBe(tasteWheelPalette.regions[0]);
  });

  it("sits on a cream stage with the decorative grape-cluster emblem at the centre", () => {
    render(<TasteWheel slices={slices} />);
    expect(screen.getByTestId("taste-wheel-emblem").props.accessible).toBe(false);
    // The wheel itself is not one opaque element: each wedge can be reached on its own.
    expect(screen.getByTestId("taste-wheel").props.accessible).toBeFalsy();
  });

  it("turns into place once when motion is allowed, and animates a selection", () => {
    render(<TasteWheel slices={slices} />);
    expect(timing).toHaveBeenCalledTimes(1);
    fireEvent.press(row("malbec"));
    expect(timing.mock.calls.length).toBeGreaterThan(1);
  });

  it("stays still under Reduce Motion, on reveal and on selection", () => {
    reduceMotion.mockReturnValue(true);
    render(<TasteWheel slices={slices} />);
    fireEvent.press(row("malbec"));
    expect(timing).not.toHaveBeenCalled();
    expect(targets()).toHaveLength(3);
    expect(screen.getByTestId("taste-wheel-centre-label").props.children).toBe("Malbec");
  });
});

describe("watercolor wedges", () => {
  it("paints wedges, not petals: one watercolor wedge per entry on a Skia canvas", () => {
    render(<TasteWheel slices={slices} />);
    expect(screen.queryAllByTestId(/^taste-petal-/)).toHaveLength(0);
    expect(screen.getByTestId("taste-wheel-canvas")).toBeTruthy();
    expect(wedges()).toHaveLength(3);
  });

  it("dims the other wedges when one is highlighted", () => {
    reduceMotion.mockReturnValue(true);
    render(<TasteWheel slices={slices} />);
    expect(wedgeOpacities()).toEqual([1, 1, 1]);
    fireEvent.press(row("syrah"));
    expect(wedgeOpacities()).toEqual([WEDGE_DIM_OPACITY, 1, WEDGE_DIM_OPACITY]);
  });

  it("draws the legend swatches as small washes: the light shade under the wedge texture in the dark shade", () => {
    render(<TasteWheel slices={slices} />);
    expect(style("taste-dot-syrah").backgroundColor).toBe(lightWash(tasteWheelPalette.red[1]));
    expect(art("taste-dot-syrah-wash").props.source).toBe(TASTE_WEDGE_WASHES[1]);
    expect(art("taste-dot-syrah-wash").props.tintColor).toBe(darkWash(tasteWheelPalette.red[1]));
  });

  it("keeps an invisible press target over each wedge", () => {
    render(<TasteWheel slices={slices} />);
    expect(targets().map((node) => node.props.fillOpacity)).toEqual([0, 0, 0]);
    fireEvent.press(target("chardonnay"));
    expect(screen.getByTestId("taste-wheel-centre-label").props.children).toBe("Chardonnay");
  });

  it.each(["Champagne Premier Cru", "Cabernet Sauvignon", "A forty character long sparkling wine na"])(
    "keeps %s inside the centre disc: at most 2 lines that shrink to fit",
    (label) => {
      render(<TasteWheel slices={[slice("GRAPE", "long", label, 3.9, "WHITE", 1), slice("GRAPE", "other", "Other", 3, "RED", 1)]} />);
      fireEvent.press(row("long"));
      const centre = screen.getByTestId("taste-wheel-centre-label");
      expect(centre.props.numberOfLines).toBe(2);
      expect(centre.props.adjustsFontSizeToFit).toBe(true);
      expect(centre.props.minimumFontScale).toBe(0.6);
      expect(style("taste-wheel-centre-label").fontSize).toBe(centreLabelFontSize(label));
      expect(style("taste-wheel-centre-text").width).toBe(centreTextWidth(wheelHole(TASTE_WHEEL_MAX_SIZE)));
    },
  );
});

describe("size", () => {
  it("opens at about 290 points and fits 88% of the card's content width once measured, the stage scaled to match", () => {
    render(<TasteWheel slices={slices} />);
    expect(style("taste-wheel")).toMatchObject({ width: 290, height: 290 });
    expect(style("taste-wheel-stage").width).toBe(290 + 2 * Math.round(290 * 0.05));
    fireEvent(screen.getByTestId("taste-wheel-container"), "layout", { nativeEvent: { layout: { width: 311, height: 500 } } });
    expect(style("taste-wheel")).toMatchObject({ width: 273, height: 273 });
    expect(style("taste-wheel-stage").width).toBe(273 + 2 * Math.round(273 * 0.05));
  });
});
