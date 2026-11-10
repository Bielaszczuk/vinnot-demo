import { illustrations } from "@/shared/illustrations";
/**
 * WineryHero — winery detail hero card.
 */
import { StyleSheet, Text, View } from "react-native";
import { ExternalLink, MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { useExternalLink } from "@/presentation/hooks/useExternalLink";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import { editorial, lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { Winery } from "@/domain/winery/winery.types";
import { localizedText } from "@/shared/i18n/language";

interface WineryHeroProps {
  winery: Winery;
}

export function WineryHero({ winery }: WineryHeroProps) {
  const { t, i18n } = useTranslation();
  const openExternalLink = useExternalLink();
  const location = [winery.subregion, winery.regionName, winery.countryName].filter(Boolean).join(", ");
  const description = localizedText(
    { es: winery.descriptionEs, en: winery.descriptionEn },
    i18n?.resolvedLanguage ?? i18n?.language,
  );

  return (
    <Card padding={0} radius={radii.md} style={styles.card}>
      <View style={styles.cover}>
        <ImageWithFallback
          uri={winery.backgroundImageUrl ?? winery.imageUrl}
          fallbackSource={illustrations.winery}
          alt={winery.name}
          style={styles.coverImage}
          containerStyle={styles.coverFallback}
          contentFit="cover"
        />
      </View>
      <View style={styles.body}>
        <View style={styles.logoFrame}>
          <ImageWithFallback
            uri={winery.logoUrl}
            alt={winery.name}
            style={styles.logo}
            containerStyle={styles.logoFallback}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.name}>{winery.name}</Text>
          {!!location && (
            <View style={styles.locationRow}>
              <MapPin size={16} color={lightTokens.textTertiary} />
              <Text style={styles.location}>{location}</Text>
            </View>
          )}
          {!!winery.establishedYear && (
            <Text style={styles.meta}>
              {t("wineries.established")} {winery.establishedYear}
            </Text>
          )}
        </View>
        {!!description && <Text style={styles.description}>{description}</Text>}
        {!!winery.website && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ExternalLink size={15} color={editorial.brand} />}
            onPress={() => void openExternalLink(winery.website)}
          >
            {t("wineries.visitWebsite")}
          </Button>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
  },
  cover: { height: 190, backgroundColor: wine[900] },
  coverImage: { width: "100%", height: "100%" },
  coverFallback: { width: "100%", height: "100%", backgroundColor: wine[900] },
  body: { gap: 14, padding: 18, paddingTop: 0 },
  logoFrame: {
    width: 92,
    height: 92,
    marginTop: -46,
    overflow: "hidden",
    borderRadius: radii.md,
    borderWidth: 4,
    borderColor: editorial.brand,
    backgroundColor: editorial.cream,
  },
  logo: { width: "100%", height: "100%" },
  logoFallback: { width: "100%", height: "100%" },
  titleBlock: { gap: 6 },
  name: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  location: { flex: 1, ...textStyles.bodySmall, color: lightTokens.textTertiary },
  meta: { ...textStyles.caption, color: lightTokens.textTertiary },
  description: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
});
