import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ProfileRoute from "../../../../app/(app)/users/[id]";
import type { PublicProfile } from "@/domain/social/social.types";

type Request = { key: string; params?: Record<string, unknown> };
type Callbacks = { onError?: () => void; onSuccess?: () => void };

const mockPush = jest.fn();
const mockMutate = jest.fn<void, [Request, Callbacks | undefined]>();
const mockRefetch = jest.fn();
const mockAuth = { user: { id: "viewer" } as { id: string } | null };
let mockProfile: PublicProfile;
let mockCellarError: unknown;
let mockQuizResult: { data: unknown } | undefined;
const mockRequests: Request[] = [];

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "u-1" }),
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && "name" in options ? `${key}:${String(options.name)}` : options && "percent" in options ? `${key}:${String(options.percent)}` : key,
    i18n: { language: "es-AR" },
  }),
}));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ user: mockAuth.user }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({ useToast: () => ({ showError: jest.fn(), showInfo: jest.fn() }) }));
jest.mock("@/presentation/components/layout", () => {
  const { Text, View } = jest.requireActual("react-native");
  return {
    AppHeader: ({ title, rightAction }: { title: string; rightAction?: React.ReactNode }) => (
      <View>
        <Text>{title}</Text>
        {rightAction}
      </View>
    ),
  };
});
jest.mock("@/presentation/features/community/CommunityActions", () => {
  const { Text } = jest.requireActual("react-native");
  return { CommunityActions: ({ targetType }: { targetType: string }) => <Text>{`actions:${targetType}`}</Text> };
});
jest.mock("@/presentation/features/user/EditProfileSheet", () => {
  const { Text } = jest.requireActual("react-native");
  return { EditProfileSheet: ({ visible }: { visible: boolean }) => (visible ? <Text>edit-sheet</Text> : null) };
});
jest.mock("@/presentation/features/points/NameBadge", () => ({ NameBadge: () => null }));
jest.mock("./TasteWheel", () => {
  const { Text } = jest.requireActual("react-native");
  return { TasteWheel: ({ slices }: { slices: unknown[] }) => <Text>{`wheel:${slices.length}`}</Text> };
});
jest.mock("@/presentation/store/mutationAdapter", () => ({
  useOperationMutation: (factory: (arg: unknown) => Request) => ({
    mutate: (arg: unknown, callbacks?: Callbacks) => mockMutate(factory(arg), callbacks),
    isPending: false,
  }),
}));
// RTK Query hands back the same data object until it changes; the stand-in does too.
const mockPage = (items: unknown[]) => ({ items, page: 0, totalItems: items.length, totalPages: 1, hasMore: false });
const mockReviewsPage = mockPage([
  {
    id: "r-1",
    rating: 4,
    title: "Gran Malbec",
    comment: null,
    vintage: null,
    createdAt: new Date("2026-11-01"),
    reviewer: { id: "u-1", username: "ana", displayName: "Ana", avatarUrl: null, tier: null },
    wine: { id: "w-1", name: "Catena Malbec", imageUrl: null, type: "red", wineryName: "Catena" },
  },
]);
const mockCellarPage = mockPage([
  { id: "c-1", wine: { id: "w-2", name: "Zuccardi", imageUrl: null, type: "red", wineryName: null }, vintage: 2018, rating: 5, addedAt: new Date("2026-10-01") },
]);
jest.mock("@/presentation/store/api", () => {
  const { skipToken } = jest.requireActual("@reduxjs/toolkit/query");
  return {
    useTypedQuery: (request: Request | symbol) => {
      const idle = { data: undefined, isLoading: false, isFetching: false, isError: false, error: undefined, refetch: mockRefetch };
      if (request === skipToken) return idle;
      const { key } = request as Request;
      mockRequests.push(request as Request);
      if (key === "social.profile") return { ...idle, data: mockProfile };
      if (key === "social.reviews") return { ...idle, data: mockReviewsPage };
      if (key === "social.tasteQuiz") return mockQuizResult ?? idle;
      if (key === "social.cellar")
        return mockCellarError ? { ...idle, isError: true, error: mockCellarError } : { ...idle, data: mockCellarPage };
      return idle;
    },
  };
});

