import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ReviewPublicationsScreen } from "./ReviewPublicationsScreen";
const item = {
  type: "COMMENT",
  id: "comment",
  wineId: "wine",
  authorId: "author",
  rating: null,
  title: "",
  content: "Current text",
  createdAt: new Date("2026-09-30T15:00:00Z"),
  revision: "2026-09-30T15:00:00.123456Z",
  authorUsername: null as string | null,
  wineName: null as string | null,
};
const mockState = {
  publications: {
    data: { items: [item], totalPages: 1, totalItems: 1 },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  },
  decide: { mutateAsync: jest.fn(), isPending: false },
};
jest.mock("@/presentation/hooks/queries/community/useCommunity", () => ({
  useReviewPublications: () => mockState,
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn(), back: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20 }),
}));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("@/presentation/navigation/guards", () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => children,
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockState.publications.data = { items: [item], totalPages: 1, totalItems: 1 };
  mockState.publications.isError = false;
  mockState.publications.isPending = false;
  mockState.decide.isPending = false;
  mockState.decide.mutateAsync.mockResolvedValue(undefined);
});
function open() {
  fireEvent.press(
    screen.getByRole("button", { name: "community.openCase: community.targets.COMMENT" }),
  );
}
it("keeps the empty queue useful without pagination or decision fields", () => {
  mockState.publications.data.items = [];
  mockState.publications.data.totalItems = 0;
  render(<ReviewPublicationsScreen />);
  expect(screen.getByText("community.queueClear")).toBeTruthy();
  expect(screen.queryByText("common.previous")).toBeNull();
  expect(screen.queryByText("common.next")).toBeNull();
  expect(screen.queryByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" })).toBeNull();
});
it("opens details without sending and cancels without a decision", () => {
  render(<ReviewPublicationsScreen />);
  open();
  expect(screen.getByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" })).toBeTruthy();
  fireEvent.press(screen.getByText("common.cancel"));
  expect(screen.queryByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" })).toBeNull();
  expect(mockState.decide.mutateAsync).not.toHaveBeenCalled();
});
it("preselects the offensive reason so rejecting needs no typing", async () => {
  render(<ReviewPublicationsScreen />);
  open();
  expect(
    screen.getByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" }).props
      .accessibilityState,
  ).toMatchObject({ checked: true });
  expect(screen.queryByLabelText("community.publicationNote")).toBeNull();
  await act(async () => {
    fireEvent.press(screen.getByText("community.reject"));
  });
  expect(mockState.decide.mutateAsync).toHaveBeenCalledWith({
    type: "COMMENT",
    id: "comment",
    status: "REJECTED",
    reasonCode: "OFFENSIVE",
    reason: "",
    expectedRevision: item.revision,
  });
});
it("sends the reason chosen with one tap", async () => {
  render(<ReviewPublicationsScreen />);
  open();
  fireEvent.press(screen.getByRole("radio", { name: "community.rejectionReasons.SPAM" }));
  expect(
    screen.getByRole("radio", { name: "community.rejectionReasons.SPAM" }).props.accessibilityState,
  ).toMatchObject({ checked: true });
  expect(
    screen.getByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" }).props
      .accessibilityState,
  ).toMatchObject({ checked: false });
  await act(async () => {
    fireEvent.press(screen.getByText("community.reject"));
  });
  expect(mockState.decide.mutateAsync).toHaveBeenCalledWith(
    expect.objectContaining({ status: "REJECTED", reasonCode: "SPAM", reason: "" }),
  );
});
it("shows the author detail only under other, preserves it after failure and retries with the displayed revision", async () => {
  mockState.decide.mutateAsync
    .mockRejectedValueOnce(new Error("conflict"))
    .mockResolvedValueOnce(undefined);
  render(<ReviewPublicationsScreen />);
  open();
  expect(screen.queryByLabelText("community.publicationNote")).toBeNull();
  fireEvent.press(screen.getByRole("radio", { name: "community.rejectionReasons.OTHER" }));
  fireEvent.changeText(screen.getByLabelText("community.publicationNote"), " Copied text ");
  await act(async () => {
    fireEvent.press(screen.getByText("community.reject"));
  });
  expect(screen.getByLabelText("community.publicationNote").props.value).toBe(" Copied text ");
  expect(screen.getByText("community.decisionError")).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByText("community.reject"));
  });
  expect(mockState.decide.mutateAsync).toHaveBeenCalledTimes(2);
  expect(mockState.decide.mutateAsync).toHaveBeenLastCalledWith({
    type: "COMMENT",
    id: "comment",
    status: "REJECTED",
    reasonCode: "OTHER",
    reason: "Copied text",
    expectedRevision: item.revision,
  });
  expect(screen.queryByRole("radio", { name: "community.rejectionReasons.OTHER" })).toBeNull();
});
it("drops a hidden detail when switching away from other", async () => {
  render(<ReviewPublicationsScreen />);
  open();
  fireEvent.press(screen.getByRole("radio", { name: "community.rejectionReasons.OTHER" }));
  fireEvent.changeText(screen.getByLabelText("community.publicationNote"), "Hidden");
  fireEvent.press(screen.getByRole("radio", { name: "community.rejectionReasons.PERSONAL_DATA" }));
  expect(screen.queryByLabelText("community.publicationNote")).toBeNull();
  await act(async () => {
    fireEvent.press(screen.getByText("community.reject"));
  });
  expect(mockState.decide.mutateAsync).toHaveBeenCalledWith(
    expect.objectContaining({ reasonCode: "PERSONAL_DATA", reason: "" }),
  );
});
it("approves without a rejection reason code", async () => {
  render(<ReviewPublicationsScreen />);
  open();
  fireEvent.press(screen.getByRole("radio", { name: "community.rejectionReasons.SPAM" }));
  await act(async () => {
    fireEvent.press(screen.getByText("community.approve"));
  });
  expect(mockState.decide.mutateAsync).toHaveBeenCalledWith({
    type: "COMMENT",
    id: "comment",
    status: "APPROVED",
    reason: "",
    expectedRevision: item.revision,
  });
  expect(mockState.decide.mutateAsync.mock.calls[0][0]).not.toHaveProperty("reasonCode");
});
it("prevents duplicate approvals and closing while sending", async () => {
  let complete!: () => void;
  mockState.decide.mutateAsync.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  render(<ReviewPublicationsScreen />);
  open();
  await act(async () => {
    fireEvent.press(screen.getByText("community.approve"));
    fireEvent.press(screen.getByText("common.cancel"));
  });
  expect(screen.getByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" })).toBeTruthy();
  expect(mockState.decide.mutateAsync).toHaveBeenCalledTimes(1);
  await act(async () => {
    complete();
  });
  expect(screen.queryByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" })).toBeNull();
});
it("requires reopening a refreshed snapshot after a conflict", async () => {
  mockState.decide.mutateAsync.mockRejectedValueOnce(new Error("changed"));
  render(<ReviewPublicationsScreen />);
  open();
  await act(async () => {
    fireEvent.press(screen.getByText("community.approve"));
  });
  fireEvent.press(screen.getByText("community.reloadQueue"));
  expect(mockState.publications.refetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("radio", { name: "community.rejectionReasons.OFFENSIVE" })).toBeNull();
});
it("never shows raw author or content identifiers in the publication detail", () => {
  render(<ReviewPublicationsScreen />);
  open();
  expect(screen.queryByText("author")).toBeNull();
  expect(screen.queryByText("comment")).toBeNull();
  expect(screen.queryByText("community.authorId")).toBeNull();
  expect(screen.queryByText("community.contentId")).toBeNull();
  expect(screen.getAllByText("Current text").length).toBeGreaterThan(0);
});

it("shows the author and the wine the publication belongs to", () => {
  mockState.publications.data.items = [
    {
      ...item,
      authorId: "6f1c2a4e-1111-4222-8333-944455556666",
      wineId: "7a2d3b5f-2222-4333-8444-a55566667777",
      authorUsername: "ana_wines",
      wineName: "Malbec Reserva",
    },
  ];
  render(<ReviewPublicationsScreen />);
  open();
  expect(screen.getByText("community.authorLabel")).toBeTruthy();
  expect(screen.getByText("ana_wines")).toBeTruthy();
  expect(screen.getByText("community.wineLabel")).toBeTruthy();
  expect(screen.getByText("Malbec Reserva")).toBeTruthy();
  expect(screen.queryByText(/6f1c2a4e|7a2d3b5f/)).toBeNull();
});
it("hides the author and the wine when the server could not name them", () => {
  mockState.publications.data.items = [
    {
      ...item,
      authorId: "6f1c2a4e-1111-4222-8333-944455556666",
      wineId: "7a2d3b5f-2222-4333-8444-a55566667777",
    },
  ];
  render(<ReviewPublicationsScreen />);
  open();
  expect(screen.queryByText("community.authorLabel")).toBeNull();
  expect(screen.queryByText("community.wineLabel")).toBeNull();
  expect(screen.queryByText(/6f1c2a4e|7a2d3b5f/)).toBeNull();
});
it("writes the author detail in the shared text field, with its limit and counter", () => {
  render(<ReviewPublicationsScreen />);
  open();
  fireEvent.press(screen.getByRole("radio", { name: "community.rejectionReasons.OTHER" }));
  expect(screen.getByLabelText("community.publicationNote").props.maxLength).toBe(2000);
  expect(screen.getByText("forms.reason.counter")).toBeTruthy();
});
