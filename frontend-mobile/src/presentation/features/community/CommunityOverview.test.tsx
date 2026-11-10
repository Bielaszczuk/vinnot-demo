import { render, screen, fireEvent } from "@testing-library/react-native";
import { CommunityOverviewPanel } from "./CommunityOverview";
const mockState = {
  data: { reports: { open: 23, inReview: 1, resolved: 2, dismissed: 3 }, blockedUsers: 4 },
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};
jest.mock("@/presentation/hooks/queries/community/useCommunity", () => ({
  useCommunityOverview: () => mockState,
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
beforeEach(() => {
  mockState.isError = false;
  mockState.isPending = false;
  mockState.refetch.mockClear();
});
it("shows total pending, closed and blocked activity", () => {
  render(<CommunityOverviewPanel />);
  expect(screen.getByText("24")).toBeTruthy();
  expect(screen.getByText("5")).toBeTruthy();
  expect(screen.getByText("4")).toBeTruthy();
});
it("does not display successful counts while loading or after failure and offers retry", () => {
  mockState.isPending = true;
  const view = render(<CommunityOverviewPanel />);
  expect(screen.queryByText("24")).toBeNull();
  expect(screen.getByText("common.loading")).toBeTruthy();
  mockState.isPending = false;
  mockState.isError = true;
  view.rerender(<CommunityOverviewPanel />);
  expect(screen.queryByText("24")).toBeNull();
  fireEvent.press(screen.getByRole("button"));
  expect(mockState.refetch).toHaveBeenCalledTimes(1);
});
