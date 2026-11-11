import { render, screen } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";
import { useReducedMotion, withRepeat } from "react-native-reanimated";
import { WineProcessSceneVisual, type WineProcessScene } from "./WineProcessScene";
import { BRUSH_TIP, PEN_NIB } from "./TasteProfileSceneArt";
import { wineSceneLooks } from "./wineSceneLook";
import { TASTE_ART, TASTE_QUIZ_ART } from "@/shared/profileArt";
import type { TasteQuizOptionKey } from "@/domain/tasteQuiz/tasteQuiz.types";
import glassTopGarnetImage from "../../../../assets/images/loading/glass-top-garnet.webp";
import glassTopImage from "../../../../assets/images/loading/glass-top.webp";
import handwritingImage from "../../../../assets/images/loading/handwriting.webp";
import journalFlatImage from "../../../../assets/images/loading/journal-flat.webp";
import penImage from "../../../../assets/images/loading/pen.webp";

// Same stand-in as the wine scenes: styles are computed once with the current progress, so a
// scene shows its opening pose (progress 0) or, with reduced motion, its finished pose (1).
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

const PICKS: TasteQuizOptionKey[] = [
  "SPICED_TEA_APPLE_TART",
  "RED_BERRIES",
  "LEMON_TART",
  "MUSHROOM_PASTA",
  "ROSES_VIOLETS",
];
const STAGE_CENTER = 64;

function show(scene: WineProcessScene, finished = false, picks: readonly TasteQuizOptionKey[] = PICKS, step = 0) {
  jest.mocked(useReducedMotion).mockReturnValue(finished);
  return render(
    <WineProcessSceneVisual scene={scene} step={step} total={4} looks={wineSceneLooks()} picks={picks} />,
  );
}

const all = (testID: string) => screen.getAllByTestId(testID, { includeHiddenElements: true });
const one = (testID: string) => screen.getByTestId(testID, { includeHiddenElements: true });
const styleOf = (node: ReturnType<typeof one>) => StyleSheet.flatten(node.props.style) as Record<string, unknown>;
const transformOf = (node: ReturnType<typeof one>) =>
  Object.assign({}, ...((styleOf(node).transform ?? []) as object[])) as Record<string, number | string>;
