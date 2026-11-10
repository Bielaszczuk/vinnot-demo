/**
 * Admin — Notifications (#327, #490): send an announcement, read what was sent with its delivery counts and the push
 * metrics, and switch push types. ADMIN only. Matches web AdminNotificationsPage.
 *
 * Architecture: screen → view-model hooks → query hooks → operations → service → client → http
 */
import { useState } from "react";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/presentation/components/layout";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { RoleGuard } from "@/presentation/navigation/guards";
import { ROLES } from "@/shared/config/roles";
import { lightTokens, layout } from "@/shared/theme/tokens";
import { AdminPageHero } from "./AdminPageHero";
import { AnnouncementsTab } from "./notifications/AnnouncementsTab";
import { NotificationHistoryTab } from "./notifications/NotificationHistoryTab";
import { NotificationSegmented } from "./notifications/NotificationSegmented";
import { PushTab } from "./notifications/PushTab";

const TABS = ["compose", "history", "settings"] as const;
type Tab = (typeof TABS)[number];

function AdminNotificationsScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("compose");
  return (
    <View style={styles.screen}>
      <AppHeader title={t("admin.notifications.title")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <AdminPageHero
          title={t("admin.notifications.title")}
          subtitle={t("admin.notifications.subtitle")}
          section="notifications"
        />
        <NotificationSegmented
          role="tab"
          fill
          accessibilityLabel={t("admin.notifications.title")}
          value={tab}
          onChange={setTab}
          options={TABS.map((key) => ({ value: key, label: t(`admin.notifications.tabs.${key}`) }))}
        />
        {/* Every tab stays mounted so switching never discards the announcement draft. */}
        <View style={tab === "compose" ? undefined : styles.hidden}>
          <AnnouncementsTab />
        </View>
        <View style={tab === "history" ? undefined : styles.hidden}>
          <NotificationHistoryTab />
        </View>
        <View style={tab === "settings" ? undefined : styles.hidden}>
          <PushTab />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

export function AdminNotificationsScreen() {
  return (
    <RoleGuard requiredRoles={[ROLES.ADMIN]}>
      <AdminNotificationsScreenContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { padding: layout.screenHorizontalPadding, gap: 16 },
  hidden: { display: "none" },
});
