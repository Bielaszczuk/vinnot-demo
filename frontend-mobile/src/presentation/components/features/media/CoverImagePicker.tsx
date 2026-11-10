import { StyleSheet, Text, View } from "react-native";
import { ImagePlus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import { useCoverImageUpload } from "@/presentation/hooks/useCoverImageUpload";
import { ImageCropModal } from "./ImageCropModal";
import type { CoverImageKind } from "@/domain/media/coverImages.types";
import { COVER_ASPECT } from "@/domain/media/imageAspect";
import { vinnotColors as colors, vinnotFonts as fonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { radii } from "@/shared/theme/tokens";
interface Props {
  kind: CoverImageKind;
  value?: string | null;
  active: boolean;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
}
export function CoverImagePicker({ kind, value, active, onChange, onBusyChange }: Props) {
  const { t } = useTranslation();
  const upload = useCoverImageUpload(kind, value, active, onChange, onBusyChange);
  return <View style={styles.card}>
    <Text style={styles.title}>{t("media.cover")}</Text>
    {!!value && <ImageWithFallback uri={upload.preview} alt={t("media.cover")} contentFit="cover" cachePolicy="none" style={styles.preview} />}
    <Button variant="outline" loading={upload.busy} onPress={() => void upload.upload()} leftIcon={<ImagePlus size={18} color={colors.brand} />}>{t(value ? "media.replace" : "media.choose")}</Button>
    {!!value && <Button variant="ghost" disabled={upload.busy} onPress={() => onChange("")}>{t("media.remove")}</Button>}
    <Text style={styles.hint} accessibilityLiveRegion="polite">{t(upload.busy ? "media.uploading" : "media.hint")}</Text>
    {!!upload.error && <Text style={styles.error} accessibilityRole="alert">{upload.error}</Text>}
    <ImageCropModal request={upload.crop.request} onCancel={upload.crop.cancel} onConfirm={upload.crop.confirm} />
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: radii["2xl"], borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.brandSoft, marginVertical: 8 },
  title: { fontFamily: fonts.semibold, fontSize: fontSizes.ui, color: colors.ink },
  // Same frame as the adjust step and the cards, so the preview shows what was framed.
  preview: { width: "100%", aspectRatio: COVER_ASPECT, borderRadius: radii.lg },
  hint: { fontFamily: fonts.regular, fontSize: fontSizes.xs, color: colors.muted, lineHeight: 18 },
  error: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: colors.danger },
});
