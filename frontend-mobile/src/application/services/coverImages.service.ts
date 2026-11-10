import { coverImagesClient } from "@/infrastructure/api/clients/coverImages.client";
import type { CoverImageKind } from "@/domain/media/coverImages.types";
import { createCoverPreviewCache } from "./coverPreviewCache";
import { photoCropService, type PhotoAdjuster } from "./photoCrop.service";
const previews = createCoverPreviewCache<string>();
export const coverImagesService = {
  /** Picks a photo, lets the user frame it as a cover and uploads the framed photo. */
  async selectAndUpload(kind: CoverImageKind, signal: AbortSignal, adjust: PhotoAdjuster) {
    const selection = await photoCropService.pickFramed("COVER", adjust, { fileName: "cover.jpg" });
    if (selection.status !== "selected" || signal.aborted) return selection.status;
    const { uri, fileName, mimeType } = selection.image;
    const image = await coverImagesClient.upload({ uri, fileName, mimeType }, kind, signal);
    // The framed local file shows at once wherever the new cover appears.
    previews.put(image.imageUrl, uri);
    return image;
  },
  async preview(url: string, signal: AbortSignal) {
    const cached = previews.get(url);
    if (cached) return cached;
    const image = await coverImagesClient.preview(url, signal);
    previews.put(url, image);
    return image;
  },
  /** Private images must not outlive the session that was allowed to read them. */
  clearPreviews() { previews.clear(); },
};
