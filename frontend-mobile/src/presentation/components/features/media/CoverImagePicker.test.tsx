import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CoverImagePicker } from "./CoverImagePicker";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));
jest.mock("@/infrastructure/device/imagePicker.gateway", () => ({
  imagePickerGateway: { pickImage: jest.fn(), cropImage: jest.fn() },
}));
jest.mock("@/infrastructure/api/clients/coverImages.client", () => ({
  coverImagesClient: { upload: jest.fn(), preview: jest.fn() },
}));

// Only the device picker and the HTTP client are faked: the real services and hooks run in between.
const { imagePickerGateway } = jest.requireMock<{ imagePickerGateway: { pickImage: jest.Mock; cropImage: jest.Mock } }>(
  "@/infrastructure/device/imagePicker.gateway",
);
const { coverImagesClient } = jest.requireMock<{ coverImagesClient: { upload: jest.Mock } }>(
  "@/infrastructure/api/clients/coverImages.client",
);
const pickImage = imagePickerGateway.pickImage;
const cropImage = imagePickerGateway.cropImage;
const upload = coverImagesClient.upload;
const photo = { status: "selected" as const, uri: "file:///party.heic", width: 4000, height: 3000, mimeType: "image/heic" };
const cropped = { uri: "file:///cover.jpg", width: 2400, height: 1350, fileName: "cover.jpg", mimeType: "image/jpeg" as const, base64: null };

function renderPicker() {
  const onChange = jest.fn();
  const onBusyChange = jest.fn();
  render(<CoverImagePicker kind="EVENT" value="" active onChange={onChange} onBusyChange={onBusyChange} />);
  return { onChange, onBusyChange };
}

async function openAdjustStep() {
  await act(async () => fireEvent.press(screen.getByText("media.choose")));
  await screen.findByText("media.crop.title");
  fireEvent(screen.getByTestId("image-crop-stage"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 400 } } });
}

beforeEach(() => jest.clearAllMocks());

it("shows the picked photo in the cover frame and uploads what was framed", async () => {
  pickImage.mockResolvedValue(photo);
  cropImage.mockResolvedValue(cropped);
  upload.mockResolvedValue({ id: "id", imageUrl: "/api/uploads/covers/id.webp", width: 2400, height: 1350, size: 1 });
  const { onChange, onBusyChange } = renderPicker();
  await openAdjustStep();
  expect(onBusyChange).toHaveBeenLastCalledWith(true);
  expect(screen.getByText("media.crop.guide")).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText("media.crop.confirm")));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith("/api/uploads/covers/id.webp"));
  expect(cropImage).toHaveBeenCalledWith("file:///party.heic", { originX: 0, originY: 375, width: 4000, height: 2250 },
    { maxLongEdge: 2400, fileName: "cover.jpg", base64: false, format: "jpeg" });
  expect(upload).toHaveBeenCalledWith({ uri: "file:///cover.jpg", fileName: "cover.jpg", mimeType: "image/jpeg" }, "EVENT", expect.any(AbortSignal));
  expect(onBusyChange).toHaveBeenLastCalledWith(false);
});

it("uploads nothing and keeps the current cover when the adjust step is cancelled", async () => {
  pickImage.mockResolvedValue(photo);
  const { onChange, onBusyChange } = renderPicker();
  await openAdjustStep();
  await act(async () => fireEvent.press(screen.getByText("media.crop.cancel")));
  await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
  expect(screen.queryByText("media.crop.title")).toBeNull();
  expect(cropImage).not.toHaveBeenCalled();
  expect(upload).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});

it("explains a denied photo permission", async () => {
  pickImage.mockResolvedValue({ status: "permission_denied" });
  renderPicker();
  await act(async () => fireEvent.press(screen.getByText("media.choose")));
  expect(screen.getByText("media.permission")).toBeTruthy();
  expect(screen.queryByText("media.crop.title")).toBeNull();
});
