import { act, fireEvent, render, screen } from "@testing-library/react-native";
import TasteQuizRoute from "../../../../app/(app)/taste-quiz";
import { hapticsService } from "@/application/services/haptics.service";
import type { TasteQuizState } from "@/domain/tasteQuiz/tasteQuiz.types";
import { TASTE_QUIZ_ADVANCE_MS, TASTE_QUIZ_FINISH_MIN_MS } from "./useTasteQuizFlow";

type Request = { key: string; params?: Record<string, unknown> };

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
const mockMutate = jest.fn<void, [Request]>();
const mockMutateAsync = jest.fn<Promise<void>, [Request]>();
let mockQuiz: TasteQuizState | undefined;

jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && "current" in options ? `${key}:${String(options.current)}/${String(options.total)}` : key,
  }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
jest.mock("@/application/services/haptics.service", () => ({ hapticsService: { selection: jest.fn() } }));
jest.mock("@/presentation/features/wine/WineProcessJourney", () => {
  const { Text, View } = jest.requireActual("react-native");
  return {
    WineProcessJourney: ({ title, steps, activeStep }: { title: string; steps: { label: string }[]; activeStep: number }) => (
      <View>
        <Text>{title}</Text>
        <Text>{steps[activeStep]?.label}</Text>
      </View>
    ),
  };
});
jest.mock("@/presentation/store/mutationAdapter", () => ({
  useOperationMutation: (factory: (arg: unknown) => Request) => ({
    mutate: (arg: unknown) => mockMutate(factory(arg)),
    mutateAsync: (arg: unknown) => mockMutateAsync(factory(arg)),
    isPending: false,
  }),
}));
jest.mock("@/presentation/store/api", () => {
  const { skipToken } = jest.requireActual("@reduxjs/toolkit/query");
  const idle = { data: undefined, isLoading: false, isFetching: false, isError: false, error: undefined, refetch: jest.fn() };
  // RTK Query hands back the same result until it changes; so does this stand-in.
  const results = new Map<unknown, unknown>();
  return {
    useTypedQuery: (request: Request | symbol) => {
      if (request === skipToken || (request as Request).key !== "social.tasteQuiz") return idle;
      if (!results.has(mockQuiz)) results.set(mockQuiz, { ...idle, data: mockQuiz });
      return results.get(mockQuiz);
    },
  };
});

const PENDING: TasteQuizState = { status: "PENDING", answers: null, shouldPrompt: true };
const COMPLETED: TasteQuizState = {
  status: "COMPLETED",
  answers: {
    RAINY_DAY: "DARK_CHOCOLATE_COFFEE",
    FRUIT: "CITRUS",
    DESSERT: "BROWNIE",
    DINNER: "LEMON_FISH",
    AROMA: "CUT_GRASS",
  },
  shouldPrompt: false,
};

