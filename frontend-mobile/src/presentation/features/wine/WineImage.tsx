import { useMemo, type ComponentProps } from "react";
import { Image as NativeImage, Platform } from "react-native";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import darkBottle from "../../../../assets/images/mock/winebottle.webp";
import lightBottle from "../../../../assets/images/mock/winebottle2.webp";

type WineImageProps = Omit<ComponentProps<typeof ImageWithFallback>, "fallbackSource"> & {
  wineType?: string;
};

/** Wine presentation shares web's default bottle, without replacing genuine photos. */
export function WineImage({ wineType, ...props }: WineImageProps) {
  const type = wineType?.toLowerCase();
  const fallbackSource = useMemo(() => {
    const asset = type === "white" || type === "sparkling" ? lightBottle : darkBottle;
    if (Platform.OS !== "android") return asset;

    // expo-image's Android SourceMap overrides Glide's target with local asset
    // width * scale / height * scale. Even bundled WebP should decode at the
    // view's size: omit source dimensions so Glide uses the target bounds.
    const resolved = NativeImage.resolveAssetSource(asset);
    return resolved?.uri ? { uri: resolved.uri } : asset;
  }, [type]);
  return (
    <ImageWithFallback
      {...props}
      fallbackSource={fallbackSource}
    />
  );
}
