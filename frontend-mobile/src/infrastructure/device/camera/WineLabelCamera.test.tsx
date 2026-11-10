import { createRef } from "react";
import { act, render } from "@testing-library/react-native";
import { deleteAsync } from "expo-file-system/legacy";
import { WineLabelCamera, type WineLabelCameraHandle } from "./WineLabelCamera";
import { releaseWineLabelImage } from "./wineLabelTemporaryImages";

const mockTakePicture = jest.fn();
const mockPrepareImage = jest.fn();
const mockAnalyzeQuality = jest.fn();

jest.mock("expo-camera", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    CameraView: React.forwardRef(function CameraMock(_props, ref) {
      React.useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePicture }));
      return null;
    }),
    useCameraPermissions: jest.fn(),
  };
});
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("./wineLabelImageProcessor", () => ({
  prepareWineLabelImage: (...args: unknown[]) => mockPrepareImage(...args),
}));
jest.mock("./wineLabelImageQualityAnalyzer", () => ({
  analyzeWineLabelImageQuality: (...args: unknown[]) => mockAnalyzeQuality(...args),
}));
jest.mock("@/shared/image/wineLabelImageQuality", () => ({
  assertUsableWineLabelImage: jest.fn(),
}));

describe("WineLabelCamera resource ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTakePicture.mockResolvedValue({ uri: "file:///cache/raw.jpg", width: 2400, height: 3200 });
    mockPrepareImage.mockResolvedValue({
      uri: "file:///cache/prepared.jpg",
      width: 1200,
      height: 1600,
    });
    mockAnalyzeQuality.mockResolvedValue({});
  });

  function camera() {
    const ref = createRef<WineLabelCameraHandle>();
    render(
      <WineLabelCamera
        ref={ref}
        torchEnabled={false}
        captureRegion={{ originX: 0, originY: 0, width: 1, height: 1 }}
      />,
    );
    return ref;
  }

  it("releases the original but transfers ownership of the prepared capture", async () => {
    const ref = camera();
    let uri: string | null | undefined;
    await act(async () => {
      uri = await ref.current?.capture();
    });
    expect(uri).toBe("file:///cache/prepared.jpg");
    expect(deleteAsync).toHaveBeenCalledTimes(1);
    expect(deleteAsync).toHaveBeenCalledWith("file:///cache/raw.jpg", { idempotent: true });
    releaseWineLabelImage(uri!);
    expect(deleteAsync).toHaveBeenCalledWith(uri, { idempotent: true });
  });

  it("releases original and derivative when the quality operation fails", async () => {
    mockAnalyzeQuality.mockRejectedValueOnce(new Error("quality failed"));
    const ref = camera();
    await act(async () => {
      await expect(ref.current?.capture()).rejects.toThrow("quality failed");
    });
    expect(deleteAsync).toHaveBeenCalledWith("file:///cache/prepared.jpg", { idempotent: true });
    expect(deleteAsync).toHaveBeenCalledWith("file:///cache/raw.jpg", { idempotent: true });
  });

  it("releases the original if preparation fails before producing a derivative", async () => {
    mockPrepareImage.mockRejectedValueOnce(new Error("decode failed"));
    const ref = camera();
    await act(async () => {
      await expect(ref.current?.capture()).rejects.toThrow("decode failed");
    });
    expect(deleteAsync).toHaveBeenCalledTimes(1);
    expect(deleteAsync).toHaveBeenCalledWith("file:///cache/raw.jpg", { idempotent: true });
  });
});
