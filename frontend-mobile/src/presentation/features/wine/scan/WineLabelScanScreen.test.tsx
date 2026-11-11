import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type { WineScanMode } from "./useWineLabelScanViewModel";
import { WineLabelScanScreen } from "./WineLabelScanScreen";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockExit = jest.fn<(...args: unknown[]) => void>();
const mockCreateDetailRoute = jest.fn<(...args: unknown[]) => string>(() => "/wine/detail");

const sampleWine = {
  id: "wine-1",
  name: "Malbec Reserva",
  winery: { id: "winery-1", name: "Bodega Norte" },
  imageUrl: null,
  bottleImageUrl: null,
};

function createViewModel() {
  return {
    permission: { granted: true, canAskAgain: true },
    requestPermission: jest.fn(),
    cameraRef: { current: null },
    mode: "camera" as WineScanMode,
    setMode: jest.fn(),
    capturedUri: "file:///captured-label.jpg" as string | null,
    observedText: ["MALBEC"],
    scanErrorKey: null as string | null,
    torchEnabled: false,
    toggleTorch: jest.fn(),
    manualQuery: "",
    setManualQuery: jest.fn(),
    manualResults: [] as (typeof sampleWine)[],
    isManualSearchLoading: false,
    isManualSearchError: false,
    retryManualSearch: jest.fn(),
    scanMutation: {
      data: undefined as
        | undefined
        | {
            wine: typeof sampleWine | null;
            suggestions: (typeof sampleWine)[];
            candidates: Array<{ wine: typeof sampleWine; score: number }>;
            confidence: number;
            extractedData: null;
          },
      isPending: false,
    },
    attachCapturedImageIfMissing: jest.fn(),
    scannedVintage: null as number | null,
    reportWineChosen: jest.fn(),
    reportNotInCatalog: jest.fn(),
    barcodeDetected: false,
    handleBarcodeDetected: jest.fn(),
    isBackLabelScan: false,
    canScanBackLabel: false,
    startBackLabelScan: jest.fn(),
    cancelBackLabelScan: jest.fn(),
    isCapturing: false,
    capture: jest.fn(),
    retryAnalysis: jest.fn(),
    cancelAnalysis: jest.fn(),
    reset: jest.fn(),
  };
}

let mockViewModel = createViewModel();
let mockCameraProps: Record<string, unknown> = {};
let mockSubmissionResult: { status: string; wine: typeof sampleWine | null } = {
  status: "NEEDS_REVIEW",
  wine: null,
};
let mockParams: Record<string, string> = { returnTo: "/(app)/(tabs)" };

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/presentation/navigation/wineNavigation", () => ({
  ADD_WINE_INTENT: "add",
  resolveWineScanReturnRoute: () => "/(app)/(tabs)",
  exitWineScanner: (...args: unknown[]) => mockExit(...args),
  createScannedWineDetailRoute: (...args: unknown[]) => mockCreateDetailRoute(...args),
}));

jest.mock("@/presentation/providers/WineLabelCameraProvider", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    useWineLabelCamera: () => ({
      CameraViewport: mockReact.forwardRef((props: Record<string, unknown>) => {
        mockCameraProps = props;
        return mockReact.createElement("View", { testID: "camera" });
      }),
    }),
  };
});

jest.mock("./useWineLabelScanViewModel", () => ({
  useWineLabelScanViewModel: () => mockViewModel,
}));

jest.mock("@/presentation/components/ui/Button", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Button: ({
      children,
      onPress,
      disabled,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      disabled?: boolean;
    }) => mockReact.createElement("Text", { onPress: disabled ? undefined : onPress }, children),
  };
});

jest.mock("@/presentation/components/ui/Card", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Card: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement("View", null, children),
  };
});

jest.mock("@/presentation/components/ui/Feedback", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    Spinner: () => mockReact.createElement("Text", null, "spinner"),
    EmptyState: ({
      title,
      action,
    }: {
      title: string;
      action: { label: string; onPress: () => void };
    }) =>
      mockReact.createElement(
        "View",
        null,
        mockReact.createElement("Text", null, title),
        mockReact.createElement(
          "Text",
          { testID: "permission-action", onPress: action.onPress },
          action.label,
        ),
      ),
  };
});

jest.mock("@/presentation/components/ui/ImageWithFallback", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return { ImageWithFallback: () => mockReact.createElement("View", { testID: "captured-image" }) };
});

