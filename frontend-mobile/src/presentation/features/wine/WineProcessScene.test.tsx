import { render, screen } from "@testing-library/react-native";
import { Animated as NativeAnimated, Image, StyleSheet } from "react-native";
import { useReducedMotion, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { Circle } from "react-native-svg";
import {
  PROCESS_RING_CIRCUMFERENCE,
  SCENE_ACTION_MS,
  SCENE_ACTION_PAUSE_MS,
  WineProcessSceneVisual,
  type WineProcessScene,
} from "./WineProcessScene";
import { POUR_COLORS, wineSceneLook, wineSceneLooks, type WineSceneLooks } from "./wineSceneLook";
import type { WineType } from "@/domain/wine/wine.types";

// Styles are computed once at render with the current progress, so a scene shows its opening
// pose (progress 0) or, with reduced motion, its finished pose (progress 1).
jest.mock("react-native-reanimated", () => {
  const React = jest.requireActual("react") as typeof import("react");
  const { View } = jest.requireActual("react-native") as typeof import("react-native");
  const fade = { duration: () => fade };
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: React.ComponentType<object>) =>
        ({ animatedProps, ...props }: { animatedProps?: object }) => (
          <Component {...props} {...animatedProps} />
        ),
    },
    Easing: {
      cubic: (value: number) => value,
      linear: (value: number) => value,
      out: (easing: unknown) => easing,
      inOut: (easing: unknown) => easing,
    },
    Extrapolation: { CLAMP: "clamp" },
    FadeIn: fade,
    FadeOut: fade,
    interpolate: (value: number, input: number[], output: number[]) => {
      if (value <= input[0]!) return output[0]!;
      for (let index = 1; index < input.length; index += 1) {
        if (value <= input[index]!) {
          const t = (value - input[index - 1]!) / (input[index]! - input[index - 1]!);
          return output[index - 1]! + (output[index]! - output[index - 1]!) * t;
        }
      }
      return output[output.length - 1]!;
    },
    useReducedMotion: jest.fn(() => false),
    useSharedValue: (initial: number) => React.useRef({ value: initial }).current,
    useAnimatedProps: (factory: () => object) => factory(),
    useAnimatedStyle: (factory: () => object) => factory(),
    withDelay: jest.fn((_delay: number, value: unknown) => value),
    withRepeat: jest.fn((value: unknown) => value),
    withSequence: jest.fn((...values: unknown[]) => values[0]),
    withTiming: jest.fn((value: number) => value),
  };
});

const scenes: WineProcessScene[] = [
  "uncork",
  "visual",
  "bouquet",
  "taste",
  "report",
  "compare",
  "structure",
  "contrast",
  "recommendation",
];

function part(testID: string) {
  return screen.getByTestId(testID, { includeHiddenElements: true });
}

function styleOf(testID: string) {
  return StyleSheet.flatten(part(testID).props.style) as Record<string, unknown>;
}

function transformOf(testID: string) {
  const transform = (styleOf(testID).transform ?? []) as Array<Record<string, number | string>>;
  return Object.assign({}, ...transform) as Record<string, number | string>;
}

function wineLevel(glass: string) {
  return styleOf(`${glass}-wine`).height as number;
}

const RED = wineSceneLooks("red");

function showScene(scene: WineProcessScene, finished = false, looks: WineSceneLooks = RED) {
  jest.mocked(useReducedMotion).mockReturnValue(finished);
  return render(<WineProcessSceneVisual scene={scene} step={0} total={5} looks={looks} />);
}

function sourceOf(testID: string) {
  // The first image of a sprite is its own layer; a glass also holds its wine.
  return part(testID).findAllByType(Image)[0]?.props.source as unknown;
}

const wineTypes: WineType[] = ["red", "fortified", "rose", "white", "orange", "dessert", "sparkling"];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

