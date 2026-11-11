import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Check, LocateFixed, Map, MapPin, Search } from "lucide-react-native";
import { LocationPickerMap } from "@/presentation/components/features/location/LocationPickerMap";
import { Button } from "@/presentation/components/ui/Button";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { SearchField } from "@/presentation/components/ui/TextField";
import { isRegionQuery, isSelectedRegion } from "@/domain/notification/eventArea";
import { useCountryName } from "@/presentation/hooks/useCountryName";
import { lightTokens, radii, wine, iconStrokes } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { useEventArea } from "./useEventArea";

type ViewModel = ReturnType<typeof useEventArea>;

/** The "events near you" area, shown under that category's switches in the notification preferences sheet. */
export function EventAreaSection({ visible }: { visible: boolean }) {
  const vm = useEventArea(visible);
  const { t } = vm;

  return (
    <View style={styles.area}>
      <View style={styles.titleRow}>
        <MapPin size={16} color={wine[700]} strokeWidth={iconStrokes.thin} />
        <Text style={styles.title}>{t("notificationPreferences.area.title")}</Text>
      </View>
      <Text style={styles.hint}>{t("notificationPreferences.area.description")}</Text>

      {vm.isLoading ? (
        <ActivityIndicator accessibilityLabel={t("common.loading")} color={wine[700]} style={styles.loader} />
      ) : vm.loadFailed ? (
        <View style={styles.failure}>
          <Text style={styles.hint}>{t("notificationPreferences.area.loadError")}</Text>
          <Button variant="ghost" size="sm" onPress={vm.retry}>
            {t("common.retry")}
          </Button>
        </View>
      ) : (
        <AreaChoices vm={vm} />
      )}
    </View>
  );
}

