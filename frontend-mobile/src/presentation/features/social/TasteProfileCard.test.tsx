import { render, screen } from "@testing-library/react-native";
import type { TasteSlice, TasteTraits } from "@/domain/social/social.types";
import { TasteProfileCard } from "./TasteProfileCard";

jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: () => true }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) =>
      options ? `${key}(${Object.values(options).join("|")})` : key,
    i18n: { language: "es-AR" },
  }),
}));

const wheel: TasteSlice[] = [
  { kind: "GRAPE", value: "malbec", label: "Malbec", score: 4.5, tone: "RED", ratedWines: 4 },
  { kind: "TYPE", value: "RED", label: "RED", score: 4.2, tone: "RED", ratedWines: 6 },
];
const traits: TasteTraits = {
  structure: [{ trait: "BODY", score: 70, wines: 5, adjusted: false }],
  families: [{ family: "FRUIT", percent: 60 }],
  fromQuiz: true,
};
const order = () =>
  screen
    .getAllByTestId(/^taste-(wheel|wheel-hint|locked|structure)$/, { includeHiddenElements: true })
    .map((node) => node.props.testID);

describe("TasteProfileCard around the redesigned wheel", () => {
  it("keeps the wheel above the traits when there is one", () => {
    render(<TasteProfileCard wheel={wheel} traits={traits} isOwn={false} />);
    expect(order()).toEqual(["taste-wheel", "taste-structure"]);
    expect(screen.queryByTestId("taste-wheel-hint")).toBeNull();
    expect(screen.queryByTestId("taste-locked")).toBeNull();
  });

  it("keeps the locked state when there is neither a wheel nor traits", () => {
    render(<TasteProfileCard wheel={null} traits={null} isOwn />);
    expect(screen.getByTestId("taste-locked")).toBeTruthy();
    expect(screen.getByText("social.taste.lockedOwn")).toBeTruthy();
    expect(screen.queryByTestId("taste-wheel")).toBeNull();
  });

  it("keeps the quiz-only profile with its note and the locked-wheel hint above the traits", () => {
    render(<TasteProfileCard wheel={null} traits={traits} isOwn={false} />);
    expect(screen.getByText("social.taste.fromQuiz")).toBeTruthy();
    expect(order()).toEqual(["taste-wheel-hint", "taste-structure"]);
    expect(screen.getByTestId("taste-wheel-lock")).toBeTruthy();
    expect(screen.queryByTestId("taste-locked")).toBeNull();
  });
});
