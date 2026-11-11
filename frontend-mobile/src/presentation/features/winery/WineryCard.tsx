import { illustrations } from "@/shared/illustrations";
/**
 * WineryCard — mobile winery card for list views.
 */
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react-native";
import { PressableCard } from "@/presentation/components/ui/Card";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import { editorial, lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { WinerySummary } from "@/domain/winery/winery.types";
import { useCountryName } from "@/presentation/hooks/useCountryName";

interface WineryCardProps {
  winery: WinerySummary;
  onPress: () => void;
}

export function WineryCard({ winery, onPress }: WineryCardProps) {
  const { t } = useTranslation();
  const countryName = useCountryName();
  const location = [winery.regionName, countryName(winery.countryName)].filter(Boolean).join(", ");

  return (
    <PressableCard onPress={onPress} padding={0} radius={radii.md} style={styles.card}>
      <View style={styles.logoArea}>
        <View style={styles.logoFrame}>
          <ImageWithFallback
            uri={winery.logoUrl ?? winery.imageUrl}
            fallbackSource={illustrations.winery}
            alt={winery.name}
            style={styles.logo}
            containerStyle={styles.logoFallback}
          />
        </View>
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>{winery.name}</Text>
        {!!location && (
          <View style={styles.locationRow}>
            <MapPin size={13} color={lightTokens.textTertiary} />
            <Text numberOfLines={1} style={styles.location}>{location}</Text>
          </View>
        )}
        {!location && <Text style={styles.location}>{t("wineries.noLocation")}</Text>}
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
  },
  logoArea: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: lightTokens.bgSubtle,
  },
  logoFrame: {
    width: 104,
    height: 104,
    overflow: "hidden",
    borderRadius: radii.md,
    backgroundColor: editorial.cream,
    borderWidth: 1,
    borderColor: editorial.brandMuted,
  },
  logo: { width: "100%", height: "100%" },
  logoFallback: { width: "100%", height: "100%", backgroundColor: editorial.creamMuted },
  body: { gap: 9, padding: 15 },
  name: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  location: { flex: 1, ...textStyles.caption, color: lightTokens.textTertiary },
});
