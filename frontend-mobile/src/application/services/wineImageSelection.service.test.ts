import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { photoCropService } from "./photoCrop.service";
import { wineImageSelectionService } from "./wineImageSelection.service";

jest.mock("./photoCrop.service", () => ({
  photoCropService: { pickFramed: jest.fn() },
}));

const pickFramed = photoCropService.pickFramed as jest.MockedFunction<typeof photoCropService.pickFramed>;
const adjust = jest.fn<() => Promise<null>>();
const image = (base64: string | null) => ({
  status: "selected" as const,
  image: { uri: "file:///wine.jpg", width: 900, height: 1200, fileName: "photo.jpg", mimeType: "image/jpeg" as const, base64 },
});

describe("wineImageSelectionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects framed images larger than five megabytes", async () => {
    // 4 base64 characters carry 3 bytes.
    pickFramed.mockResolvedValue(image("A".repeat(Math.ceil(((5 * 1024 * 1024 + 3) * 4) / 3))));

    await expect(wineImageSelectionService.selectFromLibrary("WINE", adjust)).resolves.toEqual({
      status: "file_too_large",
    });
  });

  it("frames the image in the given frame and maps it to a JPEG data URL", async () => {
    pickFramed.mockResolvedValue(image("encoded"));

    await expect(wineImageSelectionService.selectFromLibrary("LOGO", adjust)).resolves.toEqual({
      status: "selected",
      dataUrl: "data:image/jpeg;base64,encoded",
      fileName: "photo.jpg",
    });
    expect(pickFramed).toHaveBeenCalledWith("LOGO", adjust, { base64: true });
  });

  it("preserves cancellation and permission denial and reports unreadable selections", async () => {
    pickFramed.mockResolvedValueOnce({ status: "cancelled" });
    await expect(wineImageSelectionService.selectFromLibrary("WINE", adjust))
      .resolves.toEqual({ status: "cancelled" });
    pickFramed.mockResolvedValueOnce({ status: "permission_denied" });
    await expect(wineImageSelectionService.selectFromLibrary("WINE", adjust))
      .resolves.toEqual({ status: "permission_denied" });

    pickFramed.mockResolvedValueOnce(image(null));
    await expect(wineImageSelectionService.selectFromLibrary("WINE", adjust))
      .resolves.toEqual({ status: "read_error" });
  });
});
