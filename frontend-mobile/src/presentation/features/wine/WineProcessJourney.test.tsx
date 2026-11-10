import { render, screen } from "@testing-library/react-native";
import { Eye, Wine } from "lucide-react-native";
import { WineProcessJourney, type WineProcessStep } from "./WineProcessJourney";

const mockSceneMounts = jest.fn();

jest.mock("./WineProcessScene", () => {
  const { useEffect } = jest.requireActual("react") as typeof import("react");
  const { Text } = jest.requireActual("react-native") as typeof import("react-native");
  return {
    WineProcessSceneVisual: ({ scene, step, total }: { scene: string; step: number; total: number }) => {
      useEffect(() => mockSceneMounts(), []);
      return (
        <>
          <Text testID="process-scene">{scene}</Text>
          <Text testID="process-scene-progress">{`${step + 1}/${total}`}</Text>
        </>
      );
    },
  };
});

const steps: WineProcessStep[] = [
  { key: "visual", label: "Análisis visual", icon: Eye, scene: "visual" },
  { key: "taste", label: "Perfil sensorial", icon: Wine, scene: "taste" },
];

describe("WineProcessJourney", () => {
  it("announces and renders the active semantic stage", () => {
    render(
      <WineProcessJourney
        eyebrow="Sommelier Vinnot"
        title="Analizando tu vino"
        subtitle="Creando un perfil profesional"
        steps={steps}
        activeStep={1}
      />,
    );

    expect(
      screen.getByLabelText("Analizando tu vino. Perfil sensorial").props
        .accessibilityValue,
    ).toEqual({
      min: 1,
      max: 2,
      now: 2,
    });
    expect(screen.getByTestId("process-scene").props.children).toBe("taste");
    expect(screen.getAllByText("Perfil sensorial")).toHaveLength(2);
  });

  it("keeps one loading ring and moves it forward as the stage changes", () => {
    mockSceneMounts.mockClear();
    const props = {
      eyebrow: "Sommelier Vinnot",
      title: "Analizando tu vino",
      subtitle: "Creando un perfil profesional",
      steps,
    };
    const view = render(<WineProcessJourney {...props} activeStep={0} />);
    expect(screen.getByTestId("process-scene-progress").props.children).toBe("1/2");

    view.rerender(<WineProcessJourney {...props} activeStep={1} />);

    expect(screen.getByTestId("process-scene").props.children).toBe("taste");
    expect(screen.getByTestId("process-scene-progress").props.children).toBe("2/2");
    expect(mockSceneMounts).toHaveBeenCalledTimes(1);
  });

  it("clamps stale progress beyond the final stage", () => {
    render(
      <WineProcessJourney
        eyebrow="Sommelier Vinnot"
        title="Analizando tu vino"
        subtitle="Creando un perfil profesional"
        steps={steps}
        activeStep={99}
      />,
    );

    expect(screen.getByTestId("process-scene").props.children).toBe("taste");
    expect(screen.getByText("02 / 02")).toBeTruthy();
  });
});
