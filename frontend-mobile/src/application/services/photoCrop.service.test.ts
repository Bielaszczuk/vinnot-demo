import { photoCropService } from "./photoCrop.service";
import { imagePickerGateway } from "@/infrastructure/device/imagePicker.gateway";
import { IMAGE_FRAMES } from "@/domain/media/imageAspect";

jest.mock("@/infrastructure/device/imagePicker.gateway", () => ({
  imagePickerGateway: { pickImage: jest.fn(), cropImage: jest.fn() },
}));

const picked = { status: "selected" as const, uri: "file:///photo.heic", width: 4000, height: 3000, mimeType: "image/heic" };
const rect = { originX: 0, originY: 375, width: 4000, height: 2250 };
const cropped = { uri: "file:///cropped.jpg", width: 2400, height: 1350, fileName: "cover.jpg", mimeType: "image/jpeg" as const, base64: null };

beforeEach(() => jest.clearAllMocks());

it("shows the picked photo in its frame and exports exactly the framed region", async () => {
  jest.mocked(imagePickerGateway.pickImage).mockResolvedValue(picked);
  jest.mocked(imagePickerGateway.cropImage).mockResolvedValue(cropped);
  const adjust = jest.fn().mockResolvedValue(rect);
  await expect(photoCropService.pickFramed("COVER", adjust, { fileName: "cover.jpg" }))
    .resolves.toEqual({ status: "selected", image: cropped });
  expect(imagePickerGateway.pickImage).toHaveBeenCalledWith("library");
  expect(adjust).toHaveBeenCalledWith({ uri: "file:///photo.heic", width: 4000, height: 3000 }, IMAGE_FRAMES.COVER);
  expect(imagePickerGateway.cropImage).toHaveBeenCalledWith("file:///photo.heic", rect, { maxLongEdge: 2400, fileName: "cover.jpg", base64: false, format: "jpeg" });
});

it("uses the frame's own size limit, the chosen source and base64 when asked", async () => {
  jest.mocked(imagePickerGateway.pickImage).mockResolvedValue(picked);
  jest.mocked(imagePickerGateway.cropImage).mockResolvedValue(cropped);
  await photoCropService.pickFramed("AVATAR", jest.fn().mockResolvedValue(rect), { source: "camera", base64: true });
  expect(imagePickerGateway.pickImage).toHaveBeenCalledWith("camera");
  expect(imagePickerGateway.cropImage).toHaveBeenCalledWith("file:///photo.heic", rect, { maxLongEdge: 1200, fileName: undefined, base64: true, format: "jpeg" });
});

it("keeps a PNG as PNG only in frames that keep transparency", async () => {
  jest.mocked(imagePickerGateway.pickImage).mockResolvedValue({ ...picked, mimeType: "image/png" });
  jest.mocked(imagePickerGateway.cropImage).mockResolvedValue(cropped);
  await photoCropService.pickFramed("LOGO", jest.fn().mockResolvedValue(rect), { base64: true });
  expect(imagePickerGateway.cropImage).toHaveBeenLastCalledWith("file:///photo.heic", rect, { maxLongEdge: 1200, fileName: undefined, base64: true, format: "png" });
  await photoCropService.pickFramed("COVER", jest.fn().mockResolvedValue(rect));
  expect(imagePickerGateway.cropImage).toHaveBeenLastCalledWith("file:///photo.heic", rect, { maxLongEdge: 2400, fileName: undefined, base64: false, format: "jpeg" });
});

it("exports nothing when the picker or the adjust step is cancelled", async () => {
  const adjust = jest.fn().mockResolvedValue(null);
  jest.mocked(imagePickerGateway.pickImage).mockResolvedValueOnce({ status: "permission_denied" });
  await expect(photoCropService.pickFramed("WINE", adjust)).resolves.toEqual({ status: "permission_denied" });
  expect(adjust).not.toHaveBeenCalled();
  jest.mocked(imagePickerGateway.pickImage).mockResolvedValueOnce(picked);
  await expect(photoCropService.pickFramed("WINE", adjust)).resolves.toEqual({ status: "cancelled" });
  expect(adjust).toHaveBeenCalledWith({ uri: "file:///photo.heic", width: 4000, height: 3000 }, IMAGE_FRAMES.WINE);
  expect(imagePickerGateway.cropImage).not.toHaveBeenCalled();
});
