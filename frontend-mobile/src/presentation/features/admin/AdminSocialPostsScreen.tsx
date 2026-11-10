/**
 * Admin — Social posts (#499): the approval queue of the posts the marketing agent plans (#489), their slides per
 * language and format (#492, #497), the review actions, the per-language copy edit, the manual planner run and the
 * wine days of this month and the next. ADMIN only. Matches web AdminSocialPostsPage.
 *
 * Architecture: screen → view model → query hooks → operations → service → client → http
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/presentation/components/layout";
import { Button } from "@/presentation/components/ui/Button";
import { RoleGuard } from "@/presentation/navigation/guards";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { ROLES } from "@/shared/config/roles";
import { SOCIAL_POST_LANGUAGES } from "@/domain/admin/socialPost";
import { lightTokens, layout } from "@/shared/theme/tokens";
import { AdminPageHero } from "./AdminPageHero";
import { NotificationSegmented } from "./notifications/NotificationSegmented";
import { SocialPostDetailSheet } from "./social-posts/SocialPostDetailSheet";
import { SocialPostEditSheet } from "./social-posts/SocialPostEditSheet";
import { SocialAccountList } from "./social-posts/SocialAccountList";
import { SocialPillarList } from "./social-posts/SocialPillarList";
import { SocialPostQueue } from "./social-posts/SocialPostQueue";
import { WineDayList } from "./social-posts/WineDayList";
import { socialPostStyles } from "./social-posts/socialPostStyles";
import { useAdminSocialPostsViewModel } from "./social-posts/useAdminSocialPostsViewModel";
import { useSocialPostSettingsViewModel } from "./social-posts/useSocialPostSettingsViewModel";
import { Share2 } from "lucide-react-native";

function AdminSocialPostsScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vm = useAdminSocialPostsViewModel();
  const settings = useSocialPostSettingsViewModel();
  const { t } = vm;
  return (
    <View style={styles.screen}>
      <AppHeader title={t("admin.socialPosts.title")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AdminPageHero title={t("admin.socialPosts.title")} subtitle={t("admin.socialPosts.subtitle")} icon={Share2} />
        <Button loading={vm.isPlanning} disabled={vm.isPlanning} onPress={() => void vm.planNow()}>
          {t("admin.socialPosts.planNow")}
        </Button>
        {vm.awaitingCopy && vm.lastPlan && (
          <View style={socialPostStyles.notice} accessibilityRole="summary">
            <Text style={socialPostStyles.body}>
              {t("admin.socialPosts.planned", {
                count: vm.lastPlan.created,
                from: vm.lastPlan.from,
                to: vm.lastPlan.to,
              })}
            </Text>
            <Text style={socialPostStyles.help}>{t("admin.socialPosts.writingCopy")}</Text>
          </View>
        )}
        <NotificationSegmented
          role="tab"
          fill
          accessibilityLabel={t("admin.socialPosts.language")}
          value={vm.language}
          onChange={vm.setLanguage}
          options={SOCIAL_POST_LANGUAGES.map((language) => ({
            value: language,
            label: t(`admin.socialPosts.languages.${language}`),
          }))}
        />
        <SocialPostQueue
          status={vm.status}
          onStatusChange={vm.setStatus}
          language={vm.language}
          posts={vm.posts}
          page={vm.page}
          totalPages={vm.totalPages}
          totalItems={vm.totalItems}
          onPageChange={vm.setPage}
          isLoading={vm.isLoading}
          isError={vm.isError}
          retry={vm.refetch}
          formatDate={vm.formatDate}
          onOpen={vm.selectPost}
        />
        <WineDayList
          days={vm.wineDays}
          language={vm.language}
          loading={vm.wineDaysLoading}
          failed={vm.wineDaysError}
          retry={vm.refetchWineDays}
          formatDay={vm.formatDay}
        />
        <SocialPillarList
          pillars={settings.pillars}
          language={settings.language}
          loading={settings.pillarsLoading}
          failed={settings.pillarsError}
          retry={settings.refetchPillars}
          switching={settings.switchingPillar}
          onToggle={settings.togglePillar}
          formatNumber={settings.formatNumber}
        />
        <SocialAccountList
          accounts={settings.accounts}
          loading={settings.accountsLoading}
          failed={settings.accountsError}
          retry={settings.refetchAccounts}
          formatDate={settings.formatDate}
        />
      </ScrollView>
      <SocialPostDetailSheet vm={vm} />
      <SocialPostEditSheet vm={vm} />
    </View>
  );
}

export function AdminSocialPostsScreen() {
  return (
    <RoleGuard requiredRoles={[ROLES.ADMIN]}>
      <AdminSocialPostsScreenContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { padding: layout.screenHorizontalPadding, gap: 16 },
});
