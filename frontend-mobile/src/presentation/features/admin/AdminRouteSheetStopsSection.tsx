/**
 * Stops of a wine route: a winery search that offers "+ Create winery «X»" when the winery
 * is missing, the map, the ordered stop list with geocoding, and a labelled manual stop.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { ArrowDown, ArrowUp, LocateFixed, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { hasCoordinates } from "@/domain/location/coordinates";
import type { AdminRouteStop, AdminWinery } from "@/domain/admin/admin.types";
import type { ManualStopDraft, ManualStopError } from "@/domain/admin/adminRouteDraft";
import { EntityPicker, type PickerOption } from "@/presentation/components/forms";
import { LocationPickerMap } from "@/presentation/components/features/location/LocationPickerMap";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import { iconStrokes, lightTokens } from "@/shared/theme/tokens";
import { STOP_WINERY_MIN_QUERY } from "./AdminRouteSheet.contracts";
import { ManualStopFields } from "./AdminRouteSheetFields";
import { InlineWineryCreator } from "./forms/InlineWineryCreator";
import { styles } from "./AdminRouteSheet.styles";

/** Room around the stop pins when the map refits to show the whole route. */
const MAP_FIT_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

/** Grows each 28pt stop action to a 44pt touch target. */
const STOP_ACTION_HIT_SLOP = 8;

type Props = {
  winerySearch: string;
  updateWinerySearch: (value: string) => void;
  wineryResults: AdminWinery[];
  wineryLoading?: boolean;
  selectWineryAsStop: (winery: AdminWinery) => void;
  coordinates: Array<AdminRouteStop & { latitude: number; longitude: number }>;
  mapCenter: { latitude: number; longitude: number };
  stops: AdminRouteStop[];
  geocodingStopIndex: number | null;
  geocodeQuery: string;
  updateGeocodingStopIndex: (index: number | null) => void;
  updateGeocodeQuery: (value: string) => void;
  selectStopLocation: (index: number, latitude: number, longitude: number) => void;
  geocodeStop: (index: number) => Promise<void>;
  isGeocoding: boolean;
  moveStop: (index: number, direction: "up" | "down") => void;
  removeStop: (index: number) => void;
  manualStop: ManualStopDraft;
  manualErrors?: readonly ManualStopError[];
  updateManualStop: (updater: (current: ManualStopDraft) => ManualStopDraft) => void;
  addManualStop: () => void;
  disabled?: boolean;
};

function toOption(winery: AdminWinery, t: (key: string) => string): PickerOption {
  const place = [winery.regionName, winery.countryName].filter(Boolean).join(", ");
  const gps = hasCoordinates(winery) ? t("admin.routes.gpsTag") : t("admin.routes.noGpsTag");
  return { id: winery.id, label: winery.name, description: [place, gps].filter(Boolean).join(" · ") };
}

