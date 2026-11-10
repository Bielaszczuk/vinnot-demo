import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import { IMAGE_FRAMES } from "@/domain/media/imageAspect";
import { ImageCropModal } from "./ImageCropModal";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));

const photo = { uri: "file:///photo.jpg", width: 4000, height: 3000 };
// The stage is 360x400: the 16:9 frame is 320x180 inside its 20 pt margins.
const layoutStage = () =>
  fireEvent(screen.getByTestId("image-crop-stage"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 400 } } });

function renderModal(frame = IMAGE_FRAMES.COVER) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const view = render(<ImageCropModal request={{ photo, frame }} onConfirm={onConfirm} onCancel={onCancel} />);
  return { onConfirm, onCancel, view };
}

it("shows nothing without a request", () => {
  render(<ImageCropModal request={null} onConfirm={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.queryByText("media.crop.title")).toBeNull();
});

it("frames the middle of the photo until the user moves it", () => {
  const { onConfirm } = renderModal();
  expect(screen.getByText("media.crop.title")).toBeTruthy();
  expect(screen.getByLabelText("media.crop.stage")).toBeTruthy();
  layoutStage();
  expect(screen.getByText("media.crop.guide")).toBeTruthy();
  expect(screen.queryByTestId("image-crop-round-mask")).toBeNull();
  fireEvent.press(screen.getByText("media.crop.confirm"));
  expect(onConfirm).toHaveBeenCalledWith({ originX: 0, originY: 375, width: 4000, height: 2250 });
});

it("crops what the user dragged and pinched into the frame", () => {
  const { onConfirm } = renderModal();
  layoutStage();
  fireGestureHandler(getByGestureTestId("image-crop-pinch"), [
    { state: State.BEGAN, scale: 1 },
    { state: State.ACTIVE, scale: 1 },
    { state: State.ACTIVE, scale: 2 },
    { state: State.END, scale: 2 },
  ]);
  // Dragging far right and down stops at the photo's top-left corner.
  fireGestureHandler(getByGestureTestId("image-crop-pan"), [
    { state: State.BEGAN, translationX: 0, translationY: 0 },
    { state: State.ACTIVE, translationX: 0, translationY: 0 },
    { state: State.ACTIVE, translationX: 900, translationY: 900 },
    { state: State.END, translationX: 900, translationY: 900 },
  ]);
  fireEvent.press(screen.getByText("media.crop.confirm"));
  expect(onConfirm).toHaveBeenCalledWith({ originX: 0, originY: 0, width: 2000, height: 1125 });
});

it("lets screen readers zoom in and out", () => {
  const { onConfirm } = renderModal();
  layoutStage();
  const stage = screen.getByTestId("image-crop-stage");
  act(() => {
    stage.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } });
    stage.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } });
  });
  fireEvent.press(screen.getByText("media.crop.confirm"));
  expect(onConfirm).toHaveBeenLastCalledWith({ originX: 1000, originY: 938, width: 2000, height: 1125 });
  act(() => {
    for (let i = 0; i < 4; i += 1) stage.props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } });
  });
  fireEvent.press(screen.getByText("media.crop.confirm"));
  expect(onConfirm).toHaveBeenLastCalledWith({ originX: 0, originY: 375, width: 4000, height: 2250 });
});

it("masks profile photos with a circle and has no strip guide", () => {
  const { onConfirm } = renderModal(IMAGE_FRAMES.AVATAR);
  layoutStage();
  expect(screen.getByTestId("image-crop-round-mask")).toBeTruthy();
  expect(screen.queryByText("media.crop.guide")).toBeNull();
  fireEvent.press(screen.getByText("media.crop.confirm"));
  expect(onConfirm).toHaveBeenCalledWith({ originX: 500, originY: 0, width: 3000, height: 3000 });
});

it("cancels without cropping, and cannot confirm before the frame is measured", () => {
  const { onConfirm, onCancel } = renderModal();
  fireEvent.press(screen.getByText("media.crop.confirm"));
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("media.crop.cancel"));
  expect(onCancel).toHaveBeenCalledTimes(1);
});
