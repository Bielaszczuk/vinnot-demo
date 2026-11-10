import type { ReactTestInstance } from "react-test-renderer";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";
import { AiProfileSections } from "./AiProfileSections";
import { WineTasteProfile } from "./WineTasteProfile";
import type { AiWineProfile, Wine } from "@/domain/wine/wine.types";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

it.each([0, 1, 5, 30, 100])("uses the same sweetness scale in full and quick profiles for %s", (score) => {
  const full = render(<AiProfileSections profile={{ palateAnalysis: { sweetnessScore: score, sweetness: "Seco" } } as AiWineProfile} />);
  const fullBar = full.getByRole("progressbar");
  expect(fullBar.props.accessibilityValue.now).toBe(score);
  const width = `${Math.max(3, score)}%` as const;
  expect(StyleSheet.flatten((fullBar.children[0] as ReactTestInstance).props.style)).toMatchObject({ width });
  full.unmount();
  const quick = render(<WineTasteProfile wine={{ sweetnessScore: score } as Wine} />);
  expect(quick.getByRole("progressbar").props.accessibilityValue.now).toBe(score);
  expect(StyleSheet.flatten((quick.getByRole("progressbar").children[0] as ReactTestInstance).props.style)).toMatchObject({ width });
});

it("renders the section art with the real animation library", () => {
  const view = render(
    <AiProfileSections
      profile={{
        wineId: "w1",
        summary: "",
        generatedAt: new Date(),
        aromaticProfile: { intensity: "Alta", primaryAromas: ["Café", "Limón"], bouquet: "" },
        servingRecommendations: { temperature: "16-18 °C", glassware: "Amplia", decanting: "Airear", agingPotential: "5 años" },
        profileArt: {
          aromas: [{ label: "Café", art: "COFFEE" }, { label: "Limón", art: "LEMON" }],
          flavors: [],
          pairings: [],
          serving: { glass: "RED_BALLOON", decant: true, temperature: { min: 16, max: 18 } },
        },
      } as AiWineProfile}
    />,
  );
  expect(view.getByTestId("profile-art-aromas", { includeHiddenElements: true })).toBeTruthy();
  expect(view.getByText("16–18 °C", { includeHiddenElements: true })).toBeTruthy();
  view.unmount();
});
