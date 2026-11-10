import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AvatarPickerSheet } from "./AvatarPickerSheet";

const mockUpload = { mutate: jest.fn(), isPending: false };
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock("@/infrastructure/device/imagePicker.gateway", () => ({
  imagePickerGateway: { pickImage: jest.fn(), cropImage: jest.fn() },
}));
jest.mock("@/presentation/hooks/queries/user", () => ({ useUploadAvatar: () => mockUpload }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
    BottomSheetModal: forwardRef(({ children }: { children: ReactNode }, ref: unknown) => {
      useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return children;
    }),
  };
});

// Only the device picker is faked: the real selection service and crop flow run.
const { imagePickerGateway } = jest.requireMock<{ imagePickerGateway: { pickImage: jest.Mock; cropImage: jest.Mock } }>(
  "@/infrastructure/device/imagePicker.gateway",
);
const pickImage = imagePickerGateway.pickImage;
const cropImage = imagePickerGateway.cropImage;
const photo = { status: "selected" as const, uri: "file:///selfie.jpg", width: 3000, height: 4000, mimeType: "image/jpeg" };
const cropped = { uri: "file:///avatar.jpg", width: 1200, height: 1200, fileName: "avatar.jpg", mimeType: "image/jpeg" as const, base64: null };

function renderSheet() {
  const onClose = jest.fn();
  const onUploaded = jest.fn();
  render(<AvatarPickerSheet visible user={null} onClose={onClose} onUploaded={onUploaded} />);
  return { onClose, onUploaded };
}

async function openAdjustStep(button: string) {
  fireEvent.press(screen.getByText(button));
  await screen.findByText("media.crop.title");
  fireEvent(screen.getByTestId("image-crop-stage"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 400 } } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpload.mutate.mockImplementation((_upload, options: { onSuccess: (url: string) => void }) => options.onSuccess("https://cdn/avatar.webp"));
});

it("frames a gallery photo in the round frame and uploads the framed photo", async () => {
  pickImage.mockResolvedValue(photo);
  cropImage.mockResolvedValue(cropped);
  const { onClose, onUploaded } = renderSheet();
  await openAdjustStep("profile.chooseFromGallery");
  expect(pickImage).toHaveBeenCalledWith("library");
  expect(screen.getByTestId("image-crop-round-mask")).toBeTruthy();
  fireEvent.press(screen.getByText("media.crop.confirm"));
  await waitFor(() => expect(mockUpload.mutate).toHaveBeenCalledTimes(1));
  // A 3:4 portrait in a square frame keeps its middle square.
  expect(cropImage).toHaveBeenCalledWith("file:///selfie.jpg", { originX: 0, originY: 500, width: 3000, height: 3000 },
    { maxLongEdge: 1200, fileName: "avatar.jpg", base64: false, format: "jpeg" });
  expect(mockUpload.mutate.mock.calls[0][0]).toEqual({ uri: "file:///avatar.jpg", fileName: "avatar.jpg", mimeType: "image/jpeg" });
  expect(onUploaded).toHaveBeenCalledWith("https://cdn/avatar.webp");
  expect(onClose).toHaveBeenCalled();
  expect(screen.queryByText("media.crop.title")).toBeNull();
});

it("takes a photo with the camera and uploads nothing when the adjust step is cancelled", async () => {
  pickImage.mockResolvedValue(photo);
  const { onUploaded } = renderSheet();
  await openAdjustStep("profile.takePhoto");
  expect(pickImage).toHaveBeenCalledWith("camera");
  fireEvent.press(screen.getByText("media.crop.cancel"));
  await waitFor(() => expect(screen.queryByText("media.crop.title")).toBeNull());
  expect(cropImage).not.toHaveBeenCalled();
  expect(mockUpload.mutate).not.toHaveBeenCalled();
  expect(onUploaded).not.toHaveBeenCalled();
});

it("explains a denied permission without opening the adjust step", async () => {
  pickImage.mockResolvedValue({ status: "permission_denied" });
  renderSheet();
  fireEvent.press(screen.getByText("profile.takePhoto"));
  await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("profile.avatarPermissionDenied"));
  expect(screen.queryByText("media.crop.title")).toBeNull();
  expect(mockUpload.mutate).not.toHaveBeenCalled();
});
