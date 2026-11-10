/**
 * AccountSheet — account metadata and lifecycle actions.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { CheckCircle2, CircleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import type { User } from "@/domain/user/user.types";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface AccountSheetProps {
  visible: boolean;
  user: User | null;
  changingEmail: boolean;
  deactivating: boolean;
  deleting: boolean;
  onClose: () => void;
  onRequestEmailChange: (newEmail: string) => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

export function AccountSheet({
  visible,
  user,
  changingEmail,
  deactivating,
  deleting,
  onClose,
  onRequestEmailChange,
  onDeactivate,
  onDelete,
}: AccountSheetProps) {
  const { t, i18n } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    if (!visible) {
      sheetRef.current?.dismiss();
      return;
    }
    sheetRef.current?.present();
  }, [visible]);

  const memberSince = formatMemberSince(user?.createdAt, i18n.language);
  const roles = user?.roles.map((role) => t(`roles.${role}`, role.replace("ROLE_", ""))).join(", ");

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={!(changingEmail || deactivating || deleting)}
      onDismiss={() => {
        setNewEmail("");
        onClose();
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={changingEmail || deactivating || deleting ? "none" : "close"}
        />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("profile.accountSettings")}</Text>
          <Text style={styles.subtitle}>{t("profile.accountSettingsDesc")}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.accountInfo")}</Text>
          <View style={styles.infoRows}>
            <AccountRow label={t("profile.username")} value={`@${user?.username ?? "-"}`} />
            <AccountRow label={t("profile.email")} value={user?.email ?? "-"} />
            <AccountRow label={t("profile.roles")} value={roles || "-"} />
            <AccountRow label={t("profile.memberSinceLabel")} value={memberSince} />
          </View>
        </View>

        <View style={styles.verification}>
          {user?.emailVerified ? (
            <CheckCircle2 size={21} color={lightTokens.success} />
          ) : (
            <CircleAlert size={21} color={lightTokens.warning} />
          )}
          <View style={styles.verificationText}>
            <Text style={styles.verificationTitle}>
              {user?.emailVerified ? t("profile.emailVerified") : t("profile.verificationPending")}
            </Text>
            <Text style={styles.verificationDescription}>
              {user?.emailVerified
                ? t("profile.emailVerifiedDesc")
                : t("profile.verificationPendingDesc")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.changeEmail")}</Text>
          <Text style={styles.sectionDescription}>{t("profile.emailChangePolicy")}</Text>
          <TextField
            label={t("profile.newEmail")}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder={t("profile.newEmailPlaceholder")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            fullWidth
            loading={changingEmail}
            disabled={!newEmail.trim()}
            onPress={() => onRequestEmailChange(newEmail)}
          >
            {t("profile.sendEmailConfirmation")}
          </Button>
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>{t("profile.dangerZone")}</Text>
          <Text style={styles.dangerDescription}>{t("profile.dangerZoneDesc")}</Text>
          <Button variant="danger" fullWidth loading={deactivating} onPress={onDeactivate}>
            {t("profile.deactivateAccount")}
          </Button>
          <View style={styles.deleteSection}>
            <Text style={styles.deleteDescription}>{t("profile.deleteAccountDesc")}</Text>
            <Button variant="danger" fullWidth loading={deleting} onPress={onDelete}>
              {t("profile.deleteAccount")}
            </Button>
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function formatMemberSince(value: string | undefined, locale: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { gap: 22, paddingHorizontal: 20, paddingBottom: 40 },
  header: { gap: 4 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  section: { gap: 10 },
  sectionTitle: { ...textStyles.overline, color: lightTokens.textTertiary },
  sectionDescription: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  infoRows: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.md,
  },
  infoRow: {
    gap: 3,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.borderDefault,
  },
  infoLabel: { ...textStyles.caption, color: lightTokens.textTertiary },
  infoValue: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  verification: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 15,
    borderRadius: radii.md,
    backgroundColor: lightTokens.bgSubtle,
  },
  verificationText: { flex: 1, gap: 2 },
  verificationTitle: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  verificationDescription: { ...textStyles.caption, color: lightTokens.textTertiary },
  dangerZone: {
    gap: 12,
    paddingTop: 4,
  },
  dangerTitle: { ...textStyles.headingSmall, color: lightTokens.danger },
  dangerDescription: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  deleteSection: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lightTokens.borderDefault,
  },
  deleteDescription: { ...textStyles.bodySmall, color: lightTokens.danger },
});
