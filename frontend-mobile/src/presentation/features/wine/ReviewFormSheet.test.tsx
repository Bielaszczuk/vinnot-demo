import React from "react";
import { Alert, Pressable, Text, type AlertButton } from "react-native";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { act, fireEvent, render as renderView } from "@testing-library/react-native";
import draftsReducer from "@/presentation/store/draftsSlice";
import type { WineReview } from "@/domain/wine/wine.types";
import { ratePour } from "@/test/fixtures/pourRating";
import { ReviewFormSheet } from "./ReviewFormSheet";

// Most tests drive a stand-in form; the draft tests switch to the real one.
let mockRealForm = false;
const mockSubmit = jest.fn<Promise<boolean>, [unknown]>();
const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockFormMounts = jest.fn();
let mockSheetProps: Record<string, unknown> = {};

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const Modal = mockReact.forwardRef(({ children, ...props }: { children: React.ReactNode }, ref) => {
    mockSheetProps = props;
    mockReact.useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: mockDismiss }));
    return mockReact.createElement(View, { testID: "review-sheet" }, children);
  });
  return {
    BottomSheetModal: Modal,
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement(View, { testID: "review-sheet-scroll" }, children),
  };
});
jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useWineDetail: () => ({ data: { vintage: null, type: "red" } }),
}));
jest.mock("@/presentation/hooks/useWineReviewSubmission", () => ({
  useWineReviewSubmission: () => mockSubmit,
}));
jest.mock("@/presentation/components/ui/VintageField", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    VintageField: ({ value, onChange }: { value: number | null; onChange: (year: number | null) => void }) =>
      mockReact.createElement(Pressable, { onPress: () => onChange(2019) },
        mockReact.createElement(Text, null, `Vintage ${value ?? "none"}`)),
  };
});
jest.mock("./ReviewForm", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } = jest.requireActual<typeof import("react-native")>("react-native");
  const actual = () => jest.requireActual<typeof import("./ReviewForm")>("./ReviewForm");
  return {
    hasUnsavedReviewChanges: (...args: Parameters<typeof import("./ReviewForm").hasUnsavedReviewChanges>) =>
      actual().hasUnsavedReviewChanges(...args),
    ReviewForm: (props: {
      review?: { id: string } | null; onCancel?: () => void; onSuccess?: () => void; framed?: boolean;
    }) => {
      const { review, onCancel, onSuccess, framed } = props;
      mockReact.useEffect(() => { mockFormMounts(); }, []);
      if (mockRealForm) return mockReact.createElement(actual().ReviewForm, props as never);
      return mockReact.createElement(View, null,
        mockReact.createElement(Text, null, `Form ${review?.id ?? "new"}${framed === false ? " bare" : ""}`),
        mockReact.createElement(Pressable, { onPress: onCancel }, mockReact.createElement(Text, null, "Cancel")),
        mockReact.createElement(Pressable, { onPress: onSuccess }, mockReact.createElement(Text, null, "Published")));
    },
  };
});

const review = { id: "review-1" } as WineReview;
let store = configureStore({ reducer: { drafts: draftsReducer } });
const render = (ui: React.ReactElement) => renderView(ui, {
  wrapper: ({ children }) => <GestureHandlerRootView><Provider store={store}>{children}</Provider></GestureHandlerRootView>,
});

/** The wine detail: it opens the sheet, and the sheet reports when it closed. */
function Host({ initialReview = null }: { initialReview?: WineReview | null }) {
  const [open, setOpen] = React.useState(true);
  return <>
    <Pressable onPress={() => setOpen(true)}><Text>Open</Text></Pressable>
    <ReviewFormSheet wineId="wine-1" review={initialReview} visible={open} onClose={() => setOpen(false)} />
  </>;
}

