import type { ComponentProps } from "react";
import { CoverImage } from "@/presentation/components/features/media/CoverImage";
import { illustrations } from "@/shared/illustrations";

/** Same source/cache in discovery and detail; no extra downloads or URL variants. */
export function RouteCoverImage(
  props: Omit<
    ComponentProps<typeof CoverImage>,
    | "fallbackSource"
    | "contentFit"
    | "cachePolicy"
    | "placeholder"
    | "enforceEarlyResizing"
    | "transition"
  >,
) {
  return (
    <CoverImage
      {...props}
      fallbackSource={illustrations.route}
      placeholder={illustrations.route}
      contentFit="cover"
      cachePolicy="memory-disk"
      enforceEarlyResizing
      transition={0}
    />
  );
}
