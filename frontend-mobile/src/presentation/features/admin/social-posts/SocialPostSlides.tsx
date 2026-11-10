/**
 * The rendered carousel of the selected language (#492, #497; mobile #499): the format switch (Instagram 4:5,
 * TikTok 9:16), where the hero came from, the render state, the slides in a horizontal list with open and share
 * per slide, and the new illustration action. Without slides the copy is shown as a text preview.
 */
import { Image, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Badge";
import { Button } from "@/presentation/components/ui/Button";
import {
  ILLUSTRATION_FALLBACK_REASONS,
  MEDIA_RENDER_ERRORS,
  SOCIAL_FORMATS,
  type SocialFormat,
  type SocialPostCopy,
  type SocialPostMedia,
} from "@/domain/admin/socialPost";
import { NotificationSegmented } from "../notifications/NotificationSegmented";
import { socialPostStyles as styles } from "./socialPostStyles";

/** Card size of each format on screen; both keep the ratio of the rendered 1080 px images. */
const FORMAT_SIZE: Record<SocialFormat, { width: number; height: number }> = {
  INSTAGRAM: { width: 200, height: 250 },
  TIKTOK: { width: 160, height: 284 },
};

function knownCode(codes: readonly string[], code: string | null): string {
  return code !== null && codes.includes(code) ? code : "OTHER";
}

export function SocialPostSlides({
  copy,
  media,
  format,
  onFormatChange,
  slides,
  canRequestIllustration,
  working,
  onNewIllustration,
  onOpen,
  onShare,
}: {
  copy: SocialPostCopy;
  media: SocialPostMedia | null;
  format: SocialFormat;
  onFormatChange: (format: SocialFormat) => void;
  /** Slide URLs of the selected language and format. */
  slides: string[];
  canRequestIllustration: boolean;
  working: boolean;
  onNewIllustration: () => unknown;
  onOpen: (url: string) => unknown;
  onShare: (url: string, index: number) => unknown;
}) {
  const { t } = useTranslation();
  const size = FORMAT_SIZE[format];
  const fallbackReason =
    media?.source === "FALLBACK" && media.illustrationReason
      ? knownCode(ILLUSTRATION_FALLBACK_REASONS, media.illustrationReason)
      : null;
  const renderError = media?.status === "FAILED" ? knownCode(MEDIA_RENDER_ERRORS, media.error) : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.heading} accessibilityRole="header">
          {t("admin.socialPosts.media.heading")}
        </Text>
        {media?.source && (
          <Badge
            label={t(`admin.socialPosts.media.source.${media.source}`)}
            variant={media.source === "AI" ? "brand" : "warning"}
          />
        )}
      </View>
      <NotificationSegmented
        accessibilityLabel={t("admin.socialPosts.media.format")}
        value={format}
        onChange={onFormatChange}
        options={SOCIAL_FORMATS.map((candidate) => ({
          value: candidate,
          label: t(`admin.socialPosts.media.formats.${candidate}`),
        }))}
      />
      {fallbackReason && (
        <Text style={styles.help}>
          {fallbackReason === "OTHER"
            ? t("admin.socialPosts.media.fallbackReason.OTHER", { code: media?.illustrationReason })
            : t(`admin.socialPosts.media.fallbackReason.${fallbackReason}`)}
        </Text>
      )}
      {media?.status === "PENDING" && (
        <View style={styles.notice} accessibilityRole="summary">
          <Text style={styles.body}>{t("admin.socialPosts.media.pending")}</Text>
        </View>
      )}
      {renderError && (
        <View style={styles.alert} accessibilityRole="alert">
          <Text style={styles.alertText}>
            {renderError === "OTHER"
              ? t("admin.socialPosts.media.errors.OTHER", { code: media?.error ?? "—" })
              : t(`admin.socialPosts.media.errors.${renderError}`)}
          </Text>
          <Text style={styles.alertText}>{t("admin.socialPosts.media.failedHelp")}</Text>
        </View>
      )}

      {slides.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {slides.map((url, index) => (
            <View key={url} testID={`social-post-slide-${index}`} style={[styles.slide, { width: size.width }]}>
              <Image
                source={{ uri: url }}
                accessibilityLabel={t("admin.socialPosts.media.slideAlt", {
                  alt: copy.altText || copy.hook,
                  index: index + 1,
                  total: slides.length,
                })}
                style={[styles.slideImage, size]}
                resizeMode="cover"
              />
              <View style={styles.slideActions}>
                <Button
                  size="sm"
                  variant="outline"
                  accessibilityLabel={t("admin.socialPosts.media.open", { index: index + 1 })}
                  onPress={() => void onOpen(url)}
                >
                  {t("common.view")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  accessibilityLabel={t("admin.socialPosts.media.share", { index: index + 1 })}
                  onPress={() => void onShare(url, index)}
                >
                  {t("common.share")}
                </Button>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <>
          <Text style={styles.help}>{t("admin.socialPosts.detail.previewHelp")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <View style={styles.previewSlide}>
              <Text style={styles.label}>{t("admin.socialPosts.detail.slide", { index: 1 })}</Text>
              <Text style={styles.rowTitle}>{copy.hook}</Text>
            </View>
            {copy.slides.map((slide, index) => (
              <View key={`${index}-${slide.title}`} style={styles.previewSlide}>
                <Text style={styles.label}>{t("admin.socialPosts.detail.slide", { index: index + 2 })}</Text>
                <Text style={styles.rowTitle}>{slide.title}</Text>
                <Text style={styles.body}>{slide.body}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <Button
        size="sm"
        variant="outline"
        disabled={working || !canRequestIllustration}
        onPress={() => void onNewIllustration()}
      >
        {t("admin.socialPosts.media.newIllustration")}
      </Button>
    </View>
  );
}
