import {
  CELLAR_ROUTE,
  POINTS_ROUTE,
  createUserProfileRoute,
} from "@/presentation/navigation/discoveryNavigation";
import { ProfilePoints } from "@/presentation/features/points/ProfilePoints";
import { useHaptics } from "@/presentation/hooks/ui";
import { DeleteAccountDialog } from "@/presentation/features/user/DeleteAccountDialog";
import { usePermanentAccountDeletion } from "@/presentation/features/user/usePermanentAccountDeletion";
import { useCommunityActivityLabel } from "@/presentation/features/community/CommunityOverview";
/**
 * Profile Tab Screen: the hero with points, stats, quick access to the member's own places,
 * account settings, support and logout, in that order.
 */
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  Bell,
  Camera,
  ClipboardList,
  Ticket,
  CalendarDays,
  HelpCircle,
  Languages,
  Lock,
  LogOut,
  Shield,
  SlidersHorizontal,
  UserRound,
  Wine,
} from "lucide-react-native";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useAccountActions } from "@/presentation/hooks/useAccountActions";
import { useLanguagePreference } from "@/presentation/hooks/useLanguagePreference";
import {
  useDeactivateAccount,
  useFreshPointsSummary,
  useRequestEmailChange,
  useUserStats,
} from "@/presentation/hooks/queries/user";
import { useOrganizedEventCount } from "@/presentation/hooks/queries/partner";
import { Button } from "@/presentation/components/ui/Button";
import {
  AccountSheet,
  AvatarPickerSheet,
  ChangePasswordSheet,
  EditProfileSheet,
  LanguageSheet,
  NotificationPreferencesSheet,
  ProfileHero,
  SettingsSection,
  StatsRow,
} from "@/presentation/features/user";
import { AuthGuard } from "@/presentation/navigation/guards";
import { useToast } from "@/presentation/providers/ToastProvider";
import {
  getMutationErrorCode,
  getMutationErrorMessage,
} from "@/presentation/store/mutationAdapter";
import { lightTokens, wine, layout } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { ROLES } from "@/shared/config/roles";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";

