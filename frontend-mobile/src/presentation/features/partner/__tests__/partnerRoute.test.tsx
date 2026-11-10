import React from "react";
import { beforeEach, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import PartnerRoute from "../../../../../app/(app)/partner/index";

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockRemove = jest.fn(async (_input: unknown) => undefined);
const mockEvents = [
  { id: "evt-1", title: "Cata de Malbec", status: "PUBLISHED", type: "TASTING" },
  { id: "evt-2", title: "Cena maridada", status: "CANCELLED", type: "DINNER" },
];

const mockEventsQuery = jest.fn((..._args: unknown[]) => undefined);
const mockRefetch = jest.fn();
const mockDetail = jest.fn(async (_id: string): Promise<unknown> => ({ id: "evt-1" }));
const mockState = { failed: false };
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), canGoBack: () => true }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es-AR" } }) }));
jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
  useHaptics: () => ({ selection: jest.fn() }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));
jest.mock("@/presentation/hooks/queries/partner", () => ({
  usePartnerEvents: (...args: unknown[]) => {
    mockEventsQuery(...args);
    return {
      data: mockState.failed ? undefined : { items: mockEvents, totalItems: 2 },
      isLoading: false,
      isFetching: false,
      isError: mockState.failed,
      error: mockState.failed ? { code: "NETWORK_ERROR" } : undefined,
      refetch: mockRefetch,
    };
  },
  usePartnerEventDetail: () => ({ mutateAsync: mockDetail }),
  usePartnerEventMutations: () => ({ remove: { mutateAsync: mockRemove } }),
}));
jest.mock("@shopify/flash-list", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    FlashList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      refreshControl,
    }: {
      data: { id: string }[];
      renderItem: ({ item }: { item: { id: string } }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      refreshControl?: React.ReactElement<{ onRefresh: () => void }>;
    }) =>
      mockReact.createElement(
        "View",
        null,
        mockReact.createElement("Text", { testID: "pull-to-refresh", onPress: refreshControl?.props.onRefresh }, "refresh"),
        ListHeaderComponent,
        ...data.map((item) => mockReact.createElement("View", { key: item.id }, renderItem({ item }))),
        data.length === 0 ? ListEmptyComponent : null,
      ),
  };
});
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("@/presentation/features/admin", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    AdminPaginationBar: () => null,
    AdminSearchBar: ({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) =>
      mockReact.createElement("TextInput", { testID: "partner-search", value, onChangeText }),
  };
});
jest.mock("@/presentation/features/partner", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    PAGE_SIZE: 20,
    screenStyles: {},
    PartnerDashboardHero: () => null,
    PartnerEventSheet: () => null,
    PartnerEventRow: ({ item, onDelete, onEdit, editPending }: {
      item: { id: string; title: string }; onDelete: () => void; onEdit: () => void; editPending?: boolean;
    }) =>
      mockReact.createElement("View", null,
        mockReact.createElement("Text", { testID: `delete-${item.id}`, onPress: onDelete }, item.title),
        mockReact.createElement("Text", { testID: `edit-${item.id}`, onPress: onEdit }, editPending ? "editing" : "edit")),
  };
});
jest.mock("@/presentation/features/event/EventRegistrationsManagerSheet", () => ({
  EventRegistrationsManagerSheet: () => null,
}));
jest.mock("@/presentation/features/event/CancelEventSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    CancelEventSheet: ({
      visible,
      eventTitle,
      onConfirm,
    }: {
      visible: boolean;
      eventTitle: string;
      onConfirm: (cancellation: { reason: string }) => void;
    }) =>
      mockReact.createElement(
        "Text",
        { testID: "cancel-sheet", onPress: () => onConfirm({ reason: "UNFORESEEN_CIRCUMSTANCES" }) },
        visible ? `open:${eventTitle}` : "closed",
      ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockState.failed = false;
});

it("searches the organizer's events on the server and starts from the first page", () => {
  render(<PartnerRoute />);
  expect(mockEventsQuery).toHaveBeenLastCalledWith(0, 20, "");
  fireEvent.changeText(screen.getByTestId("partner-search"), "malbec");
  expect(mockEventsQuery).toHaveBeenLastCalledWith(0, 20, "malbec");
  // The server already filtered: every returned event is listed, nothing is hidden locally.
  expect(screen.getByText("Cena maridada")).toBeTruthy();
});

it("shows a retry instead of \"no events\" when the list fails to load", () => {
  mockState.failed = true;
  render(<PartnerRoute />);
  expect(screen.queryByText("partner.noEvents")).toBeNull();
  fireEvent.press(screen.getByText("common.retry"));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

it("refreshes the list on pull to refresh", () => {
  render(<PartnerRoute />);
  fireEvent.press(screen.getByTestId("pull-to-refresh"));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

it("shows a pending cue on the event being opened for editing", async () => {
  let resolve!: (value: unknown) => void;
  mockDetail.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
  render(<PartnerRoute />);
  await act(async () => fireEvent.press(screen.getByTestId("edit-evt-1")));
  expect(screen.getByTestId("edit-evt-1").props.children).toBe("editing");
  expect(screen.getByTestId("edit-evt-2").props.children).toBe("edit");
  await act(async () => resolve({ id: "evt-1" }));
  expect(screen.getByTestId("edit-evt-1").props.children).toBe("edit");
});

it("opens the reason sheet and cancels the event with the chosen reason", async () => {
  render(<PartnerRoute />);

  fireEvent.press(screen.getByTestId("delete-evt-1"));
  expect(screen.getByTestId("cancel-sheet").props.children).toBe("open:Cata de Malbec");
  await act(async () => fireEvent.press(screen.getByTestId("cancel-sheet")));

  expect(mockRemove).toHaveBeenCalledWith({
    id: "evt-1",
    cancellation: { reason: "UNFORESEEN_CIRCUMSTANCES" },
  });
  expect(mockShowSuccess).toHaveBeenCalledWith("partner.deleteSuccess");
  expect(screen.getByTestId("cancel-sheet").props.children).toBe("closed");
});

it("reports a failed cancellation and keeps the sheet open", async () => {
  mockRemove.mockRejectedValueOnce(new Error("offline"));
  render(<PartnerRoute />);

  fireEvent.press(screen.getByTestId("delete-evt-1"));
  await act(async () => fireEvent.press(screen.getByTestId("cancel-sheet")));

  expect(mockShowError).toHaveBeenCalledWith("partner.deleteError");
  expect(screen.getByTestId("cancel-sheet").props.children).toBe("open:Cata de Malbec");
});

it("does not offer cancellation for an event that is already cancelled", () => {
  render(<PartnerRoute />);

  fireEvent.press(screen.getByTestId("delete-evt-2"));

  expect(screen.getByTestId("cancel-sheet").props.children).toBe("closed");
});
