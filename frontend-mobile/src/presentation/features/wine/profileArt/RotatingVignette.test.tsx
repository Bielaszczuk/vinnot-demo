import { act, render, screen } from "@testing-library/react-native";
import { useReducedMotion } from "react-native-reanimated";
import { RotatingVignette, VIGNETTE_ROTATE_MS, type Vignette } from "./RotatingVignette";

jest.mock("react-native-reanimated", () => jest.requireActual("./reanimatedMock").createReanimatedMock());

const hidden = { includeHiddenElements: true };
const items: Vignette[] = [
  { key: "COFFEE", label: "Café", source: 1 },
  { key: "FRESH_HERBS", label: "Hierbas silvestres", source: 2 },
  { key: "LEMON", label: "Limón", source: 3 },
  { key: "VANILLA", label: "Vainilla", source: 4 },
];

const shown = () => screen.queryAllByTestId(/^vignette-(?!image-)/, hidden).map((node) => node.props.testID);

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useReducedMotion).mockReturnValue(false);
});
afterEach(() => jest.useRealTimers());

it("changes in place from one note to the next, in order, then starts over", () => {
  render(<RotatingVignette items={items.slice(0, 3)} testID="art" />);

  expect(shown()).toEqual(["vignette-COFFEE"]);
  expect(screen.getByText("Café", hidden)).toBeTruthy();
  act(() => jest.advanceTimersByTime(VIGNETTE_ROTATE_MS));
  expect(shown()).toEqual(["vignette-FRESH_HERBS"]);
  act(() => jest.advanceTimersByTime(VIGNETTE_ROTATE_MS));
  expect(shown()).toEqual(["vignette-LEMON"]);
  act(() => jest.advanceTimersByTime(VIGNETTE_ROTATE_MS));
  expect(shown()).toEqual(["vignette-COFFEE"]);
});

it("hides the art from screen readers, since the text already lists every note", () => {
  render(<RotatingVignette items={items} testID="art" />);

  const art = screen.getByTestId("art", hidden);
  expect(art.props.accessibilityElementsHidden).toBe(true);
  expect(art.props.importantForAccessibility).toBe("no-hide-descendants");
});

it("shows a single note without rotating", () => {
  render(<RotatingVignette items={items.slice(0, 1)} testID="art" />);

  expect(jest.getTimerCount()).toBe(0);
  act(() => jest.advanceTimersByTime(VIGNETTE_ROTATE_MS * 3));
  expect(shown()).toEqual(["vignette-COFFEE"]);
});

it("renders nothing without notes", () => {
  render(<RotatingVignette items={[]} testID="art" />);

  expect(screen.queryByTestId("art", hidden)).toBeNull();
});

it("shows a still row of up to three notes with reduced motion", () => {
  jest.mocked(useReducedMotion).mockReturnValue(true);
  render(<RotatingVignette items={items} testID="art" />);

  expect(shown()).toEqual(["vignette-COFFEE", "vignette-FRESH_HERBS", "vignette-LEMON"]);
  expect(jest.getTimerCount()).toBe(0);
  act(() => jest.advanceTimersByTime(VIGNETTE_ROTATE_MS * 2));
  expect(shown()).toEqual(["vignette-COFFEE", "vignette-FRESH_HERBS", "vignette-LEMON"]);
});

it("clears its timer on unmount", () => {
  const view = render(<RotatingVignette items={items} testID="art" />);

  expect(jest.getTimerCount()).toBe(1);
  view.unmount();
  expect(jest.getTimerCount()).toBe(0);
});
