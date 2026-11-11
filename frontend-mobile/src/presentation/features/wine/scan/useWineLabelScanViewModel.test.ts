import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useWineLabelScanViewModel } from "./useWineLabelScanViewModel";
import type { WineSummary } from "@/domain/wine/wine.types";

const mockMutateAsync =
  jest.fn<(input: { imageUri: string; observedText: string[]; barcode?: string }) => Promise<void>>();
const mockSendFeedback = jest.fn();
const mockReset = jest.fn();
const mockCancel = jest.fn();
const mockAttachImage = jest.fn();
const mockShowError = jest.fn();
const mockRefetch = jest.fn();
const mockReleaseImage = jest.fn();
const mockReleaseLease = jest.fn();
const mockRetainImage = jest.fn(() => mockReleaseLease);
const mockUseWines = jest.fn();
let mockScanData:
  | {
      outcome: string;
      wine?: { id: string } | null;
      scanId?: string | null;
      extractedData?: { vintage: number | null } | null;
    }
  | undefined;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError }),
}));

jest.mock("@/presentation/providers/WineLabelCameraProvider", () => ({
  useWineLabelCamera: () => ({
    permission: { granted: true, canAskAgain: true },
    requestPermission: jest.fn(),
    releaseImage: mockReleaseImage,
    retainImage: mockRetainImage,
  }),
}));

