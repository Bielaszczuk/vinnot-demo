import type { ComponentProps } from "react";
import { ImageWithFallback } from "@components/ui/ImageWithFallback";
import { useCoverImagePreview } from "@hooks/useCoverImagePreview";
export function CoverImage({ src, ...props }: ComponentProps<typeof ImageWithFallback>) {
  const preview = useCoverImagePreview(src);
  if (preview.loading) {
    return <span role="img" aria-label={props.alt || undefined} aria-busy="true" className={`block animate-pulse motion-reduce:animate-none bg-wine-50 ${props.className ?? ""}`} />;
  }
  return <ImageWithFallback {...props} src={preview.image ?? undefined} />;
}