export function AdminRouteSheetStopsSection({
  winerySearch,
  updateWinerySearch,
  wineryResults,
  wineryLoading = false,
  selectWineryAsStop,
  coordinates,
  mapCenter,
  stops,
  geocodingStopIndex,
  geocodeQuery,
  updateGeocodingStopIndex,
  updateGeocodeQuery,
  geocodeStop,
  selectStopLocation,
  isGeocoding,
  moveStop,
  removeStop,
  manualStop,
  manualErrors = [],
  updateManualStop,
  addManualStop,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const [mapStop, setMapStop] = useState<number | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  // Suggestions belong to the text being typed: once a pick clears the search, stale results are hidden.
  const suggestions = winerySearch.trim() ? wineryResults : [];
  const coordinateKey = coordinates.map((item) => `${item.latitude},${item.longitude}`).join("|");
  const totalMinutes = stops.reduce((sum, stop) => sum + (stop.estimatedDuration || 0), 0);

  useEffect(() => {
    if (coordinates.length === 0) return;
    mapRef.current?.fitToCoordinates(
      coordinates.map((item) => ({ latitude: item.latitude, longitude: item.longitude })),
      { edgePadding: MAP_FIT_PADDING, animated: true },
    );
    // Refit only when the set of pinned positions changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinateKey]);

  return (
    <View style={styles.fields}>
      <EntityPicker
        label={t("admin.routes.searchWinery")}
        placeholder={t("admin.routes.addWineryStop")}
        searchPlaceholder={t("admin.routes.searchWineryPlaceholder")}
        options={suggestions.map((winery) => toOption(winery, t))}
        loading={wineryLoading}
        onQueryChange={updateWinerySearch}
        minQueryLength={STOP_WINERY_MIN_QUERY}
        emptyLabel={t("admin.routes.noWineriesFound")}
        createLabel={(name) => t("admin.wines.createWineryNamed", { name })}
        onCreate={setCreating}
        value={null}
        onChange={(option) => {
          const winery = option && suggestions.find((item) => item.id === option.id);
          if (winery) selectWineryAsStop(winery);
        }}
        hint={t("admin.routes.searchWineriesHelp")}
        disabled={disabled || creating != null}
        testID="route-stop-winery-picker"
      />
      {creating != null && (
        <InlineWineryCreator
          initialName={creating}
          onCancel={() => setCreating(null)}
          onCreated={(winery) => {
            setCreating(null);
            selectWineryAsStop(winery);
          }}
        />
      )}

      {coordinates.length > 0 && (
        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: mapCenter.latitude,
              longitude: mapCenter.longitude,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
          >
            {coordinates.length > 1 && (
              <Polyline
                coordinates={coordinates.map((item) => ({ latitude: item.latitude, longitude: item.longitude }))}
                strokeColor={lightTokens.brandPrimary}
                strokeWidth={4}
              />
            )}
            {coordinates.map((item, index) => (
              <Marker key={`${item.name}-${index}`} coordinate={{ latitude: item.latitude, longitude: item.longitude }} title={`${index + 1}. ${item.name}`} />
            ))}
          </MapView>
        </View>
      )}

      {stops.length > 0 ? (
        <View style={styles.stopsList}>
          {stops.map((stop, index) => (
            <View key={`${stop.name}-${index}`} style={styles.stopCard}>
              <View style={styles.stopTop}>
                <View style={styles.stopOrder}><Text style={styles.stopOrderText}>{index + 1}</Text></View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={styles.stopMeta}>
                    {t(`admin.routes.stopTypes.${stop.type}`, { defaultValue: stop.type })} · {stop.estimatedDuration} {t("admin.routes.minutesShort")} · {hasCoordinates(stop) ? t("admin.routes.gpsTag") : t("admin.routes.noGpsTag")}
                  </Text>
                  {hasCoordinates(stop) && <Text style={styles.stopCoords}>{stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}</Text>}
                </View>
                <View style={styles.stopActions}>
                  {/* 28pt icons; the hit slop grows each target to 44pt. */}
                  {index > 0 && <Pressable onPress={() => moveStop(index, "up")} disabled={disabled} style={styles.iconButton} hitSlop={STOP_ACTION_HIT_SLOP}
                    accessibilityRole="button" accessibilityLabel={t("admin.routes.moveStopUp", { name: stop.name })}><ArrowUp size={14} color={lightTokens.textTertiary} /></Pressable>}
                  {index < stops.length - 1 && <Pressable onPress={() => moveStop(index, "down")} disabled={disabled} style={styles.iconButton} hitSlop={STOP_ACTION_HIT_SLOP}
                    accessibilityRole="button" accessibilityLabel={t("admin.routes.moveStopDown", { name: stop.name })}><ArrowDown size={14} color={lightTokens.textTertiary} /></Pressable>}
                  <Pressable onPress={() => removeStop(index)} disabled={disabled} style={styles.iconButton} hitSlop={STOP_ACTION_HIT_SLOP}
                    accessibilityRole="button" accessibilityLabel={t("admin.routes.removeStop", { name: stop.name })}><Trash2 size={14} color={lightTokens.danger} /></Pressable>
                </View>
              </View>
              <View style={styles.stopBottom}>
                <TextField
                  label={t("admin.routes.stopLocation")}
                  value={geocodingStopIndex === index ? geocodeQuery : ""}
                  onFocus={() => {
                    updateGeocodingStopIndex(index);
                    updateGeocodeQuery(stop.address || stop.name);
                  }}
                  onChangeText={(value) => {
                    updateGeocodingStopIndex(index);
                    updateGeocodeQuery(value);
                  }}
                  placeholder={hasCoordinates(stop) ? t("admin.routes.fixLocation") : t("admin.routes.searchStopLocation", { stop: stop.name })}
                  containerStyle={styles.geoInput}
                  editable={!disabled}
                />
                <Button
                  variant="secondary"
                  disabled={disabled}
                  loading={isGeocoding && geocodingStopIndex === index}
                  onPress={() => void geocodeStop(index)}
                  leftIcon={<LocateFixed size={15} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.regular} />}
                  style={styles.geoButton}
                >
                  {t("common.search")}
                </Button>
              </View>
              <Button variant="ghost" size="sm" disabled={disabled} onPress={() => setMapStop((current) => (current === index ? null : index))}>
                {t("admin.routes.pinOnMap")}
              </Button>
              {mapStop === index && <LocationPickerMap latitude={stop.latitude} longitude={stop.longitude}
                title={stop.name} onChange={(latitude, longitude) => selectStopLocation(index, latitude, longitude)} />}
            </View>
          ))}
          <Text style={styles.totalTime}>{t("admin.routes.totalTime", { minutes: totalMinutes })}</Text>
        </View>
      ) : (
        <View style={styles.emptyStops}>
          <Text style={styles.emptyText}>{t("admin.routes.searchWineriesToBuild")}</Text>
        </View>
      )}

      <ManualStopFields value={manualStop} errors={manualErrors} onChange={updateManualStop} onAdd={addManualStop} disabled={disabled} />
    </View>
  );
}
