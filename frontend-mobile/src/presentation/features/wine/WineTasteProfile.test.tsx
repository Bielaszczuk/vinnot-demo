import type { ReactTestInstance } from "react-test-renderer";
import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { WineTasteProfile } from "./WineTasteProfile";
import type { Wine } from "@/domain/wine/wine.types";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

it("renders low scores on the 0-100 scale without expanding five to a full bar", () => {
  render(<WineTasteProfile wine={{ bodyScore: 70, tanninScore: 0, sweetnessScore: 5, acidityScore: 100 } as Wine} />);
  const bars = screen.getAllByRole("progressbar");
  expect(bars.map((bar) => bar.props.accessibilityValue.now)).toEqual([70, 0, 5, 100]);
  expect(StyleSheet.flatten((bars[2]!.children[0] as ReactTestInstance).props.style)).toMatchObject({ width: "5%" });
  expect(StyleSheet.flatten((bars[1]!.children[0] as ReactTestInstance).props.style)).toMatchObject({ width: "3%" });
});

it("does not invent scores for empty or invalid quick profiles", () => {
  render(<WineTasteProfile wine={{ bodyScore: null, tanninScore: NaN, acidityScore: Infinity } as Wine} />);
  expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
});
