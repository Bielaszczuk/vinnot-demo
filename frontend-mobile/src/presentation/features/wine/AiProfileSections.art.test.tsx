import type { ReactTestInstance } from "react-test-renderer";
import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { AiWineProfile } from "@/domain/wine/wine.types";
import { DISH_ART, NOTE_ART, SERVING_ART } from "@/shared/profileArt";
import { AiProfileSections } from "./AiProfileSections";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-reanimated", () => jest.requireActual("./profileArt/reanimatedMock").createReanimatedMock());

const hidden = { includeHiddenElements: true };

const profile = {
  wineId: "w1",
  summary: "",
  generatedAt: new Date(),
  aromaticProfile: { intensity: "Alta", primaryAromas: ["Café", "Hierbas silvestres", "Limón"], bouquet: "" },
  palateAnalysis: { sweetness: "Seco", sweetnessScore: 15, acidity: "", tannin: "", alcohol: "", body: "", texture: "", balance: "" },
  flavorProfile: { primaryFlavors: ["Pera"], intensity: "", finish: "" },
  foodPairings: { pairings: ["Pollo asado con hierbas"] },
  servingRecommendations: { temperature: "16-18 °C", glassware: "Copa amplia", decanting: "Airear 30 min", agingPotential: "5 años" },
  profileArt: {
    aromas: [{ label: "Café", art: "COFFEE" }, { label: "Hierbas silvestres", art: "FRESH_HERBS" }, { label: "Limón", art: "LEMON" }],
    flavors: [{ label: "Pera", art: "PEAR" }],
    pairings: [{ label: "Pollo asado con hierbas", art: "POULTRY" }],
    serving: { glass: "RED_BALLOON", decant: true, temperature: { min: 16, max: 18 } },
  },
} satisfies AiWineProfile;

// expo-image hands its host view a list of sources.
const imageOf = (testID: string) => [screen.getByTestId(testID, hidden).props.source].flat()[0];
const fillScale = () => {
  const fill = screen.getByRole("progressbar").children[0] as ReactTestInstance;
  const style = StyleSheet.flatten(fill.props.style) as { transform: { scaleX: number }[] };
  return style.transform[0]!.scaleX;
};

beforeEach(() => jest.mocked(useReducedMotion).mockReturnValue(false));

it("illustrates each section with its own art", () => {
  render(<AiProfileSections profile={profile} />);

  expect(imageOf("vignette-image-COFFEE")).toBe(NOTE_ART.COFFEE);
  expect(screen.getByTestId("profile-art-aromas", hidden)).toBeTruthy();
  expect(imageOf("vignette-image-PEAR")).toBe(NOTE_ART.PEAR);
  expect(screen.getByTestId("profile-art-flavors", hidden)).toBeTruthy();
  expect(imageOf("vignette-image-POULTRY")).toBe(DISH_ART.POULTRY);
  expect(screen.getByTestId("profile-art-pairings", hidden)).toBeTruthy();
  expect(imageOf("serving-art-RED_BALLOON")).toBe(SERVING_ART.RED_BALLOON);
  expect(imageOf("serving-art-DECANTER")).toBe(SERVING_ART.DECANTER);
  expect(imageOf("serving-art-CELLAR")).toBe(SERVING_ART.CELLAR);
  expect(screen.getByText("16–18 °C", hidden)).toBeTruthy();
});

it("keeps the art inside its section", () => {
  render(<AiProfileSections profile={{ ...profile, aromaticProfile: undefined, flavorProfile: undefined, foodPairings: undefined }} />);

  expect(screen.queryByTestId("profile-art-aromas", hidden)).toBeNull();
  expect(screen.queryByTestId("profile-art-flavors", hidden)).toBeNull();
  expect(screen.queryByTestId("profile-art-pairings", hidden)).toBeNull();
});

it("shows the text alone when the profile carries no art", () => {
  render(<AiProfileSections profile={{ ...profile, profileArt: null, servingRecommendations: { ...profile.servingRecommendations, agingPotential: "" } }} />);

  expect(screen.getByText("Café")).toBeTruthy();
  expect(screen.queryByTestId(/^profile-art-/, hidden)).toBeNull();
  expect(screen.queryByTestId(/^serving-art-/, hidden)).toBeNull();
  expect(screen.queryByTestId("serving-thermometer", hidden)).toBeNull();
});

it("fills the palate bars from zero on appear", () => {
  render(<AiProfileSections profile={profile} />);

  expect(fillScale()).toBe(0);
});

it("shows the palate bars already filled with reduced motion", () => {
  jest.mocked(useReducedMotion).mockReturnValue(true);
  render(<AiProfileSections profile={profile} />);

  expect(fillScale()).toBe(1);
});
