import { hasCoordinates } from '@/domain/location/coordinates'
/**
 * RouteMap — native route map for stops.
 */
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { MapPin, Navigation } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { useRouteNavigation } from "./useRouteNavigation";
import { textStyles } from "@/shared/theme/typography";
import type { RouteStop } from "@/domain/route/route.types";

interface RouteMapProps {
  stops: RouteStop[];
}

export function RouteMap({ stops }: RouteMapProps) {
  const { t } = useTranslation();
  const { openRoute } = useRouteNavigation();
  const coordinates = stops
    .flatMap((stop) => hasCoordinates(stop.location) ? [{
      id: stop.id,
      name: stop.name,
      latitude: stop.location.latitude,
      longitude: stop.location.longitude,
    }] : []);
  const first = coordinates[0];


  return (
    <Card elevation="none" padding={0} radius={radii["2xl"]} style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("wineRoutes.routeMap")}</Text>
          <Text style={styles.subtitle}>{t("wineRoutes.routeMapDesc")}</Text>
        </View>
      </View>

      {first ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: first.latitude,
            longitude: first.longitude,
            latitudeDelta: 0.18,
            longitudeDelta: 0.18,
          }}
        >
          {coordinates.length > 1 && (
            <Polyline
              coordinates={coordinates.map(({ latitude, longitude }) => ({ latitude, longitude }))}
              strokeColor={wine[700]}
              strokeWidth={4}
            />
          )}
          {coordinates.map((coordinate, index) => (
            <Marker
              key={coordinate.id}
              coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
              title={`${index + 1}. ${coordinate.name}`}
            />
          ))}
        </MapView>
      ) : (
        <View style={styles.emptyMap}>
          <MapPin size={24} color={wine[700]} />
          <Text style={styles.emptyTitle}>{t("wineRoutes.mapUnavailable")}</Text>
          <Text style={styles.emptyText}>{t("wineRoutes.mapUnavailableDesc")}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          fullWidth
          variant="outline"
          onPress={() => void openRoute(stops)}
          disabled={stops.length === 0}
          leftIcon={<Navigation size={16} color={wine[700]} />}
        >
          {t("wineRoutes.startNavigation")}
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
  },
  header: { padding: 16 },
  title: { ...textStyles.titleMedium, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.caption, color: lightTokens.textTertiary, marginTop: 3 },
  map: { height: 260 },
  emptyMap: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
    backgroundColor: lightTokens.bgSubtle,
  },
  emptyTitle: { ...textStyles.titleMedium, color: lightTokens.textPrimary, textAlign: "center" },
  emptyText: { ...textStyles.bodySmall, color: lightTokens.textTertiary, textAlign: "center" },
  footer: { padding: 16 },
});
