import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import type { PointsSummary } from "@/domain/points/points.types";
import { lightTokens } from "@/shared/theme/tokens";
import { PointsScreenContent } from "./PointsScreen";

type Query = { data?: PointsSummary; isLoading: boolean; isFetching: boolean; isError: boolean; error?: unknown; refetch: jest.Mock };
const mockQuery: Query = { isLoading: false, isFetching: false, isError: false, refetch: jest.fn() };
const mockBack = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: "en-US", resolvedLanguage: "en-US" },
  }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@/presentation/hooks/queries/user", () => ({ useFreshPointsSummary: () => mockQuery }));
jest.mock("@/presentation/components/ui/QueryErrorState", () => {
  const { Text } = jest.requireActual("react-native");
  return { QueryErrorState: ({ onRetry }: { onRetry: () => void }) => <Text testID="points-error" onPress={onRetry}>error</Text> };
});

const summary: PointsSummary = {
  points: 92, tier: "RACIMO", nextTier: "VENDIMIA", nextTierAt: 160, tierFloor: 80, todayEarned: 4, dailyCap: 40,
  pendingCelebration: null, showWelcome: false,
  recent: [
    { id: "1", source: "REVIEW", points: 3, createdAt: new Date("2026-10-20T12:00:00Z"), label: "Malbec Reserva" },
    { id: "2", source: "EVENT_REGISTRATION", points: -4, createdAt: new Date("2026-10-21T12:00:00Z"), label: null },
    { id: "3", source: null, points: 1, createdAt: new Date("2026-10-22T12:00:00Z"), label: null },
  ],
};

describe("PointsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockQuery, { data: summary, isLoading: false, isError: false, error: undefined });
  });

  it("lists how to earn points with each limit and the daily cap", () => {
    render(<PointsScreenContent />);
    expect(screen.getByTestId("points-rule-REVIEW")).toHaveTextContent(/points\.rules\.review.*\+3/);
    expect(screen.getByTestId("points-rule-LIKE_RECEIVED")).toHaveTextContent(/points\.limits\.perDay \{"count":5\}/);
    expect(screen.getByTestId("points-rule-FOLLOWER_GAINED")).toHaveTextContent(
      /points\.rules\.followerGained.*points\.limits\.perDay \{"count":10\}.*\+1/,
    );
    expect(screen.getByText('points.dailyCapNote {"cap":40}')).toBeTruthy();
    expect(screen.getByText('points.todayEarned {"earned":4,"cap":40}')).toBeTruthy();
  });

  it("sets the how-to notes as soft fine print below the rules' text colour", () => {
    render(<PointsScreenContent />);
    for (const note of [screen.getByText("points.howToEarnNote"), screen.getByText('points.dailyCapNote {"cap":40}')]) {
      expect(note).toHaveStyle({ color: lightTokens.textTertiary });
    }
  });

  it("shows recent movements with their sign, including revocations and unknown sources", () => {
    render(<PointsScreenContent />);
    expect(screen.getByTestId("points-movement-1")).toHaveTextContent(/points\.sources\.REVIEW.*Malbec Reserva.*\+3/);
    expect(screen.getByTestId("points-movement-2")).toHaveTextContent(/points\.sources\.EVENT_REGISTRATION.*-4/);
    expect(screen.getByTestId("points-movement-3")).toHaveTextContent(/points\.sources\.unknown/);
  });

  it("shows the whole ladder: reached seals animated, the current one marked, the rest locked", () => {
    render(<PointsScreenContent />);
    expect(screen.getByTestId("points-tier-BROTE")).toHaveTextContent(/points\.reached/);
    expect(screen.getByTestId("points-tier-RACIMO")).toHaveTextContent(/points\.current/);
    expect(screen.getByTestId("points-tier-VINNOT")).toHaveTextContent(/points\.locked/);
    // Eleven tiers: three reached (Brote, Parra, Racimo), eight locked.
    expect(screen.getAllByTestId("points-locked-seal")).toHaveLength(8);
  });

  it("says when there is no activity yet", () => {
    mockQuery.data = { ...summary, recent: [] };
    render(<PointsScreenContent />);
    expect(screen.getByText("points.recentEmpty")).toBeTruthy();
  });

  it("pulls fresh points on pull-to-refresh, without a spinner for background refreshes", async () => {
    let finish: () => void = () => undefined;
    mockQuery.refetch.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    Object.assign(mockQuery, { isFetching: true });
    render(<PointsScreenContent />);
    const refresh = () => screen.UNSAFE_getByType(ScrollView).props.refreshControl.props;
    expect(refresh().refreshing).toBe(false);

    act(() => refresh().onRefresh());
    expect(mockQuery.refetch).toHaveBeenCalledTimes(1);
    expect(refresh().refreshing).toBe(true);

    await act(async () => finish());
    expect(refresh().refreshing).toBe(false);
    Object.assign(mockQuery, { isFetching: false });
  });

  it("offers a retry when loading fails", () => {
    Object.assign(mockQuery, { data: undefined, isError: true, error: new Error("boom") });
    render(<PointsScreenContent />);
    fireEvent.press(screen.getByTestId("points-error"));
    expect(mockQuery.refetch).toHaveBeenCalled();
  });
});
