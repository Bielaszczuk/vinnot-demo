import { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Camera,
  CircleAlert,
  Zap,
  ZapOff,
  RotateCcw,
  ScanBarcode,
  Search,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { WineSummary } from "@/domain/wine/wine.types";
import { withFallbackWineName } from "@/domain/wine/submissionPrefill";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { EmptyState, Spinner } from "@/presentation/components/ui/Feedback";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import { SearchField } from "@/presentation/components/ui/TextField";
import { WineCard } from "@/presentation/features/wine/WineCard";
import {
  ADD_WINE_INTENT,
  createScannedWineDetailRoute,
  exitWineScanner,
  resolveWineScanReturnRoute,
  type WineDetailRouteOptions,
} from "@/presentation/navigation/wineNavigation";
import { useWineLabelCamera } from "@/presentation/providers/WineLabelCameraProvider";
import { lightTokens, layout, radii, spacing, wine, iconStrokes } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { WineSubmissionForm } from "./WineSubmissionForm";
import { useWineLabelScanViewModel } from "./useWineLabelScanViewModel";
import { toCaptureFrameStyle, WINE_LABEL_CAPTURE_REGION } from "./wineLabelScanLayout";
import { BackButton } from "@/presentation/components/ui/BackButton";
import { firstRouteParam } from "@/presentation/navigation/routeParams";

const captureFrameStyle = toCaptureFrameStyle(WINE_LABEL_CAPTURE_REGION);

export function WineLabelScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    intent?: string | string[];
    wineName?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { CameraViewport } = useWineLabelCamera();
  const addWineIntent = firstRouteParam(params.intent) === ADD_WINE_INTENT;
  const searchedName = firstRouteParam(params.wineName)?.trim() || null;
  const viewModel = useWineLabelScanViewModel({ addWineIntent });
  const resetScanner = viewModel.reset;
  const resetScannerOnFocus = useRef(false);
  const returnTo = resolveWineScanReturnRoute(params.returnTo);
  const exitScanner = () => exitWineScanner(router, returnTo);

  useFocusEffect(
    useCallback(() => {
      if (resetScannerOnFocus.current) {
        resetScannerOnFocus.current = false;
        resetScanner();
      }
    }, [resetScanner]),
  );

  if (!viewModel.permission) {
    return (
      <View style={styles.centered}>
        <Spinner size="lg" />
      </View>
    );
  }

  if (!viewModel.permission.granted) {
    const canAskAgain = viewModel.permission.canAskAgain;
    return (
      <View style={[styles.centered, styles.permissionContent]}>
        <View style={styles.permissionPanel}>
          <EmptyState
            style={styles.permissionState}
            title={t("scan.cameraPermissionTitle")}
            description={t(
              canAskAgain
                ? "scan.cameraPermissionDescription"
                : "scan.cameraPermissionSettingsDescription",
            )}
            icon={<Camera size={42} color={wine[700]} />}
            action={{
              label: t(canAskAgain ? "scan.enableCamera" : "scan.openSettings"),
              onPress: canAskAgain ? viewModel.requestPermission : Linking.openSettings,
            }}
          />
          <BackButton onPress={exitScanner} style={styles.permissionBack} />
        </View>
      </View>
    );
  }

  const result = viewModel.scanMutation.data;
  const navigateToWine = (selectedWine: WineSummary, options?: WineDetailRouteOptions) => {
    viewModel.reportWineChosen(selectedWine);
    viewModel.attachCapturedImageIfMissing(selectedWine);
    resetScannerOnFocus.current = true;
    const scannedVintage = viewModel.scannedVintage;
    router.push(
      createScannedWineDetailRoute(
        selectedWine.id,
        returnTo,
        scannedVintage != null ? { ...options, scannedVintage } : options,
      ),
    );
  };
  const openWineReviews = (selectedWine: WineSummary) => navigateToWine(selectedWine, { tab: "reviews" });

  return (
    <KeyboardAwareScrollView
      style={[styles.screen, { marginTop: insets.top }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing[3], paddingBottom: spacing[8] },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BackButton onPress={exitScanner} />

      {viewModel.mode === "camera" && (
        <>
          <View style={styles.heading}>
            <Text style={styles.title}>
              {t(
                viewModel.isBackLabelScan
                  ? "scan.backLabelHeadline"
                  : addWineIntent
                    ? "scan.addWineHeadline"
                    : "scan.headline",
              )}
            </Text>
            <Text style={styles.subtitle}>
              {t(
                viewModel.isBackLabelScan
                  ? "scan.backLabelHint"
                  : addWineIntent
                    ? "scan.addWineCaptureHint"
                    : "scan.captureHint",
              )}
            </Text>
          </View>
          <View
            style={[
              styles.cameraShell,
              { height: Math.max(280, Math.min(510, height - insets.top - insets.bottom - 230)) },
            ]}
          >
            <View style={styles.cameraStage}>
              <CameraViewport
                ref={viewModel.cameraRef}
                torchEnabled={viewModel.torchEnabled}
                captureRegion={WINE_LABEL_CAPTURE_REGION}
                onBarcodeDetected={viewModel.handleBarcodeDetected}
              />
              <View style={styles.cameraOverlay} pointerEvents="none">
                <View style={[styles.scanFrame, captureFrameStyle]} />
              </View>
            </View>
            <View style={styles.captureToolbar}>
              <View style={styles.sideControl}>
                <Pressable
                  onPress={viewModel.toggleTorch}
                  style={[styles.torchButton, viewModel.torchEnabled && styles.torchActive]}
                  accessibilityRole="button"
                  accessibilityLabel={t("scan.toggleFlash")}
                  accessibilityState={{ selected: viewModel.torchEnabled }}
                >
                  {viewModel.torchEnabled ? (
                    <Zap size={22} color={wine[700]} />
                  ) : (
                    <ZapOff size={22} color={lightTokens.textSecondary} />
                  )}
                </Pressable>
                <Text style={styles.controlLabel}>{t("scan.flash")}</Text>
              </View>
              <View style={styles.captureControls}>
                <Pressable
                  testID="scan-shutter"
                  onPress={() => void viewModel.capture()}
                  disabled={viewModel.isCapturing || viewModel.scanMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={t("scan.capture")}
                  accessibilityHint={t("scan.captureHint")}
                  accessibilityState={{
                    disabled: viewModel.isCapturing || viewModel.scanMutation.isPending,
                    busy: viewModel.isCapturing,
                  }}
                  style={styles.shutter}
                >
                  <View style={styles.shutterInner}>
                    {viewModel.isCapturing ? (
                      <ActivityIndicator color={lightTokens.textInverted} />
                    ) : (
                      <Camera size={26} color={lightTokens.textInverted} />
                    )}
                  </View>
                </Pressable>
                <Text style={styles.captureLabel}>{t("scan.capture")}</Text>
              </View>
              <View
                style={styles.sideControl}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          </View>
          {viewModel.barcodeDetected && (
            <View style={styles.barcodeHint} accessibilityLiveRegion="polite">
              <ScanBarcode size={16} color={lightTokens.success} />
              <Text style={styles.barcodeHintText}>{t("scan.barcodeDetected")}</Text>
            </View>
          )}
          {viewModel.isBackLabelScan && (
            <Button fullWidth size="lg" variant="ghost" onPress={viewModel.cancelBackLabelScan}>
              {t("scan.backLabelCancel")}
            </Button>
          )}
          {addWineIntent && (
            <View style={styles.withoutPhoto}>
              <Text style={styles.withoutPhotoHint}>{t("scan.addWithoutPhotoHint")}</Text>
              <Button fullWidth size="lg" variant="ghost" onPress={() => viewModel.setMode("submission")}>
                {t("scan.addWithoutPhoto")}
              </Button>
            </View>
          )}
        </>
      )}

      {viewModel.mode === "analysis" && viewModel.capturedUri && (
        <Card style={styles.analysisCard} radius={radii["2xl"]}>
          <ImageWithFallback
            uri={viewModel.capturedUri}
            alt={t("scan.detectedFromLabel")}
            style={styles.analysisImage}
            contentFit="cover"
          />
          <View style={styles.analysisCopy}>
            <Spinner size="md" />
            <Text style={styles.analysisTitle}>{t("scan.analyzing")}</Text>
            <Text style={styles.analysisText}>{t("scan.analyzingDescription")}</Text>
            <Button size="md" variant="outline" onPress={viewModel.cancelAnalysis}>
              {t("scan.cancelAnalysis")}
            </Button>
          </View>
        </Card>
      )}

      {viewModel.mode === "error" && viewModel.capturedUri && (
        <Card style={styles.analysisCard} radius={radii["2xl"]}>
          <ImageWithFallback
            uri={viewModel.capturedUri}
            alt={t("scan.detectedFromLabel")}
            style={styles.analysisImage}
            contentFit="cover"
          />
          <View style={styles.analysisCopy}>
            <View style={styles.errorIcon}>
              <CircleAlert size={24} color={wine[700]} strokeWidth={iconStrokes.thin} />
            </View>
            <Text style={styles.analysisTitle}>{t("scan.analysisFailedTitle")}</Text>
            <Text style={styles.analysisText} accessibilityRole="alert">
              {t(viewModel.scanErrorKey ?? "scan.scanError")}
            </Text>
          </View>
          <View style={styles.recoveryActions} testID="scan-recovery-actions">
            <Button fullWidth size="md" onPress={viewModel.retryAnalysis}>
              {t("scan.tryAgain")}
            </Button>
            <Button
              fullWidth
              size="md"
              variant="outline"
              onPress={() => viewModel.setMode("manual-search")}
            >
              {t("scan.searchManually")}
            </Button>
            <Button fullWidth size="md" variant="ghost" onPress={viewModel.reset}>
              {t("scan.scanAnother")}
            </Button>
          </View>
        </Card>
      )}

      {viewModel.mode === "result" && result?.wine && (
        <View style={styles.section}>
          <View style={styles.heading}>
            <Text style={styles.title}>{t("scan.wineFound")}</Text>
            <Text style={styles.confidenceHigh}>
              {t("scan.confidenceHigh")} · {Math.round(result.confidence * 100)}%
            </Text>
          </View>
          <WineCard
            wine={result.wine}
            onPress={() => navigateToWine(result.wine!)}
            onReviewsPress={() => openWineReviews(result.wine!)}
          />
          <Button fullWidth size="lg" onPress={() => navigateToWine(result.wine!)}>
            {t("scan.viewDetails")}
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="outline"
            onPress={() => viewModel.setMode("manual-search")}
          >
            {t("scan.notMyWine")}
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="ghost"
            leftIcon={<RotateCcw size={18} color={wine[700]} />}
            onPress={viewModel.reset}
          >
            {t("scan.scanAnother")}
          </Button>
        </View>
      )}

      {viewModel.mode === "result" && result && !result.wine && (
        <View style={styles.section}>
          <Card style={styles.noMatchCard} radius={radii["2xl"]}>
            <Search size={34} color={wine[700]} />
            <Text style={styles.noMatchTitle}>{t("scan.uncertainTitle")}</Text>
            <Text style={styles.noMatchText}>{t("scan.uncertainDescription")}</Text>
          </Card>

          {result.suggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("scan.possibleMatches")}</Text>
              <Text style={styles.sectionDescription}>{t("scan.possibleMatchesDescription")}</Text>
              {result.suggestions.map((suggestion) => (
                <View key={suggestion.id} style={styles.suggestion}>
                  <Text style={styles.confidencePossible}>
                    {t("scan.confidenceLow")} ·{" "}
                    {Math.round(
                      (result.candidates.find((candidate) => candidate.wine.id === suggestion.id)
                        ?.score ?? 0) * 100,
                    )}
                    %
                  </Text>
                  <WineCard
                    wine={suggestion}
                    onPress={() => navigateToWine(suggestion)}
                    onReviewsPress={() => openWineReviews(suggestion)}
                  />
                </View>
              ))}
            </View>
          )}

          {viewModel.canScanBackLabel && (
            <View style={styles.backLabelOffer}>
              <Text style={styles.sectionDescription}>{t("scan.scanBackLabelDescription")}</Text>
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                leftIcon={<Camera size={18} color={wine[700]} />}
                onPress={viewModel.startBackLabelScan}
              >
                {t("scan.scanBackLabel")}
              </Button>
            </View>
          )}

          <Button
            fullWidth
            size="lg"
            leftIcon={<RotateCcw size={18} color={lightTokens.textInverted} />}
            onPress={viewModel.reset}
          >
            {t("scan.tryAgain")}
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="outline"
            onPress={() => viewModel.setMode("manual-search")}
          >
            {t("scan.searchManually")}
          </Button>
        </View>
      )}

      {viewModel.mode === "manual-search" && (
        <View style={styles.section}>
          <View style={styles.heading}>
            <Text style={styles.title}>{t("scan.manualSearchTitle")}</Text>
            <Text style={styles.subtitle}>{t("scan.manualSearchDescription")}</Text>
          </View>
          <SearchField
            value={viewModel.manualQuery}
            onChangeText={viewModel.setManualQuery}
            onClear={() => viewModel.setManualQuery("")}
            placeholder={t("scan.manualSearchPlaceholder")}
            autoFocus
          />
          {viewModel.isManualSearchLoading && <Spinner size="md" />}
          {viewModel.isManualSearchError && (
            <EmptyState
              title={t("scan.manualSearchError")}
              description={t("scan.manualSearchErrorDescription")}
              icon={<Search size={34} color={wine[700]} />}
              action={{
                label: t("common.retry"),
                onPress: viewModel.retryManualSearch,
              }}
            />
          )}
          {viewModel.manualResults.map((wineResult) => (
            <WineCard
              key={wineResult.id}
              wine={wineResult}
              onPress={() => navigateToWine(wineResult)}
              onReviewsPress={() => openWineReviews(wineResult)}
            />
          ))}
          {viewModel.manualQuery.trim().length >= 2 &&
            !viewModel.isManualSearchLoading &&
            !viewModel.isManualSearchError &&
            viewModel.manualResults.length === 0 && (
              <Card style={styles.noResultsCard}>
                <Text style={styles.noMatchTitle}>{t("scan.manualNoResults")}</Text>
                <Text style={styles.noMatchText}>{t("scan.addWineDescription")}</Text>
              </Card>
            )}
          <Button
            fullWidth
            size="lg"
            disabled={!viewModel.capturedUri}
            onPress={() => viewModel.setMode("submission")}
          >
            {t("scan.addWine")}
          </Button>
          <Button fullWidth size="lg" variant="ghost" onPress={viewModel.reset}>
            {t("scan.tryAgain")}
          </Button>
        </View>
      )}

      {viewModel.mode === "submission" && (
        <WineSubmissionForm
          imageUri={viewModel.capturedUri}
          extractedData={withFallbackWineName(result?.extractedData ?? null, searchedName)}
          onCancel={() => viewModel.setMode(viewModel.capturedUri ? "manual-search" : "camera")}
          onComplete={(submission) => {
            // A duplicate proposal found the wine in the catalog after all.
            if (submission.status === "DUPLICATE" && submission.wine) {
              viewModel.reportWineChosen(submission.wine);
            } else {
              viewModel.reportNotInCatalog();
            }
            if (submission.wine) {
              navigateToWine(submission.wine);
            } else if (submission.status === "NEEDS_REVIEW") {
              router.replace("/(app)/(tabs)/wines/submissions");
            } else {
              viewModel.reset();
            }
          }}
        />
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  permissionBack: { alignSelf: "center" },
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { paddingHorizontal: layout.screenHorizontalPadding, gap: spacing[5] },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.bgBase,
  },
  permissionContent: { paddingHorizontal: layout.screenHorizontalPadding },
  permissionPanel: {
    width: "100%",
    maxWidth: 340,
    gap: spacing[3],
  },
  permissionState: { flex: 0, padding: 0 },
  heading: { gap: spacing[1] },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  withoutPhoto: { gap: spacing[2] },
  barcodeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  barcodeHintText: { ...textStyles.labelMedium, color: lightTokens.success },
  backLabelOffer: { gap: spacing[2] },
  withoutPhotoHint: { ...textStyles.bodySmall, color: lightTokens.textSecondary, textAlign: "center" },
  cameraShell: {
    overflow: "hidden",
    borderRadius: radii["3xl"],
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  cameraStage: { flex: 1, overflow: "hidden", backgroundColor: lightTokens.bgBase },
  cameraOverlay: { ...StyleSheet.absoluteFill },
  scanFrame: {
    position: "absolute",
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
  },
  captureToolbar: {
    minHeight: 132,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  sideControl: { width: 64, alignItems: "center", gap: spacing[2] },
  captureControls: { alignItems: "center", justifyContent: "center", gap: spacing[2] },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: wine[200],
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: radii.full,
    backgroundColor: wine[700],
    alignItems: "center",
    justifyContent: "center",
  },
  captureLabel: { ...textStyles.labelMedium, color: lightTokens.textPrimary },
  controlLabel: { ...textStyles.labelSmall, color: lightTokens.textSecondary },
  torchButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  torchActive: { backgroundColor: wine[50], borderColor: wine[200] },
  analysisCard: { gap: spacing[4], alignItems: "stretch" },
  analysisImage: { width: "100%", height: 240, borderRadius: radii.xl },
  analysisCopy: { width: "100%", alignItems: "center", gap: spacing[2] },
  analysisTitle: {
    ...textStyles.headingSmall,
    color: lightTokens.textPrimary,
    textAlign: "center",
  },
  analysisText: { ...textStyles.bodyMedium, color: lightTokens.textSecondary, textAlign: "center" },
  recoveryActions: { width: "100%", alignItems: "stretch", gap: spacing[3] },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
  section: { gap: spacing[4] },
  sectionTitle: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  sectionDescription: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  confidenceHigh: { ...textStyles.labelLarge, color: lightTokens.success },
  confidencePossible: { ...textStyles.labelMedium, color: wine[700] },
  suggestion: { gap: spacing[2] },
  noMatchCard: { alignItems: "center", gap: spacing[3] },
  noMatchTitle: {
    ...textStyles.headingSmall,
    color: lightTokens.textPrimary,
    textAlign: "center",
  },
  noMatchText: {
    ...textStyles.bodyMedium,
    color: lightTokens.textSecondary,
    textAlign: "center",
  },
  noResultsCard: { gap: spacing[2] },
});
