import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useTranslation } from "react-i18next";
import { hasCoordinates } from "@/domain/location/coordinates";
import { vinnotColors as colors, vinnotFonts as fonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { radii } from "@/shared/theme/tokens";

type Props = {
  latitude: number | null;
  longitude: number | null;
  title?: string;
  onChange: (latitude: number, longitude: number) => void;
};
const overview = { latitude: -34.6, longitude: -64, latitudeDelta: 35, longitudeDelta: 35 };
/** The viewport is free to pan; only a deliberate press or marker drag selects a location. */
export function LocationPickerMap({ latitude, longitude, title, onChange }: Props) {
  const { t } = useTranslation();
  const map = useRef<MapView>(null);
  const point = { latitude, longitude };
  const selected = hasCoordinates(point);
  useEffect(() => {
    if (latitude != null && longitude != null)
      map.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.018, longitudeDelta: 0.018 },
        250,
      );
  }, [latitude, longitude]);
  const select = (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => onChange(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.hint}>{t("eventEditor.mapHelp")}</Text>
      <MapView
        ref={map}
        style={styles.map}
        initialRegion={
          selected
            ? {
                latitude: point.latitude,
                longitude: point.longitude,
                latitudeDelta: 0.018,
                longitudeDelta: 0.018,
              }
            : overview
        }
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        moveOnMarkerPress={false}
        onPress={select}
        onLongPress={select}
        accessibilityLabel={t("eventEditor.mapLabel")}
      >
        {selected && (
          <Marker
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={title}
            draggable
            onDragEnd={(event) =>
              onChange(
                event.nativeEvent.coordinate.latitude,
                event.nativeEvent.coordinate.longitude,
              )
            }
          />
        )}
      </MapView>
      <Text style={styles.hint} accessibilityLiveRegion="polite">
        {selected
          ? t("eventEditor.selectedPoint", {
              latitude: point.latitude.toFixed(5),
              longitude: point.longitude.toFixed(5),
            })
          : t("eventEditor.noPoint")}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  map: { height: 260, borderRadius: radii.xl },
  hint: { fontFamily: fonts.regular, fontSize: fontSizes.xs, lineHeight: 18, color: colors.muted },
});
