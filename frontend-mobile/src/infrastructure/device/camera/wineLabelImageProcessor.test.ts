import { ImageManipulator } from "expo-image-manipulator";
import { prepareWineLabelImage } from "./wineLabelImageProcessor";

const crop = jest.fn();
const resize = jest.fn();
const saveAsync = jest.fn();
const renderAsync = jest.fn();
const manipulate = ImageManipulator.manipulate as jest.Mock;

jest.mock("expo-image-manipulator", () => {
  const context = {
    crop: jest.fn(),
    resize: jest.fn(),
    renderAsync: jest.fn(),
  };
  context.crop.mockReturnValue(context);
  context.resize.mockReturnValue(context);
  return {
    ImageManipulator: {
      manipulate: jest.fn().mockReturnValue(context),
    },
    SaveFormat: { JPEG: "jpeg" },
  };
});

describe("prepareWineLabelImage", () => {
  beforeEach(() => {
    const context = manipulate.mock.results[0]?.value ?? {
      crop,
      resize,
      renderAsync,
    };
    manipulate.mockReset();
    crop.mockReset();
    resize.mockReset();
    saveAsync.mockReset();
    renderAsync.mockReset();
    context.crop = crop.mockReturnValue(context);
    context.resize = resize.mockReturnValue(context);
    context.renderAsync = renderAsync.mockResolvedValue({ saveAsync });
    manipulate.mockReturnValue(context);
    saveAsync.mockResolvedValue({
      uri: "file:///prepared-label.jpg",
      width: 1600,
      height: 1527,
    });
  });

  it("crops, resizes and saves a normalized JPEG", async () => {
    const result = await prepareWineLabelImage(
      { uri: "file:///camera.jpg", width: 3000, height: 4000 },
      { originX: 0.06, originY: 0.14, width: 0.88, height: 0.63 },
      { width: 750, height: 1000 },
    );

    expect(manipulate).toHaveBeenCalledWith("file:///camera.jpg");
    expect(crop).toHaveBeenCalledWith({
      originX: 180,
      originY: 560,
      width: 2640,
      height: 2520,
    });
    expect(resize).toHaveBeenCalledWith({ width: 1600 });
    expect(saveAsync).toHaveBeenCalledWith({
      base64: false,
      compress: 0.9,
      format: "jpeg",
    });
    expect(result.uri).toBe("file:///prepared-label.jpg");
  });
});
