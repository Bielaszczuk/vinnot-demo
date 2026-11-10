import type { ImageSource } from "@/infrastructure/device/imagePicker.gateway";
import { photoCropService, type PhotoAdjuster } from "./photoCrop.service";

export type AvatarSource = ImageSource;

export type AvatarSelectionResult =
  | {
      status: "selected";
      upload: {
        uri: string;
        fileName: string;
        mimeType: string;
      };
    }
  | {
      status: "cancelled" | "permission_denied";
    };

export const avatarSelectionService = {
  /** Takes or picks a photo and lets the user frame it in the round profile frame. */
  async select(source: AvatarSource, adjust: PhotoAdjuster): Promise<AvatarSelectionResult> {
    const result = await photoCropService.pickFramed("AVATAR", adjust, { source, fileName: "avatar.jpg" });
    if (result.status !== "selected") {
      return result;
    }

    return {
      status: "selected",
      upload: {
        uri: result.image.uri,
        fileName: result.image.fileName,
        mimeType: result.image.mimeType,
      },
    };
  },
};
