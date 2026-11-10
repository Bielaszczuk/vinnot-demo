import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import "@/shared/i18n";
import { RatingGlasses } from "./RatingGlasses";

it("fills each glass by its fraction: 2.2 is two full glasses and a fifth of the third", () => {
  render(<RatingGlasses rating={2.2} />);
  expect(screen.getAllByTestId("rating-glass-1")).toHaveLength(2);
  expect(screen.getByTestId("rating-glass-0.2")).toBeTruthy();
  expect(screen.getAllByTestId("rating-glass-0")).toHaveLength(2);
});

it("keeps whole glasses for a whole rating", () => {
  render(<RatingGlasses rating={4} wineType="white" />);
  expect(screen.getAllByTestId("rating-glass-1")).toHaveLength(4);
  expect(screen.getAllByTestId("rating-glass-0")).toHaveLength(1);
});

it("reads the rating with one decimal in the person's language", () => {
  render(<RatingGlasses rating={3.6} />);
  expect(screen.getByRole("image").props.accessibilityLabel).toBe("3.6 out of 5 glasses");
});

it("shows a single glass with its label in the comparison", () => {
  render(<RatingGlasses rating={4.2} max={1} showLabel wineType="sparkling" />);
  expect(screen.getAllByTestId("rating-glass-1")).toHaveLength(1);
  expect(screen.getByText("4.2")).toBeTruthy();
});

it("draws the glass art at the glass size, never at the image's own size", () => {
  render(<RatingGlasses rating={1} size={20} />);
  const wrapper = screen.getByTestId("rating-glass-1");
  const { width, height } = StyleSheet.flatten(wrapper.props.style);
  const glass = StyleSheet.flatten(screen.getAllByTestId("rating-glass-art")[0]?.props.style);
  expect(height).toBe(20);
  expect(glass).toMatchObject({ width, height });
  expect(StyleSheet.flatten(wrapper.props.style).overflow).toBe("hidden");
});
