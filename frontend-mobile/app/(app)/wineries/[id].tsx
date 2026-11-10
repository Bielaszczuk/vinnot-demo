/**
 * Winery Detail Screen.
 */
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, MapPin, Phone } from "lucide-react-native";
import MapView, { Marker } from "react-native-maps";
import { useTranslation } from "react-i18next";
import { Card } from "@/presentation/components/ui/Card";
import { BackButton } from "@/presentation/components/ui/BackButton";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { Button } from "@/presentation/components/ui/Button";
import { EmptyState, Spinner } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { goBackOr, WINERIES_ROUTE } from "@/presentation/navigation/discoveryNavigation";
import { WineryHero, WineryWineGrid } from "@/presentation/features/winery";
import { lightTokens, layout, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { useWineryDetailViewModel } from "@/presentation/features/winery/useWineryDetailViewModel";

export default function WineryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const {
    isLoading,
    loadError,
    retry,
    isLoadingWines,
    isFetching,
    displayWinery,
    wines,
    address,
    mapQuery,
    refresh,
  } = useWineryDetailViewModel();
  // A winery opened from a shared link has no history to go back to.
  const goBack = () => goBackOr(router, WINERIES_ROUTE);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner size="lg" />
      </View>
    );
  }

  if (!displayWinery) {
    return (
      <View style={styles.centered}>
        {loadError ? (
          <>
            <QueryErrorState error={loadError} onRetry={retry} />
            <Button variant="ghost" onPress={goBack}>{t("common.back")}</Button>
          </>
        ) : (
          <EmptyState
            illustration="winery"
            title={t("wineries.notFound")}
            action={{ label: t("common.back"), onPress: goBack }}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 },
      ]}
      refreshControl={
        <BrandRefreshControl refreshing={isFetching} onRefresh={refresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <BackButton fallback={WINERIES_ROUTE} />

      <WineryHero winery={displayWinery} />

      <View style={styles.grid}>
        <ContactCard
          email={displayWinery.email}
          phone={displayWinery.phone}
          address={address}
        />
        <Card padding={0} radius={radii.md} style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.cardTitle}>{t("wineries.location")}</Text>
            <Text numberOfLines={2} style={styles.mapAddress}>{address || displayWinery.name}</Text>
          </View>
          {displayWinery.latitude && displayWinery.longitude ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: displayWinery.latitude,
                longitude: displayWinery.longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
            >
              <Marker
                coordinate={{ latitude: displayWinery.latitude, longitude: displayWinery.longitude }}
                title={displayWinery.name}
                description={address || undefined}
              />
            </MapView>
          ) : (
            <View style={styles.mapFallback}>
              <MapPin size={28} color={lightTokens.brandPrimary} />
              <Text style={styles.mapText}>{t("wineries.mapUnavailable", "Mapa no disponible")}</Text>
            </View>
          )}
          <View style={styles.mapFooter}>
            <Pressable
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`)}
              style={styles.openMapsButton}
              accessibilityRole="link"
            >
              <Text style={styles.openMapsText}>{t("events.openMaps")}</Text>
            </Pressable>
          </View>
        </Card>
      </View>

      <WineryWineGrid wines={wines} isLoading={isLoadingWines} />
    </ScrollView>
  );
}

function ContactCard({ email, phone, address }: { email: string | null; phone: string | null; address: string | null }) {
  const { t } = useTranslation();
  const hasContact = !!(email || phone || address);

  return (
    <Card radius={radii.md} style={styles.contactCard}>
      <Text style={styles.cardTitle}>{t("wineries.contact")}</Text>
      {!hasContact && <Text style={styles.emptyText}>{t("wineries.noContactInfo")}</Text>}
      {!!email && (
        <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${email}`)}>
          <Mail size={17} color={lightTokens.brandAccent} />
          <Text style={styles.contactText}>{email}</Text>
        </Pressable>
      )}
      {!!phone && (
        <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Phone size={17} color={lightTokens.brandAccent} />
          <Text style={styles.contactText}>{phone}</Text>
        </Pressable>
      )}
      {!!address && (
        <View style={styles.contactRow}>
          <MapPin size={17} color={lightTokens.brandAccent} />
          <Text style={styles.contactText}>{address}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.bgBase,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalPadding,
    gap: 18,
  },
  grid: { gap: 14 },
  contactCard: { gap: 13, borderWidth: 1, borderColor: lightTokens.borderDefault },
  cardTitle: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  contactRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  contactText: { flex: 1, ...textStyles.bodySmall, color: lightTokens.textSecondary },
  emptyText: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  mapCard: { overflow: "hidden", borderWidth: 1, borderColor: lightTokens.borderDefault },
  mapHeader: { gap: 4, padding: 16 },
  mapAddress: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  map: { height: 220 },
  mapFallback: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: lightTokens.bgMuted,
  },
  mapFooter: { padding: 14 },
  openMapsButton: {
    alignItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightTokens.brandPrimary,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: lightTokens.surfaceDefault,
  },
  openMapsText: { ...textStyles.labelMedium, color: lightTokens.brandPrimary },
  mapText: { ...textStyles.labelMedium, color: lightTokens.brandPrimary },
});
