import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { imagePickerGateway } from "./imagePicker.gateway";
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: "images" },
}));
jest.mock("expo-image-manipulator", () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: "jpeg", PNG: "png" } }));
beforeEach(() => jest.resetAllMocks());

describe("pickImage", () => {
  it("returns the picked photo with its oriented size and no native editor", async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ status: "granted" } as never);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [{ uri: "file://photo.heic", width: 3000, height: 4000, mimeType: "image/heic" }] } as never);
    expect(await imagePickerGateway.pickImage("library")).toEqual({ status: "selected", uri: "file://photo.heic", width: 3000, height: 4000, mimeType: "image/heic" });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({ mediaTypes: "images", quality: 1 });
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(manipulateAsync).not.toHaveBeenCalled();
  });

  it("asks for the camera and opens it when the camera is the source", async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ status: "granted" } as never);
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [{ uri: "file://shot.jpg", width: 1200, height: 900 }] } as never);
    // Without a reported type the photo counts as JPEG.
    expect(await imagePickerGateway.pickImage("camera")).toEqual({ status: "selected", uri: "file://shot.jpg", width: 1200, height: 900, mimeType: "image/jpeg" });
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({ mediaTypes: "images", quality: 1 });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("opens nothing when permission is denied and reports a cancelled selection", async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({ status: "denied" } as never);
    expect(await imagePickerGateway.pickImage()).toEqual({ status: "permission_denied" });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({ status: "denied" } as never);
    expect(await imagePickerGateway.pickImage("camera")).toEqual({ status: "permission_denied" });
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({ status: "granted" } as never);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: true, assets: null });
    expect(await imagePickerGateway.pickImage()).toEqual({ status: "cancelled" });
  });

  it("treats a photo without a size as cancelled, since it cannot be framed", async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ status: "granted" } as never);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [{ uri: "file://x.jpg", width: 0, height: 0 }] } as never);
    expect(await imagePickerGateway.pickImage()).toEqual({ status: "cancelled" });
  });
});

describe("cropImage", () => {
  it("crops and shrinks a large region to the longest edge as JPEG", async () => {
    jest.mocked(manipulateAsync).mockResolvedValue({ uri: "file://cropped.jpg", width: 2400, height: 1350 } as never);
    const rect = { originX: 0, originY: 375, width: 4000, height: 2250 };
    expect(await imagePickerGateway.cropImage("file://photo.heic", rect, { maxLongEdge: 2400, fileName: "cover.jpg" })).toEqual({
      uri: "file://cropped.jpg", width: 2400, height: 1350, fileName: "cover.jpg", mimeType: "image/jpeg", base64: null,
    });
    expect(manipulateAsync).toHaveBeenCalledWith("file://photo.heic", [{ crop: rect }, { resize: { width: 2400 } }], { compress: 0.9, format: SaveFormat.JPEG, base64: false });
  });

  it("shrinks a portrait region by its height", async () => {
    jest.mocked(manipulateAsync).mockResolvedValue({ uri: "file://c.jpg", width: 1800, height: 2400 } as never);
    const rect = { originX: 0, originY: 0, width: 3000, height: 4000 };
    await imagePickerGateway.cropImage("file://p.jpg", rect, { maxLongEdge: 2400 });
    expect(manipulateAsync).toHaveBeenCalledWith("file://p.jpg", [{ crop: rect }, { resize: { height: 2400 } }], { compress: 0.9, format: SaveFormat.JPEG, base64: false });
  });

  it("never upscales a small region and can return it as base64", async () => {
    jest.mocked(manipulateAsync).mockResolvedValue({ uri: "file://c.jpg", width: 600, height: 800, base64: "AAAA" } as never);
    const rect = { originX: 10, originY: 20, width: 600, height: 800 };
    expect(await imagePickerGateway.cropImage("file://p.jpg", rect, { maxLongEdge: 2400, base64: true })).toEqual({
      uri: "file://c.jpg", width: 600, height: 800, fileName: "photo.jpg", mimeType: "image/jpeg", base64: "AAAA",
    });
    expect(manipulateAsync).toHaveBeenCalledWith("file://p.jpg", [{ crop: rect }], { compress: 0.9, format: SaveFormat.JPEG, base64: true });
  });

  it("keeps PNG when asked, so transparent logos stay transparent", async () => {
    jest.mocked(manipulateAsync).mockResolvedValue({ uri: "file://logo.png", width: 800, height: 800, base64: "PNG" } as never);
    const rect = { originX: 0, originY: 0, width: 800, height: 800 };
    expect(await imagePickerGateway.cropImage("file://logo.png", rect, { maxLongEdge: 1200, base64: true, format: "png" })).toEqual({
      uri: "file://logo.png", width: 800, height: 800, fileName: "photo.png", mimeType: "image/png", base64: "PNG",
    });
    expect(manipulateAsync).toHaveBeenCalledWith("file://logo.png", [{ crop: rect }], { compress: 0.9, format: SaveFormat.PNG, base64: true });
  });
});
