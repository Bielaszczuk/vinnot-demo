import { configureStore } from "@reduxjs/toolkit";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Provider } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { appApi } from "@/presentation/store/api";
import { executeMutationOperation, executeQueryOperation } from "@/application/operations";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { ratePour } from "@/test/fixtures/pourRating";
import { CellarReviewSheet } from "./CellarReviewSheet";
import { Modal } from "react-native";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";

jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));

const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock("@/application/operations", () => ({
  ...jest.requireActual("@/application/operations/types"),
  executeMutationOperation: jest.fn(), executeQueryOperation: jest.fn(),
  toApiError: (error: Error) => ({ message: error.message }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { year?: number }) => (options?.year ? `${key}:${options.year}` : key),
  }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 50, bottom: 24 }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockSuccess, showError: mockError }),
}));
jest.mock("@/presentation/components/ui/QueryErrorState", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return { QueryErrorState: ({ onRetry }: { onRetry: () => void }) =>
    React.createElement(Pressable, { onPress: onRetry }, React.createElement(Text, null, "Retry lookup")) };
});
const entry = { id: "personal-entry", wine: { id: "wine-1", name: "Malbec", type: "white" }, rating: 4,
  notes: "My personal note", purchasePrice: 15000, addedAt: new Date() } as CellarEntry;