jest.mock("@/presentation/components/ui/TextField", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    SearchField: ({ onChangeText }: { onChangeText: (value: string) => void }) =>
      mockReact.createElement(
        "Text",
        { testID: "manual-search", onPress: () => onChangeText("malbec") },
        "search",
      ),
  };
});

jest.mock("@/presentation/features/wine/WineCard", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    WineCard: ({ wine, onPress, onReviewsPress }: {
      wine: { id: string; name: string }; onPress: () => void; onReviewsPress?: () => void;
    }) =>
      mockReact.createElement(mockReact.Fragment, null,
        mockReact.createElement("Text", { testID: `wine-${wine.id}`, onPress }, wine.name),
        onReviewsPress
          ? mockReact.createElement("Text", { testID: `wine-${wine.id}-reviews`, onPress: onReviewsPress }, "reviews")
          : null),
  };
});

jest.mock("./WineSubmissionForm", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    WineSubmissionForm: ({
      imageUri,
      onComplete,
    }: {
      imageUri: string;
      onComplete: (result: typeof mockSubmissionResult) => void;
    }) =>
      mockReact.createElement(
        "Text",
        {
          testID: "submission-form",
          onPress: () => onComplete(mockSubmissionResult),
        },
        imageUri,
      ),
  };
});

const exactResult = (extractedData: { vintage: number | null } | null = null) => ({
  wine: sampleWine,
  suggestions: [],
  candidates: [{ wine: sampleWine, score: 0.95 }],
  confidence: 0.95,
  extractedData: extractedData as null,
});