function ProfileScreenContent() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();
  const { user, logout, hasRole, refreshUser, clearSession, syncUser } = useAuth();
  const canChangePassword = user?.hasPassword ?? true;
  const { forgotPassword } = useAccountActions();
  const { language, changeLanguage } = useLanguagePreference();
  const { showSuccess, showError, showInfo } = useToast();
  const communityActivityLabel = useCommunityActivityLabel();
  const statsQuery = useUserStats(!!user);
  const pointsQuery = useFreshPointsSummary(!!user);
  const showOrganizerStats = hasRole([ROLES.PARTNER, ROLES.ADMIN]);
  const organizedEvents = useOrganizedEventCount(!!user && showOrganizerStats);
  const deactivateAccount = useDeactivateAccount();
  const requestEmailChange = useRequestEmailChange();
  const deletionConfirmation = usePermanentAccountDeletion(() => setAccountOpen(false));
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [passwordSetupPending, setPasswordSetupPending] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const refreshProfile = () => {
    if (isRefreshingProfile) return;
    setIsRefreshingProfile(true);
    void Promise.all([refreshUser(), statsQuery.refetch(), pointsQuery.refetch()])
      .catch((error) => showError(t(getMutationErrorMessage(error, "common.error"))))
      .finally(() => setIsRefreshingProfile(false));
  };

  const handleAvatarUploaded = (avatarUrl: string) => {
    if (user) {
      void syncUser({ ...user, avatarUrl });
    }
  };

  const requestSocialPasswordSetup = () => {
    if (!user || passwordSetupPending) return;
    Alert.alert(t("profile.passwordSetupTitle"), t("profile.socialPasswordHint"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.sendPasswordSetupLink"),
        onPress: () => {
          setPasswordSetupPending(true);
          void forgotPassword(user.email)
            .then(() => showSuccess(t("profile.toastPasswordSetupSent")))
            .catch(() => showError(t("profile.toastPasswordSetupError")))
            .finally(() => setPasswordSetupPending(false));
        },
      },
    ]);
  };

  const confirmAccountDeactivation = () => {
    Alert.alert(
      t("profile.deactivateAccountConfirmTitle"),
      t("profile.deactivateAccountConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.deactivateAccount"),
          style: "destructive",
          onPress: () => {
            deactivateAccount.mutate(undefined, {
              onSuccess: () => {
                setAccountOpen(false);
                showSuccess(t("profile.toastAccountDeactivated"));
                void clearSession().finally(() => router.replace("/(auth)/login"));
              },
              onError: () => showError(t("profile.toastAccountDeactivationError")),
            });
          },
        },
      ],
    );
  };

  const handleRequestEmailChange = (value: string) => {
    const newEmail = value.trim().toLowerCase();
    if (!newEmail || !newEmail.includes("@")) {
      showError(t("profile.emailChangeInvalid"));
      return;
    }
    if (newEmail === user?.email.toLowerCase()) {
      showInfo(t("profile.emailChangeSame"));
      return;
    }

    requestEmailChange.mutate(newEmail, {
      onSuccess: () => {
        setAccountOpen(false);
        showSuccess(t("profile.toastEmailChangeRequested"));
      },
      onError: (error) => {
        const code = getMutationErrorCode(error);
        const messageKeyByCode: Record<string, string> = {
          EMAIL_ALREADY_EXISTS: "profile.emailChangeAlreadyExists",
          EMAIL_UNCHANGED: "profile.emailChangeSame",
          EMAIL_DELIVERY_FAILED: "profile.emailChangeDeliveryFailed",
        };
        const messageKey = code ? messageKeyByCode[code] : undefined;
        showError(
          (messageKey ? t(messageKey) : null) ??
            t(getMutationErrorMessage(error, "profile.toastEmailChangeError")),
        );
      },
    });
  };

  // The member's own places first: cellar, tickets, public profile, then role panels.
  const quickAccessActions = [
    {
      key: "cellar",
      label: t("cellar.title"),
      description: t("cellar.subtitle"),
      icon: <Wine size={18} color={wine[700]} />,
      onPress: () => {
        haptics.selection();
        router.push(CELLAR_ROUTE);
      },
    },
    {
      key: "tickets",
      label: t("tickets.title"),
      description: t("tickets.subtitle"),
      icon: <Ticket size={18} color={wine[700]} />,
      onPress: () => router.push("/my-tickets"),
    },
    ...(user
      ? [
          {
            key: "publicProfile",
            label: t("social.viewPublicProfile"),
            description: t("social.viewPublicProfileDesc"),
            icon: <UserRound size={18} color={wine[700]} />,
            onPress: () => router.push(createUserProfileRoute(user.id)),
          },
        ]
      : []),
    {
      key: "submissions",
      label: t("scan.mySubmissions"),
      description: t("scan.mySubmissionsDescription"),
      icon: <ClipboardList size={18} color={wine[700]} />,
      onPress: () => router.push("/my-submissions"),
    },
    {
      key: "community",
      label: t("community.title"),
      description: communityActivityLabel,
      icon: <Shield size={18} color={wine[700]} />,
      onPress: () => router.push("/(app)/community"),
    },
    ...(hasRole([ROLES.ADMIN, ROLES.MODERATOR])
      ? [
          {
            key: "admin",
            label: t("profile.adminPanel"),
            description: t("profile.adminPanelDesc"),
            icon: <Shield size={18} color={wine[700]} />,
            onPress: () => router.push("/(app)/admin"),
          },
        ]
      : []),
    ...(hasRole([ROLES.PARTNER, ROLES.ADMIN])
      ? [
          {
            key: "partner",
            label: t("profile.partnerPanel"),
            description: t("profile.partnerPanelDesc"),
            icon: <CalendarDays size={18} color={wine[700]} />,
            onPress: () => router.push("/(app)/partner/events"),
          },
        ]
      : []),
  ];

  // Configuring the account sits at the bottom: photo, security, account, notifications, language.
  const settingsActions = [
    {
      key: "avatar",
      label: t("profile.changeAvatar"),
      description: t("profile.changeAvatarDesc"),
      icon: <Camera size={18} color={wine[700]} />,
      onPress: () => setAvatarOpen(true),
    },
    {
      key: "password",
      label: canChangePassword
        ? t("profile.changePassword")
        : t("profile.sendPasswordSetupLink"),
      description: canChangePassword
        ? t("profile.changePasswordDesc")
        : t("profile.socialPasswordActionDesc"),
      icon: <Lock size={18} color={wine[700]} />,
      onPress: canChangePassword ? () => setPasswordOpen(true) : requestSocialPasswordSetup,
    },
    {
      key: "settings",
      label: t("profile.accountSettings"),
      description: t("profile.settingsDesc"),
      icon: <SlidersHorizontal size={18} color={wine[700]} />,
      onPress: () => setAccountOpen(true),
    },
    {
      key: "notifications",
      label: t("notificationPreferences.title"),
      description: t("notificationPreferences.menuDescription"),
      icon: <Bell size={18} color={wine[700]} />,
      onPress: () => setNotificationsOpen(true),
    },
    {
      key: "language",
      label: t("profile.appLanguage"),
      description: t(`profile.languages.${language}`),
      icon: <Languages size={18} color={wine[700]} />,
      onPress: () => setLanguageOpen(true),
    },
  ];

  const supportActions = [
    {
      key: "privacy",
      label: t("profile.privacy"),
      description: t("profile.privacyDesc"),
      icon: <Lock size={18} color={wine[700]} />,
      onPress: () => router.push("/legal"),
    },
    {
      key: "help",
      label: t("profile.help"),
      description: t("profile.helpDesc"),
      icon: <HelpCircle size={18} color={wine[700]} />,
      onPress: () => router.push("/help"),
    },
  ];

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: 32,
          },
        ]}
        refreshControl={
          <BrandRefreshControl
            refreshing={isRefreshingProfile || statsQuery.isFetching}
            onRefresh={refreshProfile}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero
          displayName={user?.name || user?.username || t("profile.title")}
          email={user?.email}
          avatarUrl={user?.avatarUrl ?? undefined}
          roles={(user?.roles ?? []).map((role) => ({
            key: role,
            label: t(`roles.${role}`, role.replace("ROLE_", "")),
          }))}
          editLabel={t("profile.editProfile")}
          onEdit={() => setEditOpen(true)}
          onAvatarPress={() => setAvatarOpen(true)}
        >
          <ProfilePoints
            summary={pointsQuery.data}
            loading={pointsQuery.isLoading}
            onOpen={() => {
              haptics.selection();
              router.push(POINTS_ROUTE);
            }}
          />
        </ProfileHero>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.stats")}</Text>
          <StatsRow
            stats={statsQuery.data}
            loading={statsQuery.isLoading}
            showOrganizerStats={showOrganizerStats}
            organizedEvents={organizedEvents}
            onCellarPress={() => {
              haptics.selection();
              router.push(CELLAR_ROUTE);
            }}
          />
        </View>

        <SettingsSection title={t("profile.quickAccess")} actions={quickAccessActions} />
        <SettingsSection title={t("profile.settings")} actions={settingsActions} />
        <SettingsSection title={t("profile.support")} actions={supportActions} />

        <Button
          variant="outline"
          size="md"
          fullWidth
          onPress={handleLogout}
          leftIcon={<LogOut size={17} color={lightTokens.danger} />}
          style={styles.logoutButton}
          textStyle={styles.logoutText}
        >
          {t("auth.logout")}
        </Button>
      </ScrollView>

      <EditProfileSheet
        visible={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onUpdated={refreshProfile}
      />
      <AvatarPickerSheet
        visible={avatarOpen}
        user={user}
        onClose={() => setAvatarOpen(false)}
        onUploaded={handleAvatarUploaded}
      />
      <ChangePasswordSheet visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <AccountSheet
        visible={accountOpen}
        user={user}
        changingEmail={requestEmailChange.isPending}
        deactivating={deactivateAccount.isPending}
        deleting={deletionConfirmation.busy}
        onClose={() => setAccountOpen(false)}
        onRequestEmailChange={handleRequestEmailChange}
        onDeactivate={confirmAccountDeactivation}
        onDelete={deletionConfirmation.open}
      />
      <DeleteAccountDialog confirmation={deletionConfirmation} />
      <NotificationPreferencesSheet visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <LanguageSheet
        visible={languageOpen}
        language={language}
        onSelect={changeLanguage}
        onClose={() => setLanguageOpen(false)}
      />
    </>
  );
}

export function ProfileScreen() {
  return (
    <AuthGuard>
      <ProfileScreenContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { paddingHorizontal: layout.screenHorizontalPadding, gap: 22 },
  section: { gap: 10 },
  sectionTitle: { ...textStyles.overline, color: lightTokens.textTertiary },
  logoutButton: { borderColor: lightTokens.danger },
  logoutText: { color: lightTokens.danger },
});
