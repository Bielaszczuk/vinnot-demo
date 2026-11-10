import { PROFILE_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { AdminQueryError } from "@/presentation/features/admin/AdminQueryError";
/**
 * Admin Dashboard — matches web AdminDashboardPage.
 * Gradient hero + real stats + extended stats + quick actions.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  MapPin,
  MessageSquare,
  Share2,
  ShieldAlert,
  Users,
  Wine,
} from "lucide-react-native";
import { AppHeader } from "@/presentation/components/layout";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { AdminStatCard } from "./AdminStatCard";
import { AdminPageHero } from "./AdminPageHero";
import { useAdminStats } from "@/presentation/hooks/queries/admin";
import { adminSectionAccent, lightTokens, layout, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { useAuth } from "@/presentation/hooks/useAuth";
import { ROLES } from "@/shared/config/roles";
import type { AdminStats } from "@/domain/admin/admin.types";

const STAT_CARDS = [
  {
    key: "wines" as keyof AdminStats,
    labelKey: "admin.stats.wines",
    icon: Wine,
    color: adminSectionAccent.wines,
    route: "/(app)/admin/wines",
  },
  {
    key: "wineries" as keyof AdminStats,
    labelKey: "admin.stats.wineries",
    icon: BookOpen,
    color: adminSectionAccent.wineries,
    route: "/(app)/admin/wineries",
  },
  {
    key: "events" as keyof AdminStats,
    labelKey: "admin.stats.events",
    icon: CalendarDays,
    color: adminSectionAccent.events,
    route: "/(app)/admin/events",
  },
  {
    key: "routes" as keyof AdminStats,
    labelKey: "admin.stats.routes",
    icon: MapPin,
    color: adminSectionAccent.routes,
    route: "/(app)/admin/routes",
  },
  {
    key: "reviews" as keyof AdminStats,
    labelKey: "admin.stats.reviews",
    icon: MessageSquare,
    color: adminSectionAccent.reviews,
    route: "/(app)/admin/reviews",
  },
  {
    key: "users" as keyof AdminStats,
    labelKey: "admin.stats.users",
    icon: Users,
    color: adminSectionAccent.users,
    route: "/(app)/admin/users",
  },
] as const satisfies ReadonlyArray<{
  key: keyof AdminStats;
  labelKey: string;
  icon: typeof Wine;
  color: string;
  route: Href;
}>;

const QUICK_ACTIONS = [
  {
    labelKey: "admin.actions.moderation",
    descKey: "admin.actions.moderationDesc",
    route: "/(app)/admin/community",
    icon: ShieldAlert,
  },
  {
    labelKey: "admin.submissions.title",
    descKey: "admin.submissions.subtitle",
    route: "/(app)/admin/submissions",
    icon: Wine,
  },
  {
    labelKey: "admin.actions.manageWines",
    descKey: "admin.actions.manageWinesDesc",
    route: "/(app)/admin/wines",
    icon: Wine,
  },
  {
    labelKey: "admin.actions.manageWineries",
    descKey: "admin.actions.manageWineriesDesc",
    route: "/(app)/admin/wineries",
    icon: BookOpen,
  },
  {
    labelKey: "admin.actions.manageUsers",
    descKey: "admin.actions.manageUsersDesc",
    route: "/(app)/admin/users",
    icon: Users,
  },
  {
    labelKey: "admin.actions.manageEvents",
    descKey: "admin.actions.manageEventsDesc",
    route: "/(app)/admin/events",
    icon: CalendarDays,
  },
  {
    labelKey: "admin.actions.manageRoutes",
    descKey: "admin.actions.manageRoutesDesc",
    route: "/(app)/admin/routes",
    icon: MapPin,
  },
  {
    labelKey: "admin.actions.moderateReviews",
    descKey: "admin.actions.moderateReviewsDesc",
    route: "/(app)/admin/reviews",
    icon: MessageSquare,
  },
  {
    labelKey: "admin.actions.manageNotifications",
    descKey: "admin.actions.manageNotificationsDesc",
    route: "/(app)/admin/notifications",
    icon: Bell,
  },
  {
    labelKey: "admin.actions.manageSocialPosts",
    descKey: "admin.actions.manageSocialPostsDesc",
    route: "/(app)/admin/social-posts",
    icon: Share2,
  },
] as const satisfies ReadonlyArray<{
  labelKey: string;
  descKey: string;
  route: Href;
  icon: typeof Wine;
}>;

/** Quick actions only administrators see: moderators cannot manage users, send notifications or review social posts. */
const ADMIN_ONLY_ROUTES: ReadonlySet<string> = new Set([
  "/(app)/admin/users",
  "/(app)/admin/notifications",
  "/(app)/admin/social-posts",
]);

export function AdminDashboardScreen() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(ROLES.ADMIN);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { data: stats, isLoading, isError, refetch } = useAdminStats();

  const extendedStats = [
    { labelKey: "admin.stats.activeUsers", value: stats?.activeUsers, color: adminSectionAccent.users },
    { labelKey: "admin.stats.publishedEvents", value: stats?.publishedEvents, color: adminSectionAccent.events },
    { labelKey: "admin.stats.publishedRoutes", value: stats?.publishedRoutes, color: adminSectionAccent.routes },
  ].filter((s) => s.value != null);

  return (
    <View style={{ flex: 1, backgroundColor: lightTokens.bgBase }}>
      <AppHeader title={t("admin.shortTitle")} showBack onBack={() => goBackOr(router, PROFILE_ROUTE)} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <AdminPageHero
          title={t("admin.dashboardTitle")}
          subtitle={t("admin.dashboardSubtitle")}
          section="dashboard"
        />

        <Text style={styles.sectionTitle}>{t("admin.platformOverview")}</Text>
        {/* Stats Grid */}
        {isError ? (
          <AdminQueryError retry={refetch} />
        ) : isLoading ? (
          <View style={styles.statsGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="47%" height={108} radius={radii["2xl"]} />
            ))}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {STAT_CARDS.filter((card) => isAdmin || card.key !== "users").map((card) => (
              <AdminStatCard
                key={card.key}
                label={t(card.labelKey)}
                value={stats?.[card.key] ?? "—"}
                icon={card.icon}
                accentColor={card.color}
                onPress={() => router.push(card.route)}
              />
            ))}
          </View>
        )}

        {/* Extended stats */}
        {extendedStats.length > 0 && (
          <View style={styles.extendedRow}>
            {extendedStats.map((stat) => (
              <View key={stat.labelKey} style={styles.extendedStat}>
                <Text style={[styles.extendedValue, { color: stat.color }]}>
                  {stat.value?.toLocaleString(i18n.resolvedLanguage ?? i18n.language)}
                </Text>
                <Text style={styles.extendedLabel}>{t(stat.labelKey)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t("admin.quickActions")}</Text>
        {QUICK_ACTIONS.filter((action) => isAdmin || !ADMIN_ONLY_ROUTES.has(action.route)).map(
          (action) => {
            const ActionIcon = action.icon;
            return (
              <MotionPressable
                key={action.labelKey}
                onPress={() => router.push(action.route)}
                style={styles.actionCard}
                accessibilityRole="button"
              >
                <View style={styles.actionIconBox}>
                  <ActionIcon size={20} color={wine[700]} />
                </View>
                <View style={styles.actionBody}>
                  <Text style={styles.actionLabel}>{t(action.labelKey)}</Text>
                  <Text style={styles.actionDesc}>{t(action.descKey)}</Text>
                </View>
                <View style={styles.actionChevron}>
                  <ChevronRight size={17} color={wine[700]} />
                </View>
              </MotionPressable>
            );
          },
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.screenHorizontalPadding, gap: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  extendedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  extendedStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  extendedValue: { ...textStyles.headingSmall },
  extendedLabel: { ...textStyles.caption, color: lightTokens.textTertiary },
  sectionTitle: { ...textStyles.headingSmall, color: lightTokens.textPrimary, marginTop: 4 },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    shadowColor: lightTokens.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 7,
    elevation: 1,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.xl,
    backgroundColor: wine[50],
    alignItems: "center",
    justifyContent: "center",
  },
  actionBody: { flex: 1 },
  actionLabel: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  actionDesc: { ...textStyles.caption, color: lightTokens.textTertiary, marginTop: 2 },
  actionChevron: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
});
