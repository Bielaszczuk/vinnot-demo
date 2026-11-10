import { useCallback, useEffect, useState } from "react";
import { coverImagesService } from "@/application/services/coverImages.service";
/** Private covers use authenticated transport; ordinary URLs keep native image delivery. */
export function useCoverImagePreview(url: string | null | undefined) {
  const managed = !!url?.includes("/uploads/covers/");
  const [preview, setPreview] = useState<{ url: string; image: string } | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const load = useCallback(async (value: string, controller: AbortController) => {
    try {
      const image = await coverImagesService.preview(value, controller.signal);
      if (!controller.signal.aborted) setPreview({ url: value, image });
    } catch {
      // Preserve the feature's existing fallback.
      if (!controller.signal.aborted) setFailedUrl(value);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (managed && url) void load(url, controller);
    return () => controller.abort();
  }, [url, managed, load]);
  const image = managed ? (preview && preview.url === url ? preview.image : null) : url;
  // While loading, callers show a neutral placeholder instead of the fallback illustration.
  return { image, managed, loading: managed && !image && failedUrl !== url };
}
