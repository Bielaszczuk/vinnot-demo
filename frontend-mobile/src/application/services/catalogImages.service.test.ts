import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { catalogImagesService } from "./catalogImages.service";
import { adminApiClient } from "@/infrastructure/api/clients/admin.client";
import { wineImageSelectionService } from "./wineImageSelection.service";

jest.mock("@/infrastructure/api/clients/admin.client", () => ({
  adminApiClient: { uploadCatalogImage: jest.fn() },
}));
jest.mock("./wineImageSelection.service", () => ({
  wineImageSelectionService: { selectFromLibrary: jest.fn() },
}));

const upload = adminApiClient.uploadCatalogImage as jest.MockedFunction<typeof adminApiClient.uploadCatalogImage>;
const select = wineImageSelectionService.selectFromLibrary as jest.MockedFunction<
  typeof wineImageSelectionService.selectFromLibrary
>;

describe("catalogImagesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const adjust = jest.fn<() => Promise<null>>();

  it("uploads the framed photo and returns the stored URL", async () => {
    select.mockResolvedValue({ status: "selected", dataUrl: "data:image/jpeg;base64,AAA", fileName: "a.jpg" });
    upload.mockResolvedValue("https://cdn.vinnot.com/catalog/a.jpg");
    await expect(catalogImagesService.selectAndUpload("WINE", adjust)).resolves.toEqual({
      status: "uploaded",
      imageUrl: "https://cdn.vinnot.com/catalog/a.jpg",
    });
    expect(upload).toHaveBeenCalledWith("data:image/jpeg;base64,AAA");
    expect(select).toHaveBeenCalledWith("WINE", adjust);
  });

  it("uploads nothing when no photo was picked", async () => {
    select.mockResolvedValue({ status: "permission_denied" });
    await expect(catalogImagesService.selectAndUpload("LOGO", adjust)).resolves.toEqual({ status: "permission_denied" });
    expect(upload).not.toHaveBeenCalled();
  });
});