const pressAlertButton = (label: string) => {
  const buttons = (jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  act(() => buttons.find((button) => button.text === label)?.onPress?.());
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSheetProps = {};
  mockRealForm = false;
  mockSubmit.mockReset().mockResolvedValue(true);
  store = configureStore({ reducer: { drafts: draftsReducer } });
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

it("slides up the review form in a sheet that only drags from its handle", () => {
  const view = render(<ReviewFormSheet wineId="wine-1" visible onClose={jest.fn()} />);

  expect(mockPresent).toHaveBeenCalledTimes(1);
  expect(view.getByText("Form new bare")).toBeTruthy();
  // The pour control's bottle and bar are dragged inside the sheet: the content must not move it.
  expect(mockSheetProps.enableContentPanningGesture).toBe(false);
  expect(mockSheetProps.snapPoints).toEqual(["90%"]);
});

it("mounts no form while the sheet is closed", () => {
  const view = render(<ReviewFormSheet wineId="wine-1" visible={false} onClose={jest.fn()} />);

  expect(view.queryByText(/^Form/)).toBeNull();
  expect(mockPresent).not.toHaveBeenCalled();
});

it("opens the reader's own review in edit mode", () => {
  const view = render(<ReviewFormSheet wineId="wine-1" review={review} visible onClose={jest.fn()} />);

  expect(view.getByText("Form review-1 bare")).toBeTruthy();
});

it("closes after a successful publication and dismisses the sheet", () => {
  const onClose = jest.fn();
  const view = render(<ReviewFormSheet wineId="wine-1" visible onClose={onClose} />);

  fireEvent.press(view.getByText("Published"));
  expect(onClose).toHaveBeenCalledTimes(1);

  view.rerender(<ReviewFormSheet wineId="wine-1" visible={false} onClose={onClose} />);
  expect(mockDismiss).toHaveBeenCalledTimes(1);
});

it("closes on Cancel", () => {
  const onClose = jest.fn();
  const view = render(<ReviewFormSheet wineId="wine-1" visible onClose={onClose} />);

  fireEvent.press(view.getByText("Cancel"));

  expect(onClose).toHaveBeenCalledTimes(1);
});

it("closes on a swipe or Back and mounts a fresh form on the next opening", () => {
  const view = render(<Host />);
  expect(mockFormMounts).toHaveBeenCalledTimes(1);

  act(() => (mockSheetProps.onDismiss as () => void)());
  expect(view.queryByText(/^Form/)).toBeNull();

  fireEvent.press(view.getByText("Open"));
  expect(view.getByText("Form new bare")).toBeTruthy();
  expect(mockFormMounts).toHaveBeenCalledTimes(2);
  expect(mockPresent).toHaveBeenCalledTimes(2);
});

it("keeps the form on screen while the sheet slides down after closing", () => {
  const onClose = jest.fn();
  const view = render(<ReviewFormSheet wineId="wine-1" visible onClose={onClose} />);

  view.rerender(<ReviewFormSheet wineId="wine-1" visible={false} onClose={onClose} />);
  expect(view.getByText("Form new bare")).toBeTruthy();

  act(() => (mockSheetProps.onDismiss as () => void)());
  expect(view.queryByText(/^Form/)).toBeNull();
});

it("keeps the edited review in the form while the sheet slides down after saving", () => {
  const onClose = jest.fn();
  const view = render(<ReviewFormSheet wineId="wine-1" review={review} visible onClose={onClose} />);

  view.rerender(<ReviewFormSheet wineId="wine-1" review={null} visible={false} onClose={onClose} />);

  expect(view.getByText("Form review-1 bare")).toBeTruthy();
  expect(view.queryByText("Form new bare")).toBeNull();
});

describe("with the real form", () => {
  beforeEach(() => { mockRealForm = true; });

  it("keeps the whole draft when the sheet is swiped away, and restores it on reopening", async () => {
    const view = render(<Host />);
    await ratePour(view, 4);
    fireEvent.press(view.getByText("Vintage none"));
    fireEvent.changeText(view.getByLabelText("reviews.form.titleLabel"), "Gran Malbec");
    fireEvent.changeText(view.getByLabelText("reviews.form.commentLabel"), "Frutos rojos");

    act(() => (mockSheetProps.onDismiss as () => void)());
    expect(view.queryByLabelText("reviews.form.titleLabel")).toBeNull();
    expect(Alert.alert).not.toHaveBeenCalled();

    fireEvent.press(view.getByText("Open"));
    expect(view.getByTestId("rating-pour-value")).toHaveTextContent(/^4[.,]0$/);
    expect(view.getByText("Vintage 2019")).toBeTruthy();
    expect(view.getByLabelText("reviews.form.titleLabel").props.value).toBe("Gran Malbec");
    expect(view.getByLabelText("reviews.form.commentLabel").props.value).toBe("Frutos rojos");
    expect(store.getState().drafts.reviews["wine-1:new"]).toEqual(
      { rating: 4, vintage: 2019, title: "Gran Malbec", comment: "Frutos rojos" });
  });

  it("asks before Cancel discards unsaved changes: Keep editing stays, Discard clears and closes", () => {
    const view = render(<Host />);
    fireEvent.changeText(view.getByLabelText("reviews.form.titleLabel"), "A medias");

    fireEvent.press(view.getByText("common.cancel"));
    expect(Alert.alert).toHaveBeenCalledWith("common.unsavedChanges.title", "common.unsavedChanges.message",
      expect.any(Array), { cancelable: false });
    pressAlertButton("common.unsavedChanges.keepEditing");
    expect(view.getByLabelText("reviews.form.titleLabel").props.value).toBe("A medias");
    expect(store.getState().drafts.reviews["wine-1:new"]).toMatchObject({ title: "A medias" });

    expect(mockDismiss).not.toHaveBeenCalled();

    fireEvent.press(view.getByText("common.cancel"));
    pressAlertButton("common.unsavedChanges.discard");
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(store.getState().drafts.reviews).toEqual({});
    act(() => (mockSheetProps.onDismiss as () => void)());
    expect(view.queryByLabelText("reviews.form.titleLabel")).toBeNull();
  });

  it("closes on Cancel without asking when nothing changed, also for an untouched edit", () => {
    const view = render(<Host />);
    fireEvent.press(view.getByText("common.cancel"));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    view.unmount();

    const own = { id: "review-1", rating: 3, title: "Original", comment: "", vintage: null } as unknown as WineReview;
    const edit = render(<Host initialReview={own} />);
    fireEvent.press(edit.getByText("common.cancel"));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockDismiss).toHaveBeenCalledTimes(2);
  });

  it("cannot be swiped, tapped or backed away while a review is publishing", async () => {
    let finish: (published: boolean) => void = () => undefined;
    mockSubmit.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<Host />);
    const backdrop = () => (mockSheetProps.backdropComponent as (props: object) => React.ReactElement<{ pressBehavior: string }>)({});
    expect(mockSheetProps.enablePanDownToClose).toBe(true);
    await ratePour(view, 3);

    await act(async () => { fireEvent.press(view.getByText("wines.sendReview")); });
    expect(mockSheetProps.enablePanDownToClose).toBe(false);
    expect(backdrop().props.pressBehavior).toBe("none");

    await act(async () => { finish(false); });
    expect(mockSheetProps.enablePanDownToClose).toBe(true);
    expect(backdrop().props.pressBehavior).toBe("close");
  });
});
