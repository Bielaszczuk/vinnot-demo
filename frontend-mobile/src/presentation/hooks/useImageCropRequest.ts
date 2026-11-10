/**
 * Bridges the photo flow and the adjust modal: the flow awaits `adjust`, the modal shows the
 * request and settles it with the framed region (confirm) or null (cancel).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoAdjuster } from "@/application/services/photoCrop.service";
import type { ImageFrame } from "@/domain/media/imageAspect";
import type { CropRect, PickedPhoto } from "@/domain/media/imageCrop";

export interface ImageCropRequest {
  photo: PickedPhoto;
  frame: ImageFrame;
}

/**
 * The system picker (and the camera) is still closing when it hands back the photo. iOS drops a
 * modal presented during that animation, so the adjust modal waits for it to finish.
 */
export const PICKER_SETTLE_MS = 400;

interface Pending {
  resolve: (rect: CropRect | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function useImageCropRequest() {
  const [request, setRequest] = useState<ImageCropRequest | null>(null);
  const pending = useRef<Pending | null>(null);

  const settle = useCallback((rect: CropRect | null) => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    clearTimeout(current.timer);
    setRequest(null);
    current.resolve(rect);
  }, []);

  const adjust = useCallback<PhotoAdjuster>((photo, frame) => {
    // A newer photo replaces any adjust step still open.
    settle(null);
    return new Promise<CropRect | null>((resolve) => {
      pending.current = { resolve, timer: setTimeout(() => setRequest({ photo, frame }), PICKER_SETTLE_MS) };
    });
  }, [settle]);

  const cancel = useCallback(() => settle(null), [settle]);

  // Leaving the screen cancels the adjust step, so the flow never waits forever.
  useEffect(() => cancel, [cancel]);

  return { request, adjust, confirm: settle, cancel };
}
