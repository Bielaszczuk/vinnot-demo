import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { coverImagesService } from "@/application/services/coverImages.service";
import type { CoverImageKind } from "@/domain/media/coverImages.types";
import { useImageCropRequest } from "./useImageCropRequest";
export function useCoverImageUpload(kind: CoverImageKind, value: string | null | undefined, active: boolean,
  onChange: (value: string) => void, onBusyChange: (busy: boolean) => void) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; image: string } | null>(null);
  const pending = useRef<AbortController | null>(null);
  const callbacks = useRef({ onChange, onBusyChange });
  const crop = useImageCropRequest();
  const { adjust, cancel: cancelCrop } = crop;
  useEffect(() => { callbacks.current = { onChange, onBusyChange }; }, [onChange, onBusyChange]);
  const cancelUpload = useCallback(() => {
    // Closing the editor also closes an open adjust step; nothing is uploaded.
    cancelCrop();
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    callbacks.current.onBusyChange(false);
  }, [cancelCrop]);
  useEffect(() => cancelUpload, [active, cancelUpload]);
  const loadPreview = useCallback(async (url: string, controller: AbortController) => {
    try {
      const image = await coverImagesService.preview(url, controller.signal);
      if (!controller.signal.aborted) setPreview({ url, image });
    } catch { if (!controller.signal.aborted) setError(t("media.previewFailed")); }
  }, [t]);
  useEffect(() => {
    const controller = new AbortController();
    if (active && value?.includes("/uploads/covers/")) void loadPreview(value, controller);
    return () => controller.abort();
  }, [value, active, loadPreview]);

  async function upload() {
    if (pending.current || !active) return;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); callbacks.current.onBusyChange(true); setError(null);
    try {
      const image = await coverImagesService.selectAndUpload(kind, controller.signal, adjust);
      if (!controller.signal.aborted) {
        if (typeof image === "object") callbacks.current.onChange(image.imageUrl);
        else if (image === "permission_denied") setError(t("media.permission"));
      }
    } catch { if (!controller.signal.aborted) setError(t("media.failed")); }
    finally {
      if (pending.current === controller) { pending.current = null; setBusy(false); callbacks.current.onBusyChange(false); }
    }
  }
  return { crop: { request: crop.request, confirm: crop.confirm, cancel: cancelCrop }, busy: active && busy, error, preview: value?.includes("/uploads/covers/") ? (preview?.url === value ? preview.image : null) : value, upload };
}
