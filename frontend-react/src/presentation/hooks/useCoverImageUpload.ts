import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { coverImagesService } from "@application/services/coverImages.service";
import { acceptsCoverImage, type CoverImageKind } from "@domain/media/coverImages.types";
import { usePendingImageCrop } from "./usePendingImageCrop";

export function useCoverImageUpload(kind: CoverImageKind, value: string | null | undefined,
  onChange: (value: string | null) => void, onBusyChange: (busy: boolean) => void) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; image: string } | null>(null);
  const pending = useRef<AbortController | null>(null);
  const crop = usePendingImageCrop();
  const callbacks = useRef({ onChange, onBusyChange });
  useEffect(() => { callbacks.current = { onChange, onBusyChange }; }, [onChange, onBusyChange]);
  useEffect(() => () => { pending.current?.abort(); callbacks.current.onBusyChange(false); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    if (value?.includes("/uploads/covers/")) {
      coverImagesService.preview(value, controller.signal).then(blob => {
        if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setPreview({ url: value, image: objectUrl }); }
      }).catch(() => { if (!controller.signal.aborted) setError(t("media.previewFailed")); });
    }
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [value, t]);
  async function upload(file?: File) {
    if (!file || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); callbacks.current.onBusyChange(true); setError(null);
    try {
      const image = await coverImagesService.upload(file, kind, controller.signal);
      if (!controller.signal.aborted) callbacks.current.onChange(image.imageUrl);
    } catch (failure) {
      if (!controller.signal.aborted) setError(t(failure instanceof Error && failure.message === "INVALID_COVER_IMAGE" ? "media.invalid" : "media.failed"));
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false); callbacks.current.onBusyChange(false); }
    }
  }
  /** A picked photo is framed first; only the framed result is uploaded. */
  function pick(file?: File) {
    if (!file || pending.current) return;
    if (!acceptsCoverImage(file.type, file.size)) { setError(t("media.invalid")); return; }
    setError(null);
    crop.open(file);
  }
  function confirmCrop(file: File) {
    crop.close();
    void upload(file);
  }
  return {
    busy, error, preview: value?.includes("/uploads/covers/") ? (preview?.url === value ? preview.image : null) : value,
    upload, pick, cropping: crop.pending, confirmCrop, cancelCrop: crop.close,
  };
}
