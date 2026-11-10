export type CoverImageKind = "EVENT" | "WINE_ROUTE";
export interface CoverImage {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  size: number;
}
export const MAX_COVER_UPLOAD_BYTES = 8 * 1024 * 1024;
export function acceptsCoverImage(type: string, size: number): boolean {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(type)
    && size > 0 && size <= MAX_COVER_UPLOAD_BYTES;
}
