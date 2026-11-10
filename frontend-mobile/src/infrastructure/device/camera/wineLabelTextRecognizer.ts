import type { Text } from "@infinitered/react-native-mlkit-text-recognition";
import { retainWineLabelImage } from "./wineLabelTemporaryImages";

const MAX_OBSERVED_LINES = 24;
const MAX_LINE_LENGTH = 120;
const MAX_TOTAL_CHARACTERS = 2_000;
const DEFAULT_RECOGNITION_TIMEOUT_MS = 1_000;
let nativeRecognitionInFlight = false;

export function normalizeRecognizedWineLabelText(result: Text): string[] {
  const blockLines = result.blocks.flatMap((block) => block.lines.map((line) => line.text));
  const rawLines = blockLines.length > 0 ? blockLines : result.text.split(/\r?\n/u);
  const seen = new Set<string>();
  let totalCharacters = 0;

  return rawLines
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter((line) => {
      if (!line) {
        return false;
      }
      const normalized = line.toLocaleLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .map((line) => line.slice(0, MAX_LINE_LENGTH))
    .slice(0, MAX_OBSERVED_LINES)
    .filter((line) => {
      // Preserve complete bounded lines; optional OCR must fit the HTTP contract.
      if (totalCharacters + line.length > MAX_TOTAL_CHARACTERS) return false;
      totalCharacters += line.length;
      return true;
    });
}

/**
 * Native OCR is an optional acceleration layer. Recognition failures must not
 * prevent the server-side visual recognizer from analyzing the captured label.
 */
export async function recognizeWineLabelText(
  imageUri: string,
  timeoutMs = DEFAULT_RECOGNITION_TIMEOUT_MS,
): Promise<string[]> {
  // ML Kit has no cancellation API. A timed-out native call must not build up
  // more native jobs and retained files as the user captures other labels.
  if (nativeRecognitionInFlight) return [];
  nativeRecognitionInFlight = true;
  const release = retainWineLabelImage(imageUri);
  try {
    const result = await withTimeout(
      import("@infinitered/react-native-mlkit-text-recognition")
        .then(({ recognizeText }) => recognizeText(imageUri))
        .finally(() => {
          nativeRecognitionInFlight = false;
          release();
        }),
      timeoutMs,
    );
    return normalizeRecognizedWineLabelText(result);
  } catch {
    return [];
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Wine label text recognition timed out")),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}
