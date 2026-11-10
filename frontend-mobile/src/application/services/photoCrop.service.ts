/**
 * Photo framing — picks a photo, lets the user frame it in the adjust step and exports exactly
 * the framed region. Every photo upload goes through it, so what is framed is what is shown.
 * @architecture: Capa 3 — Aplicación
 */
import {
  imagePickerGateway,
  type CroppedImage,
  type ImageSource,
} from "@/infrastructure/device/imagePicker.gateway";
import { IMAGE_FRAMES, type ImageFrame, type ImageFrameKind } from "@/domain/media/imageAspect";
import type { CropRect, PickedPhoto } from "@/domain/media/imageCrop";

/** Shows the adjust step and resolves with the framed region, or null when it is cancelled. */
export type PhotoAdjuster = (photo: PickedPhoto, frame: ImageFrame) => Promise<CropRect | null>;

export type FramedPhotoResult =
  | { status: "selected"; image: CroppedImage }
  | { status: "cancelled" | "permission_denied" };

export interface PickFramedOptions {
  source?: ImageSource;
  fileName?: string;
  base64?: boolean;
}

export const photoCropService = {
  async pickFramed(kind: ImageFrameKind, adjust: PhotoAdjuster, options: PickFramedOptions = {}): Promise<FramedPhotoResult> {
    const picked = await imagePickerGateway.pickImage(options.source ?? "library");
    if (picked.status !== "selected") return { status: picked.status };
    const frame = IMAGE_FRAMES[kind];
    const rect = await adjust({ uri: picked.uri, width: picked.width, height: picked.height }, frame);
    if (!rect) return { status: "cancelled" };
    const image = await imagePickerGateway.cropImage(picked.uri, rect, {
      maxLongEdge: frame.maxLongEdge,
      fileName: options.fileName,
      base64: options.base64 === true,
      format: frame.keepsTransparency && picked.mimeType === "image/png" ? "png" : "jpeg",
    });
    return { status: "selected", image };
  },
};
