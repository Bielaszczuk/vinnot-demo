import { render, screen } from "@testing-library/react-native";
import { SCENE_ACTION_MS } from "@/presentation/features/wine/WineProcessScene";
import esAR from "@/shared/i18n/locales/es-AR.json";
import enUS from "@/shared/i18n/locales/en-US.json";
import { TASTE_QUIZ_STAGE_INTERVAL_MS, TasteQuizLoadingSteps } from "./TasteQuizLoadingSteps";
import { TASTE_QUIZ_FINISH_MIN_MS } from "./useTasteQuizFlow";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/features/wine/WineProcessJourney", () => {
  const { Text } = jest.requireActual("react-native") as typeof import("react-native");
  return {
    WineProcessJourney: ({
      title,
      steps,
      picks,
    }: {
      title: string;
      steps: { key: string; label: string; scene: string }[];
      picks: readonly string[];
    }) => (
      <>
        <Text testID="journey-title">{title}</Text>
        <Text testID="journey-scenes">{steps.map((step) => step.scene).join(",")}</Text>
        <Text testID="journey-labels">{steps.map((step) => step.label).join(",")}</Text>
        <Text testID="journey-picks">{picks.join(",")}</Text>
      </>
    ),
  };
});

describe("TasteQuizLoadingSteps", () => {
  it("tells the member's own taste profile in four new scenes, in order, with their picks", () => {
    render(<TasteQuizLoadingSteps picks={["SPICED_TEA_APPLE_TART", "RED_BERRIES", "LEMON_TART"]} />);
    expect(screen.getByTestId("journey-title").props.children).toBe("tasteQuiz.finishing.title");
    expect(screen.getByTestId("journey-scenes").props.children).toBe("quizPicks,quizGlass,quizBlend,quizWheel");
    expect(screen.getByTestId("journey-labels").props.children).toBe(
      "tasteQuiz.finishing.picks,tasteQuiz.finishing.glass,tasteQuiz.finishing.blend,tasteQuiz.finishing.profile",
    );
    expect(screen.getByTestId("journey-picks").props.children).toBe("SPICED_TEA_APPLE_TART,RED_BERRIES,LEMON_TART");
  });
});

describe("taste quiz finish pacing", () => {
  const QUIZ_SCENES = ["quizPicks", "quizGlass", "quizBlend", "quizWheel"] as const;
  /** Scenes start this long after their step begins (fade in plus the action delay). */
  const SCENE_LEAD_MS = 120;

  it("plays each scene at a calm pace and lets it rest on its final pose before the next step", () => {
    QUIZ_SCENES.forEach((scene) => expect(SCENE_ACTION_MS[scene]).toBeGreaterThanOrEqual(2500));
    QUIZ_SCENES.slice(0, 3).forEach((scene) =>
      expect(TASTE_QUIZ_STAGE_INTERVAL_MS - SCENE_LEAD_MS - SCENE_ACTION_MS[scene]).toBeGreaterThanOrEqual(400),
    );
  });

  it("keeps the animation on screen until the wheel is fully drawn", () => {
    const wheelDrawnAt = 3 * TASTE_QUIZ_STAGE_INTERVAL_MS + SCENE_LEAD_MS + SCENE_ACTION_MS.quizWheel;
    expect(TASTE_QUIZ_FINISH_MIN_MS).toBeGreaterThanOrEqual(wheelDrawnAt);
  });

  it("names the last step as shaping the profile, not painting it", () => {
    expect(esAR.tasteQuiz.finishing.profile).toBe("Dando forma a tu perfil de gustos");
    expect(enUS.tasteQuiz.finishing.profile).toBe("Shaping your taste profile");
  });
});
