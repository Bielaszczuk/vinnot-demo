/**
 * Catalog images — picks a photo, lets the user frame it and stores it right away through POST /admin/catalog-images,
 * so a catalog form only ever holds the stored image URL.
 * @architecture: Capa 3 — Aplicación
 */
import { adminApiClient } from "@/infrastructure/api/clients/admin.client";
import type { ImageFrameKind } from "@/domain/media/imageAspect";
import type { PhotoAdjuster } from "./photoCrop.service";
import { wineImageSelectionService } from "./wineImageSelection.service";

export type CatalogImageUploadResult =
  | { status: "uploaded"; imageUrl: string }
  | { status: "cancelled" | "permission_denied" | "file_too_large" | "read_error" };

export const catalogImagesService = {
  async selectAndUpload(frame: ImageFrameKind, adjust: PhotoAdjuster): Promise<CatalogImageUploadResult> {
    const selection = await wineImageSelectionService.selectFromLibrary(frame, adjust);
    if (selection.status !== "selected") return { status: selection.status };
    const imageUrl = await adminApiClient.uploadCatalogImage(selection.dataUrl);
    return { status: "uploaded", imageUrl };
  },
};
