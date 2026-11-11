import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView, State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import { TasteTraitSlider } from "./TasteTraitSlider";

const mockImpact = jest.fn();
jest.mock("@/presentation/hooks/ui", () => ({
  useHaptics: () => ({ impact: mockImpact, selection: jest.fn(), notification: jest.fn() }),
}));

const TRACK_WIDTH = 200;

function renderSlider(value = 40) {
  const onChange = jest.fn();
  render(<TasteTraitSlider trait="BODY" name="Cuerpo" level="Medio" value={value} color="#7A1F2E" onChange={onChange} />, {
    wrapper: GestureHandlerRootView,
  });
  fireEvent(screen.getByTestId("taste-slider-BODY"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: TRACK_WIDTH, height: 32 } },
  });
  return onChange;
}

// The gesture hands each value to the JS thread on the next tick.
const flush = () => act(() => jest.runOnlyPendingTimers());

describe("TasteTraitSlider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockImpact.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it("sets the value where the track is tapped and gives a light haptic", () => {
    const onChange = renderSlider();
    fireGestureHandler(getByGestureTestId("taste-slider-tap-BODY"), [
      { state: State.BEGAN, x: 150, y: 16 },
      { state: State.ACTIVE, x: 150, y: 16 },
      { state: State.END, x: 150, y: 16 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(75);
    expect(mockImpact).toHaveBeenCalledWith("light");
  });

  it("follows a drag, kept inside 0-100, with one haptic per release", () => {
    const onChange = renderSlider();
    fireGestureHandler(getByGestureTestId("taste-slider-pan-BODY"), [
      { state: State.BEGAN, x: 80, y: 16 },
      { state: State.ACTIVE, x: 100, y: 16 },
      { x: 260, y: 18 },
    ]);
    flush();
    expect(onChange).toHaveBeenCalledWith(50);
    expect(onChange).toHaveBeenLastCalledWith(100);
    // The helper ends the drag after the last move: one release, one haptic.
    expect(mockImpact).toHaveBeenCalledTimes(1);
    fireGestureHandler(getByGestureTestId("taste-slider-pan-BODY"), [
      { state: State.BEGAN, x: 20, y: 16 },
      { state: State.ACTIVE, x: -30, y: 16 },
      { state: State.END, x: -30, y: 16 },
    ]);
    flush();
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(mockImpact).toHaveBeenCalledTimes(2);
  });

  it("only takes over after a horizontal move, so a vertical swipe keeps scrolling the screen", () => {
    renderSlider();
    const pan = getByGestureTestId("taste-slider-pan-BODY");
    expect(pan.config).toMatchObject({ activeOffsetXStart: -8, activeOffsetXEnd: 8, failOffsetYStart: -12, failOffsetYEnd: 12 });
  });

  it("steps by 5 with the screen-reader actions, within 0-100", () => {
    const onChange = renderSlider(98);
    const slider = screen.getByTestId("taste-slider-BODY");
    expect(slider.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 98, text: "Medio" });
    fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onChange).toHaveBeenLastCalledWith(100);
    fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onChange).toHaveBeenLastCalledWith(93);
  });

  it("ignores touches before the track is measured", () => {
    const onChange = jest.fn();
    render(<TasteTraitSlider trait="BODY" name="Cuerpo" level="Medio" value={40} color="#7A1F2E" onChange={onChange} />, {
      wrapper: GestureHandlerRootView,
    });
    fireGestureHandler(getByGestureTestId("taste-slider-tap-BODY"), [
      { state: State.BEGAN, x: 150, y: 16 },
      { state: State.END, x: 150, y: 16 },
    ]);
    flush();
    expect(onChange).not.toHaveBeenCalled();
  });
});
