import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { CommunityModerationScreen } from "./CommunityScreens";
import type { ModerationReport } from "@/domain/community/community.types";
const report: ModerationReport = {
  id: "case",
  target: { type: "REVIEW", id: "review" },
  status: "OPEN",
  createdAt: new Date("2026-10-02T15:00:00Z"),
  authorId: "author",
  reason: "HATE",
  description: "Details",
  excerpt: "Reported text",
  reviewerId: null,
  decision: null,
  authorUsername: null,
  reviewerUsername: null,
  targetLabel: null,
  relatedTargetLabel: null,
};
const mockState = {
  reports: {
    data: { items: [report], totalItems: 1, totalPages: 1 },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  },
  decide: { mutateAsync: jest.fn(), isPending: false },
  remove: { mutateAsync: jest.fn(), isPending: false },
  user: { id: "moderator", roles: ["ROLE_MODERATOR"] },
};
const mockQuery = jest.fn(() => mockState);
jest.mock("@/presentation/hooks/queries/community/useCommunity", () => ({
  useCommunityModeration: () => mockQuery(),
}));
jest.mock("./CommunityOverview", () => ({
  CommunityOverviewPanel: () => null,
  ReportStatusBadge: () => null,
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20 }),
}));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("@/presentation/navigation/guards", () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => children,
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockState.reports.data = { items: [{ ...report }], totalItems: 1, totalPages: 1 };
  mockState.reports.isPending = false;
  mockState.reports.isError = false;
  mockState.decide.isPending = false;
  mockState.remove.isPending = false;
  mockState.decide.mutateAsync.mockResolvedValue(undefined);
  mockState.remove.mutateAsync.mockResolvedValue(undefined);
});
function open() {
  fireEvent.press(
    screen.getByRole("button", { name: "community.openCase: community.reasons.HATE" }),
  );
}
const NOTE = "community.decisionDetail";
it("shows a catalog quality report as Vinnot's automatic report and opens the wine catalog", () => {
  mockState.reports.data = {
    items: [{
      ...report,
      target: { type: "WINE", id: "matched-wine" },
      reason: "CATALOG_QUALITY",
      authorId: null,
      description: "Scan exact match corrected by a member: possible duplicate, wrong winery or wrong image",
      excerpt: "Gran Malbec 2020 (Bodega Norte) → Gran Malbec Reserva 2020 (Bodega Norte)",
      targetLabel: "Gran Malbec 2020",
      relatedTargetLabel: "Gran Malbec Reserva 2020",
    }],
    totalItems: 1,
    totalPages: 1,
  };
  render(<CommunityModerationScreen />);
  fireEvent.press(
    screen.getByRole("button", { name: "community.openCase: community.reasons.CATALOG_QUALITY" }),
  );

  expect(screen.getByText("community.catalogQualityDescription")).toBeTruthy();
  expect(screen.queryByText(/Scan exact match corrected/)).toBeNull();
  expect(screen.getByText("community.automaticReporter")).toBeTruthy();
  expect(screen.getByText("Gran Malbec Reserva 2020")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "community.removeContent" })).toBeNull();
  expect(screen.getByRole("radio", { name: "community.decisionReasons.CATALOG_FIXED" }).props.accessibilityState)
    .toMatchObject({ checked: true });
  expect(screen.queryByRole("radio", { name: "community.decisionReasons.AUTHOR_WARNED" })).toBeNull();
  fireEvent.press(screen.getByRole("radio", { name: "community.outcomes.DISMISSED" }));
  expect(screen.getByRole("radio", { name: "community.decisionReasons.CATALOG_CORRECT" })).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "community.reviewContent" }));
  expect(mockPush).toHaveBeenCalledWith("/(app)/admin/wines");
});
const chooseOther = () => fireEvent.press(screen.getByRole("radio", { name: "community.decisionReasons.OTHER" }));
it("shows compact cases and opens private details only on selection", () => {
  render(<CommunityModerationScreen />);
  expect(screen.queryByRole("radio", { name: "community.outcomes.RESOLVED" })).toBeNull();
  open();
  expect(screen.getByRole("radio", { name: "community.outcomes.RESOLVED" })).toBeTruthy();
  expect(mockState.decide.mutateAsync).not.toHaveBeenCalled();
});
it("decides with one tap on a preset reason of the chosen outcome", async () => {
  render(<CommunityModerationScreen />);
  open();
  expect(screen.getByRole("radio", { name: "community.decisionReasons.AUTHOR_WARNED" }).props.accessibilityState)
    .toMatchObject({ checked: true });
  expect(screen.queryByLabelText(NOTE)).toBeNull();
  fireEvent.press(screen.getByRole("radio", { name: "community.outcomes.DISMISSED" }));
  expect(screen.queryByRole("radio", { name: "community.decisionReasons.AUTHOR_WARNED" })).toBeNull();
  expect(screen.queryByText("community.resolve")).toBeNull();
  await act(async () => {
    fireEvent.press(screen.getByText("community.dismiss"));
  });
  expect(mockState.decide.mutateAsync).toHaveBeenCalledWith({
    id: "case",
    status: "DISMISSED",
    decision: "community.decisionReasons.NO_VIOLATION",
  });
});
it("preserves a failed decision and closes only after confirmed success", async () => {
  mockState.decide.mutateAsync
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined);
  render(<CommunityModerationScreen />);
  open();
  chooseOther();
  expect(screen.getByLabelText(NOTE).props.maxLength).toBe(2000);
  fireEvent.press(screen.getByText("community.resolve"));
  expect(mockState.decide.mutateAsync).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText(NOTE), " Checked ");
  await act(async () => {
    fireEvent.press(screen.getByText("community.resolve"));
  });
  expect(screen.getByLabelText(NOTE).props.value).toBe(" Checked ");
  await act(async () => {
    fireEvent.press(screen.getByText("community.resolve"));
  });
  expect(mockState.decide.mutateAsync).toHaveBeenLastCalledWith({
    id: "case",
    status: "RESOLVED",
    decision: "Checked",
  });
  expect(screen.queryByLabelText(NOTE)).toBeNull();
});
it("claims a case with the same request as before", async () => {
  render(<CommunityModerationScreen />);
  open();
  await act(async () => {
    fireEvent.press(screen.getByText("community.claim"));
  });
  expect(mockState.decide.mutateAsync).toHaveBeenCalledWith({ id: "case", status: "IN_REVIEW", decision: "" });
});
it("does not decide a case assigned to another moderator", () => {
  mockState.reports.data.items[0]!.reviewerId = "someone-else";
  render(<CommunityModerationScreen />);
  open();
  expect(screen.getByText("community.assignedElsewhere")).toBeTruthy();
  fireEvent.press(screen.getByText("community.claim"));
  fireEvent.press(screen.getByText("community.resolve"));
  expect(mockState.decide.mutateAsync).not.toHaveBeenCalled();
});
it("requires a reason and a destructive confirmation before removing content", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  render(<CommunityModerationScreen />);
  open();
  fireEvent.press(screen.getByRole("radio", { name: "community.outcomes.REMOVE" }));
  chooseOther();
  fireEvent.changeText(screen.getByLabelText(NOTE), "Confirmed hate");
  fireEvent.press(screen.getByText("community.removeContent"));
  expect(mockState.remove.mutateAsync).not.toHaveBeenCalled();
  await act(async () => {
    alert.mock.calls[0]![2]![1]!.onPress?.();
  });
  expect(mockState.remove.mutateAsync).toHaveBeenCalledWith({
    id: "case",
    decision: "Confirmed hate",
  });
  alert.mockRestore();
});
it("offers removing content only for reviews and comments", () => {
  mockState.reports.data.items[0] = { ...report, target: { type: "EVENT", id: "event" } };
  render(<CommunityModerationScreen />);
  open();
  expect(screen.queryByRole("radio", { name: "community.outcomes.REMOVE" })).toBeNull();
  expect(screen.getByRole("radio", { name: "community.outcomes.DISMISSED" })).toBeTruthy();
});
it("renders closed decisions without active decision controls", () => {
  mockState.reports.data.items[0] = { ...report, status: "RESOLVED", decision: "Removed" };
  render(<CommunityModerationScreen />);
  open();
  expect(screen.getByText("Removed")).toBeTruthy();
  expect(screen.queryByRole("radio", { name: "community.outcomes.RESOLVED" })).toBeNull();
});
it("never shows raw case or content identifiers in the case detail", () => {
  render(<CommunityModerationScreen />);
  open();
  expect(screen.queryByText("case")).toBeNull();
  expect(screen.queryByText("review")).toBeNull();
  expect(screen.queryByText("community.caseId")).toBeNull();
  expect(screen.queryByText("community.contentId")).toBeNull();
  expect(screen.getAllByText("Reported text").length).toBeGreaterThan(0);
});