const mutation = jest.mocked(executeMutationOperation);
const query = jest.mocked(executeQueryOperation);
const stores: ReturnType<typeof configureStore>[] = [];
beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ hasReview: false });
  mutation.mockResolvedValue({ id: "review-1" });
});
afterEach(() => {
  cleanup();
  for (const store of stores.splice(0)) store.dispatch(appApi.util.resetApiState());
});
function open(input = entry) {
  const store = configureStore({ reducer: { [appApi.reducerPath]: appApi.reducer },
    middleware: getDefault => getDefault().concat(appApi.middleware) });
  stores.push(store);
  const close = jest.fn();
  const openWine = jest.fn();
  const view = render(<GestureHandlerRootView><Provider store={store}>
    <CellarReviewSheet entry={input} onClose={close} onOpenWine={openWine} /></Provider></GestureHandlerRootView>);
  return { ...view, close, openWine, store };
}
it("publishes an editable draft only after submission, excluding purchase price and entry ID", async () => {
  const view = open();
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  expect(mutation).not.toHaveBeenCalled();
  expect(query).toHaveBeenCalledWith({ key: "wine.myReviewStatus", params: { id: "wine-1" } });
  fireEvent.changeText(view.getByDisplayValue("My personal note"), "Public version");
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1));
  expect(mutation.mock.calls[0]?.[0]).toEqual({ key: "wine.review.create",
    params: { wineId: "wine-1", rating: 4, title: undefined, comment: "Public version" } });
  expect(mockSuccess).toHaveBeenCalledWith("community.reviewPublished");
  expect(entry.notes).toBe("My personal note");
});
it("cancel leaves the personal note untouched and sends no mutation", async () => {
  const view = open();
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  fireEvent.press(view.getByLabelText("common.cancel"));
  expect(view.close).toHaveBeenCalledTimes(1);
  expect(mutation).not.toHaveBeenCalled();
});
it("an existing review offers opening the wine without replacing it", async () => {
  query.mockResolvedValue({ hasReview: true });
  const view = open();
  await waitFor(() => expect(view.getByText("cellar.reviewExistsTitle")).toBeTruthy());
  expect(view.queryByDisplayValue("My personal note")).toBeNull();
  fireEvent.press(view.getByLabelText("cellar.openWine"));
  expect(view.openWine).toHaveBeenCalledTimes(1);
  expect(mutation).not.toHaveBeenCalled();
});
it("keeps the edited draft and allows retry after publication fails", async () => {
  mutation.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: "review-1" });
  const view = open();
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  fireEvent.changeText(view.getByDisplayValue("My personal note"), "Keep this draft");
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(mockError).toHaveBeenCalledTimes(1));
  expect(view.getByDisplayValue("Keep this draft")).toBeTruthy();
  expect(view.close).not.toHaveBeenCalled();
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1));
  expect(mutation).toHaveBeenCalledTimes(2);
});
it("checks current state again when reopening, even with a cached result", async () => {
  const view = open();
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  view.unmount();
  query.mockResolvedValue({ hasReview: true });
  const next = render(<Provider store={view.store}><CellarReviewSheet entry={entry} onClose={jest.fn()} onOpenWine={jest.fn()} /></Provider>);
  await waitFor(() => expect(next.getByText("cellar.reviewExistsTitle")).toBeTruthy());
  expect(query).toHaveBeenCalledTimes(2);
  expect(mutation).not.toHaveBeenCalled();
});
it("does not allow duplicate sends or dismissal while publication is in flight", async () => {
  let resolve!: (value: unknown) => void;
  mutation.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = open();
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  fireEvent.press(view.getAllByLabelText("common.close")[0]!);
  expect(mutation).toHaveBeenCalledTimes(1);
  expect(view.close).not.toHaveBeenCalled();
  await act(async () => resolve({ id: "review-1" }));
  expect(view.close).toHaveBeenCalledTimes(1);
});
it("does not offer a composer until a failed lookup is successfully retried", async () => {
  query.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ hasReview: false });
  const view = open();
  await waitFor(() => expect(view.getByText("Retry lookup")).toBeTruthy());
  expect(view.queryByDisplayValue("My personal note")).toBeNull();
  fireEvent.press(view.getByText("Retry lookup"));
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  expect(mutation).not.toHaveBeenCalled();
});
it("requires selecting a rating if the cellar note has none", async () => {
  const view = open({ ...entry, rating: null });
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  expect(mutation).not.toHaveBeenCalled();
  await ratePour(view, 4);
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1));
});
it("pre-fills the review vintage with the cellar note vintage", async () => {
  const view = open({ ...entry, vintage: 2017 });
  await waitFor(() => expect(view.getByLabelText("vintage.label").props.accessibilityValue)
    .toEqual({ text: "2017" }));
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1));
  expect(mutation.mock.calls[0]?.[0]).toEqual({ key: "wine.review.create",
    params: { wineId: "wine-1", rating: 4, title: undefined, comment: "My personal note", vintage: 2017 } });
});
it("publishes without a vintage when the note has none", async () => {
  const view = open({ ...entry, vintage: null });
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  expect(view.getByLabelText("vintage.label").props.accessibilityValue).toEqual({ text: "vintage.none" });
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1));
  expect(mutation.mock.calls[0]?.[0].params).not.toHaveProperty("vintage");
});
it("publishes the vintage picked in the select", async () => {
  const view = open({ ...entry, vintage: null });
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  fireEvent(view.getByLabelText("vintage.label"), "focus");
  fireEvent.press(view.getByLabelText("vintage.select:2016"));
  expect(view.getByLabelText("vintage.label").props.accessibilityValue).toEqual({ text: "2016" });
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1));
  expect(mutation.mock.calls[0]?.[0]).toMatchObject({ params: { wineId: "wine-1", vintage: 2016 } });
});
it("publishes the vintage typed in the field", async () => {
  const view = open({ ...entry, vintage: null });
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  fireEvent(view.getByLabelText("vintage.label"), "focus");
  fireEvent.changeText(view.getByLabelText("vintage.label"), "2004");
  expect(view.getByLabelText("vintage.label").props.accessibilityValue).toEqual({ text: "2004" });
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1));
  expect(mutation.mock.calls[0]?.[0]).toMatchObject({ params: { wineId: "wine-1", vintage: 2004 } });
});
it("publishes the cellar note's decimal rating unchanged", async () => {
  const view = open({ ...entry, rating: 3.6 });
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  expect(view.getByTestId("rating-pour-value")).toHaveTextContent(/^3[.,]6$/);
  fireEvent.press(view.getByLabelText("wines.sendReview"));
  await waitFor(() => expect(view.close).toHaveBeenCalledTimes(1));
  expect(mutation.mock.calls[0]?.[0]).toMatchObject({ params: { rating: 3.6 } });
});
it("slides the review sheet up when Reduce Motion is off", async () => {
  jest.mocked(useReduceMotionEnabled).mockReturnValue(false);
  const view = open();
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  expect(view.UNSAFE_getByType(Modal).props.animationType).toBe("slide");
});
it("fades the review sheet in under Reduce Motion", async () => {
  jest.mocked(useReduceMotionEnabled).mockReturnValue(true);
  const view = open();
  await waitFor(() => expect(view.getByDisplayValue("My personal note")).toBeTruthy());
  expect(view.UNSAFE_getByType(Modal).props.animationType).toBe("fade");
});
