import { fireEvent, render, screen } from "@testing-library/react-native";
import { PointsHost } from "./PointsHost";

const mockPush = jest.fn();
const mockFinish = jest.fn();
const mockDismiss = jest.fn();
const mockNotification = jest.fn();
const mockState: { celebrating: string | null; welcome: { points: number; tier: string } | null } = { celebrating: null, welcome: null };
let mockEnabled: boolean | undefined;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key) }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { onboardingCompleted: true } }) }));
jest.mock("@/presentation/hooks/ui", () => ({ useHaptics: () => ({ notification: mockNotification, selection: jest.fn(), impact: jest.fn() }) }));
jest.mock("./usePointsCelebration", () => ({
  usePointsCelebration: (enabled: boolean) => {
    mockEnabled = enabled;
    return { ...mockState, finishCelebration: mockFinish, dismissWelcome: mockDismiss };
  },
}));

describe("PointsHost", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.celebrating = null;
    mockState.welcome = null;
  });

  it("renders nothing when there is nothing to celebrate", () => {
    render(<PointsHost />);
    expect(screen.toJSON()).toBeNull();
    expect(mockEnabled).toBe(true);
  });

  it("celebrates a new tier with a success haptic and closes it with continue", () => {
    mockState.celebrating = "VENDIMIA";
    render(<PointsHost />);
    expect(screen.getByText('points.celebration.title {"tier":"points.tiers.VENDIMIA"}')).toBeTruthy();
    expect(mockNotification).toHaveBeenCalledWith("success");
    fireEvent.press(screen.getByText("points.celebration.continue"));
    expect(mockFinish).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("closes the celebration before opening the points screen", () => {
    mockState.celebrating = "VENDIMIA";
    render(<PointsHost />);
    fireEvent.press(screen.getByText("points.celebration.seePoints"));
    expect(mockFinish).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/(app)/points");
  });

  it("shows the one-time welcome card and dismisses it", () => {
    mockState.welcome = { points: 92, tier: "RACIMO" };
    render(<PointsHost />);
    expect(screen.getByText("points.welcome.title")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("points.welcome.dismiss"));
    expect(mockDismiss).toHaveBeenCalled();
    fireEvent.press(screen.getByText("points.welcome.action"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/points");
  });
});
