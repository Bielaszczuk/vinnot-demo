import { render, screen } from "@testing-library/react-native";
import { withTiming } from "react-native-reanimated";
import type { TasteSlice } from "@/domain/social/social.types";
import { TASTE_WEDGE_WASHES } from "@/shared/profileArt";
import { TIDE_OPACITY, WEDGE_DIM_OPACITY, tasteWheelWedges, tideWidth, wedgeOutline } from "./tasteWheelGeometry";
import { darkWash, lightWash } from "./tasteWheelPalette";
import { TasteWheelCanvas } from "./TasteWheelCanvas";

jest.mock("@shopify/react-native-skia", () => {
  // The manual Skia mock, with each loaded image standing for its source so a wedge's texture can be told.
  const actual = jest.requireActual("../../../../__mocks__/@shopify/react-native-skia");
  return { ...actual, useImage: (source: unknown) => ({ source }) };
});
/** When on, derived values ignore their dependencies like they do on iOS and Android: computed once per mount. */
const mockNativeDerived = { on: false };
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  const { useState } = jest.requireActual("react") as typeof import("react");
  const useDerivedValue = (compute: () => unknown, deps?: unknown[]) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks -- the flag never changes while a tree is mounted
    mockNativeDerived.on ? useState(() => ({ value: compute() }))[0] : actual.useDerivedValue(compute, deps);
  return { __esModule: true, ...actual, default: actual.default, withTiming: jest.fn(actual.withTiming), useDerivedValue };
});

type Node = { type: unknown; props: Record<string, unknown>; parent: Node | null; findAll: (match: (node: Node) => boolean) => Node[] };
const timing = withTiming as unknown as jest.Mock;
const SIZE = 290;
const COLORS = ["#7A1F3D", "#D4A537", "#B8304A"];
const slice = (value: string): TasteSlice => ({ kind: "GRAPE", value, label: value, score: 4, tone: null, ratedWines: 1 });
const wedges = tasteWheelWedges([slice("malbec"), slice("chardonnay"), slice("syrah")], SIZE);

const root = () => screen.UNSAFE_root as unknown as Node;
const all = (type: string, match: (node: Node) => boolean = () => true) =>
  root().findAll((node) => node.type === type && match(node));
/** A Skia prop may be a plain value or a shared value. */
const valueOf = (prop: unknown) =>
  prop !== null && typeof prop === "object" && "value" in (prop as object) ? (prop as { value: unknown }).value : prop;
/** Each wedge is drawn inside its own group clipped to its outline. */
const clipped = () => all("SkiaGroup", (node) => node.props.clip !== undefined);
/** The nearest drawn element above a node, skipping the mock's wrapper components. */
function hostParent(node: Node): Node {
  let parent = node.parent!;
  while (typeof parent.type !== "string") parent = parent.parent!;
  return parent;
}
const within = (group: Node, type: string, match: (node: Node) => boolean = () => true) =>
  group.findAll((node) => node.type === type && match(node));

function draw(selectedValue: string | null = null, reduceMotion = false) {
  return render(
    <TasteWheelCanvas size={SIZE} wedges={wedges} colors={COLORS} selectedValue={selectedValue} reduceMotion={reduceMotion} />,
  );
}

beforeEach(() => timing.mockClear());

describe("TasteWheelCanvas", () => {
  it("redraws a wedge's outline when its shape changes, even where derived values ignore their dependencies", () => {
    mockNativeDerived.on = true;
    try {
      const view = draw();
      const longer = tasteWheelWedges([slice("malbec"), { ...slice("chardonnay"), score: 3 }, slice("syrah")], SIZE);
      view.rerender(<TasteWheelCanvas size={SIZE} wedges={longer} colors={COLORS} selectedValue={null} reduceMotion={false} />);
      expect(clipped().map((group) => valueOf(group.props.clip))).toEqual(longer.map((wedge) => wedgeOutline(wedge.shape, 0)));
    } finally {
      mockNativeDerived.on = false;
    }
  });


  it("draws one wedge per entry, each clipped to its own organic outline", () => {
    draw();
    expect(screen.getByTestId("taste-wheel-canvas")).toBeTruthy();
    expect(clipped().map((group) => valueOf(group.props.clip))).toEqual(wedges.map((wedge) => wedgeOutline(wedge.shape, 0)));
  });

  it("lays a light wash of each slice's colour first", () => {
    draw();
    expect(clipped().map((group) => within(group, "SkiaFill")[0]!.props.color)).toEqual(COLORS.map(lightWash));
  });

  it("shows the dark wash only through the slice's texture, turned with the slice", () => {
    draw();
    clipped().forEach((group, index) => {
      const wedge = wedges[index]!;
      const [layer] = within(group, "SkiaGroup", (node) => node.props.layer === true);
      const [image] = within(layer!, "SkiaImage");
      expect(image!.props.image).toEqual({ source: TASTE_WEDGE_WASHES[wedge.variant - 1] });
      expect(image!.props).toMatchObject({ ...wedge.texture, fit: "fill" });
      expect(hostParent(image!).props.transform).toEqual([{ rotate: wedge.mid }]);
      expect(hostParent(image!).props.origin).toEqual({ x: SIZE / 2, y: SIZE / 2 });
      const [rect] = within(layer!, "SkiaRect");
      expect(rect!.props).toMatchObject({ color: darkWash(COLORS[index]!), blendMode: "srcIn" });
    });
  });

  it("draws a darker tide line along the outline, inside the clip so only its inner half shows", () => {
    draw();
    clipped().forEach((group, index) => {
      const [tide] = within(group, "SkiaPath");
      expect(tide!.props).toMatchObject({
        style: "stroke",
        color: darkWash(COLORS[index]!),
        opacity: TIDE_OPACITY,
        strokeWidth: tideWidth(SIZE),
      });
      expect(valueOf(tide!.props.path)).toBe(wedgeOutline(wedges[index]!.shape, 0));
    });
    expect(TIDE_OPACITY).toBe(0.4);
  });

  it("dims the other wedges and grows the selected one, without motion under Reduce Motion", () => {
    draw("chardonnay", true);
    const opacities = clipped().map((group) => valueOf(hostParent(group).props.opacity));
    expect(opacities).toEqual([WEDGE_DIM_OPACITY, 1, WEDGE_DIM_OPACITY]);
    expect(valueOf(clipped()[1]!.props.clip)).toBe(wedgeOutline(wedges[1]!.shape, 1));
    expect(valueOf(clipped()[0]!.props.clip)).toBe(wedgeOutline(wedges[0]!.shape, 0));
    expect(timing).not.toHaveBeenCalled();
  });

  it("keeps every wedge at full strength without a selection, and animates a new selection", () => {
    const view = draw();
    expect(clipped().map((group) => valueOf(hostParent(group).props.opacity))).toEqual([1, 1, 1]);
    view.rerender(<TasteWheelCanvas size={SIZE} wedges={wedges} colors={COLORS} selectedValue="syrah" reduceMotion={false} />);
    expect(timing).toHaveBeenCalled();
  });
});
