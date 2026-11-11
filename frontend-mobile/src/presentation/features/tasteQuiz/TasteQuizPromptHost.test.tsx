import { act, render } from "@testing-library/react-native";
import type { TasteQuizState } from "@/domain/tasteQuiz/tasteQuiz.types";
import { TasteQuizPromptHost } from "./TasteQuizPromptHost";
import { TASTE_QUIZ_PROMPT_DELAY_MS } from "./useTasteQuizPrompt";

type Request = { key: string };

const mockPush = jest.fn();
const mockAuth: { user: { id: string; onboardingCompleted?: boolean } | null; isAuthenticated: boolean } = {
  user: null,
  isAuthenticated: true,
};
const mockRequests: (Request | symbol)[] = [];
let mockQuiz: TasteQuizState | undefined;

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => mockAuth }));
jest.mock("@/presentation/store/api", () => {
  const { skipToken } = jest.requireActual("@reduxjs/toolkit/query");
  const idle = { data: undefined, isLoading: false, isFetching: false, isError: false };
  // RTK Query hands back the same result until it changes; so does this stand-in.
  const results = new Map<unknown, unknown>();
  return {
    useTypedQuery: (request: Request | symbol) => {
      mockRequests.push(request);
      if (request === skipToken) return idle;
      if (!results.has(mockQuiz)) results.set(mockQuiz, { ...idle, data: mockQuiz });
      return results.get(mockQuiz);
    },
  };
});

const prompt = (shouldPrompt: boolean): TasteQuizState => ({ status: "PENDING", answers: null, shouldPrompt });

function wait() {
  act(() => {
    jest.advanceTimersByTime(TASTE_QUIZ_PROMPT_DELAY_MS);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockRequests.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

it("opens the quiz once when the server says it should prompt", () => {
  mockAuth.user = { id: "first-user", onboardingCompleted: true };
  mockQuiz = prompt(true);
  const { rerender } = render(<TasteQuizPromptHost />);
  expect(mockPush).not.toHaveBeenCalled();
  wait();
  expect(mockPush).toHaveBeenCalledWith("/(app)/taste-quiz");
  rerender(<TasteQuizPromptHost />);
  wait();
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it("does not open it again in the same app session, even after the host remounts", () => {
  mockAuth.user = { id: "second-user", onboardingCompleted: true };
  mockQuiz = prompt(true);
  const first = render(<TasteQuizPromptHost />);
  wait();
  first.unmount();
  render(<TasteQuizPromptHost />);
  wait();
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it("does not open the quiz when the server says not to prompt", () => {
  mockAuth.user = { id: "third-user", onboardingCompleted: true };
  mockQuiz = prompt(false);
  render(<TasteQuizPromptHost />);
  wait();
  expect(mockPush).not.toHaveBeenCalled();
});

it("waits for the profile completion before asking the server", () => {
  mockAuth.user = { id: "fourth-user", onboardingCompleted: false };
  mockQuiz = prompt(true);
  render(<TasteQuizPromptHost />);
  wait();
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockRequests.every((request) => typeof request === "symbol")).toBe(true);
});
