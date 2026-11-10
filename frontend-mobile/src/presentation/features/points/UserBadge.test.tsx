import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { UserBadge } from "./UserBadge";

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const reducedMotion = useReducedMotion as jest.Mock;

describe("UserBadge", () => {
  beforeEach(() => reducedMotion.mockReturnValue(false));

  it("renders nothing when the user has no visible badge", () => {
    render(<UserBadge tier={null} />);
    expect(screen.toJSON()).toBeNull();
    render(<UserBadge tier={undefined} />);
    expect(screen.toJSON()).toBeNull();
  });

  it("draws the tier art and names the tier for screen readers", () => {
    render(<UserBadge tier="GRAN_RESERVA" size="profile" mode="loop" />);
    expect(screen.getByRole("image", { name: "points.tiers.GRAN_RESERVA" })).toBeTruthy();
    expect(screen.UNSAFE_getAllByType("SkiaImage" as never).length).toBeGreaterThanOrEqual(2);
  });

  it("skips sparkles below 40 points and keeps them at profile size", () => {
    const { UNSAFE_queryAllByType, rerender } = render(<UserBadge tier="VINNOT" size={24} />);
    expect(UNSAFE_queryAllByType("SkiaPath" as never)).toHaveLength(0);
    expect(UNSAFE_queryAllByType("SkiaPoints" as never)).toHaveLength(0);
    rerender(<UserBadge tier="VINNOT" size="profile" mode="loop" />);
    expect(UNSAFE_queryAllByType("SkiaPath" as never)).toHaveLength(12);
    expect(UNSAFE_queryAllByType("SkiaPoints" as never)).toHaveLength(3);
  });

  it("keeps the glitter inside the seal, clipped like every other light layer", () => {
    const { UNSAFE_getAllByType, UNSAFE_getByType } = render(<UserBadge tier="VINNOT" size="profile" mode="loop" />);
    const canvas = UNSAFE_getByType("SkiaCanvas" as never).props as { style: { left: number; width: number } };
    const pad = -canvas.style.left;
    const size = canvas.style.width - pad * 2;
    const seal = { x: pad, y: pad, width: size, height: size };
    const clips: { x: number; y: number; width: number; height: number }[] = [];
    for (const glitter of UNSAFE_getAllByType("SkiaPoints" as never)) {
      for (const point of glitter.props.points as { x: number; y: number }[]) {
        expect(point.x).toBeGreaterThanOrEqual(seal.x);
        expect(point.x).toBeLessThanOrEqual(seal.x + seal.width);
        expect(point.y).toBeGreaterThanOrEqual(seal.y);
        expect(point.y).toBeLessThanOrEqual(seal.y + seal.height);
      }
      let parent = glitter.parent;
      while (parent && !(parent.props as { clip?: unknown }).clip) parent = parent.parent;
      clips.push(parent?.props.clip);
    }
    // Strictly inside the art's rect: the masking draw is antialiased on its own edge,
    // so light reaching that edge would leave a faint box around the seal.
    expect(clips.length).toBeGreaterThan(0);
    for (const clip of clips) {
      expect(clip.x).toBeGreaterThan(seal.x);
      expect(clip.y).toBeGreaterThan(seal.y);
      expect(clip.x + clip.width).toBeLessThan(seal.x + seal.width);
      expect(clip.y + clip.height).toBeLessThan(seal.y + seal.height);
    }
  });

  it("keeps a resting seal flat, without the 3D tilt that leaves a box edge on iOS", () => {
    const { UNSAFE_getByType } = render(<UserBadge tier="VINNOT" size="profile" mode="loop" interactive onPress={jest.fn()} />);
    let node = UNSAFE_getByType("SkiaCanvas" as never).parent;
    while (node && !("transform" in (StyleSheet.flatten(node.props.style) ?? {}))) node = node.parent;
    expect(node).toBeTruthy();
    expect(StyleSheet.flatten(node?.props.style).transform).toEqual([]);
  });

  it("opens its action when pressed", () => {
    const onPress = jest.fn();
    render(<UserBadge tier="RACIMO" size="profile" mode="loop" onPress={onPress} accessibilityLabel="Racimo · 92 points" />);
    fireEvent.press(screen.getByRole("button", { name: "Racimo · 92 points" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("still shows the seal with reduced motion", () => {
    reducedMotion.mockReturnValue(true);
    render(<UserBadge tier="BARRICA" size="card" mode="list" />);
    expect(screen.getByRole("image", { name: "points.tiers.BARRICA" })).toBeTruthy();
  });
});
