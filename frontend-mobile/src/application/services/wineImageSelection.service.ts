import type { ImageFrameKind } from "@/domain/media/imageAspect";
import { photoCropService, type PhotoAdjuster } from "./photoCrop.service";

const MAX_WINE_IMAGE_BYTES = 5 * 1024 * 1024;

export type WineImageSelectionResult =
  | {
      status: "selected";
      dataUrl: string;
      fileName: string;
    }
  | {
      status:
        | "cancelled"
        | "permission_denied"
        | "file_too_large"
        | "read_error";
    };

/** Bytes carried by a base64 string: every 4 characters hold 3 bytes. */
function base64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

export const wineImageSelectionService = {
  /** Picks a catalog photo, lets the user frame it and returns it as a JPEG data URL. */
  async selectFromLibrary(frame: ImageFrameKind, adjust: PhotoAdjuster): Promise<WineImageSelectionResult> {
    const result = await photoCropService.pickFramed(frame, adjust, { base64: true });
    if (result.status !== "selected") {
      return result;
    }
    const { base64, mimeType, fileName } = result.image;
    if (!base64) {
      return { status: "read_error" };
    }
    if (base64Bytes(base64) > MAX_WINE_IMAGE_BYTES) {
      return { status: "file_too_large" };
    }

    return {
      status: "selected",
      dataUrl: `data:${mimeType};base64,${base64}`,
      fileName,
    };
  },
};