function choose(option: string) {
  fireEvent.press(screen.getByTestId(`taste-quiz-option-${option}`));
  act(() => {
    jest.advanceTimersByTime(TASTE_QUIZ_ADVANCE_MS);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
  mockQuiz = PENDING;
  mockMutateAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

it("shows the first question with its two illustrated options and no traits", () => {
  render(<TasteQuizRoute />);
  expect(screen.getByText("tasteQuiz.questions.RAINY_DAY")).toBeTruthy();
  expect(screen.getAllByTestId(/^taste-quiz-option-/).map((option) => option.props.testID)).toEqual([
    "taste-quiz-option-DARK_CHOCOLATE_COFFEE",
    "taste-quiz-option-SPICED_TEA_APPLE_TART",
  ]);
  const option = screen.getByRole("button", { name: "tasteQuiz.options.DARK_CHOCOLATE_COFFEE" });
  expect(option.props.accessibilityState).toMatchObject({ selected: false });
  expect(screen.getByLabelText("tasteQuiz.progress:1/5")).toBeTruthy();
  expect(screen.queryByText(/ACIDITY|BODY|TANNIN|SWEETNESS/)).toBeNull();
});

it("selects with a light haptic and advances to the next question after a short beat", () => {
  render(<TasteQuizRoute />);
  fireEvent.press(screen.getByTestId("taste-quiz-option-SPICED_TEA_APPLE_TART"));
  expect(hapticsService.selection).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("taste-quiz-option-SPICED_TEA_APPLE_TART").props.accessibilityState).toMatchObject({
    selected: true,
  });
  expect(screen.getByText("tasteQuiz.questions.RAINY_DAY")).toBeTruthy();
  act(() => {
    jest.advanceTimersByTime(TASTE_QUIZ_ADVANCE_MS);
  });
  expect(screen.getByText("tasteQuiz.questions.FRUIT")).toBeTruthy();
  expect(screen.getAllByTestId(/^taste-quiz-option-/)).toHaveLength(4);
  expect(screen.getByLabelText("tasteQuiz.progress:2/5")).toBeTruthy();
});

it("goes back to the previous question with its answer still selected", () => {
  render(<TasteQuizRoute />);
  expect(screen.queryByTestId("taste-quiz-back")).toBeNull();
  choose("DARK_CHOCOLATE_COFFEE");
  fireEvent.press(screen.getByTestId("taste-quiz-back"));
  expect(screen.getByText("tasteQuiz.questions.RAINY_DAY")).toBeTruthy();
  expect(screen.getByTestId("taste-quiz-option-DARK_CHOCOLATE_COFFEE").props.accessibilityState).toMatchObject({
    selected: true,
  });
  expect(screen.getByTestId("taste-quiz-option-SPICED_TEA_APPLE_TART").props.accessibilityState).toMatchObject({
    selected: false,
  });
});

it("skips on any step: records the skip and goes back", () => {
  render(<TasteQuizRoute />);
  choose("DARK_CHOCOLATE_COFFEE");
  fireEvent.press(screen.getByText("tasteQuiz.skip"));
  expect(mockMutate).toHaveBeenCalledWith({ key: "social.tasteQuiz.skip" });
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

it("skips to Home when there is nothing to go back to", () => {
  mockRouter.canGoBack.mockReturnValue(false);
  render(<TasteQuizRoute />);
  fireEvent.press(screen.getByText("tasteQuiz.skip"));
  expect(mockMutate).toHaveBeenCalledWith({ key: "social.tasteQuiz.skip" });
  expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/home");
});

it("leaves a retake without recording a skip, so the completed quiz stays", () => {
  mockQuiz = COMPLETED;
  render(<TasteQuizRoute />);
  fireEvent.press(screen.getByText("tasteQuiz.skip"));
  expect(mockMutate).not.toHaveBeenCalled();
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

function answerAll() {
  choose("SPICED_TEA_APPLE_TART");
  choose("RED_BERRIES");
  choose("LEMON_TART");
  choose("MUSHROOM_PASTA");
  choose("ROSES_VIOLETS");
}

const FIVE_ANSWERS = {
  RAINY_DAY: "SPICED_TEA_APPLE_TART",
  FRUIT: "RED_BERRIES",
  DESSERT: "LEMON_TART",
  DINNER: "MUSHROOM_PASTA",
  AROMA: "ROSES_VIOLETS",
};

it("sends the five answers while the taste profile animation plays, then opens the own profile", async () => {
  render(<TasteQuizRoute />);
  answerAll();
  expect(mockMutateAsync).toHaveBeenCalledWith({ key: "social.tasteQuiz.complete", params: { answers: FIVE_ANSWERS } });
  expect(screen.getByText("tasteQuiz.finishing.title")).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(TASTE_QUIZ_FINISH_MIN_MS - 100);
  });
  // The animation stays on screen for its minimum time even when the answer is instant.
  expect(mockRouter.replace).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(100);
  });
  expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: "/(app)/users/[id]", params: { id: "me" } });
});

it("offers a friendly retry that keeps the answers when saving fails", async () => {
  mockMutateAsync.mockRejectedValueOnce({ status: 500, message: "boom" });
  render(<TasteQuizRoute />);
  answerAll();
  await act(async () => {
    jest.advanceTimersByTime(TASTE_QUIZ_FINISH_MIN_MS);
  });
  expect(screen.getByText("tasteQuiz.error.title")).toBeTruthy();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("tasteQuiz.error.retry"));
  expect(mockMutateAsync).toHaveBeenLastCalledWith({
    key: "social.tasteQuiz.complete",
    params: { answers: FIVE_ANSWERS },
  });
  await act(async () => {
    jest.advanceTimersByTime(TASTE_QUIZ_FINISH_MIN_MS);
  });
  expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: "/(app)/users/[id]", params: { id: "me" } });
});
