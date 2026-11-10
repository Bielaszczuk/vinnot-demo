import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Image } from "expo-image";
import { MyCommunityScreen } from "./CommunityScreens";
import { communityService } from "@/application/services/community.service";
import { illustrations } from "@/shared/illustrations";

const report = {
  id: "3f9a2c1b-0000-4000-8000-1234567890ab",
  target: { type: "REVIEW" as const, id: "review" },
  status: "OPEN" as const,
  createdAt: new Date(2026, 9, 2),
};
const mockState = {
  reports: { data: { items: [report], totalItems: 1, totalPages: 1 } as { items: (typeof report)[]; totalItems: number; totalPages: number } | undefined, isPending: false, isError: false, refetch: jest.fn() },
  blocks: { data: { items: [{ userId: "u1", username: "Ana" }], totalItems: 1, totalPages: 1 } as { items: { userId: string; username: string }[]; totalItems: number; totalPages: number } | undefined, isPending: false, isError: false, refetch: jest.fn() },
};
const mockUnblock = { mutate: jest.fn(), isPending: false, isError: false };
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };

jest.mock("@/presentation/hooks/queries/community/useCommunity", () => ({
  useMyCommunity: () => mockState,
  useCommunityActions: () => ({ unblock: mockUnblock }),
}));
jest.mock("@/application/services/community.service", () => {
  const actual = jest.requireActual("@/application/services/community.service");
  return { communityService: { ...actual.communityService, copyCaseId: jest.fn() } };
});
jest.mock("./CommunityOverview", () => ({
  CommunityOverviewPanel: () => null,
  ModerationShortcuts: () => null,
  ReportStatusBadge: () => null,
}));
jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ hasAnyRole: () => false }) }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => (values?.date ? `${key}:${values.date}` : key), i18n: { language: "en-US" } }),
}));
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20 }) }));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("@/application/services/haptics.service", () => ({ hapticsService: { impact: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockState.reports.data = { items: [report], totalItems: 1, totalPages: 1 };
  mockState.reports.isPending = false;
  mockState.reports.isError = false;
  mockState.blocks.data = { items: [{ userId: "u1", username: "Ana" }], totalItems: 1, totalPages: 1 };
  mockState.blocks.isPending = false;
  mockState.blocks.isError = false;
});

it("shows a short case number and copies the full one", async () => {
  jest.mocked(communityService.copyCaseId).mockResolvedValue(undefined);
  render(<MyCommunityScreen />);
  expect(screen.getByText("community.caseId · 3F9A2C1B")).toBeTruthy();
  expect(screen.queryByText(new RegExp(report.id))).toBeNull();
  expect(screen.getByText("community.reportDate:Oct 02, 2026")).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "community.copyCaseId" })));
  expect(communityService.copyCaseId).toHaveBeenCalledWith(report.id);
  expect(screen.getByText("community.caseCopied")).toBeTruthy();
});

it("says so when the copy fails", async () => {
  jest.mocked(communityService.copyCaseId).mockRejectedValue(new Error("CLIPBOARD_UNAVAILABLE"));
  render(<MyCommunityScreen />);
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "community.copyCaseId" })));
  expect(screen.getByText("community.copyFailed")).toBeTruthy();
});

it("shows the watercolor empty state without reports and a plain note without blocks", () => {
  mockState.reports.data = { items: [], totalItems: 0, totalPages: 0 };
  mockState.blocks.data = { items: [], totalItems: 0, totalPages: 0 };
  render(<MyCommunityScreen />);
  expect(screen.UNSAFE_getByType(Image).props.source).toBe(illustrations.community);
  expect(screen.getByText("community.noReports")).toBeTruthy();
  expect(screen.getByText("community.noBlocks")).toBeTruthy();
});

it("offers a retry button when a list fails and skeletons while loading", () => {
  mockState.reports.isError = true;
  mockState.blocks.isPending = true;
  render(<MyCommunityScreen />);
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "common.retry" }));
  expect(mockState.reports.refetch).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("community-blocks-loading")).toBeTruthy();
});

it("unblocks a person and opens contact with real buttons", () => {
  render(<MyCommunityScreen />);
  fireEvent.press(screen.getByRole("button", { name: "community.unblock" }));
  expect(mockUnblock.mutate).toHaveBeenCalledWith("u1");
  fireEvent.press(screen.getByRole("button", { name: "community.contact" }));
  expect(mockRouter.push).toHaveBeenCalledWith("/contact");
});