function profile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: "u-1",
    username: "ana",
    displayName: "Ana Pérez",
    avatarUrl: null,
    tier: "BARRICA",
    bio: "Malbec y montaña",
    createdAt: new Date("2026-01-01"),
    followersCount: 12,
    followingCount: 3,
    reviewsCount: 8,
    cellarCount: 20,
    cellarVisible: true,
    following: false,
    followsYou: true,
    affinityPercent: 73,
    tasteWheel: [{ kind: "TYPE", value: "RED", label: "Tinto", score: 4, tone: "RED", ratedWines: 6 }],
    tasteTraits: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequests.length = 0;
  mockAuth.user = { id: "viewer" };
  mockProfile = profile();
  mockCellarError = undefined;
  mockQuizResult = undefined;
});

it("renders the profile fields, counters, affinity and the taste wheel", () => {
  render(<ProfileRoute />);
  // The header title and the profile card both show the username.
  expect(screen.getAllByText("@ana")).toHaveLength(2);
  expect(screen.getByText("Ana Pérez")).toBeTruthy();
  expect(screen.getByText("Malbec y montaña")).toBeTruthy();
  expect(screen.getByText("social.followsYou")).toBeTruthy();
  expect(screen.getByText("social.affinity:73")).toBeTruthy();
  expect(screen.getByText("12")).toBeTruthy();
  expect(screen.getByText("20")).toBeTruthy();
  expect(screen.getByText("wheel:1")).toBeTruthy();
  expect(screen.getByText("Catena Malbec")).toBeTruthy();
  expect(screen.getByText("actions:USER")).toBeTruthy();
  expect(mockRequests).toContainEqual({ key: "social.profile", params: { userId: "u-1" } });
});

it("follows with an optimistic button and follower count", () => {
  render(<ProfileRoute />);
  fireEvent.press(screen.getByText("social.follow"));
  expect(mockMutate).toHaveBeenCalledWith({ key: "social.follow", params: { userId: "u-1" } }, expect.any(Object));
  expect(screen.getByText("social.following")).toBeTruthy();
  expect(screen.getByText("13")).toBeTruthy();
});

it("unfollows someone already followed and goes back when it fails", () => {
  mockProfile = profile({ following: true });
  render(<ProfileRoute />);
  fireEvent.press(screen.getByText("social.following"));
  expect(mockMutate).toHaveBeenCalledWith({ key: "social.unfollow", params: { userId: "u-1" } }, expect.any(Object));
  expect(screen.getByText("11")).toBeTruthy();
  act(() => mockMutate.mock.calls[0]![1]?.onError?.());
  expect(screen.getByText("social.following")).toBeTruthy();
  expect(screen.getByText("12")).toBeTruthy();
});

it("shows Edit profile instead of Follow on one's own profile", () => {
  mockAuth.user = { id: "u-1" };
  mockProfile = profile({ followsYou: false, affinityPercent: null });
  render(<ProfileRoute />);
  expect(screen.queryByText("social.follow")).toBeNull();
  expect(screen.queryByText("actions:USER")).toBeNull();
  fireEvent.press(screen.getByText("profile.editProfile"));
  expect(screen.getByText("edit-sheet")).toBeTruthy();
});

it("explains the taste wheel when it is not available yet", () => {
  mockProfile = profile({ tasteWheel: null });
  render(<ProfileRoute />);
  expect(screen.queryByText(/^wheel:/)).toBeNull();
  expect(screen.getByTestId("taste-locked")).toBeTruthy();
  expect(screen.getByText("social.taste.locked")).toBeTruthy();
});

const traits = {
  structure: [
    { trait: "BODY", score: 72, wines: 9, adjusted: false },
    { trait: "ACIDITY", score: 33, wines: 4, adjusted: false },
    { trait: "SWEETNESS", score: 50, wines: 6, adjusted: false },
  ],
  families: [
    { family: "OAK", percent: 62 },
    { family: "FRUIT", percent: 48 },
  ],
} as const satisfies Omit<NonNullable<PublicProfile["tasteTraits"]>, "fromQuiz">;

