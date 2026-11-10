import type { ComponentProps } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import { useCoverImagePreview } from "@/presentation/hooks/useCoverImagePreview";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
export function CoverImage({ uri, ...props }: ComponentProps<typeof ImageWithFallback>) {
  const preview = useCoverImagePreview(uri);
  if (preview.loading) {
    return (
      <View
        accessibilityLabel={props.alt}
        accessibilityState={{ busy: true }}
        style={[styles.placeholder, props.style as StyleProp<ViewStyle>, props.containerStyle]}
      />
    );
  }
  return <ImageWithFallback {...props} uri={preview.image ?? undefined} cachePolicy={preview.managed ? "none" : props.cachePolicy} />;
}
const styles = StyleSheet.create({ placeholder: { backgroundColor: vinnotColors.brandSoft } });