describe("WineProcessSceneVisual", () => {
  it.each(scenes)("draws the %s step", (scene) => {
    showScene(scene);

    expect(part(`process-scene-${scene}`)).toBeTruthy();
  });

  it("pulls the cork out with the corkscrew while preparing the bottle", () => {
    const view = showScene("uncork");
    expect(transformOf("scene-uncork-cork").translateY).toBeCloseTo(0);
    view.unmount();

    showScene("uncork", true);
    expect(transformOf("scene-uncork-cork").translateY).toBeLessThan(-20);
    expect(transformOf("scene-uncork-corkscrew").translateY).toBeLessThan(0);
  });

  it("fills the empty glass during the visual analysis", () => {
    const view = showScene("visual");
    expect(wineLevel("scene-visual-glass")).toBe(0);
    view.unmount();

    showScene("visual", true);
    expect(wineLevel("scene-visual-glass")).toBeGreaterThan(0);
    expect(styleOf("scene-visual-pour").height).toBe(0);
  });

  it("lowers the wine with a sip while tasting", () => {
    const view = showScene("taste");
    const full = wineLevel("scene-taste-glass");
    view.unmount();

    showScene("taste", true);
    expect(wineLevel("scene-taste-glass")).toBeLessThan(full);
    expect(wineLevel("scene-taste-glass")).toBeGreaterThan(0);
  });

  it("lets the aromas rise from the glass", () => {
    const view = showScene("bouquet");
    const hidden = screen.getAllByTestId("scene-bouquet-wisp", { includeHiddenElements: true });
    expect(hidden).toHaveLength(3);
    hidden.forEach((wisp) => expect(StyleSheet.flatten(wisp.props.style).opacity).toBe(0));
    view.unmount();

    showScene("bouquet", true);
    screen
      .getAllByTestId("scene-bouquet-wisp", { includeHiddenElements: true })
      .forEach((wisp) => expect(StyleSheet.flatten(wisp.props.style).opacity).toBeGreaterThan(0));
  });

  it("pours both wines side by side when comparing", () => {
    const view = showScene("compare");
    expect(wineLevel("scene-compare-first")).toBe(0);
    expect(wineLevel("scene-compare-second")).toBe(0);
    view.unmount();

    showScene("compare", true);
    expect(wineLevel("scene-compare-first")).toBeGreaterThan(0);
    expect(wineLevel("scene-compare-second")).toBeGreaterThan(0);
  });

  it("examines one wine and then the other with a magnifier when contrasting them", () => {
    const view = showScene("contrast");
    const start = transformOf("scene-contrast-magnifier");
    expect(styleOf("scene-contrast-magnifier").opacity).toBe(0);
    view.unmount();

    showScene("contrast", true);
    const end = transformOf("scene-contrast-magnifier");
    expect(styleOf("scene-contrast-magnifier").opacity).toBe(1);
    expect(end.translateX).toBeLessThan(start.translateX as number);
    expect(wineLevel("scene-contrast-first")).toBeGreaterThan(wineLevel("scene-contrast-second"));
  });

  it("drops a bunch of grapes into each pan and lets the balance come to rest level", () => {
    const view = showScene("structure");
    const grapes = () =>
      screen.getAllByTestId("scene-structure-grapes", { includeHiddenElements: true });
    expect(grapes()).toHaveLength(2);
    grapes().forEach((bunch) => expect(StyleSheet.flatten(bunch.props.style).opacity).toBe(0));
    view.unmount();

    showScene("structure", true);
    grapes().forEach((bunch) => expect(StyleSheet.flatten(bunch.props.style).opacity).toBe(1));
    expect(transformOf("scene-structure-beam").rotate).toBe("0deg");
    screen
      .getAllByTestId("scene-structure-pan", { includeHiddenElements: true })
      .forEach((pan) => {
        const [x, y] = StyleSheet.flatten(pan.props.style).transform as Array<Record<string, number>>;
        expect(x?.translateX).toBeCloseTo(0);
        expect(y?.translateY).toBeCloseTo(0);
      });
  });

  it.each<WineProcessScene>(["report", "recommendation"])(
    "writes the notes on the page for the %s step",
    (scene) => {
      const lineWidths = () =>
        screen
          .getAllByTestId("scene-writing-line", { includeHiddenElements: true })
          .map((line) => StyleSheet.flatten(line.props.style).width as number);
      const view = showScene(scene);
      expect(part("scene-writing-pen")).toBeTruthy();
      expect(lineWidths()).toHaveLength(6);
      lineWidths().forEach((width) => expect(width).toBe(0));
      view.unmount();

      showScene(scene, true);
      lineWidths().forEach((width) => expect(width).toBeGreaterThan(0));
      expect(StyleSheet.flatten(part("scene-writing-ink").props.style).opacity).toBe(1);
    },
  );

  it("plays the step's gesture once and rests until the next step", () => {
    const loop = jest.spyOn(NativeAnimated, "loop");
    const view = render(<WineProcessSceneVisual scene="uncork" step={0} total={5} looks={RED} />);
    view.rerender(<WineProcessSceneVisual scene="visual" step={1} total={5} looks={RED} />);

    expect(withTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: SCENE_ACTION_MS.uncork }),
    );
    expect(withTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: SCENE_ACTION_MS.visual }),
    );
    expect(withTiming).toHaveBeenCalledWith(
      PROCESS_RING_CIRCUMFERENCE * (1 - 2 / 5),
      expect.objectContaining({ duration: 900 }),
    );
    expect(withRepeat).not.toHaveBeenCalled();
    expect(loop).not.toHaveBeenCalled();
  });

  it("writes again with a pause on the last step while the answer is on its way", () => {
    render(<WineProcessSceneVisual scene="report" step={4} total={5} looks={RED} />);

    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), -1, false);
    expect(withDelay).toHaveBeenCalledWith(SCENE_ACTION_PAUSE_MS, expect.anything());
  });

  it("writes the final note more slowly than the other gestures", () => {
    render(<WineProcessSceneVisual scene="report" step={4} total={5} looks={RED} />);

    expect(withTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: SCENE_ACTION_MS.report }),
    );
    expect(SCENE_ACTION_MS.report).toBeGreaterThan(SCENE_ACTION_MS.uncork);
    expect(SCENE_ACTION_MS.recommendation).toBeGreaterThan(SCENE_ACTION_MS.compare);
  });

  it("keeps a non-writing last step at rest", () => {
    render(<WineProcessSceneVisual scene="contrast" step={4} total={5} looks={RED} />);

    expect(withRepeat).not.toHaveBeenCalled();
  });

  it("shows the finished pose and a filled ring without animating when motion is reduced", () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    render(<WineProcessSceneVisual scene="report" step={4} total={5} looks={RED} />);

    expect(withTiming).not.toHaveBeenCalled();
    expect(withRepeat).not.toHaveBeenCalled();
    const progress = screen
      .UNSAFE_getAllByType(Circle)
      .find((circle) => circle.props.testID === "process-ring-progress");
    expect(progress?.props.strokeDashoffset).toBe(0);
  });
  describe("follows the wine type", () => {
    it.each(wineTypes)("fills the glass of a %s wine with its own colour and pours it in that colour", (type) => {
      const look = wineSceneLook(type);
      showScene("visual", false, wineSceneLooks(type));
      expect(part(`scene-visual-glass-${look.wine}`)).toBeTruthy();
      expect(styleOf("scene-visual-pour").backgroundColor).toBe(POUR_COLORS[look.wine]);
    });

    it.each(wineTypes)("keeps the glass of a %s wine through the aroma and the sip", (type) => {
      const look = wineSceneLook(type);
      const view = showScene("bouquet", false, wineSceneLooks(type));
      expect(part(`scene-bouquet-glass-${look.wine}`)).toBeTruthy();
      view.unmount();
      showScene("taste", false, wineSceneLooks(type));
      expect(part(`scene-taste-glass-${look.wine}`)).toBeTruthy();
    });

    it("draws a different glass for red, rosé, white and sparkling wines", () => {
      const glassFor = (type: WineType) => {
        const view = showScene("taste", false, wineSceneLooks(type));
        const source = sourceOf("scene-taste-glass");
        view.unmount();
        return source;
      };
      const sources = (["red", "rose", "white", "sparkling"] as WineType[]).map(glassFor);
      expect(new Set(sources).size).toBe(4);
      expect(glassFor("fortified")).toBe(glassFor("red"));
      expect(glassFor("orange")).toBe(glassFor("white"));
    });

    it("lets bubbles rise only through sparkling wine", () => {
      const view = showScene("taste", false, wineSceneLooks("sparkling"));
      expect(screen.getAllByTestId("scene-taste-glass-bubble", { includeHiddenElements: true })).toHaveLength(5);
      view.unmount();

      showScene("taste", false, wineSceneLooks("white"));
      expect(screen.queryAllByTestId("scene-taste-glass-bubble", { includeHiddenElements: true })).toHaveLength(0);
    });

    it("opens a dark bottle for red wines and a clear bottle that shows the wine for the others", () => {
      const bottle = (type: WineType) => {
        const view = showScene("uncork", false, wineSceneLooks(type));
        const kind = wineSceneLook(type).bottle;
        const source = sourceOf(`scene-uncork-bottle-${kind}`);
        expect(part("scene-uncork-corkscrew")).toBeTruthy();
        view.unmount();
        return source;
      };
      expect(bottle("fortified")).toBe(bottle("red"));
      const clear = (["white", "rose", "orange"] as WineType[]).map(bottle);
      expect(new Set(clear).size).toBe(3);
      expect(clear).not.toContain(bottle("red"));
      expect(bottle("dessert")).toBe(bottle("orange"));
    });

    it("pops a sparkling cork: the cage comes off, the cork jumps and a little foam wells up", () => {
      const looks = wineSceneLooks("sparkling");
      const view = showScene("uncork", false, looks);
      expect(part("scene-uncork-bottle-sparkling")).toBeTruthy();
      expect(screen.queryByTestId("scene-uncork-corkscrew", { includeHiddenElements: true })).toBeNull();
      expect(styleOf("scene-uncork-cage").opacity).toBe(1);
      expect(transformOf("scene-uncork-sparkling-cork").translateY).toBeCloseTo(0);
      screen
        .getAllByTestId("scene-uncork-foam", { includeHiddenElements: true })
        .forEach((foam) => expect(StyleSheet.flatten(foam.props.style).opacity).toBe(0));
      view.unmount();

      showScene("uncork", true, looks);
      expect(styleOf("scene-uncork-cage").opacity).toBe(0);
      expect(transformOf("scene-uncork-sparkling-cork").translateY).toBeLessThan(-50);
      expect(styleOf("scene-uncork-sparkling-cork").opacity).toBe(0);
      screen
        .getAllByTestId("scene-uncork-foam", { includeHiddenElements: true })
        .forEach((foam) => expect(StyleSheet.flatten(foam.props.style).opacity).toBeGreaterThan(0));
    });

    it("pours each wine of a comparison in its own glass", () => {
      showScene("compare", true, wineSceneLooks("white", "sparkling"));
      expect(part("scene-compare-first-white")).toBeTruthy();
      expect(part("scene-compare-second-sparkling")).toBeTruthy();
    });

    it("aims the magnifier at the bowl of each glass", () => {
      const lensEnd = (looks: WineSceneLooks) => {
        const view = showScene("contrast", true, looks);
        const end = transformOf("scene-contrast-magnifier").translateY;
        expect(part(`scene-contrast-second-${looks.second.wine}`)).toBeTruthy();
        view.unmount();
        return end as number;
      };
      // A flute's bowl sits higher than a Bordeaux glass's.
      expect(lensEnd(wineSceneLooks("red", "sparkling"))).toBeLessThan(lensEnd(wineSceneLooks("red", "red")));
    });

    it("drops red grapes for red and rosé wines and white grapes for the others", () => {
      const bunches = (looks: WineSceneLooks) => {
        const view = showScene("structure", true, looks);
        const sources = screen
          .getAllByTestId("scene-structure-grapes", { includeHiddenElements: true })
          .map((bunch) => bunch.findByType(Image).props.source as unknown);
        view.unmount();
        return sources;
      };
      const [red, white] = bunches(wineSceneLooks("red", "white"));
      expect(red).not.toBe(white);
      expect(bunches(wineSceneLooks("rose", "sparkling"))).toEqual([red, white]);
      expect(bunches(wineSceneLooks("orange", "fortified"))).toEqual([white, red]);
    });
  });
});
