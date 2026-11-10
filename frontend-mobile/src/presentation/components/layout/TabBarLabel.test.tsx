import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TabBarLabel, TAB_LABEL_MAX_FONT_SCALE } from "./TabBarLabel";

it("caps the label growth with large text so the tab bar does not clip", () => {
  render(<TabBarLabel color="#ab214c">Bodega</TabBarLabel>);
  const label = screen.getByText("Bodega");
  expect(TAB_LABEL_MAX_FONT_SCALE).toBe(1.3);
  expect(label.props.maxFontSizeMultiplier).toBe(TAB_LABEL_MAX_FONT_SCALE);
  expect(label.props.numberOfLines).toBe(1);
  expect(StyleSheet.flatten(label.props.style).color).toBe("#ab214c");
});
