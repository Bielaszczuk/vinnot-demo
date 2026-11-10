/**
 * Composition boundary for the native camera adapter.
 * This is the only presentation file allowed to wire Expo camera infrastructure.
 */
import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
  type RefAttributes,
} from "react";
import type { PermissionResponse } from "expo-camera";
import type { NormalizedImageRegion } from "@/shared/image/imageGeometry";
import {
  WineLabelCamera,
  useWineLabelCameraPermission,
  type WineLabelCameraHandle,
} from "@/infrastructure/device/camera/WineLabelCamera";
import {
  releaseWineLabelImage,
  retainWineLabelImage,
} from "@/infrastructure/device/camera/wineLabelTemporaryImages";

interface CameraViewportProps extends RefAttributes<WineLabelCameraHandle> {
  torchEnabled: boolean;
  captureRegion: NormalizedImageRegion;
}

interface WineLabelCameraContextValue {
  CameraViewport: ComponentType<CameraViewportProps>;
  permission: PermissionResponse | null;
  requestPermission: () => Promise<PermissionResponse>;
  releaseImage: (uri: string) => void;
  retainImage: (uri: string) => () => void;
}

const WineLabelCameraContext = createContext<WineLabelCameraContextValue | null>(null);

export function WineLabelCameraProvider({ children }: { children: ReactNode }) {
  const [permission, requestPermission] = useWineLabelCameraPermission();
  return (
    <WineLabelCameraContext.Provider
      value={{
        CameraViewport: WineLabelCamera,
        permission,
        requestPermission,
        releaseImage: releaseWineLabelImage,
        retainImage: retainWineLabelImage,
      }}
    >
      {children}
    </WineLabelCameraContext.Provider>
  );
}

export function useWineLabelCamera() {
  const context = useContext(WineLabelCameraContext);
  if (!context) {
    throw new Error("useWineLabelCamera must be used inside WineLabelCameraProvider");
  }
  return context;
}

export type { WineLabelCameraHandle };
