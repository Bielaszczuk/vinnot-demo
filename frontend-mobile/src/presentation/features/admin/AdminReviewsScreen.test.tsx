import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, Modal } from "react-native";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { appApi } from "@/presentation/store/api";
import { executeMutationOperation, executeQueryOperation } from "@/application/operations";
import { AdminReviewsScreen } from "./AdminReviewsScreen";

const mockError = jest.fn();
const mockSuccess = jest.fn();
const review = { id: "review-1", wineId: "wine-1", rating: 4, comment: "A review", title: null,
  likesCount: 0, isVerified: false, createdAt: "2026-10-03T12:00:00Z",
  wine: { id: "wine-1", name: "Wine", vintage: null }, reviewer: null };

jest.mock("@/application/operations", () => ({
  executeMutationOperation: jest.fn(), executeQueryOperation: jest.fn(),
  queryTags: () => [], mutationTags: () => [], pointsTags: () => [],
  toApiError: (error: Error) => ({ message: error.message }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("@/presentation/providers/ToastProvider", () => ({ useToast: () => ({ showError: mockError, showSuccess: mockSuccess }) }));
jest.mock("./AdminPageHero", () => ({ AdminPageHero: () => null }));
jest.mock("./AdminSearchBar", () => ({ AdminSearchBar: () => null }));
jest.mock("./AdminPaginationBar", () => ({ AdminPaginationBar: () => null }));
jest.mock("@shopify/flash-list", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { FlashList: ({ data, renderItem }: { data: typeof review[]; renderItem: (arg: { item: typeof review }) => React.ReactNode }) =>
    React.createElement(View, null, data.map(item => React.createElement(View, { key: item.id }, renderItem({ item })))) };
});

const mutate = executeMutationOperation as jest.Mock;
const query = executeQueryOperation as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ items: [review], totalItems: 1 });
  mutate.mockResolvedValue(null); // Successful DELETE/204 through the real RTK adapter.
});
const stores: ReturnType<typeof configureStore>[] = [];
afterEach(() => {
  cleanup();
  for (const store of stores.splice(0)) store.dispatch(appApi.util.resetApiState());
});
async function openScreen() {
  const store = configureStore({ reducer: { [appApi.reducerPath]: appApi.reducer }, middleware: getDefault => getDefault().concat(appApi.middleware) });
  stores.push(store);
  const view = render(<Provider store={store}><AdminReviewsScreen /></Provider>);
  await waitFor(() => expect(view.getByLabelText("community.openCase")).toBeTruthy());
  return view;
}
it("confirms within the detail sheet and closes after a successful void delete", async () => {
  const alert = jest.spyOn(Alert, "alert");
  const view = await openScreen();
  fireEvent.press(view.getByLabelText("community.openCase"));
  fireEvent.press(view.getAllByLabelText("admin.reviews.deleteAction").at(-1)!);
  expect(alert).not.toHaveBeenCalled();
  expect(mutate).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("common.cancel"));
  expect(view.queryByText("admin.reviews.deleteMessage")).toBeNull();
  fireEvent.press(view.getAllByLabelText("admin.reviews.deleteAction").at(-1)!);
  fireEvent.press(view.getByLabelText("common.delete"));
  await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
  expect(mutate).toHaveBeenCalledWith({ key: "admin.review.delete", params: { id: "review-1" } }, expect.anything());
  expect(view.UNSAFE_getByType(Modal).props.visible).toBe(false);
  alert.mockRestore();
});
it("keeps the detail open after failure and permits retry without duplicate requests", async () => {
  mutate.mockRejectedValueOnce(new Error("offline"));
  const view = await openScreen();
  fireEvent.press(view.getByLabelText("community.openCase"));
  fireEvent.press(view.getAllByLabelText("admin.reviews.deleteAction").at(-1)!);
  fireEvent.press(view.getByLabelText("common.delete"));
  await waitFor(() => expect(mockError).toHaveBeenCalledTimes(1));
  expect(view.UNSAFE_getByType(Modal).props.visible).toBe(true);
  let complete!: (result: null) => void;
  mutate.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  fireEvent.press(view.getByLabelText("common.delete"));
  fireEvent.press(view.getByLabelText("common.delete"));
  fireEvent.press(view.getByText("common.close"));
  expect(mutate).toHaveBeenCalledTimes(2);
  expect(view.UNSAFE_getByType(Modal).props.visible).toBe(true);
  await act(async () => complete(null));
  await waitFor(() => expect(view.UNSAFE_getByType(Modal).props.visible).toBe(false));
});
it("preserves confirmation and deletion from the list icon", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  const view = await openScreen();
  fireEvent.press(view.getByLabelText("admin.reviews.deleteAction"));
  expect(mutate).not.toHaveBeenCalled();
  expect(alert.mock.calls[0]![0]).toBe("admin.reviews.deleteTitle");
  const buttons = alert.mock.calls[0]![2]!;
  await act(async () => buttons.find(button => button.style === "destructive")!.onPress?.());
  await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
  expect(mutate).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});
