import { exitWineRouteDetail } from "@/presentation/navigation/discoveryNavigation";
import { CommunityActions } from "@/presentation/features/community/CommunityActions";
/**
 * Wine Route Detail Screen.
 */
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clock, MapPin, Navigation, Share2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { TagPill } from "@/presentation/components/ui/Atoms";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { RouteCoverImage } from "./RouteCoverImage";
import { useWineRouteDetailViewModel } from "./useWineRouteDetailViewModel";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { RouteDifficultyGlyph } from "./RouteGlyph";
import { RouteMap } from "./RouteMap";
import { RouteStopTimeline } from "./RouteStopTimeline";
import { formatRouteDistance, formatRouteLength } from "./routePresentation";
import { editorial, lightTokens, layout, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { wineTypeLabel } from "@/presentation/features/wine/wineTypeLabel";
import { COVER_ASPECT } from "@/domain/media/imageAspect";

export function WineRouteDetailScreen({ id }: { id: string | undefined }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const {
    query: routeQuery,
    route,
    durationMinutes: totalDurationMinutes,
    canShare,
    share: handleShare,
    navigate: startNavigation,
  } = useWineRouteDetailViewModel(id);

  if (routeQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <AppHeader
          title={t("wineRoutes.title")}
          showBack
          onBack={() => exitWineRouteDetail(router)}
        />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
          <Skeleton height={460} radius={radii["2xl"]} />
          <Skeleton height={210} radius={radii["2xl"]} />
          <Skeleton height={320} radius={radii["2xl"]} />
        </ScrollView>
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.screen}>
        <AppHeader
          title={t("wineRoutes.title")}
          showBack
          onBack={() => exitWineRouteDetail(router)}
        />
        {routeQuery.isError ? (
          <QueryErrorState error={routeQuery.error} onRetry={() => void routeQuery.refetch()} />
        ) : (
          <EmptyState
            illustration="route"
            title={t("wineRoutes.notFound")}
            action={{ label: t("common.back"), onPress: () => exitWineRouteDetail(router) }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title={t("wineRoutes.title")}
        showBack
        onBack={() => exitWineRouteDetail(router)}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        refreshControl={
          <BrandRefreshControl
            refreshing={routeQuery.isFetching}
            onRefresh={() => {
              void routeQuery.refetch();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <CommunityActions targetType="WINE_ROUTE" targetId={route.id} allowBlock={false} />
        <Card padding={0} radius={radii["2xl"]} elevation="none" style={styles.heroCard}>
          <View style={styles.hero}>
            <RouteCoverImage uri={route.imageUrl} alt={route.name} style={styles.heroImage} />
          </View>
          <View style={styles.heroBody}>
            <View style={styles.badgeRow}>
              {route.difficulty && (
                <View style={styles.difficultyBadge}>
                  <RouteDifficultyGlyph
                    difficulty={route.difficulty}
                    size={14}
                    color={vinnotColors.brand}
                  />
                  <Text style={styles.difficultyText}>
                    {t(`wineRoutes.difficulty.${route.difficulty}`, route.difficulty)}
                  </Text>
                </View>
              )}
              <View style={styles.stopsBadge}>
                <MapPin size={15} color={vinnotColors.brand} />
                <Text style={styles.stopsText}>
                  {route.stops.length} {t("wineRoutes.stops")}
                </Text>
              </View>
            </View>
            <Text style={styles.title}>{route.name}</Text>
            <View style={styles.metaWrap}>
              <Meta
                icon={<MapPin size={16} color={editorial.brandMuted} />}
                value={[route.region, route.country].filter(Boolean).join(", ")}
              />
              <Meta
                icon={<Clock size={16} color={editorial.brandMuted} />}
                value={formatRouteLength(totalDurationMinutes, route.estimatedDays, t)}
              />
              <Meta
                icon={<Navigation size={16} color={editorial.brandMuted} />}
                value={formatRouteDistance(route.distance)}
              />
            </View>
            {route.tags.length > 0 && (
              <View style={styles.tags}>
                {route.tags.map((tag) => (
                  <TagPill key={tag} label={wineTypeLabel(t, tag)} />
                ))}
              </View>
            )}
            <View style={styles.actions}>
              {canShare && (
                <Button
                  fullWidth
                  variant="outline"
                  onPress={handleShare}
                  leftIcon={<Share2 size={16} color={editorial.brand} />}
                  style={styles.actionButton}
                >
                  {t("events.share")}
                </Button>
              )}
              <Button
                fullWidth
                disabled={!route.stops.length}
                onPress={startNavigation}
                leftIcon={<Navigation size={16} color={vinnotColors.white} />}
              >
                {t("wineRoutes.startNavigation")}
              </Button>
            </View>
          </View>
        </Card>

        {!!route.description && (
          <Card radius={radii["2xl"]} elevation="none" style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t("wineRoutes.aboutRoute")}</Text>
            <Text style={styles.description}>{route.description}</Text>
          </Card>
        )}

        <RouteStopTimeline stops={route.stops} />
        <RouteMap stops={route.stops} />

        <Card radius={radii["2xl"]} elevation="none" style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{t("wineRoutes.quickInfo")}</Text>
          <View style={styles.quickGrid}>
            <Quick
              label={t("wineRoutes.duration")}
              value={formatRouteLength(totalDurationMinutes, route.estimatedDays, t)}
            />
            <Quick label={t("wineRoutes.distance")} value={formatRouteDistance(route.distance)} />
            {route.difficulty && (
              <Quick
                label={t("wineRoutes.difficultyLabel")}
                value={t(`wineRoutes.difficulty.${route.difficulty}`, route.difficulty)}
              />
            )}
            <Quick
              label={t("wineRoutes.status")}
              value={route.isPublished ? t("wineRoutes.published") : t("wineRoutes.draft")}
            />
          </View>
        </Card>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Meta({ icon, value }: { icon: ReactNode; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.metaItem}>
      {icon}
      <Text style={styles.metaText}>{value}</Text>
    </View>
  );
}

function Quick({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.quickItem}>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.canvas },
  content: { gap: 18, paddingHorizontal: layout.screenHorizontalPadding, paddingTop: 12 },
  heroCard: { borderColor: vinnotColors.borderSoft },
  // Same 16:9 frame the cover was adjusted in.
  hero: { aspectRatio: COVER_ASPECT, overflow: "hidden", backgroundColor: vinnotColors.brandSoft },
  heroImage: { width: "100%", height: "100%" },
  heroBody: { padding: 20, gap: 16 },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  difficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: vinnotColors.brandSoft,
  },
  difficultyText: { ...textStyles.labelSmall, color: vinnotColors.brand },
  stopsBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  stopsText: { ...textStyles.caption, color: vinnotColors.muted },
  infoCard: {
    gap: 14,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
  },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { flexShrink: 1, ...textStyles.bodySmall, color: lightTokens.textTertiary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: lightTokens.borderDefault,
    paddingTop: 14,
  },
  actionButton: { minHeight: 48 },
  sectionTitle: { ...textStyles.headingSmall, color: vinnotColors.ink },
  description: { ...textStyles.bodyMedium, color: lightTokens.textSecondary, lineHeight: 25 },
  quickGrid: {
    gap: 1,
    overflow: "hidden",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
  },
  quickItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: lightTokens.surfaceDefault,
    borderBottomWidth: 1,
    borderBottomColor: lightTokens.bgMuted,
  },
  quickLabel: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  quickValue: { ...textStyles.labelLarge, color: editorial.brand, textAlign: "right", flex: 1 },
});