it("shows who wrote the case, what it is about and who reviews it", () => {
  mockState.reports.data.items[0] = {
    ...report,
    authorId: "6f1c2a4e-1111-4222-8333-944455556666",
    reviewerId: "moderator",
    authorUsername: "ana_wines",
    reviewerUsername: "mod_lu",
    targetLabel: "Malbec Reserva",
  };
  render(<CommunityModerationScreen />);
  open();
  expect(screen.getByText("community.authorLabel")).toBeTruthy();
  expect(screen.getByText("ana_wines")).toBeTruthy();
  expect(screen.getByText("community.aboutLabel")).toBeTruthy();
  expect(screen.getByText("community.targets.REVIEW · Malbec Reserva")).toBeTruthy();
  expect(screen.getByText("community.reviewedByLabel")).toBeTruthy();
  expect(screen.getByText("mod_lu")).toBeTruthy();
  expect(screen.queryByText(/6f1c2a4e/)).toBeNull();
});
it("hides each name the server could not resolve and never falls back to ids", () => {
  mockState.reports.data.items[0] = {
    ...report,
    authorId: "6f1c2a4e-1111-4222-8333-944455556666",
    reviewerId: "7a2d3b5f-2222-4333-8444-a55566667777",
  };
  render(<CommunityModerationScreen />);
  open();
  expect(screen.queryByText("community.authorLabel")).toBeNull();
  expect(screen.queryByText("community.aboutLabel")).toBeNull();
  expect(screen.queryByText("community.reviewedByLabel")).toBeNull();
  expect(screen.queryByText(/6f1c2a4e|7a2d3b5f/)).toBeNull();
});