it("shows the structure scales in contract order and the preferred aromas with their percent", () => {
  mockProfile = profile({ tasteTraits: { structure: [...traits.structure], families: [...traits.families], fromQuiz: false } });
  render(<ProfileRoute />);
  expect(screen.getByText("wheel:1")).toBeTruthy();
  expect(screen.getByTestId("taste-structure")).toBeTruthy();
  expect(screen.getByText("social.taste.structureTitle")).toBeTruthy();
  const rows = screen.getAllByTestId(/^taste-trait-/).map((row) => row.props.testID);
  expect(rows).toEqual(["taste-trait-BODY", "taste-trait-ACIDITY", "taste-trait-SWEETNESS"]);
  expect(screen.getByText("social.taste.traits.BODY")).toBeTruthy();
  expect(screen.getByText("social.taste.levels.BODY.HIGH")).toBeTruthy();
  expect(screen.getByText("social.taste.levels.ACIDITY.LOW")).toBeTruthy();
  expect(screen.getByText("social.taste.levels.SWEETNESS.MEDIUM")).toBeTruthy();
  expect(screen.queryByTestId("taste-trait-TANNIN")).toBeNull();
  expect(screen.getByTestId("taste-aromas")).toBeTruthy();
  expect(screen.getByText("social.taste.aromasTitle")).toBeTruthy();
  const chips = screen.getAllByTestId(/^taste-family-/).map((chip) => chip.props.testID);
  expect(chips).toEqual(["taste-family-OAK", "taste-family-FRUIT"]);
  expect(screen.getByText("social.taste.families.OAK")).toBeTruthy();
  expect(screen.getByText("62%")).toBeTruthy();
  expect(screen.getByText("48%")).toBeTruthy();
});

it("hides an empty structure or aroma list", () => {
  mockProfile = profile({ tasteTraits: { structure: [], families: [...traits.families], fromQuiz: false } });
  const { unmount } = render(<ProfileRoute />);
  expect(screen.queryByTestId("taste-structure")).toBeNull();
  expect(screen.getByTestId("taste-aromas")).toBeTruthy();
  unmount();
  mockProfile = profile({ tasteTraits: { structure: [...traits.structure], families: [], fromQuiz: false } });
  render(<ProfileRoute />);
  expect(screen.getByTestId("taste-structure")).toBeTruthy();
  expect(screen.queryByTestId("taste-aromas")).toBeNull();
});

it("shows only the wheel, or the locked state, without taste traits", () => {
  render(<ProfileRoute />);
  expect(screen.getByText("wheel:1")).toBeTruthy();
  expect(screen.queryByTestId("taste-structure")).toBeNull();
  expect(screen.queryByTestId("taste-aromas")).toBeNull();
});

it("speaks to the member on their own taste profile", () => {
  mockAuth.user = { id: "u-1" };
  mockProfile = profile({ tasteTraits: { structure: [...traits.structure], families: [...traits.families], fromQuiz: false } });
  render(<ProfileRoute />);
  expect(screen.getByText("social.taste.titleOwn")).toBeTruthy();
  expect(screen.getByText("social.taste.aromasTitleOwn")).toBeTruthy();
  expect(screen.queryByText("social.taste.aromasTitle")).toBeNull();
});

it("opens the followers and following lists from the counters and a reviewed wine from its card", () => {
  render(<ProfileRoute />);
  fireEvent.press(screen.getByTestId("counter-followers"));
  fireEvent.press(screen.getByTestId("counter-following"));
  fireEvent.press(screen.getByLabelText("Catena Malbec"));
  expect(mockPush.mock.calls.map((call) => call[0])).toEqual([
    { pathname: "/(app)/users/[id]/followers", params: { id: "u-1" } },
    { pathname: "/(app)/users/[id]/following", params: { id: "u-1" } },
    { pathname: "/(app)/(tabs)/wines/[id]", params: { id: "w-1" } },
  ]);
});

it("shows the visible cellar wines", () => {
  render(<ProfileRoute />);
  fireEvent.press(screen.getByText("social.sections.cellar"));
  expect(screen.getByText("Zuccardi")).toBeTruthy();
  expect(screen.queryByTestId("cellar-locked")).toBeNull();
});

