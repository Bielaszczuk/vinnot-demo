import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView, State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "@/shared/i18n";
import { RatingPourControl } from "./RatingPourControl";
import { SliderGhost, SliderThumb } from "./RatingSlider";
import { glassLeft, POUR_GLASS_HEIGHT, pourLayout, sliderLayout, sliderX, UNCORK_MS } from "./pourGeometry";
import { ratingArt, TRACK_GRADIENTS, WINE_ART } from "./ratingArt";
import { KNOWN_WINE_TYPES } from "@/domain/wine/wine.types";

// The bar spans the compact md control's glasses: whole scores sit under their glasses.
const compact = pourLayout(POUR_GLASS_HEIGHT.md, ratingArt("red").glass, ratingArt("red").bottle);
const bar = sliderLayout(compact, ratingArt("red").glass);
const glassCentre = (index: number) => glassLeft(index, compact) + compact.glassWidth / 2;
// A hair past the exact spot, so float noise cannot round a .x5 score down.
const barX = (score: number) => sliderX(score, bar) + 1e-6;
const HINT = "Drag the bottle or the bar to rate";

const mockSelection = jest.fn();
jest.mock("@/presentation/hooks/ui", () => ({
  ...jest.requireActual("@/presentation/hooks/ui"),
  useHaptics: () => ({ selection: mockSelection, impact: jest.fn(), notification: jest.fn() }),
}));

function renderControl(value: number, onChange = jest.fn(), disabled = false) {
  render(<RatingPourControl value={value} onChange={onChange} wineType="red" testID="pour" disabled={disabled} />, {
    wrapper: GestureHandlerRootView,
  });
  return { onChange };
}

const flush = () => act(() => jest.runOnlyPendingTimers());
const settle = () => act(async () => {});
// The demo waits for the bottle to uncork by itself.
const uncorked = () => act(() => jest.advanceTimersByTime(UNCORK_MS));
// The bar is hidden from screen readers, so queries must include hidden elements.
const getBar = () => screen.getByTestId("rating-slider", { includeHiddenElements: true });
// The real track fill is the last rounded rect drawn with a gradient.
const trackFillWidth = () => {
  const fills = screen.UNSAFE_root.findAll(
    (node) => (node.type as unknown) === "SkiaRoundedRect" && typeof node.props.width === "object",
  );
  return fills[fills.length - 1]!.props.width.value as number;
};
const thumbX = () => screen.UNSAFE_getByType(SliderThumb).props.x.value as number;
const tapBar = (score: number) => {
  fireGestureHandler(getByGestureTestId("rating-slider-tap"), [
    { state: State.BEGAN, x: barX(score), y: 17 },
    { state: State.ACTIVE, x: barX(score), y: 17 },
    { state: State.END, x: barX(score), y: 17 },
  ]);
  flush();
};

