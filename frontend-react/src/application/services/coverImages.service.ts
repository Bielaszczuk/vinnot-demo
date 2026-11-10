import { coverImagesClient } from "@infrastructure/api/clients/coverImages.client";
import { acceptsCoverImage, type CoverImageKind } from "@domain/media/coverImages.types";
import { createCoverPreviewCache } from "./coverPreviewCache";
const previews = createCoverPreviewCache<Blob>();
export const coverImagesService = {
  upload(file: File, kind: CoverImageKind, signal: AbortSignal) {
    if (!acceptsCoverImage(file.type, file.size)) throw new Error("INVALID_COVER_IMAGE");
    return coverImagesClient.upload(file, kind, signal).then(image => {
      // The uploaded file shows at once wherever the new cover appears.
      previews.put(image.imageUrl, file);
      return image;
    });
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