function AreaChoices({ vm }: { vm: ViewModel }) {
  const { t, area, busy } = vm;
  const current = !area
    ? t("notificationPreferences.area.none")
    : area.kind === "REGION"
      ? area.regionName
      : area.placeName ?? t("notificationPreferences.area.approximate");

  return (
    <>
      <View style={styles.current}>
        <Text style={[styles.currentText, !area && styles.currentEmpty]}>{current}</Text>
      </View>

      {vm.notice && (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {t(
            vm.notice === "permission_denied"
              ? "notificationPreferences.area.permissionDenied"
              : "notificationPreferences.area.locationUnavailable",
          )}
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          fullWidth
          leftIcon={<LocateFixed size={16} color={wine[700]} strokeWidth={iconStrokes.thin} />}
          loading={busy === "location"}
          disabled={busy !== null}
          onPress={vm.chooseApproximateLocation}
        >
          {t("notificationPreferences.area.useLocation")}
        </Button>
        <Text style={styles.hint}>{t("notificationPreferences.area.useLocationHint")}</Text>
        <Button
          variant="outline"
          size="sm"
          fullWidth
          leftIcon={<Map size={16} color={wine[700]} strokeWidth={iconStrokes.thin} />}
          disabled={busy !== null}
          onPress={vm.toggleRegions}
        >
          {t("notificationPreferences.area.chooseRegion")}
        </Button>
        {vm.regionsOpen && <RegionSearch vm={vm} />}
        {area && (
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            loading={busy === "clear"}
            disabled={busy !== null}
            onPress={vm.stop}
            accessibilityLabel={t("notificationPreferences.area.stop")}
          >
            {t("notificationPreferences.area.stop")}
          </Button>
        )}
      </View>
    </>
  );
}

/** A search box over the region catalogue; the map appears when the catalogue has no match, or on demand. */
function RegionSearch({ vm }: { vm: ViewModel }) {
  const { t } = vm;
  return (
    <View style={styles.search}>
      <SearchField
        accessibilityLabel={t("notificationPreferences.area.searchLabel")}
        placeholder={t("notificationPreferences.area.searchPlaceholder")}
        value={vm.query}
        onChangeText={vm.setQuery}
        onClear={() => vm.setQuery("")}
        onSubmitEditing={vm.searchPlace}
        autoCorrect={false}
        autoFocus
      />
      <RegionResults vm={vm} />
      {vm.mapShown ? (
        <MapPicker vm={vm} />
      ) : (
        !vm.regionsLoading &&
        !vm.regionsFailed && (
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            leftIcon={<Map size={16} color={wine[700]} strokeWidth={iconStrokes.thin} />}
            disabled={vm.busy !== null}
            onPress={vm.openMap}
          >
            {t("notificationPreferences.area.pickOnMap")}
          </Button>
        )
      )}
    </View>
  );
}

function RegionResults({ vm }: { vm: ViewModel }) {
  const countryName = useCountryName();
  const { t } = vm;
  if (vm.regionsLoading) {
    return <ActivityIndicator accessibilityLabel={t("common.loading")} color={wine[700]} style={styles.loader} />;
  }
  if (vm.regionsFailed) {
    return (
      <View style={styles.failure}>
        <Text style={styles.hint}>{t("notificationPreferences.area.regionsError")}</Text>
        <Button variant="ghost" size="sm" onPress={vm.retryRegions}>
          {t("common.retry")}
        </Button>
      </View>
    );
  }
  if (!isRegionQuery(vm.query)) {
    return <Text style={styles.hint}>{t("notificationPreferences.area.searchHint")}</Text>;
  }
  if (vm.matches.length === 0) {
    return <Text style={styles.hint}>{t("notificationPreferences.area.noCatalogMatch")}</Text>;
  }
  return (
    <View style={styles.regions} accessibilityRole="radiogroup" accessibilityLabel={t("notificationPreferences.area.chooseRegion")}>
      {vm.matches.map((region, index) => {
        const selected = isSelectedRegion(vm.area, region.id);
        return (
          <MotionPressable
            key={region.id}
            accessibilityRole="radio"
            accessibilityLabel={region.name}
            accessibilityState={{ checked: selected, disabled: vm.busy !== null }}
            disabled={vm.busy !== null}
            onPress={() => vm.chooseRegion(region)}
            pressedScale={0.99}
            style={[
              styles.region,
              index === vm.matches.length - 1 && styles.lastRegion,
              selected && styles.regionActive,
            ]}
          >
            <View style={styles.regionText}>
              <Text style={[styles.regionName, selected && styles.regionNameSelected]}>{region.name}</Text>
              <Text style={styles.regionCountry}>{countryName(region.countryName)}</Text>
            </View>
            {selected && <Check size={18} color={wine[700]} strokeWidth={iconStrokes.regular} />}
          </MotionPressable>
        );
      })}
    </View>
  );
}

/** Like the event editor: searching moves the pin, a tap or drag adjusts it and only "use this point" saves. */
function MapPicker({ vm }: { vm: ViewModel }) {
  const { t } = vm;
  const failure =
    vm.placeFailure === "not_found"
      ? "notificationPreferences.area.placeNotFound"
      : vm.placeFailure === "unavailable"
        ? "notificationPreferences.area.placeUnavailable"
        : null;
  return (
    <View style={styles.place}>
      {vm.canSearchPlace && (
        <Button
          variant="outline"
          size="sm"
          fullWidth
          leftIcon={<Search size={16} color={wine[700]} strokeWidth={iconStrokes.thin} />}
          loading={vm.busy === "place"}
          disabled={vm.busy !== null}
          onPress={vm.searchPlace}
        >
          {t("notificationPreferences.area.searchMap", { query: vm.query.trim() })}
        </Button>
      )}
      {failure && (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {t(failure)}
        </Text>
      )}
      <LocationPickerMap
        latitude={vm.pin?.latitude ?? null}
        longitude={vm.pin?.longitude ?? null}
        title={vm.pin?.name}
        onChange={vm.movePin}
      />
      <Button
        size="sm"
        fullWidth
        leftIcon={<MapPin size={16} color={lightTokens.textInverted} strokeWidth={iconStrokes.thin} />}
        loading={vm.busy === "point"}
        disabled={vm.busy !== null || !vm.pin}
        onPress={vm.savePin}
      >
        {t("notificationPreferences.area.usePoint")}
      </Button>
      <Text style={styles.hint}>{t("notificationPreferences.area.placeHint")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lightTokens.borderDefault,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { ...textStyles.labelMedium, color: lightTokens.textPrimary },
  hint: { ...textStyles.caption, color: lightTokens.textTertiary },
  loader: { alignSelf: "flex-start", marginVertical: 6 },
  failure: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  current: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: wine[100],
    backgroundColor: wine[50],
  },
  currentText: { ...textStyles.bodySmall, color: wine[800] },
  currentEmpty: { color: lightTokens.textSecondary },
  notice: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  actions: { gap: 8, marginTop: 6 },
  search: { gap: 8 },
  place: { gap: 8 },
  regions: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.md,
  },
  region: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.borderDefault,
  },
  lastRegion: { borderBottomWidth: 0 },
  regionActive: { backgroundColor: wine[50] },
  regionText: { flex: 1, gap: 1 },
  regionName: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  regionNameSelected: { color: wine[800] },
  regionCountry: { ...textStyles.caption, color: lightTokens.textTertiary },
});