const sourceOf = (node: ReturnType<typeof one>) => node.findAllByType(Image)[0]?.props.source as unknown;
/** Where the brush's tip is on the stage: the layer moves by its transform from the top-left corner. */
const brushTip = (node: ReturnType<typeof one>) => {
  const style = styleOf(node);
  const move = transformOf(node);
  return {
    x: (style.left as number) + Number(move.translateX) + BRUSH_TIP.x * (style.width as number),
    y: (style.top as number) + Number(move.translateY) + BRUSH_TIP.y * (style.height as number),
  };
};
/** Where the pen's nib is on the stage. */
const penNib = (node: ReturnType<typeof one>) => {
  const style = styleOf(node);
  const move = transformOf(node);
  return {
    x: (style.left as number) + Number(move.translateX) + PEN_NIB.x * (style.width as number),
    y: (style.top as number) + Number(move.translateY) + PEN_NIB.y * (style.height as number),
  };
};
const centreOf = (node: ReturnType<typeof one>) => {
  const style = styleOf(node);
  return {
    x: (style.left as number) + (style.width as number) / 2 + Number(transformOf(node).translateX ?? 0),
    y: (style.top as number) + (style.height as number) / 2 + Number(transformOf(node).translateY ?? 0),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

describe("taste profile scenes", () => {
  it.each(["quizPicks", "quizGlass", "quizBlend", "quizWheel"] as const)("draws the %s scene", (scene) => {
    show(scene);
    expect(one(`process-scene-${scene}`)).toBeTruthy();
  });

  it("draws each pick into the open journal as the pen passes over it, with a note beside it", () => {
    const view = show("quizPicks");
    const journal = styleOf(one("scene-picks-journal"));
    expect(sourceOf(one("scene-picks-journal"))).toBe(journalFlatImage);
    const sketches = all("scene-picks-sketch");
    expect(sketches.map(sourceOf)).toEqual(PICKS.map((key) => TASTE_QUIZ_ART[key]));
    // Nothing is on the page yet, and nothing moves in from outside: each sketch is a window on the page.
    sketches.forEach((sketch) => {
      const style = styleOf(sketch);
      expect(style.overflow).toBe("hidden");
      expect(style.width).toBe(0);
      expect(transformOf(sketch).translateX).toBeUndefined();
      expect(transformOf(sketch).translateY).toBeUndefined();
      expect(Math.abs(parseFloat(String(transformOf(sketch).rotate ?? "0deg")))).toBeLessThanOrEqual(2);
    });
    const notes = all("scene-picks-note");
    expect(notes).toHaveLength(PICKS.length * 2);
    notes.forEach((note) => {
      expect(sourceOf(note)).toBe(handwritingImage);
      expect(styleOf(note).overflow).toBe("hidden");
      expect(styleOf(note).width).toBe(0);
    });
    // The pen waits with its nib at the first sketch, ready to draw it.
    const pen = one("scene-picks-pen");
    expect(sourceOf(pen)).toBe(penImage);
    expect(styleOf(pen).opacity).toBe(1);
    const first = styleOf(sketches[0]!);
    const nib = penNib(pen);
    expect(nib.x).toBeCloseTo(first.left as number, 3);
    expect(nib.y).toBeCloseTo((first.top as number) + (first.height as number) / 2, 3);
    expect(journal.width as number).toBeGreaterThan(100);
    view.unmount();

    show("quizPicks", true);
    const page = styleOf(one("scene-picks-journal"));
    const gutter = (page.left as number) + (page.width as number) / 2;
    const drawn = all("scene-picks-sketch");
    drawn.forEach((sketch, index) => {
      const style = styleOf(sketch);
      const left = style.left as number;
      const top = style.top as number;
      const size = style.height as number;
      // Fully drawn, blended into the paper, without shadows.
      expect(style.width).toBeCloseTo(size);
      expect(style.opacity as number).toBeLessThan(1);
      expect(style.opacity as number).toBeGreaterThanOrEqual(0.7);
      expect(style.mixBlendMode).toBe("multiply");
      expect(style.shadowOpacity).toBeUndefined();
      // Inside the journal and on one page, clear of the gutter.
      expect(left).toBeGreaterThan(page.left as number);
      expect(top).toBeGreaterThan(page.top as number);
      expect(top + size).toBeLessThan((page.top as number) + (page.height as number));
      expect(left + size < gutter || left > gutter).toBe(true);
      // Its two note lines are written to its right, inside the same page.
      const lines = all("scene-picks-note").slice(index * 2, index * 2 + 2);
      lines.forEach((line) => {
        const note = styleOf(line);
        expect(note.width as number).toBeGreaterThan(0);
        expect(note.left as number).toBeGreaterThanOrEqual(left + size);
        expect((note.top as number) >= top && (note.top as number) < top + size).toBe(true);
        const right = (note.left as number) + (note.width as number);
        expect(left > gutter ? right < (page.left as number) + (page.width as number) : right < gutter).toBe(true);
      });
    });
    // The pen has left the finished page.
    expect(styleOf(one("scene-picks-pen")).opacity).toBe(0);
  });

  it("draws only the picks it gets", () => {
    show("quizPicks", true, ["CITRUS"]);
    expect(all("scene-picks-sketch").map(sourceOf)).toEqual([TASTE_QUIZ_ART.CITRUS]);
    expect(all("scene-picks-note")).toHaveLength(2);
  });

  it("fills the empty glass with red wine and lets aromas rise, with no picks flying in", () => {
    const view = show("quizGlass");
    expect(styleOf(one("scene-glass-glass-wine")).height).toBe(0);
    expect(screen.queryAllByTestId("scene-glass-pick", { includeHiddenElements: true })).toHaveLength(0);
    all("scene-glass-wisp").forEach((wisp) => expect(styleOf(wisp).opacity).toBe(0));
    view.unmount();

    show("quizGlass", true);
    expect(styleOf(one("scene-glass-glass-wine")).height as number).toBeGreaterThan(0);
    expect(one("scene-glass-glass-red")).toBeTruthy();
    expect(all("scene-glass-wisp")).toHaveLength(3);
    expect(screen.queryAllByTestId("scene-glass-pick", { includeHiddenElements: true })).toHaveLength(0);
  });

  it("dips the brush into the palette wells and swirls the colours together in the middle", () => {
    const view = show("quizBlend");
    expect(one("scene-blend-palette")).toBeTruthy();
    all("scene-blend-swirl").forEach((blob) => expect(styleOf(blob).opacity).toBe(0));
    const restTip = brushTip(one("scene-blend-brush"));
    view.unmount();

    show("quizBlend", true);
    expect(all("scene-blend-swirl")).toHaveLength(3);
    all("scene-blend-swirl").forEach((blob) => expect(styleOf(blob).opacity as number).toBeGreaterThan(0));
    // The brush ends with its tip in the mixing well at the centre of the palette.
    const palette = styleOf(one("scene-blend-palette"));
    const mix = {
      x: (palette.left as number) + (palette.width as number) / 2,
      y: (palette.top as number) + (palette.height as number) / 2,
    };
    const tip = brushTip(one("scene-blend-brush"));
    expect(Math.hypot(tip.x - mix.x, tip.y - mix.y)).toBeLessThan(4);
    expect(Math.hypot(restTip.x - mix.x, restTip.y - mix.y)).toBeGreaterThan(20);
  });

  it("paints the six petals of the taste wheel around a glass of red wine seen from above", () => {
    const view = show("quizWheel");
    all("scene-wheel-petal").forEach((petal) => expect(styleOf(petal).opacity).toBe(0));
    expect(styleOf(one("scene-wheel-swirl")).opacity).toBe(0);
    view.unmount();

    show("quizWheel", true);
    const glass = one("scene-wheel-glass");
    expect(sourceOf(glass)).toBe(glassTopImage);
    expect(centreOf(glass)).toEqual({ x: STAGE_CENTER, y: STAGE_CENTER });
    const swirl = one("scene-wheel-swirl");
    expect(sourceOf(swirl)).toBe(glassTopGarnetImage);
    expect(centreOf(swirl)).toEqual({ x: STAGE_CENTER, y: STAGE_CENTER });
    const rim = (styleOf(glass).width as number) / 2;
    // The grape cluster is gone from this scene.
    expect(screen.queryByTestId("scene-wheel-emblem", { includeHiddenElements: true })).toBeNull();
    expect(
      screen.UNSAFE_getAllByType(Image).some((image) => image.props.source === TASTE_ART.GRAPE_CLUSTER),
    ).toBe(false);

    const petals = all("scene-wheel-petal");
    expect(petals).toHaveLength(6);
    expect(new Set(petals.map(sourceOf)).size).toBe(6);
    petals.forEach((petal, index) => {
      const angle = index * 60;
      expect(transformOf(petal).rotate).toBe(`${angle}deg`);
      expect(styleOf(petal).opacity).toBe(1);
      // Each petal sits out from the centre along its own angle, its point towards the glass.
      const { x, y } = centreOf(petal);
      const radians = (angle * Math.PI) / 180;
      const distance = Math.hypot(x - STAGE_CENTER, y - STAGE_CENTER);
      expect(x - STAGE_CENTER).toBeCloseTo(distance * Math.sin(radians), 3);
      expect(y - STAGE_CENTER).toBeCloseTo(-distance * Math.cos(radians), 3);
      // A clear gap between the glass rim and the petal's point.
      expect(distance - (styleOf(petal).height as number) / 2).toBeGreaterThanOrEqual(rim + 3);
    });
  });

  it("keeps painting the wheel while the profile is saved, and plays the other scenes once", () => {
    const view = show("quizPicks", false, PICKS, 3);
    expect(withRepeat).not.toHaveBeenCalled();
    view.unmount();
    show("quizWheel", false, PICKS, 3);
    expect(withRepeat).toHaveBeenCalled();
  });
});
