import { useCallback, useEffect, useRef, useState } from "react";
import {
  useWineLabelCamera,
  type WineLabelCameraHandle,
} from "@/presentation/providers/WineLabelCameraProvider";
import {
  useAttachWineLabelImage,
  useScanWineLabel,
  useWines,
} from "@/presentation/hooks/queries/wine/useWines";
import type { WineSummary } from "@/domain/wine/wine.types";
import { useToast } from "@/presentation/providers/ToastProvider";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/presentation/hooks/ui";

export type WineScanMode =
  | "camera"
  | "analysis"
  | "error"
  | "result"
  | "manual-search"
  | "submission";

export interface WineLabelScanOptions {
  /**
   * The person opened the scanner to add a wine the catalog did not have:
   * any scan without an exact match goes straight to the submission form.
   */
  addWineIntent?: boolean;
}

export function useWineLabelScanViewModel({ addWineIntent = false }: WineLabelScanOptions = {}) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const cameraRef = useRef<WineLabelCameraHandle | null>(null);
  const { permission, requestPermission, releaseImage, retainImage } = useWineLabelCamera();
  const capturedImageRef = useRef<string | null>(null);
  const [mode, setMode] = useState<WineScanMode>("camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [observedText, setObservedText] = useState<string[]>([]);
  const [scanErrorKey, setScanErrorKey] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const scanMutation = useScanWineLabel();
  const attachImageMutation = useAttachWineLabelImage();
  const resetScanMutation = scanMutation.reset;
  const requestGeneration = useRef(0);
  const captureInProgress = useRef(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const normalizedQuery = manualQuery.trim();
  const debouncedQuery = useDebounce(normalizedQuery, 300);
  const searchEnabled =
    mode === "manual-search" && normalizedQuery.length >= 2 && debouncedQuery === normalizedQuery;
  const scanCancel = scanMutation.cancel;
  const manualSearch = useWines({ search: debouncedQuery }, 0, 10, searchEnabled);

  useEffect(
    () => () => {
      requestGeneration.current += 1;
      scanCancel();
      if (capturedImageRef.current) releaseImage(capturedImageRef.current);
      capturedImageRef.current = null;
    },
    [scanCancel, releaseImage],
  );

  const capture = async () => {
    if (captureInProgress.current) return;
    captureInProgress.current = true;
    setIsCapturing(true);
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    let imageCaptured = false;
    try {
      const camera = cameraRef.current;
      const imageUri = await camera?.capture();
      if (generation !== requestGeneration.current) {
        if (imageUri) releaseImage(imageUri);
        return;
      }
      if (!camera || !imageUri) {
        throw new Error("Camera did not return a captured image");
      }
      if (capturedImageRef.current) releaseImage(capturedImageRef.current);
      capturedImageRef.current = imageUri;
      setCapturedUri(imageUri);
      imageCaptured = true;
      setScanErrorKey(null);
      setTorchEnabled(false);
      setMode("analysis");
      const detectedText = await camera.recognizeText(imageUri);
      if (generation !== requestGeneration.current) return;
      setObservedText(detectedText);
      await analyze(imageUri, detectedText, generation);
    } catch (error) {
      handleAnalysisFailure(error, generation, imageCaptured);
    } finally {
      captureInProgress.current = false;
      setIsCapturing(false);
    }
  };

  const analyze = async (imageUri: string, detectedText: string[], generation: number) => {
    const release = retainImage(imageUri);
    let outcome: string | undefined;
    try {
      const scan = await scanMutation.mutateAsync({ imageUri, observedText: detectedText });
      outcome = scan?.outcome;
    } finally {
      release();
    }
    if (generation !== requestGeneration.current) return;
    setScanErrorKey(null);
    setMode(addWineIntent && outcome !== "EXACT_MATCH" ? "submission" : "result");
  };

  const handleAnalysisFailure = (error: unknown, generation: number, hasCapturedImage: boolean) => {
    if (generation !== requestGeneration.current || isAborted(error)) return;
    const errorKey = resolveScanErrorKey(error);
    scanMutation.reset();
    setScanErrorKey(errorKey);
    setMode(hasCapturedImage ? "error" : "camera");
    showError(t(errorKey));
  };

  const retryAnalysis = async () => {
    if (!capturedUri || captureInProgress.current) return;
    captureInProgress.current = true;
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    scanMutation.reset();
    setScanErrorKey(null);
    setMode("analysis");
    try {
      await analyze(capturedUri, observedText, generation);
    } catch (error) {
      handleAnalysisFailure(error, generation, true);
    } finally {
      captureInProgress.current = false;
    }
  };

  const reset = useCallback(() => {
    requestGeneration.current += 1;
    scanCancel();
    resetScanMutation();
    if (capturedImageRef.current) releaseImage(capturedImageRef.current);
    capturedImageRef.current = null;
    setCapturedUri(null);
    setObservedText([]);
    setScanErrorKey(null);
    setManualQuery("");
    setMode("camera");
  }, [resetScanMutation, scanCancel, releaseImage]);

  const attachCapturedImageIfMissing = useCallback(
    (selectedWine: WineSummary) => {
      if (
        !capturedUri ||
        scanMutation.data?.outcome !== "EXACT_MATCH" ||
        scanMutation.data.wine?.id !== selectedWine.id ||
        selectedWine.imageUrl ||
        selectedWine.bottleImageUrl ||
        attachImageMutation.isPending
      ) {
        return;
      }
      const release = retainImage(capturedUri);
      attachImageMutation.mutate(
        {
          wineId: selectedWine.id,
          imageUri: capturedUri,
          observedText,
        },
        { onSuccess: release, onError: release },
      );
    },
    [attachImageMutation, capturedUri, observedText, retainImage, scanMutation.data],
  );

  return {
    cameraRef,
    isCapturing,
    permission,
    requestPermission,
    mode,
    setMode,
    capturedUri,
    observedText,
    scanErrorKey,
    torchEnabled,
    toggleTorch: () => setTorchEnabled((current) => !current),
    manualQuery,
    setManualQuery,
    manualResults: searchEnabled ? (manualSearch.currentData?.items ?? []) : [],
    isManualSearchLoading:
      mode === "manual-search" &&
      normalizedQuery.length >= 2 &&
      (!searchEnabled || manualSearch.isFetching),
    isManualSearchError: searchEnabled && manualSearch.isError,
    retryManualSearch: () => {
      if (searchEnabled) void manualSearch.refetch();
    },
    scanMutation,
    attachCapturedImageIfMissing,
    capture,
    retryAnalysis,
    cancelAnalysis: reset,
    reset,
  };
}

function isAborted(error: unknown): boolean {
  return (
    readErrorCode(error) === "ERR_CANCELED" ||
    (error instanceof Error && error.name === "AbortError") ||
    (readErrorCode(error) === "FETCH_ERROR" && readErrorMessage(error).includes("AbortError"))
  );
}

function resolveScanErrorKey(error: unknown): string {
  const code = readErrorCode(error);
  const message = readErrorMessage(error).toLowerCase();
  const status = readErrorStatus(error);
  if (code === "LABEL_IMAGE_TOO_DARK") return "scan.imageTooDark";
  if (code === "LABEL_IMAGE_TOO_BRIGHT") return "scan.imageTooBright";
  if (code === "LABEL_IMAGE_OUT_OF_FOCUS") return "scan.imageOutOfFocus";
  if (code === "LABEL_IMAGE_RESOLUTION_TOO_LOW") return "scan.imageResolutionTooLow";
  if (code === "LABEL_CATALOG_UNAVAILABLE") return "scan.catalogError";
  if (code === "LABEL_SCAN_TIMEOUT") return "scan.timeoutError";
  if (code === "INVALID_LABEL_IMAGE") return "scan.invalidImageError";
  if (code === "INVALID_LABEL_TEXT") return "scan.invalidTextError";
  if (code === "IMAGE_PROCESSING_BUSY") return "scan.busyError";
  if (status === 429 || code === "RATE_LIMIT_EXCEEDED") return "scan.rateLimitError";
  if (status === 401) return "scan.sessionExpired";
  if (code === "ECONNABORTED" || message.includes("timeout")) return "scan.timeoutError";
  if (code === "ERR_NETWORK" || message.includes("network")) return "scan.offlineError";
  if (code === "LABEL_RECOGNITION_UNAVAILABLE" || code === "LABEL_RECOGNITION_NOT_CONFIGURED") {
    return "scan.providerError";
  }
  return "scan.scanError";
}

function readErrorCode(error: unknown): string | undefined {
  return readErrorProperty(error, "code");
}

function readErrorMessage(error: unknown): string {
  return readErrorProperty(error, "message") ?? "";
}

function readErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function readErrorProperty(error: unknown, property: "code" | "message"): string | undefined {
  if (typeof error !== "object" || error === null || !(property in error)) return undefined;
  const value = (error as Record<string, unknown>)[property];
  return typeof value === "string" ? value : undefined;
}
