import { useEffect, useState } from "react";
import { coverImagesService } from "@application/services/coverImages.service";
/** Fetch private covers through authenticated transport; release local URLs on navigation. */
export function useCoverImagePreview(url: string | null | undefined) {
  const managed = !!url?.includes("/uploads/covers/");
  const [preview, setPreview] = useState<{ url: string; image: string } | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let localUrl: string | undefined;
    if (managed && url) void coverImagesService.preview(url, controller.signal).then(image => {
      if (controller.signal.aborted) return;
      localUrl = URL.createObjectURL(image);
      setPreview({ url, image: localUrl });
    }).catch(() => {
      // Preserve the feature's existing fallback.
      if (!controller.signal.aborted) setFailedUrl(url);
    });
    return () => { controller.abort(); if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [url, managed]);
  const image = managed ? (preview && preview.url === url ? preview.image : null) : url;
  // While loading, callers show a neutral placeholder instead of the fallback illustration.
  return { image, managed, loading: managed && !image && failedUrl !== url };
}
