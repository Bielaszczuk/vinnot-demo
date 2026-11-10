import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView, State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "@/shared/i18n";
import { GhostBottle } from "./GhostBottle";
import { RatingPourControl } from "./RatingPourControl";
import { GHOST_CYCLE_MS, LIFT_MS, POUR_GLASS_HEIGHT, pourLayout, UNCORK_MS } from "./pourGeometry";
import { PourBottle } from "./PourBottle";
import { ratingArt } from "./ratingArt";

// The compact md control: the rail starts after the bottle's stand and is five glass slots long.
const compact = pourLayout(POUR_GLASS_HEIGHT.md, ratingArt("red").glass, ratingArt("red").bottle);
const SIDE = compact.side;
const RAIL = compact.inner;
// A hair past the exact spot, so float noise cannot round a .x5 score down.
const xFor = (score: number) => SIDE + (score / 5) * RAIL + 1e-6;

const mockSelection = jest.fn();
jest.mock("@/presentation/hooks/ui", () => ({
  ...jest.requireActual("@/presentation/hooks/ui"),
  useHaptics: () => ({ selection: mockSelection, impact: jest.fn(), notification: jest.fn() }),
}));

let mockReduceMotion = false;
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  ...jest.requireActual("react-native-reanimated"),
  useReducedMotion: () => mockReduceMotion,
}));

function renderControl(value: number, onChange = jest.fn(), disabled = false) {
  render(<RatingPourControl value={value} onChange={onChange} wineType="red" testID="pour" disabled={disabled} />, {
    wrapper: GestureHandlerRootView,
  });
  const slider = screen.getByRole("adjustable");
  return { slider, onChange };
}

const flush = () => act(() => jest.runOnlyPendingTimers());
/** The bottle uncorks by itself when the control opens unrated. */
const uncorked = () => act(() => jest.advanceTimersByTime(UNCORK_MS));

