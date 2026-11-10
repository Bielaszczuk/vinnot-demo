/**
 * Upload-on-pick for catalog images: the photo is stored as soon as it is chosen, so the
 * form only holds its URL. A closed form ignores a late result.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { catalogImagesService } from "@/application/services/catalogImages.service";
import type { ImageFrameKind } from "@/domain/media/imageAspect";
import { useImageCropRequest } from "./useImageCropRequest";

const ERROR_KEYS = {
  permission_denied: "media.permission",
  file_too_large: "forms.catalogImage.tooLarge",
  read_error: "admin.wines.imageReadError",
} as const;

export function useCatalogImageUpload(
  frame: ImageFrameKind,
  active: boolean,
  onChange: (imageUrl: string) => void,
  onBusyChange?: (busy: boolean) => void,
) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const pending = useRef(false);
  const callbacks = useRef({ onChange, onBusyChange });
  callbacks.current = { onChange, onBusyChange };
  const crop = useImageCropRequest();
  const { adjust, cancel: cancelCrop } = crop;

  const settle = useCallback((value: boolean) => {
    pending.current = value;
    setBusy(value);
    callbacks.current.onBusyChange?.(value);
  }, []);

  // Closing or reopening the form drops any upload still running and any open adjust step.
  useEffect(() => {
    cancelCrop();
    revision.current += 1;
    pending.current = false;
    callbacks.current.onBusyChange?.(false);
  }, [active, cancelCrop]);

  const upload = async () => {
    if (!active || pending.current) return;
    const request = ++revision.current;
    settle(true);
    setError(null);
    try {
      const result = await catalogImagesService.selectAndUpload(frame, adjust);
      if (request !== revision.current) return;
      if (result.status === "uploaded") callbacks.current.onChange(result.imageUrl);
      else if (result.status !== "cancelled") setError(t(ERROR_KEYS[result.status]));
    } catch {
      if (request === revision.current) setError(t("media.failed"));
    } finally {
      if (request === revision.current) settle(false);
      // A dropped upload only clears the spinner when no newer upload took over.
      else if (!pending.current) setBusy(false);
    }
  };

  return { crop: { request: crop.request, confirm: crop.confirm, cancel: cancelCrop }, busy: active && busy, error: active ? error : null, upload };
}