it("locks the cellar without asking for it when the profile says it is not visible", () => {
  mockProfile = profile({ cellarVisible: false, cellarCount: null });
  render(<ProfileRoute />);
  fireEvent.press(screen.getByText("social.sections.cellar"));
  expect(screen.getByTestId("cellar-locked")).toBeTruthy();
  expect(screen.getByText("social.cellarLockedBody:Ana Pérez")).toBeTruthy();
  expect(mockRequests.some((request) => request.key === "social.cellar")).toBe(false);
});

it("locks the cellar when the server answers 403 CELLAR_NOT_VISIBLE", () => {
  mockCellarError = { status: 403, code: "CELLAR_NOT_VISIBLE", message: "hidden" };
  render(<ProfileRoute />);
  fireEvent.press(screen.getByText("social.sections.cellar"));
  expect(screen.getByTestId("cellar-locked")).toBeTruthy();
  expect(screen.queryByText("Zuccardi")).toBeNull();
});

// RTK Query hands back the same result until it changes; so do these quiz stand-ins.
const quizResult = (status: "PENDING" | "COMPLETED" | "SKIPPED") => ({
  data: { status, answers: null, shouldPrompt: false },
  isLoading: false,
  isFetching: false,
  isError: false,
  error: undefined,
  refetch: mockRefetch,
});
const PENDING_QUIZ = quizResult("PENDING");
const SKIPPED_QUIZ = quizResult("SKIPPED");
const COMPLETED_QUIZ = quizResult("COMPLETED");

it("invites the member to take the taste quiz on their own profile until it is completed", () => {
  mockAuth.user = { id: "u-1" };
  for (const result of [undefined, PENDING_QUIZ, SKIPPED_QUIZ]) {
    mockQuizResult = result;
    const { unmount } = render(<ProfileRoute />);
    expect(screen.getByText("social.taste.quizTake")).toBeTruthy();
    expect(screen.queryByText("social.taste.quizRetake")).toBeNull();
    unmount();
  }
  expect(mockRequests).toContainEqual({ key: "social.tasteQuiz" });
});

it("offers a retake once the quiz is completed and opens the quiz", () => {
  mockAuth.user = { id: "u-1" };
  mockQuizResult = COMPLETED_QUIZ;
  render(<ProfileRoute />);
  expect(screen.queryByText("social.taste.quizTake")).toBeNull();
  fireEvent.press(screen.getByText("social.taste.quizRetake"));
  expect(mockPush).toHaveBeenCalledWith("/(app)/taste-quiz");
});

it("never shows the quiz entry on someone else's profile nor asks for their quiz", () => {
  mockQuizResult = PENDING_QUIZ;
  render(<ProfileRoute />);
  expect(screen.queryByText("social.taste.quizTake")).toBeNull();
  expect(screen.queryByText("social.taste.quizRetake")).toBeNull();
  expect(mockRequests.some((request) => request.key === "social.tasteQuiz")).toBe(false);
});

it("notes when the taste profile comes from the quiz, worded for the owner or a visitor", () => {
  mockProfile = profile({ tasteTraits: { structure: [...traits.structure], families: [], fromQuiz: true } });
  const { unmount } = render(<ProfileRoute />);
  expect(screen.getByText("social.taste.fromQuiz")).toBeTruthy();
  expect(screen.queryByText("social.taste.fromQuizOwn")).toBeNull();
  unmount();
  mockAuth.user = { id: "u-1" };
  render(<ProfileRoute />);
  expect(screen.getByText("social.taste.fromQuizOwn")).toBeTruthy();
});

it("keeps the card unchanged without the quiz note when the profile comes from rated wines", () => {
  mockProfile = profile({
    tasteTraits: { structure: [...traits.structure], families: [...traits.families], fromQuiz: false },
  });
  render(<ProfileRoute />);
  expect(screen.queryByText("social.taste.fromQuiz")).toBeNull();
  expect(screen.queryByText("social.taste.fromQuizOwn")).toBeNull();
  expect(screen.getByText("wheel:1")).toBeTruthy();
  expect(screen.queryByTestId("taste-locked")).toBeNull();
  expect(screen.queryByTestId("taste-wheel-hint")).toBeNull();
  expect(screen.getByTestId("taste-structure")).toBeTruthy();
  expect(screen.getByTestId("taste-aromas")).toBeTruthy();
});