describe("RatingPourControl slider bar", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    mockSelection.mockClear();
    await AsyncStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  it("sits under the glasses, as wide as them, with an empty glass at the far left while unrated", () => {
    renderControl(0);
    const slider = getBar();
    expect(slider.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: compact.width })]));
    const thumb = screen.UNSAFE_getByType(SliderThumb);
    expect(thumb.props.x.value).toBe(bar.start);
    expect(thumb.props.fill.value).toBe(0);
    // The same watercolor glass as the five above.
    expect(thumb.props.glass).toBe(ratingArt("red").glass);
    expect(trackFillWidth()).toBe(0);
  });

  it("fills the track to the glass with a gradient of the wine's colour", () => {
    renderControl(3);
    expect(trackFillWidth()).toBeCloseTo(sliderX(3, bar) - bar.start);
    const gradients = screen.UNSAFE_root.findAll((node) => (node.type as unknown) === "SkiaLinearGradient");
    expect(gradients[gradients.length - 1]!.props.colors).toEqual([...ratingArt("red").trackGradient]);
    screen.unmount();
    render(<RatingPourControl value={3} onChange={jest.fn()} wineType="white" />, { wrapper: GestureHandlerRootView });
    const white = screen.UNSAFE_root.findAll((node) => (node.type as unknown) === "SkiaLinearGradient");
    expect(white[white.length - 1]!.props.colors).toEqual([...TRACK_GRADIENTS.white]);
  });

  it("has a gradient pair for every wine look and wine type", () => {
    for (const look of Object.keys(WINE_ART) as (keyof typeof WINE_ART)[]) {
      expect(TRACK_GRADIENTS[look]).toEqual([expect.stringMatching(/^#[0-9A-F]{6}$/i), expect.stringMatching(/^#[0-9A-F]{6}$/i)]);
    }
    for (const type of [...KNOWN_WINE_TYPES, null]) {
      expect(ratingArt(type).trackGradient).toHaveLength(2);
    }
  });

  it("fills the bar to the end under the last glass: 1.0 and 5.0 sit under the first and last glass", () => {
    const { onChange } = renderControl(1);
    expect(thumbX()).toBeCloseTo(glassCentre(0));
    fireGestureHandler(getByGestureTestId("rating-slider-tap"), [
      { state: State.BEGAN, x: glassCentre(4), y: 24 },
      { state: State.ACTIVE, x: glassCentre(4), y: 24 },
      { state: State.END, x: glassCentre(4), y: 24 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(thumbX()).toBeCloseTo(glassCentre(4));
    expect(trackFillWidth()).toBeCloseTo(glassCentre(4) - bar.start);
    // The track itself runs from 0 to 5.
    const track = screen.UNSAFE_root.findAll(
      (node) => (node.type as unknown) === "SkiaRoundedRect" && typeof node.props.width === "number",
    )[0]!;
    expect(track.props.x).toBeCloseTo(bar.start);
    expect(track.props.width).toBeCloseTo(bar.end - bar.start);
  });

  it("sets the score from a tap on the bar, snapped to one decimal, and pours with it", () => {
    const { onChange } = renderControl(0);
    tapBar(2.15);
    expect(onChange).toHaveBeenLastCalledWith(2.2);
    // The bottle above follows: the live score is the one the pour control shows.
    expect(screen.getByTestId("rating-pour-value")).toHaveTextContent("2.2");
    expect(thumbX()).toBeCloseTo(sliderX(2.2, bar));
  });

  it("follows the finger along the bar, ticks once per whole glass and clamps at both ends", () => {
    const { onChange } = renderControl(1);
    fireGestureHandler(getByGestureTestId("rating-slider-pan"), [
      { state: State.BEGAN, x: barX(1), y: 17 },
      { state: State.ACTIVE, x: barX(1.5), y: 17 },
      { x: barX(2.3), y: 17 },
      { x: barX(3.4), y: 17 },
      { x: compact.width + 60, y: 17 },
      { state: State.END, x: compact.width + 60, y: 17 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByTestId("rating-pour-value")).toHaveTextContent("5.0");
    expect(mockSelection).toHaveBeenCalledTimes(3);
    expect(thumbX()).toBe(bar.end);
    fireGestureHandler(getByGestureTestId("rating-slider-pan"), [
      { state: State.BEGAN, x: barX(4), y: 17 },
      { state: State.ACTIVE, x: -30, y: 17 },
      { state: State.END, x: -30, y: 17 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(0.1);
  });

  it("moves with the bottle, a screen-reader step and a new value from outside", () => {
    const onChange = jest.fn();
    renderControl(1, onChange);
    expect(thumbX()).toBeCloseTo(sliderX(1, bar));
    expect(screen.UNSAFE_getByType(SliderThumb).props.fill.value).toBeCloseTo(0.2);
    fireGestureHandler(getByGestureTestId("rating-pour-pan"), [
      { state: State.BEGAN, x: compact.side + (1 / 5) * compact.inner, y: 60 },
      { state: State.ACTIVE, x: compact.side + (3.5 / 5) * compact.inner + 1e-6, y: 60 },
      { state: State.END, x: compact.side + (3.5 / 5) * compact.inner + 1e-6, y: 60 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(3.5);
    expect(thumbX()).toBeCloseTo(sliderX(3.5, bar));
    fireEvent(screen.getByRole("adjustable"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(thumbX()).toBeCloseTo(sliderX(3.6, bar));
    screen.rerender(<RatingPourControl value={4.4} onChange={onChange} wineType="red" testID="pour" />);
    expect(thumbX()).toBeCloseTo(sliderX(4.4, bar));
    expect(screen.UNSAFE_getByType(SliderThumb).props.fill.value).toBeCloseTo(0.88);
  });

  it("hides the explanation and the demo as soon as the bar is touched", async () => {
    renderControl(0);
    await settle();
    uncorked();
    expect(screen.getByText(HINT)).toBeTruthy();
    expect(screen.UNSAFE_queryByType(SliderGhost)).not.toBeNull();
    fireGestureHandler(getByGestureTestId("rating-slider-pan"), [
      { state: State.BEGAN, x: barX(0.5), y: 17 },
      { state: State.FAILED, x: barX(0.5), y: 17 },
    ]);
    flush();
    expect(screen.queryByText(HINT)).toBeNull();
    expect(screen.UNSAFE_queryByType(SliderGhost)).toBeNull();
  });

  it("records one lesson per opening when rated from the bar", async () => {
    renderControl(0);
    await settle();
    tapBar(2);
    tapBar(3);
    await settle();
    await expect(AsyncStorage.getItem("vinnot_rating_gesture_count")).resolves.toBe("1");
  });

  it("glides a see-through glass along the bar during the demo, to the demo's level", async () => {
    renderControl(0);
    await settle();
    uncorked();
    const ghost = screen.UNSAFE_getByType(SliderGhost);
    expect(ghost.props.level).toBeDefined();
    const thumb = ghost.findByType(SliderThumb);
    const level = ghost.props.level.value as number;
    expect(thumb.props.x.value).toBeCloseTo(sliderX(level, bar));
    // Centred on the track like the real glass.
    expect(thumb.props.slider).toEqual(bar);
  });

  it("shows the score right below the bar, at the end of the track, outside the part hidden from screen readers", () => {
    renderControl(2.4);
    // Found without hidden elements: screen readers can reach it.
    const readout = screen.getByTestId("rating-pour-value");
    expect(readout).toHaveTextContent("2.4");
    const ancestors: string[] = [];
    for (let node = readout.parent; node; node = node.parent) {
      if (typeof node.props.testID === "string") ancestors.push(node.props.testID);
    }
    expect(ancestors).toContain("rating-score-row");
    expect(ancestors).not.toContain("rating-slider");
    const row = screen.getByTestId("rating-score-row");
    // Right-aligned with the end of the track.
    expect(row.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ width: compact.width, paddingRight: compact.width - bar.end }),
    ]));
    // The score row comes after the bar, in the control and not inside the bar.
    const order = screen.getByTestId("pour")
      .findAll((node) => typeof node.type === "string" && typeof node.props.testID === "string")
      .map((node) => node.props.testID as string);
    expect(order.indexOf("rating-score-row")).toBeGreaterThan(order.indexOf("rating-slider"));
    expect(getBar().findAll((node) => node.props.testID === "rating-pour-value")).toHaveLength(0);
  });

  it("is hidden from screen readers: the pour control stays the single slider", () => {
    renderControl(2);
    const slider = getBar();
    expect(slider.props.accessible).toBe(false);
    expect(slider.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(slider.props.accessibilityElementsHidden).toBe(true);
    expect(screen.getAllByRole("adjustable")).toHaveLength(1);
  });

  it("does not change the score while disabled, and dims like the control", () => {
    const { onChange } = renderControl(2, jest.fn(), true);
    tapBar(4);
    fireGestureHandler(getByGestureTestId("rating-slider-pan"), [
      { state: State.BEGAN, x: barX(2), y: 17 },
      { state: State.ACTIVE, x: barX(4), y: 17 },
      { state: State.END, x: barX(4), y: 17 },
    ]);
    flush();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("rating-pour-value")).toHaveTextContent("2.0");
    expect(getBar().props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0.55 })]),
    );
  });
});
