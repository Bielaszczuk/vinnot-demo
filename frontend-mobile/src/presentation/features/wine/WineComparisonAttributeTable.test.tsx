import type { ReactTestInstance } from "react-test-renderer";
import { act, render, screen } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";
import { WineComparisonAttributeTable } from "./WineComparisonAttributeTable";

const firstAttribute = {
  name: "Intensidad Frutal",
  wineAValue: "Fruta madura con una descripción extensa que debe permanecer legible",
  wineBValue: "Moderada y equilibrada",
  wineAScore: 85,
  wineBScore: 60,
};
const attributes = [firstAttribute];
const props = {
  wineAName: "Adrianna Lot 3 Malbec con nombre largo",
  wineBName: "Adrianna Lot 9 Malbec",
  attributesLabel: "Atributos",
  attributes,
};

describe("WineComparisonAttributeTable", () => {
  const initialDimensions = Dimensions.get("window");
  afterEach(() => act(() => Dimensions.set({ window: initialDimensions })));

  it.each<[number, number, "column" | "row"]>([
    [320, 1, "column"],
    [390, 1, "row"],
    [430, 1.5, "column"],
  ])("adapts at width %s and font scale %s", (width, fontScale, direction) => {
    Dimensions.set({ window: { width, height: 844, scale: 3, fontScale } });
    render(<WineComparisonAttributeTable {...props} />);
    expect(screen.getByTestId("comparison-attribute-values-0")).toHaveStyle({
      flexDirection: direction,
    });
    for (const text of [
      props.wineAName,
      props.wineBName,
      firstAttribute.name,
      firstAttribute.wineAValue,
    ]) {
      expect(screen.getByText(text).props.numberOfLines).toBeUndefined();
    }
  });

  it("exposes each wine's value without attributing a winner", () => {
    render(<WineComparisonAttributeTable {...props} />);
    const bars = screen.getAllByRole("progressbar");
    expect(bars[0]!.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 85 });
    expect(bars[1]!.props.accessibilityValue.now).toBe(60);
    expect(bars[0]!.props.accessibilityLabel).toContain(props.wineAName);
    expect(bars[1]!.props.accessibilityLabel).toContain(props.wineBName);
    expect(StyleSheet.flatten((bars[0]!.children[0] as ReactTestInstance).props.style)).toMatchObject({ width: "85%" });
    expect(bars[0]).toHaveStyle({ alignItems: "flex-end" });
    expect(bars[1]).toHaveStyle({ alignItems: "flex-start" });
    expect(screen.getByTestId("comparison-axis-0")).toHaveStyle({ flexDirection: "row" });
  });

  it("clamps overflow and preserves zero instead of fabricating a minimum score", () => {
    render(
      <WineComparisonAttributeTable
        {...props}
        attributes={[{ ...firstAttribute, wineAScore: -10, wineBScore: 140 }]}
      />,
    );
    const bars = screen.getAllByRole("progressbar");
    expect(StyleSheet.flatten((bars[0]!.children[0] as ReactTestInstance).props.style)).toMatchObject({ width: "0%" });
    expect(StyleSheet.flatten((bars[1]!.children[0] as ReactTestInstance).props.style)).toMatchObject({ width: "100%" });
    expect(bars[0]).toHaveStyle({ overflow: "hidden", width: "100%" });
  });

  it.each([undefined, NaN, Infinity, -Infinity])(
    "does not invent a bar for missing/invalid score %s",
    (score) => {
      render(
        <WineComparisonAttributeTable
          {...props}
          attributes={[{ ...firstAttribute, wineAScore: score, wineBScore: score }]}
        />,
      );
      expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
      expect(screen.getByText(firstAttribute.wineAValue)).toBeTruthy();
    },
  );

  it("keeps separate attributes separate", () => {
    render(
      <WineComparisonAttributeTable
        {...props}
        attributes={[...attributes, { ...firstAttribute, name: "Acidez" }]}
      />,
    );
    expect(screen.getAllByRole("progressbar")).toHaveLength(4);
    expect(screen.getByText("Acidez")).toBeTruthy();
  });
});