it("shows the quiz traits with a compact locked-wheel hint instead of the empty wheel state", () => {
  mockAuth.user = { id: "u-1" };
  mockProfile = profile({
    tasteWheel: null,
    tasteTraits: { structure: [...traits.structure], families: [...traits.families], fromQuiz: true },
  });
  render(<ProfileRoute />);
  expect(screen.queryByTestId("taste-locked")).toBeNull();
  expect(screen.getByTestId("taste-wheel-hint")).toBeTruthy();
  expect(screen.getByText("social.taste.wheelHintOwn")).toBeTruthy();
  expect(screen.getByTestId("taste-structure")).toBeTruthy();
});

it("puts the locked wheel where the wheel goes, above the traits, with its lock", () => {
  mockAuth.user = { id: "u-1" };
  mockProfile = profile({
    tasteWheel: null,
    tasteTraits: { structure: [...traits.structure], families: [...traits.families], fromQuiz: true },
  });
  render(<ProfileRoute />);
  const order = screen
    .getAllByTestId(/^taste-(wheel-hint|structure)$/, { includeHiddenElements: true })
    .map((node) => node.props.testID);
  expect(order).toEqual(["taste-wheel-hint", "taste-structure"]);
  expect(screen.getByTestId("taste-wheel-lock")).toBeTruthy();
});