jest.mock("@/presentation/hooks/queries/wine/useWines", () => ({
  useScanWineLabel: () => ({
    mutateAsync: mockMutateAsync,
    reset: mockReset,
    cancel: mockCancel,
    data: mockScanData,
    isPending: false,
  }),
  useAttachWineLabelImage: () => ({
    mutate: mockAttachImage,
    isPending: false,
  }),
  useSendScanFeedback: () => ({ mutate: mockSendFeedback }),
  useWines: (...args: unknown[]) => {
    mockUseWines(...args);
    return {
      data: { items: [{ id: "stale-wine" }] },
      currentData: { items: [] },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
  },
}));

describe("useWineLabelScanViewModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanData = undefined;
  });

  it.each([
    ["POSSIBLE_MATCHES", "chosen", false],
    ["EXACT_MATCH", "other", false],
    ["EXACT_MATCH", "chosen", true],
  ])("only publishes the verified exact image: %s / %s", async (outcome, wineId, publish) => {
    mockMutateAsync.mockResolvedValue(undefined);
    mockScanData = { outcome, wine: { id: wineId } };
    const { result } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture: async () => "file:///label.jpg",
      recognizeText: async () => ["TAPIZ", "BLACK TEARS"],
    };
    await act(async () => result.current.capture());
    const selected = {
      id: "chosen",
      imageUrl: null,
      bottleImageUrl: null,
    } as unknown as WineSummary;
    act(() => result.current.attachCapturedImageIfMissing(selected));
    expect(mockAttachImage).toHaveBeenCalledTimes(publish ? 1 : 0);
    if (publish) {
      const [input, callbacks] = mockAttachImage.mock.calls[0] as [
        { wineId: string; imageUri: string },
        { onSuccess: () => void; onError: () => void },
      ];
      expect(input).toMatchObject({ wineId: "chosen", imageUri: "file:///label.jpg" });
      expect(callbacks.onSuccess).toBe(mockReleaseLease);
      expect(callbacks.onError).toBe(mockReleaseLease);
      act(() =>
        result.current.attachCapturedImageIfMissing({
          ...selected,
          imageUrl: "https://catalog/image.jpg",
        }),
      );
      expect(mockAttachImage).toHaveBeenCalledTimes(1);
    }
  });

  it("does not turn a late network rejection into an error after cancellation", async () => {
    let rejectScan!: (reason: unknown) => void;
    mockMutateAsync.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectScan = reject;
        }),
    );
    const { result } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture: async () => "file:///pending.jpg",
      recognizeText: async () => [],
    };
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.capture();
    });
    act(() => result.current.cancelAnalysis());
    await act(async () => {
      rejectScan({ code: "ERR_NETWORK" });
      await pending;
    });
    expect(result.current.mode).toBe("camera");
    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockReleaseLease).toHaveBeenCalledTimes(1);
  });

  it("discards a capture that completes after cancellation without starting OCR or upload", async () => {
    let completeCapture!: (uri: string) => void;
    const recognizeText = jest.fn<() => Promise<string[]>>().mockResolvedValue([]);
    const { result } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture: () =>
        new Promise<string>((resolve) => {
          completeCapture = resolve;
        }),
      recognizeText,
    };
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.capture();
    });
    act(() => result.current.cancelAnalysis());
    await act(async () => {
      completeCapture("file:///late.jpg");
      await pending;
    });
    expect(recognizeText).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockReleaseImage).toHaveBeenCalledWith("file:///late.jpg");
    expect(result.current.mode).toBe("camera");
  });

  it("invalidates pending OCR on unmount and suppresses duplicate captures", async () => {
    let finish!: (lines: string[]) => void;
    const capture = jest.fn<() => Promise<string>>().mockResolvedValue("file:///label.jpg");
    const { result, unmount } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture,
      recognizeText: () =>
        new Promise<string[]>((resolve) => {
          finish = resolve;
        }),
    };
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.capture();
    });
    await act(async () => result.current.capture());
    expect(capture).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => {
      finish(["TAPIZ"]);
      await pending;
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockReleaseImage).toHaveBeenCalledWith("file:///label.jpg");
  });

  it("only enables a debounced manual query and never exposes previous-text results", async () => {
    jest.useFakeTimers();
    try {
      const { result, unmount } = renderHook(() => useWineLabelScanViewModel());
      expect(mockUseWines).toHaveBeenLastCalledWith({ search: "" }, 0, 10, false);
      act(() => {
        result.current.setMode("manual-search");
        result.current.setManualQuery(" B ");
      });
      await act(async () => jest.advanceTimersByTimeAsync(300));
      expect(mockUseWines).toHaveBeenLastCalledWith({ search: "B" }, 0, 10, false);
      act(() => result.current.setManualQuery("Black"));
      expect(result.current.manualResults).toEqual([]);
      await act(async () => jest.advanceTimersByTimeAsync(299));
      expect(mockUseWines).toHaveBeenLastCalledWith({ search: "B" }, 0, 10, false);
      await act(async () => jest.advanceTimersByTimeAsync(1));
      expect(mockUseWines).toHaveBeenLastCalledWith({ search: "Black" }, 0, 10, true);
      expect(result.current.manualResults).toEqual([]);
      act(() => result.current.setManualQuery("Mariflor"));
      expect(result.current.manualResults).toEqual([]);
      act(() => result.current.retryManualSearch());
      expect(mockRefetch).not.toHaveBeenCalled();
      act(() => result.current.setMode("camera"));
      await act(async () => jest.advanceTimersByTimeAsync(300));
      expect(mockUseWines).toHaveBeenLastCalledWith({ search: "Mariflor" }, 0, 10, false);
      unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it("freezes the captured image while recognition is pending", async () => {
    let completeOcr: ((lines: string[]) => void) | undefined;
    mockMutateAsync.mockResolvedValue(undefined);
    const recognizeText = jest.fn(
      () =>
        new Promise<string[]>((resolve) => {
          completeOcr = resolve;
        }),
    );
    const { result } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture: async () => "file:///captured-label.jpg",
      recognizeText,
    };

    let capturePromise: Promise<void>;
    await act(async () => {
      capturePromise = result.current.capture();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.mode).toBe("analysis");
    expect(result.current.capturedUri).toBe("file:///captured-label.jpg");
    expect(mockMutateAsync).not.toHaveBeenCalled();

    await act(async () => {
      completeOcr?.(["FORASTERO", "MALBEC"]);
      await capturePromise!;
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      imageUri: "file:///captured-label.jpg",
      observedText: ["FORASTERO", "MALBEC"],
    });
    expect(result.current.mode).toBe("result");
  });

  it("ignores a late result after the user cancels analysis", async () => {
    let completeScan: (() => void) | undefined;
    mockMutateAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completeScan = resolve;
        }),
    );
    const { result } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture: async () => "file:///captured-label.jpg",
      recognizeText: async () => ["MALBEC"],
    };

    let capturePromise: Promise<void>;
    await act(async () => {
      capturePromise = result.current.capture();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => result.current.cancelAnalysis());
    await act(async () => {
      completeScan?.();
      await capturePromise!;
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.mode).toBe("camera");
    expect(result.current.capturedUri).toBeNull();
  });

  it.each([
    [{ code: "LABEL_CATALOG_UNAVAILABLE" }, "scan.catalogError"],
    [{ code: "LABEL_SCAN_TIMEOUT" }, "scan.timeoutError"],
    [{ code: "ERR_NETWORK", message: "Network Error" }, "scan.offlineError"],
    [{ code: "ECONNABORTED", message: "timeout" }, "scan.timeoutError"],
    [{ status: 401, message: "Unauthorized" }, "scan.sessionExpired"],
    [
      {
        status: 503,
        code: "LABEL_RECOGNITION_UNAVAILABLE",
        message: "Provider unavailable",
      },
      "scan.providerError",
    ],
    [{ status: 500, code: "INTERNAL_ERROR", message: "Failure" }, "scan.scanError"],
    [{ code: "LABEL_IMAGE_TOO_DARK", message: "dark" }, "scan.imageTooDark"],
    [{ code: "LABEL_IMAGE_TOO_BRIGHT", message: "bright" }, "scan.imageTooBright"],
    [{ code: "LABEL_IMAGE_OUT_OF_FOCUS", message: "blurred" }, "scan.imageOutOfFocus"],
    [{ code: "LABEL_IMAGE_RESOLUTION_TOO_LOW", message: "small" }, "scan.imageResolutionTooLow"],
    [{ status: 429, code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" }, "scan.rateLimitError"],
    [{ status: 422, code: "INVALID_LABEL_IMAGE", message: "Wine-label image could not be read" }, "scan.invalidImageError"],
    [{ status: 422, code: "INVALID_LABEL_TEXT", message: "Wine-label OCR text is too long" }, "scan.invalidTextError"],
    [{ status: 503, code: "IMAGE_PROCESSING_BUSY", message: "Image processing is busy" }, "scan.busyError"],
  ])("maps scan failure %p to %s", async (failure, translationKey) => {
    mockMutateAsync.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture: async () => "file:///captured-label.jpg",
      recognizeText: async () => ["MALBEC"],
    };

    await act(async () => result.current.capture());

    expect(mockShowError).toHaveBeenCalledWith(translationKey);
    expect(result.current.mode).toBe("error");
    expect(result.current.capturedUri).toBe("file:///captured-label.jpg");
    expect(result.current.scanErrorKey).toBe(translationKey);
  });

  it("retries analysis with the preserved capture instead of opening the camera", async () => {
    mockMutateAsync
      .mockRejectedValueOnce({
        status: 503,
        code: "LABEL_RECOGNITION_UNAVAILABLE",
        message: "Provider unavailable",
      })
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture: async () => "file:///captured-label.jpg",
      recognizeText: async () => ["BLACK TEARS", "TAPIZ"],
    };

    await act(async () => result.current.capture());
    await act(async () => result.current.retryAnalysis());

    expect(mockMutateAsync).toHaveBeenLastCalledWith({
      imageUri: "file:///captured-label.jpg",
      observedText: ["BLACK TEARS", "TAPIZ"],
    });
    expect(result.current.mode).toBe("result");
    expect(result.current.scanErrorKey).toBeNull();
  });

  it.each([
    ["NO_MATCH", "submission"],
    ["POSSIBLE_MATCHES", "submission"],
    ["EXACT_MATCH", "result"],
  ])("when adding a wine, a %s scan opens %s", async (outcome, expectedMode) => {
    mockMutateAsync.mockResolvedValue({ outcome } as never);
    const { result } = renderHook(() => useWineLabelScanViewModel({ addWineIntent: true }));
    result.current.cameraRef.current = {
      capture: async () => "file:///new-wine.jpg",
      recognizeText: async () => ["NEW WINE"],
    };

    await act(async () => result.current.capture());

    expect(result.current.mode).toBe(expectedMode);
    expect(result.current.capturedUri).toBe("file:///new-wine.jpg");
  });

  it("keeps showing scan results when the scanner is not adding a wine", async () => {
    mockMutateAsync.mockResolvedValue({ outcome: "NO_MATCH" } as never);
    const { result } = renderHook(() => useWineLabelScanViewModel());
    result.current.cameraRef.current = {
      capture: async () => "file:///label.jpg",
      recognizeText: async () => ["LABEL"],
    };

    await act(async () => result.current.capture());

    expect(result.current.mode).toBe("result");
  });

  describe("scan feedback", () => {
    const chosen = (id: string) => ({ id }) as unknown as WineSummary;

    it("confirms the exact wine once per scan, ignoring later verdicts", () => {
      mockScanData = { outcome: "EXACT_MATCH", wine: { id: "exact" }, scanId: "scan-1" };
      const { result } = renderHook(() => useWineLabelScanViewModel());

      act(() => result.current.reportWineChosen(chosen("exact")));
      act(() => result.current.reportWineChosen(chosen("other")));
      act(() => result.current.reportNotInCatalog());

      expect(mockSendFeedback).toHaveBeenCalledTimes(1);
      expect(mockSendFeedback).toHaveBeenCalledWith({
        scanId: "scan-1",
        verdict: "CONFIRMED",
        wineId: "exact",
      });
    });

    it("corrects the scan when the member picks another suggestion or search result", () => {
      mockScanData = { outcome: "EXACT_MATCH", wine: { id: "exact" }, scanId: "scan-2" };
      const { result } = renderHook(() => useWineLabelScanViewModel());

      act(() => result.current.reportWineChosen(chosen("picked")));

      expect(mockSendFeedback).toHaveBeenCalledWith({
        scanId: "scan-2",
        verdict: "CORRECTED",
        wineId: "picked",
      });
    });

    it("reports a wine the catalog lacks without a wine", () => {
      mockScanData = { outcome: "NO_MATCH", wine: null, scanId: "scan-3" };
      const { result } = renderHook(() => useWineLabelScanViewModel());

      act(() => result.current.reportNotInCatalog());

      expect(mockSendFeedback).toHaveBeenCalledWith({
        scanId: "scan-3",
        verdict: "NOT_IN_CATALOG",
        wineId: null,
      });
    });

    it("sends nothing for a scan that was not recorded", () => {
      mockScanData = { outcome: "EXACT_MATCH", wine: { id: "exact" }, scanId: null };
      const { result } = renderHook(() => useWineLabelScanViewModel());

      act(() => result.current.reportWineChosen(chosen("exact")));
      act(() => result.current.reportNotInCatalog());

      expect(mockSendFeedback).not.toHaveBeenCalled();
    });

    it("fires and forgets: no callbacks, no error shown", () => {
      mockScanData = { outcome: "POSSIBLE_MATCHES", wine: null, scanId: "scan-4" };
      const { result } = renderHook(() => useWineLabelScanViewModel());

      act(() => result.current.reportWineChosen(chosen("picked")));

      expect(mockSendFeedback.mock.calls[0]).toHaveLength(1);
      expect(mockShowError).not.toHaveBeenCalled();
    });
  });

  it("exposes only a plausible vintage read on the label", () => {
    mockScanData = { outcome: "EXACT_MATCH", scanId: "scan-5", extractedData: { vintage: 2017 } };
    const { result, rerender } = renderHook(() => useWineLabelScanViewModel());
    expect(result.current.scannedVintage).toBe(2017);

    mockScanData = { outcome: "EXACT_MATCH", scanId: "scan-5", extractedData: { vintage: 3017 } };
    rerender({});
    expect(result.current.scannedVintage).toBeNull();
  });

  describe("barcode", () => {
    it("keeps the last valid code seen and sends it with the scan", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      const { result } = renderHook(() => useWineLabelScanViewModel());
      expect(result.current.barcodeDetected).toBe(false);

      act(() => result.current.handleBarcodeDetected("not-a-code"));
      expect(result.current.barcodeDetected).toBe(false);
      act(() => result.current.handleBarcodeDetected("7791234567898"));
      act(() => result.current.handleBarcodeDetected("12345"));
      act(() => result.current.handleBarcodeDetected("036000291452"));
      expect(result.current.barcodeDetected).toBe(true);

      result.current.cameraRef.current = {
        capture: async () => "file:///label.jpg",
        recognizeText: async () => ["CATENA"],
      };
      await act(async () => result.current.capture());

      expect(mockMutateAsync).toHaveBeenCalledWith({
        imageUri: "file:///label.jpg",
        observedText: ["CATENA"],
        barcode: "036000291452",
      });
    });

    it("forgets the code when the member scans another label", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      const { result } = renderHook(() => useWineLabelScanViewModel());
      act(() => result.current.handleBarcodeDetected("7791234567898"));
      act(() => result.current.reset());
      expect(result.current.barcodeDetected).toBe(false);

      result.current.cameraRef.current = {
        capture: async () => "file:///label.jpg",
        recognizeText: async () => ["CATENA"],
      };
      await act(async () => result.current.capture());

      expect(mockMutateAsync).toHaveBeenCalledWith({
        imageUri: "file:///label.jpg",
        observedText: ["CATENA"],
      });
    });
  });

  describe("back label", () => {
    it("merges the back reading and re-sends the front photo", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      mockScanData = { outcome: "POSSIBLE_MATCHES", wine: null, scanId: "scan-6" };
      const { result } = renderHook(() => useWineLabelScanViewModel());
      const capture = jest
        .fn<() => Promise<string | null>>()
        .mockResolvedValueOnce("file:///front.jpg")
        .mockResolvedValueOnce("file:///back.jpg");
      const recognizeText = jest
        .fn<(uri: string) => Promise<string[]>>()
        .mockResolvedValueOnce(["CATENA", "MALBEC"])
        .mockResolvedValueOnce(["Malbec", "Bodega Catena Zapata"]);
      result.current.cameraRef.current = { capture, recognizeText };

      await act(async () => result.current.capture());
      expect(result.current.canScanBackLabel).toBe(true);
      act(() => result.current.startBackLabelScan());
      expect(result.current.mode).toBe("camera");
      expect(result.current.isBackLabelScan).toBe(true);
      act(() => result.current.handleBarcodeDetected("7791234567898"));
      await act(async () => result.current.capture());

      expect(recognizeText).toHaveBeenLastCalledWith("file:///back.jpg");
      expect(mockMutateAsync).toHaveBeenLastCalledWith({
        imageUri: "file:///front.jpg",
        observedText: ["CATENA", "MALBEC", "Bodega Catena Zapata"],
        barcode: "7791234567898",
      });
      expect(mockReleaseImage).toHaveBeenCalledWith("file:///back.jpg");
      expect(mockReleaseImage).not.toHaveBeenCalledWith("file:///front.jpg");
      expect(result.current.capturedUri).toBe("file:///front.jpg");
      expect(result.current.mode).toBe("result");
      expect(result.current.isBackLabelScan).toBe(false);
      expect(result.current.canScanBackLabel).toBe(false);
    });

    it("returns to the previous result when the member cancels the back label", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      mockScanData = { outcome: "NO_MATCH", wine: null, scanId: "scan-7" };
      const { result } = renderHook(() => useWineLabelScanViewModel());
      result.current.cameraRef.current = {
        capture: async () => "file:///front.jpg",
        recognizeText: async () => ["CATENA"],
      };
      await act(async () => result.current.capture());

      act(() => result.current.startBackLabelScan());
      act(() => result.current.cancelBackLabelScan());

      expect(result.current.mode).toBe("result");
      expect(result.current.isBackLabelScan).toBe(false);
      expect(result.current.capturedUri).toBe("file:///front.jpg");
      expect(mockReset).not.toHaveBeenCalled();
    });

    it("keeps the previous result when the back photo cannot be used", async () => {
      mockMutateAsync.mockResolvedValue(undefined);
      mockScanData = { outcome: "NO_MATCH", wine: null, scanId: "scan-8" };
      const { result } = renderHook(() => useWineLabelScanViewModel());
      const capture = jest
        .fn<() => Promise<string | null>>()
        .mockResolvedValueOnce("file:///front.jpg")
        .mockRejectedValueOnce({ code: "LABEL_IMAGE_TOO_DARK" });
      result.current.cameraRef.current = { capture, recognizeText: async () => ["CATENA"] };
      await act(async () => result.current.capture());

      act(() => result.current.startBackLabelScan());
      await act(async () => result.current.capture());

      expect(mockShowError).toHaveBeenCalledWith("scan.imageTooDark");
      expect(mockReset).not.toHaveBeenCalled();
      expect(result.current.mode).toBe("camera");
      expect(result.current.isBackLabelScan).toBe(true);
      expect(result.current.capturedUri).toBe("file:///front.jpg");
    });
  });
});