describe("WineLabelScanScreen interactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockViewModel = createViewModel();
    mockParams = { returnTo: "/(app)/(tabs)" };
    mockSubmissionResult = { status: "NEEDS_REVIEW", wine: null };
  });

  it("lets the person add a wine without a photo when the bottle is not at hand", () => {
    mockParams = { returnTo: "/(app)/(tabs)/wines", intent: "add" };
    const cameraScreen = render(<WineLabelScanScreen />);
    expect(cameraScreen.getByText("scan.addWithoutPhotoHint")).toBeTruthy();
    fireEvent.press(cameraScreen.getByText("scan.addWithoutPhoto"));
    expect(mockViewModel.setMode).toHaveBeenCalledWith("submission");

    cameraScreen.unmount();
    mockViewModel.mode = "submission";
    mockViewModel.capturedUri = null;
    const formScreen = render(<WineLabelScanScreen />);
    expect(formScreen.getByTestId("submission-form")).toBeTruthy();
  });

  it("keeps the regular label scanner photo-only", () => {
    const screen = render(<WineLabelScanScreen />);
    expect(screen.queryByText("scan.addWithoutPhoto")).toBeNull();
  });

  it("requests camera permission when it can ask again", () => {
    mockViewModel.permission = { granted: false, canAskAgain: true };
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByTestId("permission-action"));

    expect(mockViewModel.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("lets the user leave the scanner from the camera permission state", () => {
    mockViewModel.permission = { granted: false, canAskAgain: true };
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByText("common.back"));

    expect(mockExit).toHaveBeenCalledWith(expect.any(Object), "/(app)/(tabs)");
  });

  it("shows the frozen capture and cancels an analysis explicitly", () => {
    mockViewModel.mode = "analysis";
    const screen = render(<WineLabelScanScreen />);

    expect(screen.getByTestId("captured-image")).toBeTruthy();
    fireEvent.press(screen.getByText("scan.cancelAnalysis"));

    expect(mockViewModel.cancelAnalysis).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed capture visible and offers explicit recovery actions", () => {
    mockViewModel.mode = "error";
    mockViewModel.scanErrorKey = "scan.providerError";
    const screen = render(<WineLabelScanScreen />);

    expect(screen.getByTestId("captured-image")).toBeTruthy();
    expect(screen.getByText("scan.analysisFailedTitle")).toBeTruthy();
    expect(screen.getByText("scan.providerError")).toBeTruthy();
    expect(screen.getByTestId("scan-recovery-actions")).toHaveStyle({
      width: "100%",
      alignItems: "stretch",
    });
    expect(screen.getByText("scan.providerError")).toHaveStyle({ textAlign: "center" });

    fireEvent.press(screen.getByText("scan.tryAgain"));
    expect(mockViewModel.retryAnalysis).toHaveBeenCalledTimes(1);
    // The manual search field stays above the keyboard on both platforms.
    expect(screen.UNSAFE_getByType(KeyboardAwareScrollView).props.keyboardShouldPersistTaps).toBe("handled");
    fireEvent.press(screen.getByText("scan.searchManually"));
    expect(mockViewModel.setMode).toHaveBeenCalledWith("manual-search");
    fireEvent.press(screen.getByText("scan.scanAnother"));
    expect(mockViewModel.reset).toHaveBeenCalledTimes(1);
  });

  it("opens an exact match and offers its captured image before navigating", () => {
    mockViewModel.mode = "result";
    mockViewModel.scanMutation.data = {
      wine: sampleWine,
      suggestions: [],
      candidates: [{ wine: sampleWine, score: 0.95 }],
      confidence: 0.95,
      extractedData: null,
    };
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByText("scan.viewDetails"));

    expect(mockViewModel.attachCapturedImageIfMissing).toHaveBeenCalledWith(sampleWine);
    expect(mockPush).toHaveBeenCalledWith("/wine/detail");
  });

  it("lets the user select a suggestion or continue to manual search", () => {
    mockViewModel.mode = "result";
    mockViewModel.scanMutation.data = {
      wine: null,
      suggestions: [sampleWine],
      candidates: [{ wine: sampleWine, score: 0.82 }],
      confidence: 0.82,
      extractedData: null,
    };
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByText("scan.searchManually"));
    expect(mockViewModel.setMode).toHaveBeenCalledWith("manual-search");

    fireEvent.press(screen.getByTestId("wine-wine-1"));
    expect(mockViewModel.attachCapturedImageIfMissing).toHaveBeenCalledWith(sampleWine);
  });

  it("keeps the captured image through manual search and routes reviewed submissions", () => {
    mockViewModel.mode = "manual-search";
    const manualScreen = render(<WineLabelScanScreen />);
    fireEvent.press(manualScreen.getByTestId("manual-search"));
    expect(mockViewModel.setManualQuery).toHaveBeenCalledWith("malbec");
    fireEvent.press(manualScreen.getByText("scan.addWine"));
    expect(mockViewModel.setMode).toHaveBeenCalledWith("submission");

    manualScreen.unmount();
    mockViewModel.mode = "submission";
    const submissionScreen = render(<WineLabelScanScreen />);
    expect(submissionScreen.getByText("file:///captured-label.jpg")).toBeTruthy();
    fireEvent.press(submissionScreen.getByTestId("submission-form"));
    expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/wines/submissions");
  });

  it.each([
    ["an exact match", { wine: sampleWine, suggestions: [] }],
    ["a suggestion", { wine: null, suggestions: [sampleWine] }],
  ])("opens %s straight on its reviews from the review count", (_case, match) => {
    mockViewModel.mode = "result";
    mockViewModel.scanMutation.data = {
      ...match,
      candidates: [{ wine: sampleWine, score: 0.9 }],
      confidence: 0.9,
      extractedData: null,
    };
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByTestId("wine-wine-1-reviews"));

    expect(mockViewModel.attachCapturedImageIfMissing).toHaveBeenCalledWith(sampleWine);
    expect(mockCreateDetailRoute).toHaveBeenCalledWith("wine-1", "/(app)/(tabs)", { tab: "reviews" });
    expect(mockPush).toHaveBeenCalledWith("/wine/detail");
  });

  it("opens a manual search result straight on its reviews from the review count", () => {
    mockViewModel.mode = "manual-search";
    mockViewModel.manualResults = [sampleWine];
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByTestId("wine-wine-1-reviews"));
    expect(mockCreateDetailRoute).toHaveBeenLastCalledWith("wine-1", "/(app)/(tabs)", { tab: "reviews" });
    fireEvent.press(screen.getByTestId("wine-wine-1"));
    expect(mockCreateDetailRoute).toHaveBeenLastCalledWith("wine-1", "/(app)/(tabs)", undefined);
  });

  it("distinguishes a failed manual search from an empty catalog result", () => {
    mockViewModel.mode = "manual-search";
    mockViewModel.manualQuery = "Black Tears";
    mockViewModel.isManualSearchError = true;
    const screen = render(<WineLabelScanScreen />);

    expect(screen.getByText("scan.manualSearchError")).toBeTruthy();
    expect(screen.queryByText("scan.manualNoResults")).toBeNull();
    fireEvent.press(screen.getByText("common.retry"));

    expect(mockViewModel.retryManualSearch).toHaveBeenCalledTimes(1);
  });
});

