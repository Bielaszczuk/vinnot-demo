/**
 * CatalogImagePicker — catalog photo (wine label, winery logo) framed in the adjust step and
 * uploaded as soon as it is confirmed through POST /admin/catalog-images. Mirrors CoverImagePicker.
 */
import { StyleSheet, Text, View } from "react-native";
import { ImagePlus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import { useCatalogImageUpload } from "@/presentation/hooks/useCatalogImageUpload";
import type { ImageFrameKind } from "@/domain/media/imageAspect";
import { ImageCropModal } from "./ImageCropModal";
import { lightTokens, radii, spacing } from "@/shared/theme/tokens";
import { fontFamilies, fontSizes, textStyles } from "@/shared/theme/typography";

export interface CatalogImagePickerProps {
  label: string;
  /** Frame of the adjust step: where the image is displayed (wine bottle 3:4, logo, cover). */
  frame: ImageFrameKind;
  value: string;
  onChange: (imageUrl: string) => void;
  /** False while the form is closed; a late upload result is then ignored. */
  active: boolean;
  onBusyChange?: (busy: boolean) => void;
  alt?: string;
  /** "contain" suits bottles and logos; "cover" suits photos. */
  fit?: "contain" | "cover";
  disabled?: boolean;
}

export function CatalogImagePicker({
  label,
  frame,
  value,
  onChange,
  active,
  onBusyChange,
  alt,
  fit = "contain",
  disabled = false,
}: CatalogImagePickerProps) {
  const { t } = useTranslation();
  const upload = useCatalogImageUpload(frame, active, onChange, onBusyChange);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{label}</Text>
      <View style={styles.body}>
        <View style={styles.preview}>
          {value ? (
            <ImageWithFallback uri={value} alt={alt ?? label} contentFit={fit} style={styles.image} />
          ) : (
            <ImagePlus size={24} color={lightTokens.textTertiary} />
          )}
        </View>
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            loading={upload.busy}
            disabled={disabled}
            onPress={() => void upload.upload()}
            leftIcon={<ImagePlus size={16} color={lightTokens.brandPrimary} />}
            accessibilityLabel={t(value ? "media.replace" : "media.choose")}
          >
            {t(value ? "media.replace" : "media.choose")}
          </Button>
          {!!value && (
            <Button variant="ghost" size="sm" disabled={upload.busy || disabled} onPress={() => onChange("")}>
              {t("media.remove")}
            </Button>
          )}
        </View>
      </View>
      <Text style={styles.hint} accessibilityLiveRegion="polite">
        {t(upload.busy ? "media.uploading" : "forms.catalogImage.hint")}
      </Text>
      {!!upload.error && (
        <Text style={styles.error} accessibilityRole="alert">
          {upload.error}
        </Text>
      )}
      <ImageCropModal request={upload.crop.request} onCancel={upload.crop.cancel} onConfirm={upload.crop.confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.xl,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: lightTokens.borderSoft,
    backgroundColor: lightTokens.brandSecondary,
  },
  title: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.ui, color: lightTokens.textPrimary },
  body: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  preview: {
    width: 76,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderCurve: "continuous",
    backgroundColor: lightTokens.surfaceDefault,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  actions: { flex: 1, gap: spacing[2], alignItems: "flex-start" },
  hint: { ...textStyles.caption, color: lightTokens.textTertiary, lineHeight: 18 },
  error: { ...textStyles.caption, color: lightTokens.danger, lineHeight: 18 },
});
