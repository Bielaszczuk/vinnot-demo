import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
/**
 * Events Tab Screen — nearby map + searchable event feed.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker, type Region } from "react-native-maps";
import { FlashList } from "@shopify/flash-list";
import { MapPin } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { FilterSheet } from "@/presentation/components/ui/FilterSheet";
import { SearchFilterBar } from "@/presentation/components/ui/SearchFilterBar";
import { BrowseScreenHeader } from "@/presentation/components/layout/BrowseScreenHeader";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { EventCard, EVENT_TYPE_OPTIONS } from "@/presentation/features/event";
import { EventTypeGlyph } from "@/presentation/features/event/EventTypeGlyph";
import {
  useDiscoverEvents,
  useEvents,
  useNearbyEvents,
} from "@/presentation/hooks/queries/event";
import { useCountries } from "@/presentation/hooks/queries/wine";
import { useDebounce, useGeolocation } from "@/presentation/hooks/ui";
import { useEventAreaFilter } from "@/presentation/features/event/useEventAreaFilter";
import {
  filterEventCatalog,
  normalizeEventSearch,
} from "@/presentation/features/event/eventCatalogFilter";
import {
  EVENT_CATALOG_PAGE_SIZE,
  EVENT_DISCOVERY_RADIUS_KM,
} from "@/presentation/features/event/eventDiscoveryConfig";
import { layout, radii } from "@/shared/theme/tokens";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import type { EventType } from "@/domain/event/event.types";
import type { Event } from "@/domain/event/event.types";
import {
  EventAreaSearch,
  EventFilterOptions,
  EventFilterSelect,
  HeroPill,
} from "@/presentation/features/event/EventFilterControls";
import { styles } from "@/presentation/features/event/events.styles";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { useCountryName } from "@/presentation/hooks/useCountryName";

const DEFAULT_REGION = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 8,
  longitudeDelta: 8,
};
/** About 30 km across: the person's city and its surroundings. */
const NEARBY_DELTA = 0.3;
const CAMERA_ANIMATION_MS = 450;

function nearbyRegion(latitude: number, longitude: number): Region {
  return { latitude, longitude, latitudeDelta: NEARBY_DELTA, longitudeDelta: NEARBY_DELTA };
}