describe("adjusting the own palate", () => {
  const ownTraits = (structure: NonNullable<PublicProfile["tasteTraits"]>["structure"] = [...traits.structure]) => {
    mockAuth.user = { id: "u-1" };
    mockProfile = profile({ tasteTraits: { structure, families: [...traits.families], fromQuiz: false } });
  };
  // The app root wraps every screen in a GestureHandlerRootView; the sliders need it.
  const show = () => render(<ProfileRoute />, { wrapper: GestureHandlerRootView });
  const slider = (trait: string) => screen.getByTestId(`taste-slider-${trait}`);
  const act11y = (trait: string, actionName: "increment" | "decrement") =>
    fireEvent(slider(trait), "accessibilityAction", { nativeEvent: { actionName } });
  const adjustCalls = () => mockMutate.mock.calls.map(([request]) => request).filter((r) => r.key.startsWith("social.tasteTraits."));

  it("offers «Ajustar» only on the own profile", () => {
    mockProfile = profile({ tasteTraits: { structure: [...traits.structure], families: [], fromQuiz: false } });
    const { unmount } = show();
    expect(screen.getByTestId("taste-structure")).toBeTruthy();
    expect(screen.queryByTestId("taste-adjust")).toBeNull();
    expect(screen.queryByTestId("taste-slider-BODY")).toBeNull();
    unmount();

    ownTraits();
    show();
    expect(screen.getByText("social.taste.adjust.start")).toBeTruthy();
    expect(screen.queryByTestId("taste-slider-BODY")).toBeNull();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    // Every trait gets a slider; a trait the profile lacks starts in the middle.
    for (const trait of ["ACIDITY", "BODY", "TANNIN", "SWEETNESS"]) expect(slider(trait)).toBeTruthy();
    expect(slider("TANNIN").props.accessibilityValue).toMatchObject({ min: 0, max: 100, now: 50 });
    expect(screen.queryByTestId("taste-adjust")).toBeNull();
  });

  it("moves a slider with the screen-reader actions and updates the level word", () => {
    ownTraits();
    show();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    expect(slider("ACIDITY").props.accessibilityRole).toBe("adjustable");
    expect(slider("ACIDITY").props.accessibilityLabel).toBe("social.taste.traits.ACIDITY");
    expect(slider("ACIDITY").props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 33,
      text: "social.taste.levels.ACIDITY.LOW",
    });
    act11y("ACIDITY", "increment");
    expect(slider("ACIDITY").props.accessibilityValue).toMatchObject({ now: 38, text: "social.taste.levels.ACIDITY.MEDIUM" });
    expect(screen.getByText("social.taste.levels.ACIDITY.MEDIUM")).toBeTruthy();
    act11y("ACIDITY", "decrement");
    act11y("ACIDITY", "decrement");
    expect(slider("ACIDITY").props.accessibilityValue).toMatchObject({ now: 28, text: "social.taste.levels.ACIDITY.LOW" });
  });

  it("saves only the traits that changed, a missing trait once touched", () => {
    ownTraits();
    show();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    act11y("ACIDITY", "increment");
    act11y("TANNIN", "increment");
    // Moved and put back: nothing to save for this one.
    act11y("BODY", "increment");
    act11y("BODY", "decrement");
    fireEvent.press(screen.getByTestId("taste-save"));
    expect(adjustCalls()).toEqual([{ key: "social.tasteTraits.adjust", params: { structure: { ACIDITY: 38, TANNIN: 55 } } }]);
    // The sliders stay until the server accepts the values.
    expect(slider("ACIDITY")).toBeTruthy();
    act(() => mockMutate.mock.calls[0]![1]?.onSuccess?.());
    expect(screen.queryByTestId("taste-slider-ACIDITY")).toBeNull();
  });

  it("leaves edit mode without a request when nothing changed", () => {
    ownTraits();
    show();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    fireEvent.press(screen.getByTestId("taste-save"));
    expect(adjustCalls()).toEqual([]);
    expect(screen.queryByTestId("taste-slider-ACIDITY")).toBeNull();
  });

  it("cancels back to the previous values", () => {
    ownTraits();
    show();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    act11y("ACIDITY", "increment");
    fireEvent.press(screen.getByTestId("taste-cancel"));
    expect(screen.queryByTestId("taste-slider-ACIDITY")).toBeNull();
    expect(screen.getByText("social.taste.levels.ACIDITY.LOW")).toBeTruthy();
    expect(adjustCalls()).toEqual([]);
    fireEvent.press(screen.getByTestId("taste-adjust"));
    expect(slider("ACIDITY").props.accessibilityValue).toMatchObject({ now: 33 });
  });

  it("tags hand-set traits and offers «Volver a lo calculado» only when some trait is adjusted", () => {
    ownTraits();
    const { unmount } = show();
    expect(screen.queryByTestId("taste-adjusted-BODY")).toBeNull();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    expect(screen.queryByTestId("taste-reset")).toBeNull();
    unmount();

    ownTraits([{ ...traits.structure[0], adjusted: true }, traits.structure[1], traits.structure[2]]);
    show();
    expect(screen.getByTestId("taste-adjusted-BODY")).toBeTruthy();
    expect(screen.getByText("social.taste.adjust.tag")).toBeTruthy();
    expect(screen.queryByTestId("taste-adjusted-ACIDITY")).toBeNull();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    fireEvent.press(screen.getByTestId("taste-reset"));
    expect(adjustCalls()).toEqual([{ key: "social.tasteTraits.reset" }]);
    act(() => mockMutate.mock.calls[0]![1]?.onSuccess?.());
    expect(screen.queryByTestId("taste-slider-BODY")).toBeNull();
  });

  it("keeps editing after a failed save", () => {
    ownTraits();
    show();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    act11y("SWEETNESS", "increment");
    fireEvent.press(screen.getByTestId("taste-save"));
    act(() => mockMutate.mock.calls[0]![1]?.onError?.());
    expect(slider("SWEETNESS").props.accessibilityValue).toMatchObject({ now: 55 });
  });

  it("lets the member set a structure by hand when the profile has none yet", () => {
    mockAuth.user = { id: "u-1" };
    mockProfile = profile({ tasteWheel: null, tasteTraits: null });
    show();
    expect(screen.getByTestId("taste-locked")).toBeTruthy();
    fireEvent.press(screen.getByTestId("taste-adjust"));
    act11y("BODY", "increment");
    fireEvent.press(screen.getByTestId("taste-save"));
    expect(adjustCalls()).toEqual([{ key: "social.tasteTraits.adjust", params: { structure: { BODY: 55 } } }]);
  });
});
