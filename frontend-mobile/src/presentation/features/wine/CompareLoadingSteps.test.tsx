import { act, render, screen } from "@testing-library/react-native";
import { WINE_COMPARISON_STAGE_INTERVAL_MS } from "./wineProcessTiming";
import { CompareLoadingSteps } from "./CompareLoadingSteps";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback,
  }),
}));

jest.mock("./WineProcessJourney", () => {
  const { Text } = jest.requireActual("react-native") as typeof import("react-native");
  return {
    WineProcessJourney: ({
      steps,
      activeStep,
      looks,
    }: {
      steps: Array<{ label: string; scene: string }>;
      activeStep: number;
      looks: { first: { glass: string }; second: { glass: string } };
    }) => (
      <>
        <Text testID="comparison-stage">
          {activeStep}:{steps[activeStep]?.scene}:{steps[activeStep]?.label}
        </Text>
        <Text testID="comparison-glasses">{`${looks.first.glass}/${looks.second.glass}`}</Text>
      </>
    ),
  };
});

describe("CompareLoadingSteps", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reaches and exposes the final recommendation stage", () => {
    render(<CompareLoadingSteps />);

    expect(screen.getByTestId("comparison-stage").props.children.join("")).toBe(
      "0:compare:Leyendo identidad y perfil sensorial",
    );

    act(() => jest.advanceTimersByTime(WINE_COMPARISON_STAGE_INTERVAL_MS));
    act(() => jest.advanceTimersByTime(WINE_COMPARISON_STAGE_INTERVAL_MS));
    act(() => jest.advanceTimersByTime(WINE_COMPARISON_STAGE_INTERVAL_MS));

    expect(screen.getByTestId("comparison-stage").props.children.join("")).toBe(
      "3:recommendation:Preparando la recomendación final",
    );
  });

  it("draws each wine of the comparison in its own glass, and red wines until the types are known", () => {
    const view = render(<CompareLoadingSteps firstType="white" secondType="sparkling" />);
    expect(screen.getByTestId("comparison-glasses").props.children).toBe("tulip/flute");
    view.unmount();

    render(<CompareLoadingSteps />);
    expect(screen.getByTestId("comparison-glasses").props.children).toBe("bordeaux/bordeaux");
  });
});
