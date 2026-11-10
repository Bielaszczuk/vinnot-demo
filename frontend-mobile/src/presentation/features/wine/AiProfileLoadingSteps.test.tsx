import { render, screen } from "@testing-library/react-native";
import { AiProfileLoadingSteps } from "./AiProfileLoadingSteps";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback,
  }),
}));

jest.mock("./WineProcessJourney", () => {
  const { Text } = jest.requireActual("react-native") as typeof import("react-native");
  return {
    WineProcessJourney: ({ looks }: { looks: { first: { glass: string; wine: string; bottle: string } } }) => (
      <Text testID="profile-look">{`${looks.first.glass}/${looks.first.wine}/${looks.first.bottle}`}</Text>
    ),
  };
});

describe("AiProfileLoadingSteps", () => {
  it("draws the profiled wine with its own glass, colour and bottle", () => {
    render(<AiProfileLoadingSteps wineType="sparkling" />);
    expect(screen.getByTestId("profile-look").props.children).toBe("flute/sparkling/sparkling");
  });

  it("draws a red wine while the wine's type is not known yet", () => {
    render(<AiProfileLoadingSteps />);
    expect(screen.getByTestId("profile-look").props.children).toBe("bordeaux/red/dark");
  });
});