export default function EventsScreen() {
  const { t } = useTranslation();
  const countryName = useCountryName();
  const { formatNumber } = useFormatters();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const geo = useGeolocation();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<EventType | "ALL">("ALL");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<"country" | null>(null);
  const debouncedSearch = useDebounce(normalizeEventSearch(search), 250);
  const hasLocation = typeof geo.latitude === "number" && typeof geo.longitude === "number";
  const areaFilter = useEventAreaFilter(selectedCountry);
  const hasCatalogFilters =
    Boolean(debouncedSearch) || selectedType !== "ALL" || Boolean(selectedCountry);

  const allEventsQuery = useEvents(
    hasCatalogFilters
      ? {
          search: debouncedSearch || undefined,
          type: selectedType === "ALL" ? undefined : selectedType,
          country: areaFilter.selection ? undefined : selectedCountry || undefined,
        }
      : undefined,
    0,
    EVENT_CATALOG_PAGE_SIZE,
  );
  const discoveryQuery = useDiscoverEvents(
    {
      latitude: geo.latitude ?? 0,
      longitude: geo.longitude ?? 0,
      radiusKm: EVENT_DISCOVERY_RADIUS_KM,
      page: 0,
      pageSize: EVENT_CATALOG_PAGE_SIZE,
    },
    hasLocation,
  );
  const areaEventsQuery = useNearbyEvents(
    {
      latitude: areaFilter.selection?.latitude ?? 0,
      longitude: areaFilter.selection?.longitude ?? 0,
      radiusKm: EVENT_DISCOVERY_RADIUS_KM,
    },
    Boolean(areaFilter.selection),
  );
  const { data: countries = [] } = useCountries();

  const nearbyEvents = useMemo(
    () => discoveryQuery.data?.nearbyEvents ?? [],
    [discoveryQuery.data?.nearbyEvents],
  );
  const otherEvents = useMemo(
    () => discoveryQuery.data?.otherEvents ?? [],
    [discoveryQuery.data?.otherEvents],
  );
  const allEvents = useMemo(() => eventItems(allEventsQuery.data), [allEventsQuery.data]);
  const areaEvents = useMemo(() => eventItems(areaEventsQuery.data), [areaEventsQuery.data]);
  const isAreaMode = Boolean(areaFilter.selection);
  const shouldUseNearby = hasLocation && discoveryQuery.data?.nearbyEventsFound === true;
  const sourceEvents = isAreaMode
    ? areaEvents
    : hasCatalogFilters
      ? allEvents
      : hasLocation
        ? shouldUseNearby
          ? nearbyEvents
          : otherEvents
        : allEvents;
  const activeQuery = isAreaMode ? areaEventsQuery : hasCatalogFilters || !hasLocation ? allEventsQuery : discoveryQuery;
  const isLoading = isAreaMode
    ? areaEventsQuery.isLoading
    : hasCatalogFilters || !hasLocation
      ? allEventsQuery.isLoading
      : discoveryQuery.isLoading;
  const isRefreshing = isAreaMode
    ? areaEventsQuery.isFetching
    : hasCatalogFilters || !hasLocation
      ? allEventsQuery.isFetching
      : discoveryQuery.isFetching;
  const activeFilterCount =
    Number(selectedType !== "ALL") +
    Number(Boolean(selectedCountry)) +
    Number(Boolean(areaFilter.selection));

  const clearFilters = () => {
    setSelectedType("ALL");
    setSelectedCountry("");
    areaFilter.clearArea();
    setOpenFilter(null);
  };

  const refreshEvents = () => {
    if (isAreaMode) {
      void areaEventsQuery.refetch();
      return;
    }
    if (!hasCatalogFilters && hasLocation) {
      void discoveryQuery.refetch();
      return;
    }
    void allEventsQuery.refetch();
  };

  const countryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...countries.map((country) => country.name),
            ...allEvents.map((event) => event.location.country),
            ...nearbyEvents.map((event) => event.location.country),
            ...otherEvents.map((event) => event.location.country),
          ].filter((country): country is string => Boolean(country?.trim())),
        ),
      ).sort((left, right) => countryName(left).localeCompare(countryName(right))),
    [allEvents, countries, countryName, nearbyEvents, otherEvents],
  );

  const filteredEvents = useMemo(
    () =>
      filterEventCatalog(sourceEvents, {
        search: debouncedSearch,
        type: selectedType,
        country: selectedCountry,
        ignoreCountry: isAreaMode,
      }),
    [debouncedSearch, isAreaMode, selectedCountry, selectedType, sourceEvents],
  );

  const eventsWithCoordinates = useMemo(
    () =>
      filteredEvents.filter(
        (event) =>
          Number.isFinite(event.location.latitude) &&
          Number.isFinite(event.location.longitude),
      ),
    [filteredEvents],
  );

  const mapRegion = useMemo<Region>(() => {
    const firstEvent = eventsWithCoordinates[0];
    if (areaFilter.selection) {
      return nearbyRegion(areaFilter.selection.latitude, areaFilter.selection.longitude);
    }
    if (!hasCatalogFilters && hasLocation) {
      return nearbyRegion(geo.latitude!, geo.longitude!);
    }
    if (firstEvent?.location.latitude && firstEvent.location.longitude) {
      return nearbyRegion(firstEvent.location.latitude, firstEvent.location.longitude);
    }
    return DEFAULT_REGION;
  }, [
    areaFilter.selection,
    eventsWithCoordinates,
    geo.latitude,
    geo.longitude,
    hasCatalogFilters,
    hasLocation,
  ]);

  // Apple Maps keeps its first camera and ignores later `region` props, so the
  // camera moves explicitly once the map is ready and whenever the target changes.
  const mapRef = useRef<MapView>(null);
  const moveCameraToRegion = useCallback(() => {
    mapRef.current?.animateToRegion(mapRegion, CAMERA_ANIMATION_MS);
  }, [mapRegion]);
  useEffect(moveCameraToRegion, [moveCameraToRegion]);

  const header = (
    <View style={styles.headerWrap}>
      <BrowseScreenHeader
        title={t("events.title")}
        subtitle={t("events.subtitle")}
        notice={
          !!geo.error && !geo.loading && !isAreaMode && !hasCatalogFilters ? (
            <Text style={styles.geoNotice} testID="events-location-notice">
              {t(geo.error === "permission_denied" ? "events.locationDenied" : "events.locationError")}.{" "}
              {t("events.showingAll")}.
            </Text>
          ) : null
        }
        style={styles.browseHeader}
      >
        <SearchFilterBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch("")}
          placeholder={t("events.searchPlaceholder")}
          activeFilterCount={activeFilterCount}
          onFilterPress={() => setFiltersOpen(true)}
          isLoading={isRefreshing && search.trim().length > 0}
          filterAccessibilityLabel={t("common.filter")}
          clearAccessibilityLabel={t("common.clear")}
        />
        {activeFilterCount > 0 ? (
          <View style={styles.activeSummary}>
            {selectedType !== "ALL" ? (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>
                  {t(`events.types.${selectedType}`, selectedType)}
                </Text>
              </View>
            ) : null}
            {selectedCountry ? (
              <View style={styles.activeChip}>
                <Text numberOfLines={1} style={styles.activeChipText}>
                  {countryName(selectedCountry)}
                </Text>
              </View>
            ) : null}
            {areaFilter.selection ? (
              <View style={styles.activeChip}>
                <Text numberOfLines={1} style={styles.activeChipText}>
                  {areaFilter.selection.city ||
                    areaFilter.selection.region ||
                    areaFilter.selection.label}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </BrowseScreenHeader>

      <View style={styles.mapCard}>
        {eventsWithCoordinates.length > 0 || hasLocation || areaFilter.selection ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            onMapReady={moveCameraToRegion}
          >
            {areaFilter.selection ? (
              <Marker
                coordinate={{
                  latitude: areaFilter.selection.latitude,
                  longitude: areaFilter.selection.longitude,
                }}
                title={areaFilter.selection.city || areaFilter.selection.label}
                description={t("events.selectedArea", "Zona seleccionada")}
                pinColor={vinnotColors.brand}
              />
            ) : hasLocation && !hasCatalogFilters ? (
              <Marker
                coordinate={{ latitude: geo.latitude!, longitude: geo.longitude! }}
                title={t("events.yourLocation")}
                pinColor={vinnotColors.brand}
              />
            ) : null}
            {eventsWithCoordinates.map((event) => (
              <Marker
                key={event.id}
                coordinate={{
                  latitude: event.location.latitude!,
                  longitude: event.location.longitude!,
                }}
                title={event.title}
                description={[event.location.name, event.location.city].filter(Boolean).join(", ")}
                onCalloutPress={() => router.push(`/(app)/(tabs)/events/${event.id}`)}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.mapEmpty}>
            <View style={styles.mapEmptyIcon}>
              <MapPin size={22} color={vinnotColors.brand} />
            </View>
            <Text style={styles.mapEmptyTitle}>{t("events.mapUnavailable")}</Text>
            <Text style={styles.mapEmptyText}>{t("events.mapListUnavailableDesc")}</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.listLabel}>
            {areaFilter.selection
              ? t("events.nearSelectedArea", {
                  area:
                    areaFilter.selection.city ||
                    areaFilter.selection.region ||
                    areaFilter.query,
                  defaultValue: "Eventos cerca de {{area}}",
                })
              : !hasCatalogFilters && shouldUseNearby
                ? t("events.nearby")
                : t("events.allEvents")}
          </Text>
          <Text style={styles.resultCount}>
            {t("events.availableCount", { count: filteredEvents.length, value: formatNumber(filteredEvents.length) })}
          </Text>
        </View>
        {(search || selectedType !== "ALL" || selectedCountry || areaFilter.selection) && (
          <MotionPressable
            pressedScale={0.96}
            style={styles.clearButton}
            onPress={() => {
              setSearch("");
              clearFilters();
            }}
          >
            <Text style={styles.clearText}>{t("common.clear")}</Text>
          </MotionPressable>
        )}
      </View>
      {!hasCatalogFilters && !isAreaMode && hasLocation && !shouldUseNearby && !isLoading && filteredEvents.length > 0 ? (
        <View style={styles.discoveryNotice}>
          <View style={styles.discoveryNoticeIcon}>
            <MapPin size={17} color={vinnotColors.brand} />
          </View>
          <View style={styles.discoveryNoticeText}>
            <Text style={styles.discoveryNoticeTitle}>
              {t("events.discoveryFallbackTitle")}
            </Text>
            <Text style={styles.discoveryNoticeBody}>
              {t("events.discoveryFallbackBody")}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {isLoading ? (
        <ScrollView contentContainerStyle={[styles.loadingContent, { paddingBottom: 24 }]}>
          {header}
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height={293} radius={radii["2xl"]} />
          ))}
        </ScrollView>
      ) : (
        <FlashList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => router.push(`/(app)/(tabs)/events/${item.id}`)}
            />
          )}
          ListHeaderComponent={<>{header}{activeQuery.isError && <QueryErrorState error={activeQuery.error} onRetry={refreshEvents} />}</>}
          ListEmptyComponent={activeQuery.isError ? null :
            <EmptyState
              illustration="event"
              title={t("events.noEvents")}
              description={t("events.noEventsDesc")}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: layout.screenHorizontalPadding,
            paddingBottom: 24,
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <BrandRefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshEvents}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      <FilterSheet
        visible={filtersOpen}
        title={t("common.filter")}
        activeCount={activeFilterCount}
        clearLabel={t("common.clear")}
        onClear={clearFilters}
        onClose={() => {
          setFiltersOpen(false);
          setOpenFilter(null);
        }}
      >
        <View style={styles.filterSection}>
          <Text style={styles.sheetFilterLabel}>{t("events.eventType", "Tipo de evento")}</Text>
          <View style={styles.typeGrid}>
            <HeroPill
              label={t("events.all")}
              selected={selectedType === "ALL"}
              onPress={() => setSelectedType("ALL")}
            />
            {EVENT_TYPE_OPTIONS.map((option) => {
              const selected = selectedType === option.value;
              return (
                <HeroPill
                  key={option.value}
                  label={t(`events.types.${option.value}`, option.value)}
                  icon={
                    <EventTypeGlyph
                      type={option.value}
                      size={15}
                      color={selected ? vinnotColors.white : vinnotColors.brand}
                    />
                  }
                  selected={selected}
                  onPress={() => setSelectedType(option.value)}
                />
              );
            })}
          </View>
        </View>
        <EventFilterSelect
          label={t("wines.country", "País")}
          value={countryName(selectedCountry)}
          open={openFilter === "country"}
          onPress={() => setOpenFilter((current) => (current === "country" ? null : "country"))}
        />
        {openFilter === "country" ? (
          <EventFilterOptions
            options={countryOptions}
            value={selectedCountry}
            formatOption={countryName}
            searchPlaceholder={t("events.searchCountry", "Buscar país")}
            emptyLabel={t("events.noCountries", "No encontramos países")}
            onChange={(value) => {
              setSelectedCountry(value);
              areaFilter.clearArea();
              setOpenFilter(null);
            }}
          />
        ) : null}
        <EventAreaSearch
          query={areaFilter.query}
          selectedLabel={areaFilter.selection?.label}
          selectedMeta={[
            areaFilter.selection?.city,
            areaFilter.selection?.region,
            areaFilter.selection?.country,
          ]
            .filter(Boolean)
            .join(", ")}
          isSearching={areaFilter.isSearching}
          error={areaFilter.error}
          onQueryChange={areaFilter.setQuery}
          onSearch={() => {
            void areaFilter.searchArea();
          }}
          onClear={areaFilter.clearArea}
        />
      </FilterSheet>
    </View>
  );
}

type EventCollectionResult = {
  events: Event[];
};

function eventItems(result: EventCollectionResult | Event[] | undefined): Event[] {
  if (!result) return [];
  return Array.isArray(result) ? result : result.events;
}
