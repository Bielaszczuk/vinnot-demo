import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import draftsReducer from "@/presentation/store/draftsSlice";
import type { WineReview } from "@/domain/wine/wine.types";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ratePour } from "@/test/fixtures/pourRating";
import { SheetFieldFocusContext, SheetInputContext } from "@/presentation/components/ui/SheetInputContext";
import { ReviewForm } from "./ReviewForm";

const mockSubmit = jest.fn<Promise<boolean>, [unknown]>();
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useWineDetail: () => ({ data: { vintage: null, type: "red" } }),
}));
jest.mock("@/presentation/hooks/useWineReviewSubmission", () => ({
  useWineReviewSubmission: () => mockSubmit,
}));
jest.mock("@/presentation/components/ui/VintageField", () => ({ VintageField: () => null }));
// The sheet's text input stands out by a marker, so a test can tell it from a plain one.
jest.mock("@gorhom/bottom-sheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const { TextInput } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    BottomSheetTextInput: mockReact.forwardRef((props: object, ref) =>
      mockReact.createElement(TextInput, { ...props, ref: ref as never, nativeID: "sheet-text-input" })),
  };
});

const store = () => configureStore({ reducer: { drafts: draftsReducer } });
const renderForm = (s: ReturnType<typeof store>, props: Partial<React.ComponentProps<typeof ReviewForm>> = {}) =>
  render(<GestureHandlerRootView><Provider store={s}><ReviewForm wineId="wine-1" {...props} /></Provider></GestureHandlerRootView>);

beforeEach(() => {
  mockSubmit.mockReset().mockResolvedValue(true);
});

it("keeps an unsent review when the form is left and opened again", async () => {
  const s = store();
  const first = renderForm(s);
  await ratePour(first, 5);
  fireEvent.changeText(first.getByLabelText("reviews.form.titleLabel"), "Gran Malbec");
  fireEvent.changeText(first.getByLabelText("reviews.form.commentLabel"), "Frutos rojos");
  first.unmount();

  const again = renderForm(s);
  expect(again.getByLabelText("reviews.form.titleLabel").props.value).toBe("Gran Malbec");
  expect(again.getByLabelText("reviews.form.commentLabel").props.value).toBe("Frutos rojos");
});

it("clears the draft after a successful publication", async () => {
  const s = store();
  const view = renderForm(s);
  await ratePour(view, 4);
  fireEvent.changeText(view.getByLabelText("reviews.form.titleLabel"), "Publicada");
  await act(async () => fireEvent.press(view.getByText("wines.sendReview")));

  expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: 4, title: "Publicada" }));
  await waitFor(() => expect(s.getState().drafts.reviews).toEqual({}));
});

it("keeps the draft when publishing fails so the text is not lost", async () => {
  mockSubmit.mockResolvedValue(false);
  const s = store();
  const view = renderForm(s);
  await ratePour(view, 1);
  fireEvent.changeText(view.getByLabelText("reviews.form.titleLabel"), "Reintento");
  await act(async () => fireEvent.press(view.getByText("wines.sendReview")));

  expect(s.getState().drafts.reviews["wine-1:new"]).toMatchObject({ title: "Reintento" });
});

it("keeps an edit draft per review and leaves discarding it on Cancel to the caller", () => {
  const s = store();
  const review = { id: "review-1", rating: 3, title: "Original", comment: "", vintage: null } as unknown as WineReview;
  const onCancel = jest.fn();
  const first = renderForm(s, { review, onCancel });
  expect(first.getByLabelText("reviews.form.titleLabel").props.value).toBe("Original");
  fireEvent.changeText(first.getByLabelText("reviews.form.titleLabel"), "Editada");
  first.unmount();

  const again = renderForm(s, { review, onCancel });
  expect(again.getByLabelText("reviews.form.titleLabel").props.value).toBe("Editada");
  fireEvent.press(again.getByText("common.cancel"));
  expect(onCancel).toHaveBeenCalledTimes(1);
  // The sheet asks before discarding, so Cancel alone must not lose the draft.
  expect(s.getState().drafts.reviews["wine-1:review:review-1"]).toMatchObject({ title: "Editada" });
});

it("reports a publication in flight", async () => {
  let finish: (published: boolean) => void = () => undefined;
  mockSubmit.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const onBusyChange = jest.fn();
  const view = renderForm(store(), { onBusyChange });
  await ratePour(view, 2);
  await act(async () => { fireEvent.press(view.getByText("wines.sendReview")); });
  expect(onBusyChange).toHaveBeenLastCalledWith(true);
  await act(async () => { finish(true); });
  expect(onBusyChange).toHaveBeenLastCalledWith(false);
});

it("publishes a rating with one decimal, keeping 2.15 as 2.2", async () => {
  const view = renderForm(store());
  await ratePour(view, 2.15);
  expect(view.getByTestId("rating-pour-value")).toHaveTextContent(/^2[.,]2$/);
  await act(async () => fireEvent.press(view.getByText("wines.sendReview")));
  expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: 2.2 }));
});

it("keeps an existing review's decimal rating when editing", () => {
  const review = { id: "review-2", rating: 3.6, title: "", comment: "", vintage: null } as unknown as WineReview;
  const view = renderForm(store(), { review, onCancel: jest.fn() });
  expect(view.getByTestId("rating-pour-value")).toHaveTextContent(/^3[.,]6$/);
});

test("notes which fields are required and marks the rating, with no publication policy", () => {
  const view = renderForm(store());
  expect(view.getByText("reviews.form.requiredNote")).toBeTruthy();
  expect(view.getByText("reviews.form.ratingLabel")).toBeTruthy();
  expect(view.queryByText("community.reviewPolicy")).toBeNull();
});

it("types into the sheet's own inputs and reveals the focused field above the keyboard inside a sheet", () => {
  const focusField = jest.fn();
  const view = render(<GestureHandlerRootView><Provider store={store()}>
    <SheetInputContext.Provider value>
      <SheetFieldFocusContext.Provider value={focusField}>
        <ReviewForm wineId="wine-1" framed={false} />
      </SheetFieldFocusContext.Provider>
    </SheetInputContext.Provider>
  </Provider></GestureHandlerRootView>);
  const title = view.getByLabelText("reviews.form.titleLabel");
  const comment = view.getByLabelText("reviews.form.commentLabel");
  expect(title.props.nativeID).toBe("sheet-text-input");
  expect(comment.props.nativeID).toBe("sheet-text-input");

  fireEvent(title, "focus");
  expect(focusField).toHaveBeenLastCalledWith(expect.anything());
  expect(focusField.mock.calls.at(-1)?.[0]).not.toBeNull();
  fireEvent(title, "blur");
  expect(focusField).toHaveBeenLastCalledWith(null);
  fireEvent(comment, "focus");
  expect(focusField.mock.calls.at(-1)?.[0]).not.toBeNull();
});

it("keeps plain inputs outside a sheet", () => {
  const view = renderForm(store());
  expect(view.getByLabelText("reviews.form.titleLabel").props.nativeID).toBeUndefined();
});
