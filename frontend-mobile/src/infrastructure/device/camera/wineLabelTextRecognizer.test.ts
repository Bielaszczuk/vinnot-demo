import type { Text } from "@infinitered/react-native-mlkit-text-recognition";
import { deleteAsync } from "expo-file-system/legacy";
import { ownWineLabelImage, releaseWineLabelImage } from "./wineLabelTemporaryImages";
import {
  normalizeRecognizedWineLabelText,
  recognizeWineLabelText,
} from "./wineLabelTextRecognizer";

const mockRecognizeText = jest.fn();

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@infinitered/react-native-mlkit-text-recognition", () => ({
  recognizeText: mockRecognizeText,
}));

describe("normalizeRecognizedWineLabelText", () => {
  it("omits overflowing lines without splitting them and preserves later evidence that fits", () => {
    const lines = Array.from({ length: 17 }, (_, index) => `${index}`.padEnd(120, "a"));
    const result = normalizeRecognizedWineLabelText({
      text: [...lines, "Tapiz"].join("\n"),
      blocks: [],
    });
    expect(result).toEqual([...lines.slice(0, 16), "Tapiz"]);
    expect(result.reduce((total, line) => total + line.length, 0)).toBe(1_925);
  });

  it("accepts the total HTTP character boundary while retaining the line count limit", () => {
    const lines = Array.from({ length: 16 }, (_, index) => `${index}`.padEnd(120, "a"));
    const boundary = "b".repeat(80);
    expect(
      normalizeRecognizedWineLabelText({
        text: [...lines, boundary, "extra"].join("\n"),
        blocks: [],
      }),
    ).toEqual([...lines, boundary]);
    expect(
      normalizeRecognizedWineLabelText({
        text: Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n"),
        blocks: [],
      }),
    ).toHaveLength(24);
  });

  it("keeps the capture until native OCR settles even after timeout and cancellation", async () => {
    jest.useFakeTimers();
    try {
      let resolveNative!: (value: Text) => void;
      mockRecognizeText.mockImplementationOnce(
        () =>
          new Promise<Text>((resolve) => {
            resolveNative = resolve;
          }),
      );
      const uri = "file:///cache/native-ocr-pending.jpg";
      ownWineLabelImage(uri);
      const recognition = recognizeWineLabelText(uri, 100);
      await jest.advanceTimersByTimeAsync(100);
      await expect(recognition).resolves.toEqual([]);
      await expect(recognizeWineLabelText("file:///cache/next.jpg", 100)).resolves.toEqual([]);
      expect(mockRecognizeText).toHaveBeenCalledTimes(1);
      releaseWineLabelImage(uri);
      expect(deleteAsync).not.toHaveBeenCalled();
      resolveNative({ text: "Too late", blocks: [] });
      await jest.advanceTimersByTimeAsync(0);
      expect(deleteAsync).toHaveBeenCalledWith(uri, { idempotent: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it("returns the native OCR result after loading the optional adapter", async () => {
    mockRecognizeText.mockResolvedValueOnce({ text: "TAPIZ\nMALBEC", blocks: [] });
    await expect(recognizeWineLabelText("file:///label.jpg")).resolves.toEqual(["TAPIZ", "MALBEC"]);
  });

  it("preserves distinct OCR lines and removes blank duplicates", () => {
    const result = {
      text: "unused fallback",
      blocks: [
        {
          text: "FORASTERO\nMALBEC",
          frame: { left: 0, top: 0, right: 1, bottom: 1 },
          recognizedLanguages: ["es"],
          lines: [
            {
              text: "  FORASTERO  ",
              frame: { left: 0, top: 0, right: 1, bottom: 1 },
              recognizedLanguages: ["es"],
              elements: [],
            },
            {
              text: "Malbec",
              frame: { left: 0, top: 0, right: 1, bottom: 1 },
              recognizedLanguages: ["es"],
              elements: [],
            },
            {
              text: "forastero",
              frame: { left: 0, top: 0, right: 1, bottom: 1 },
              recognizedLanguages: ["es"],
              elements: [],
            },
          ],
        },
      ],
    } satisfies Text;

    expect(normalizeRecognizedWineLabelText(result)).toEqual(["FORASTERO", "Malbec"]);
  });

  it("uses the full OCR text when the provider returns no line blocks", () => {
    const result = {
      text: "Norton\nCosecha   Tardía\n2024",
      blocks: [],
    } satisfies Text;

    expect(normalizeRecognizedWineLabelText(result)).toEqual(["Norton", "Cosecha Tardía", "2024"]);
  });

  it("returns no evidence when native recognition is unavailable", async () => {
    mockRecognizeText.mockRejectedValueOnce(new Error("Native module unavailable"));

    await expect(recognizeWineLabelText("file:///label.jpg")).resolves.toEqual([]);
  });

  it("continues without OCR evidence when native recognition does not settle", async () => {
    jest.useFakeTimers();
    try {
      let complete!: (value: Text) => void;
      mockRecognizeText.mockImplementationOnce(
        () =>
          new Promise<Text>((resolve) => {
            complete = resolve;
          }),
      );

      const recognition = recognizeWineLabelText("file:///label.jpg", 100);
      await jest.advanceTimersByTimeAsync(100);

      await expect(recognition).resolves.toEqual([]);
      complete({ text: "late", blocks: [] });
      await jest.advanceTimersByTimeAsync(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
