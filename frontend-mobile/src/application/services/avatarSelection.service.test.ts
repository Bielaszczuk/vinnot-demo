import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { photoCropService } from "./photoCrop.service";
import { avatarSelectionService } from "./avatarSelection.service";

jest.mock("./photoCrop.service", () => ({
  photoCropService: { pickFramed: jest.fn() },
}));

const pickFramed = photoCropService.pickFramed as jest.MockedFunction<typeof photoCropService.pickFramed>;
const adjust = jest.fn<() => Promise<null>>();

describe("avatarSelectionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("preserves cancellation and permission denial without producing an upload", async () => {
    pickFramed.mockResolvedValueOnce({ status: "cancelled" }).mockResolvedValueOnce({ status: "permission_denied" });

    await expect(avatarSelectionService.select("library", adjust)).resolves.toEqual({ status: "cancelled" });
    await expect(avatarSelectionService.select("library", adjust)).resolves.toEqual({ status: "permission_denied" });
  });

  it("frames the photo from the chosen source and maps it to the upload contract", async () => {
    pickFramed.mockResolvedValue({
      status: "selected",
      image: { uri: "file:///avatar.jpg", width: 1200, height: 1200, fileName: "avatar.jpg", mimeType: "image/jpeg", base64: null },
    });

    await expect(avatarSelectionService.select("camera", adjust)).resolves.toEqual({
      status: "selected",
      upload: {
        uri: "file:///avatar.jpg",
        fileName: "avatar.jpg",
        mimeType: "image/jpeg",
      },
    });
    expect(pickFramed).toHaveBeenCalledWith("AVATAR", adjust, { source: "camera", fileName: "avatar.jpg" });
  });
});
