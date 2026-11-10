import {
  ownWineLabelImage,
  releaseWineLabelImage,
  retainWineLabelImage,
} from "./wineLabelTemporaryImages";
import { deleteAsync } from "expo-file-system/legacy";

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("owned camera files", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps active upload/OCR leases after the screen releases the image", () => {
    const uri = "file:///cache/capture.jpg";
    ownWineLabelImage(uri);
    const releaseOcr = retainWineLabelImage(uri);
    const releaseUpload = retainWineLabelImage(uri);
    releaseWineLabelImage(uri);
    releaseOcr();
    releaseOcr();
    expect(deleteAsync).not.toHaveBeenCalled();
    releaseUpload();
    expect(deleteAsync).toHaveBeenCalledWith(uri, { idempotent: true });
    releaseWineLabelImage(uri);
    expect(deleteAsync).toHaveBeenCalledTimes(1);
  });

  it("never deletes unowned files or paths outside the camera cache", () => {
    for (const uri of [
      "file:///documents/photo.jpg",
      "file:///cache/../photo.jpg",
      "https://host/image.jpg",
    ]) {
      ownWineLabelImage(uri);
      retainWineLabelImage(uri)();
      releaseWineLabelImage(uri);
    }
    releaseWineLabelImage("file:///cache/unknown.jpg");
    expect(deleteAsync).not.toHaveBeenCalled();
  });

  it("does not turn a cleanup failure into a scan failure", async () => {
    jest.mocked(deleteAsync).mockRejectedValueOnce(new Error("unavailable"));
    ownWineLabelImage("file:///cache/failed.jpg");
    releaseWineLabelImage("file:///cache/failed.jpg");
    await Promise.resolve();
    expect(deleteAsync).toHaveBeenCalledTimes(1);
  });
});