it("keeps the shutter visible in camera mode and disables it while capturing", () => {
  mockViewModel = createViewModel();
  const screen = render(<WineLabelScanScreen />);
  const shutter = screen.getByTestId("scan-shutter");
  expect(screen.getByText("scan.capture")).toBeTruthy();
  fireEvent.press(shutter);
  expect(mockViewModel.capture).toHaveBeenCalledTimes(1);
  mockViewModel.isCapturing = true;
  screen.rerender(<WineLabelScanScreen />);
  expect(screen.getByTestId("scan-shutter")).toBeDisabled();
  fireEvent.press(screen.getByTestId("scan-shutter"));
  expect(mockViewModel.capture).toHaveBeenCalledTimes(1);
});

describe("WineLabelScanScreen scan feedback, vintage, back label and barcode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockViewModel = createViewModel();
    mockParams = { returnTo: "/(app)/(tabs)" };
    mockSubmissionResult = { status: "NEEDS_REVIEW", wine: null };
  });

  it("reports the opened wine and carries the scanned vintage to its detail", () => {
    mockViewModel.mode = "result";
    mockViewModel.scanMutation.data = exactResult();
    mockViewModel.scannedVintage = 2017;
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByText("scan.viewDetails"));

    expect(mockViewModel.reportWineChosen).toHaveBeenCalledWith(sampleWine);
    expect(mockCreateDetailRoute).toHaveBeenCalledWith("wine-1", "/(app)/(tabs)", { scannedVintage: 2017 });
  });

  it("still opens manual search from Not my wine without sending feedback", () => {
    mockViewModel.mode = "result";
    mockViewModel.scanMutation.data = exactResult();
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByText("scan.notMyWine"));

    expect(mockViewModel.setMode).toHaveBeenCalledWith("manual-search");
    expect(mockViewModel.reportWineChosen).not.toHaveBeenCalled();
  });

  it("reports a picked manual search result", () => {
    mockViewModel.mode = "manual-search";
    mockViewModel.manualResults = [sampleWine];
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByTestId("wine-wine-1"));

    expect(mockViewModel.reportWineChosen).toHaveBeenCalledWith(sampleWine);
  });

  it("reports a proposed wine as not in the catalog", () => {
    mockViewModel.mode = "submission";
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByTestId("submission-form"));

    expect(mockViewModel.reportNotInCatalog).toHaveBeenCalledTimes(1);
    expect(mockViewModel.reportWineChosen).not.toHaveBeenCalled();
  });

  it("reports the existing wine when a proposal turns out to be a duplicate", () => {
    mockViewModel.mode = "submission";
    mockSubmissionResult = { status: "DUPLICATE", wine: sampleWine };
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByTestId("submission-form"));

    expect(mockViewModel.reportWineChosen).toHaveBeenCalledWith(sampleWine);
    expect(mockViewModel.reportNotInCatalog).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/wine/detail");
  });

  it("offers the back label on a weak result", () => {
    mockViewModel.mode = "result";
    mockViewModel.canScanBackLabel = true;
    mockViewModel.scanMutation.data = { ...exactResult(), wine: null, suggestions: [] };
    const screen = render(<WineLabelScanScreen />);

    fireEvent.press(screen.getByText("scan.scanBackLabel"));

    expect(mockViewModel.startBackLabelScan).toHaveBeenCalledTimes(1);
  });

  it("does not offer the back label once it was merged", () => {
    mockViewModel.mode = "result";
    mockViewModel.scanMutation.data = { ...exactResult(), wine: null, suggestions: [] };
    const screen = render(<WineLabelScanScreen />);

    expect(screen.queryByText("scan.scanBackLabel")).toBeNull();
  });

  it("guides the back label capture and lets the member return to the result", () => {
    mockViewModel.isBackLabelScan = true;
    const screen = render(<WineLabelScanScreen />);

    expect(screen.getByText("scan.backLabelHeadline")).toBeTruthy();
    expect(screen.getByText("scan.backLabelHint")).toBeTruthy();
    fireEvent.press(screen.getByText("scan.backLabelCancel"));
    expect(mockViewModel.cancelBackLabelScan).toHaveBeenCalledTimes(1);
  });

  it("reads barcodes in the viewfinder and says when one was found", () => {
    const screen = render(<WineLabelScanScreen />);
    expect(mockCameraProps.onBarcodeDetected).toBe(mockViewModel.handleBarcodeDetected);
    expect(screen.queryByText("scan.barcodeDetected")).toBeNull();

    mockViewModel.barcodeDetected = true;
    screen.rerender(<WineLabelScanScreen />);
    expect(screen.getByText("scan.barcodeDetected")).toBeTruthy();
  });
});
