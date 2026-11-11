import { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeSettings } from "expo-camera";
import type { ImageDimensions, NormalizedImageRegion } from "@/shared/image/imageGeometry";
import { prepareWineLabelImage } from "./wineLabelImageProcessor";
import { analyzeWineLabelImageQuality } from "./wineLabelImageQualityAnalyzer";
import { recognizeWineLabelText } from "./wineLabelTextRecognizer";
import { assertUsableWineLabelImage } from "@/shared/image/wineLabelImageQuality";
import { ownWineLabelImage, releaseWineLabelImage } from "./wineLabelTemporaryImages";

export interface WineLabelCameraHandle {
  capture: () => Promise<string | null>;
  recognizeText: (imageUri: string) => Promise<string[]>;
}

interface WineLabelCameraProps {
  torchEnabled: boolean;
  captureRegion: NormalizedImageRegion;
  /** Receives the raw data of every EAN/UPC code the preview sees. */
  onBarcodeDetected?: (data: string) => void;
}

/** Retail codes printed on wine bottles. */
const WINE_BARCODE_SETTINGS: BarcodeSettings = {
  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
};

export const WineLabelCamera = forwardRef<WineLabelCameraHandle, WineLabelCameraProps>(
  ({ torchEnabled, captureRegion, onBarcodeDetected }, ref) => {
    const cameraRef = useRef<CameraView | null>(null);
    const previewDimensionsRef = useRef<ImageDimensions | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        capture: async () => {
          const photo = await cameraRef.current?.takePictureAsync({
            quality: 0.92,
            base64: false,
            skipProcessing: false,
          });
          if (!photo) {
            return null;
          }
          ownWineLabelImage(photo.uri);
          let preparedUri: string | undefined;
          try {
            const preparedImage = await prepareWineLabelImage(
              photo,
              captureRegion,
              previewDimensionsRef.current ?? undefined,
            );
            preparedUri = preparedImage.uri;
            ownWineLabelImage(preparedUri);
            assertUsableWineLabelImage(await analyzeWineLabelImageQuality(preparedImage));
            return preparedImage.uri;
          } catch (error) {
            if (preparedUri) releaseWineLabelImage(preparedUri);
            throw error;
          } finally {
            releaseWineLabelImage(photo.uri);
          }
        },
        recognizeText: recognizeWineLabelText,
      }),
      [captureRegion],
    );

    return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchEnabled}
          barcodeScannerSettings={WINE_BARCODE_SETTINGS}
          onBarcodeScanned={
            onBarcodeDetected ? ({ data }) => onBarcodeDetected(data) : undefined
          }
          onLayout={({ nativeEvent }) => {
            previewDimensionsRef.current = {
              width: nativeEvent.layout.width,
              height: nativeEvent.layout.height,
            };
          }}
        />
      </View>
    );
  },
);

WineLabelCamera.displayName = "WineLabelCamera";

export function useWineLabelCameraPermission() {
  return useCameraPermissions();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
