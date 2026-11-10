import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export type ImageSource = "camera" | "library";

export type PickedImageResult =
  | { status: "selected"; uri: string; width: number; height: number; mimeType: string }
  | { status: "cancelled" | "permission_denied" };

/** Region to keep, in the photo's own (oriented) pixels. */
export interface ImageCropRegion {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export type CropImageFormat = "jpeg" | "png";

export interface CroppedImage {
  uri: string;
  width: number;
  height: number;
  fileName: string;
  mimeType: "image/jpeg" | "image/png";
  /** Only filled when asked for. */
  base64: string | null;
}

export interface CropImageOptions {
  /** Longest edge of the result; a smaller region is never upscaled. */
  maxLongEdge: number;
  fileName?: string;
  base64?: boolean;
  /** JPEG by default; PNG keeps transparency (logos, bottle cut-outs). */
  format?: CropImageFormat;
}

export const imagePickerGateway = {
  /**
   * Picks a photo without the native editor: the app frames it in its own adjust step. The
   * picker reports width and height after the EXIF orientation, the space the crop works in.
   */
  async pickImage(source: ImageSource = "library"): Promise<PickedImageResult> {
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") return { status: "permission_denied" };
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 };
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (result.canceled || !asset || !(asset.width > 0 && asset.height > 0)) return { status: "cancelled" };
    return { status: "selected", uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType ?? "image/jpeg" };
  },

  /**
   * Keeps the framed region and re-encodes it (JPEG unless PNG is asked), which also normalizes HEIC and the EXIF
   * orientation on the device; the backend validates and encodes the image again.
   */
  async cropImage(uri: string, rect: ImageCropRegion, options: CropImageOptions): Promise<CroppedImage> {
    const longEdge = Math.max(rect.width, rect.height);
    const actions = longEdge > options.maxLongEdge
      ? [{ crop: rect }, { resize: rect.width >= rect.height ? { width: options.maxLongEdge } : { height: options.maxLongEdge } }]
      : [{ crop: rect }];
    const base64 = options.base64 === true;
    const png = options.format === "png";
    const photo = await manipulateAsync(uri, actions, { compress: 0.9, format: png ? SaveFormat.PNG : SaveFormat.JPEG, base64 });
    return {
      uri: photo.uri,
      width: photo.width,
      height: photo.height,
      fileName: options.fileName ?? (png ? "photo.png" : "photo.jpg"),
      mimeType: png ? "image/png" : "image/jpeg",
      base64: photo.base64 ?? null,
    };
  },
};
