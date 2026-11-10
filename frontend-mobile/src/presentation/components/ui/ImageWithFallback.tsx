/**
 * ImageWithFallback — remote image with a wine-tinted fallback surface.
 */
import { useState } from "react";
import { ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Image, type ImageProps, type ImageSource } from "expo-image";
import { Wine } from "lucide-react-native";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { iconStrokes, radii } from "@/shared/theme/tokens";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";
import { reducedImageTransition } from "./motion/reducedMotion";

interface ImageWithFallbackProps {
  uri?: string | null;
  fallbackSource?: ImageSource | number;
  alt?: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: ViewStyle;
  contentFit?: "cover" | "contain";
  cachePolicy?: ImageProps["cachePolicy"];
  placeholder?: ImageProps["placeholder"];
  enforceEarlyResizing?: boolean;
  transition?: ImageProps["transition"];
}

export function ImageWithFallback({
  uri,
  fallbackSource,
  alt,
  style,
  containerStyle,
  contentFit = "contain",
  cachePolicy = "disk",
  placeholder,
  enforceEarlyResizing = false,
  transition = 220,
}: ImageWithFallbackProps) {
  const reduceMotion = useReduceMotionEnabled();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [failedFallback, setFailedFallback] = useState<ImageSource | number | null>(null);
  const source = uri?.trim();
  const failed = !!source && failedSource === source;

  if (!source || failed) {
    if (fallbackSource && failedFallback !== fallbackSource) {
      return (
        <Image
          source={fallbackSource}
          style={style}
          contentFit={contentFit}
          accessibilityLabel={alt}
          transition={reducedImageTransition(180, reduceMotion)}
          onError={() => setFailedFallback(fallbackSource)}
        />
      );
    }

    return (
      <View style={[styles.fallback, style as StyleProp<ViewStyle>, containerStyle]}>
        <View style={styles.glow} />
        <Wine size={34} color={vinnotColors.brand} strokeWidth={iconStrokes.thin} />
        {!!alt && <Text numberOfLines={2} style={styles.fallbackText}>{alt}</Text>}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: source }}
      style={style}
      contentFit={contentFit}
      cachePolicy={(source.includes("/uploads/covers/") || /^https:\/\/images\.vinnot\.com\/uploads\/(development|production)\//.test(source)) ? "none" : cachePolicy}
      placeholder={placeholder}
      placeholderContentFit={contentFit}
      allowDownscaling
      enforceEarlyResizing={enforceEarlyResizing}
      recyclingKey={source}
      accessibilityLabel={alt}
      onError={() => setFailedSource(source)}
      transition={reducedImageTransition(transition, reduceMotion)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: vinnotColors.brandSoft,
  },
  glow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brandSoft,
  },
  fallbackText: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 120,
    textAlign: "center",
    color: vinnotColors.muted,
  },
});