describe("RatingPourControl", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSelection.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it("shows the score next to the glasses and the slider value", () => {
    const { slider } = renderControl(3.6);
    expect(screen.getByTestId("rating-pour-value")).toHaveTextContent("3.6");
    expect(screen.getByText("/ 5")).toBeTruthy();
    expect(slider.props.accessibilityValue).toMatchObject({ min: 0, max: 5, now: 3.6, text: "3.6 of 5" });
  });

  it("reads 0.0 while the wine is not rated yet", () => {
    const { slider } = renderControl(0);
    expect(screen.getByTestId("rating-pour-value")).toHaveTextContent("0.0");
    expect(slider.props.accessibilityValue).toMatchObject({ now: 0, text: "Not rated yet" });
  });

  it("spreads the glasses over the width it is given", () => {
    const { slider } = renderControl(0);
    expect(slider.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: compact.width })]));
    fireEvent(screen.getByTestId("pour"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 120 } } });
    expect(screen.getByRole("adjustable").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 300 })]),
    );
  });

  it("steps a tenth up and down for screen readers", () => {
    const { slider, onChange } = renderControl(3.6);
    fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onChange).toHaveBeenLastCalledWith(3.7);
    fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onChange).toHaveBeenLastCalledWith(3.6);
  });

  it("starts an empty rating at 0.1 and never passes 5.0", () => {
    const empty = renderControl(0);
    fireEvent(empty.slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(empty.onChange).toHaveBeenCalledWith(0.1);
    screen.unmount();
    const full = renderControl(5);
    fireEvent(full.slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(full.onChange).not.toHaveBeenCalled();
  });

  it("sets the score from a tap on a glass, snapped to one decimal", () => {
    const { onChange } = renderControl(0);
    fireGestureHandler(getByGestureTestId("rating-pour-tap"), [
      { state: State.BEGAN, x: xFor(2.15), y: 60 },
      { state: State.ACTIVE, x: xFor(2.15), y: 60 },
      { state: State.END, x: xFor(2.15), y: 60 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(2.2);
  });

  it("follows the finger, ticks once per whole glass and clamps at both ends", () => {
    const { onChange } = renderControl(1);
    fireGestureHandler(getByGestureTestId("rating-pour-pan"), [
      { state: State.BEGAN, x: xFor(1), y: 60 },
      { state: State.ACTIVE, x: xFor(1.5), y: 60 },
      { x: xFor(2.3), y: 60 },
      { x: xFor(3.4), y: 60 },
      { x: 400, y: 60 },
      { state: State.END, x: 400, y: 60 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByTestId("rating-pour-value")).toHaveTextContent("5.0");
    // 1 → 2.3 → 3.4 → 5.0 crosses into a new glass three times; 1.5 stays in the same glass.
    expect(mockSelection).toHaveBeenCalledTimes(3);
    fireGestureHandler(getByGestureTestId("rating-pour-pan"), [
      { state: State.BEGAN, x: 300, y: 60 },
      { state: State.ACTIVE, x: 0, y: 60 },
      { state: State.END, x: 0, y: 60 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(0.1);
  });
});

describe("RatingPourControl teaching the drag", () => {
  const COUNT_KEY = "vinnot_rating_gesture_count";
  const HINT = "Drag the bottle or the bar to rate";
  const settle = () => act(async () => {});
  // The demo is drawn in the canvas: a see-through copy of the bottle.
  const queryDemo = () => screen.UNSAFE_queryByType(GhostBottle);
  const rate = () => {
    fireGestureHandler(getByGestureTestId("rating-pour-tap"), [
      { state: State.BEGAN, x: xFor(2.15), y: 60 },
      { state: State.ACTIVE, x: xFor(2.15), y: 60 },
      { state: State.END, x: xFor(2.15), y: 60 },
    ]);
    flush();
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    mockReduceMotion = false;
    await AsyncStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  it("explains the gesture under the glasses until the bottle is touched", async () => {
    renderControl(0);
    await settle();
    expect(screen.getByText(HINT)).toBeTruthy();
    fireGestureHandler(getByGestureTestId("rating-pour-pan"), [
      { state: State.BEGAN, x: xFor(0.5), y: 60 },
      { state: State.FAILED, x: xFor(0.5), y: 60 },
    ]);
    flush();
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it("keeps the explanation for someone who already learned the gesture", async () => {
    await AsyncStorage.setItem(COUNT_KEY, "3");
    renderControl(0);
    await settle();
    expect(screen.getByText(HINT)).toBeTruthy();
    expect(queryDemo()).toBeNull();
  });

  it("shows no explanation once the wine is rated, nor while disabled", async () => {
    renderControl(3.6);
    await settle();
    expect(screen.queryByText(HINT)).toBeNull();
    expect(queryDemo()).toBeNull();
    screen.unmount();
    renderControl(0, jest.fn(), true);
    await settle();
    expect(screen.queryByText(HINT)).toBeNull();
    expect(queryDemo()).toBeNull();
  });

  it("shows a see-through bottle gliding over the glasses each time it opens unrated", async () => {
    renderControl(0);
    await settle();
    uncorked();
    expect(queryDemo()).not.toBeNull();
    // Only the real bottle casts a shadow; on the see-through copy it would read as haze.
    // The shadow is the layer paint of the bottle's group.
    const shadows = (root: { findAll: (match: (node: { type: unknown; props: { layer?: unknown } }) => boolean) => unknown[] }) =>
      root.findAll((node) => node.type === "SkiaGroup" && node.props.layer !== undefined).length;
    expect(shadows(queryDemo()!)).toBe(0);
    expect(shadows(screen.UNSAFE_root)).toBe(1);
    screen.unmount();
    renderControl(0);
    await settle();
    uncorked();
    expect(queryDemo()).not.toBeNull();
  });

  it("plays the demo twice, then stops", async () => {
    renderControl(0);
    await settle();
    uncorked();
    act(() => jest.advanceTimersByTime(GHOST_CYCLE_MS * 2 - 50));
    expect(queryDemo()).not.toBeNull();
    act(() => jest.advanceTimersByTime(100));
    expect(queryDemo()).toBeNull();
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it("teaches the gesture for three ratings, then never shows the demo again", async () => {
    for (const lesson of [1, 2, 3]) {
      renderControl(0);
      await settle();
      uncorked();
      expect(queryDemo()).not.toBeNull();
      rate();
      rate();
      await settle();
      // One opening counts once, however many times it is rated.
      await expect(AsyncStorage.getItem(COUNT_KEY)).resolves.toBe(String(lesson));
      screen.unmount();
    }
    renderControl(0);
    await settle();
    expect(queryDemo()).toBeNull();
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it("does not show the demo when the system asks for reduced motion", async () => {
    mockReduceMotion = true;
    renderControl(0);
    await settle();
    expect(queryDemo()).toBeNull();
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it("stops the demo as soon as the control is touched", async () => {
    renderControl(0);
    await settle();
    uncorked();
    expect(queryDemo()).not.toBeNull();
    fireGestureHandler(getByGestureTestId("rating-pour-pan"), [
      { state: State.BEGAN, x: xFor(0.5), y: 60 },
      { state: State.FAILED, x: xFor(0.5), y: 60 },
    ]);
    flush();
    expect(queryDemo()).toBeNull();
  });

  it("never rates on its own while the demo plays", async () => {
    const { onChange } = renderControl(0);
    await settle();
    act(() => jest.advanceTimersByTime(GHOST_CYCLE_MS * 3));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("rating-pour-value")).toHaveTextContent("0.0");
  });
});

describe("RatingPourControl uncorking before the first rating", () => {
  // The real bottle; the demo's see-through copy draws no shadow.
  const bottle = () => screen.UNSAFE_getAllByType(PourBottle).find((node) => node.props.shadow !== false)!;
  const uncork = () => bottle().props.uncork.value as number;
  const level = () => bottle().props.level.value as number;
  const settle = () => act(async () => {});
  const queryDemo = () => screen.UNSAFE_queryByType(GhostBottle);
  const tap = (score: number) => {
    fireGestureHandler(getByGestureTestId("rating-pour-tap"), [
      { state: State.BEGAN, x: xFor(score), y: 60 },
      { state: State.ACTIVE, x: xFor(score), y: 60 },
      { state: State.END, x: xFor(score), y: 60 },
    ]);
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    mockReduceMotion = false;
    await AsyncStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  it("uncorks the bottle by itself when the control opens unrated, then leaves it open on its stand", async () => {
    renderControl(0);
    await settle();
    act(() => jest.advanceTimersByTime(UNCORK_MS / 2));
    expect(uncork()).toBeGreaterThan(0);
    expect(uncork()).toBeLessThan(1);
    act(() => jest.advanceTimersByTime(UNCORK_MS));
    expect(uncork()).toBe(1);
    // Still upright on its stand: it lifts only on the first rating.
    expect(bottle().props.stand.value).toBe(1);
  });

  it("stays corked while disabled", async () => {
    renderControl(0, jest.fn(), true);
    await settle();
    act(() => jest.advanceTimersByTime(UNCORK_MS * 2));
    expect(uncork()).toBe(0);
  });

  it("does not uncork by itself when it opens rated, even when the form resets", async () => {
    const onChange = jest.fn();
    renderControl(3, onChange);
    await settle();
    expect(uncork()).toBe(1);
    screen.rerender(<RatingPourControl value={0} onChange={onChange} wineType="red" testID="pour" />);
    act(() => jest.advanceTimersByTime(UNCORK_MS * 2));
    // Corked again, as before.
    expect(uncork()).toBe(0);
  });

  it("pours the first rating without waiting for the uncorking", async () => {
    renderControl(0);
    await settle();
    uncorked();
    tap(2);
    // No wait for the uncorking nor the lift: the glasses fill while the bottle lifts.
    act(() => jest.advanceTimersByTime(150));
    expect(150).toBeLessThan(LIFT_MS);
    expect(level()).toBeCloseTo(2);
  });

  it("follows the bar on the first rating without waiting for the uncorking", async () => {
    renderControl(0);
    await settle();
    uncorked();
    fireGestureHandler(getByGestureTestId("rating-slider-tap"), [
      { state: State.BEGAN, x: 300, y: 24 },
      { state: State.ACTIVE, x: 300, y: 24 },
      { state: State.END, x: 300, y: 24 },
    ]);
    act(() => jest.advanceTimersByTime(150));
    expect(level()).toBeCloseTo(5);
  });

  it("finishes the uncorking at once when touched before it ends, and pours in step", async () => {
    renderControl(0);
    await settle();
    act(() => jest.advanceTimersByTime(UNCORK_MS / 3));
    expect(uncork()).toBeLessThan(1);
    fireGestureHandler(getByGestureTestId("rating-pour-pan"), [
      { state: State.BEGAN, x: xFor(0.5), y: 60 },
      { state: State.FAILED, x: xFor(0.5), y: 60 },
    ]);
    act(() => jest.advanceTimersByTime(16));
    expect(uncork()).toBe(1);
    tap(1.5);
    act(() => jest.advanceTimersByTime(150));
    expect(level()).toBeCloseTo(1.5);
  });

  it("starts open with reduced motion, with no demo", async () => {
    mockReduceMotion = true;
    renderControl(0);
    expect(uncork()).toBe(1);
    await settle();
    expect(queryDemo()).toBeNull();
  });

  it("plays the demo only once the bottle is open, with the see-through bottle open too", async () => {
    renderControl(0);
    await settle();
    act(() => jest.advanceTimersByTime(UNCORK_MS - 50));
    expect(queryDemo()).toBeNull();
    act(() => jest.advanceTimersByTime(100));
    expect(queryDemo()).not.toBeNull();
    const ghost = screen.UNSAFE_getAllByType(PourBottle).find((node) => node.props.shadow === false)!;
    expect(ghost.props.uncork.value).toBe(1);
  });
});
