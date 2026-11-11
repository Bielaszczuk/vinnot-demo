/**
 * AdminUserActionSheet — account names, role picker, ban/unban, delete user.
 * Matches web AdminUsersPage actions.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AdminDetailSheet } from "./AdminDetailSheet";
import { Ban, CheckCircle2, Trash2, UserCog } from "lucide-react-native";
import { Avatar } from "@/presentation/components/ui/Atoms";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import { useAdminUserMutations } from "@/presentation/hooks/queries/admin";
import { useToast } from "@/presentation/providers/ToastProvider";
import { editorial, lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { AdminUser } from "@/domain/admin/admin.types";
import { NameBadge } from "@/presentation/features/points/NameBadge";
import type { AdminUserUpdate } from "@/domain/admin/adminUserDraft";
import { AdminUserAccountFields } from "./users/AdminUserAccountFields";
import {
  DEFAULT_SUSPENSION_REASON,
  MAX_SUSPENSION_NOTE_LENGTH,
  SUSPENSION_REASONS,
  type SuspensionReason,
} from "@/domain/admin/suspensionReason";

const ROLES = [
  { value: "ROLE_USER", labelKey: "roles.ROLE_USER" },
  { value: "ROLE_MODERATOR", labelKey: "roles.ROLE_MODERATOR" },
  { value: "ROLE_PARTNER", labelKey: "roles.ROLE_PARTNER" },
  { value: "ROLE_ADMIN", labelKey: "roles.ROLE_ADMIN" },
];

function resolveRole(user: AdminUser): string {
  const priority = ["ROLE_ADMIN", "ROLE_PARTNER", "ROLE_MODERATOR", "ROLE_USER"];
  for (const r of priority) {
    if (user.roles.includes(r)) return r;
  }
  return "ROLE_USER";
}

interface AdminUserActionSheetProps {
  visible: boolean;
  user: AdminUser | null;
  onClose: () => void;
}

type ConfirmType = "ban" | "unban" | "delete" | null;

export function AdminUserActionSheet({ visible, user, onClose }: AdminUserActionSheetProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { update, updateRole, ban, unban, remove } = useAdminUserMutations();

  const [selectedRole, selectRole] = useState("ROLE_USER");
  const [confirmType, chooseConfirmType] = useState<ConfirmType>(null);
  const [banReasonCode, chooseBanReason] = useState<SuspensionReason>(DEFAULT_SUSPENSION_REASON);
  const [banNote, updateBanNote] = useState("");

  useEffect(() => {
    if (!visible || !user) return;
    selectRole(resolveRole(user));
    chooseConfirmType(null);
    chooseBanReason(DEFAULT_SUSPENSION_REASON);
    updateBanNote("");
  }, [visible, user]);

  const openConfirm = (type: Exclude<ConfirmType, null>) => {
    if (type === "ban") {
      chooseBanReason(DEFAULT_SUSPENSION_REASON);
      updateBanNote("");
    }
    chooseConfirmType(type);
  };

  const busy = update.isPending || updateRole.isPending || ban.isPending || unban.isPending || remove.isPending;

  const handleAccountSave = (changes: AdminUserUpdate) => {
    if (!user || busy) return;
    update.mutate(
      { userId: user.id, update: changes },
      {
        onSuccess: () => showSuccess(t("admin.users.accountUpdated")),
        onError: () => showError(t("admin.users.accountError")),
      },
    );
  };

  const handleRoleSave = () => {
    if (!user || busy) return;
    updateRole.mutate(
      { userId: user.id, role: selectedRole },
      {
        onSuccess: () => {
          showSuccess(t("admin.users.roleUpdated", { role: t(`roles.${selectedRole}`) }));
          onClose();
        },
        onError: () => showError(t("admin.users.roleError")),
      },
    );
  };

  const handleAction = () => {
    if (!user || !confirmType || busy) return;
    const mutOpts = {
      onSuccess: () => {
        showSuccess(t("admin.users.actionSuccess"));
        onClose();
      },
      onError: () => showError(t("admin.users.actionError")),
    };
    if (confirmType === "ban")
      ban.mutate(
        {
          userId: user.id,
          reasonCode: banReasonCode,
          ...(banReasonCode === "OTHER" && banNote.trim() ? { note: banNote } : {}),
        },
        mutOpts,
      );
    else if (confirmType === "unban") unban.mutate(user.id, mutOpts);
    else if (confirmType === "delete") remove.mutate(user.id, mutOpts);
  };

  if (!user) return null;

  return (
    <AdminDetailSheet
      visible={visible}
      title={user.username}
      subtitle={user.email}
      busy={busy}
      onClose={onClose}
    >
      <View style={styles.content}>
        <View style={styles.userRow}>
          <Avatar uri={user.avatarUrl} name={user.username} size={48} style={styles.avatar} />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{user.username}</Text>
              <NameBadge tier={user.badgeTier} size={22} />
            </View>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.email}>
              {user.badgeTier
                ? t("points.tierAndPoints", { tier: t(`points.tiers.${user.badgeTier}`), points: t("points.pointsCount", { count: user.points }) })
                : t("points.pointsCount", { count: user.points })}
            </Text>
          </View>
        </View>

        <AdminUserAccountFields
          key={user.id}
          user={user}
          busy={busy}
          saving={update.isPending}
          onSave={handleAccountSave}
        />

        {/* Role picker */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <UserCog size={16} color={editorial.brand} />
            <Text style={styles.sectionTitle}>{t("admin.users.changeRole")}</Text>
          </View>
          <View style={styles.roleGrid}>
            {ROLES.map((role) => (
              <Pressable
                key={role.value}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedRole === role.value, disabled: busy }}
                disabled={busy}
                onPress={() => selectRole(role.value)}
                style={[styles.roleChip, selectedRole === role.value && styles.roleChipSelected]}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    selectedRole === role.value && styles.roleChipTextSelected,
                  ]}
                >
                  {t(role.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button onPress={handleRoleSave} loading={updateRole.isPending} disabled={busy} size="sm">
            {t("admin.users.saveRole")}
          </Button>
        </View>

        {/* Confirm section */}
        {confirmType === null ? (
          <View style={styles.actions}>
            {!user.locked ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => openConfirm("ban")}
                style={[styles.actionBtn, styles.banBtn]}
              >
                <Ban size={16} color="#ea580c" />
                <Text style={[styles.actionBtnText, { color: "#ea580c" }]}>
                  {t("admin.users.ban")}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => openConfirm("unban")}
                style={[styles.actionBtn, styles.unbanBtn]}
              >
                <CheckCircle2 size={16} color={lightTokens.success} />
                <Text style={[styles.actionBtnText, { color: lightTokens.success }]}>
                  {t("admin.users.unban")}
                </Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => openConfirm("delete")}
              style={[styles.actionBtn, styles.deleteBtn]}
            >
              <Trash2 size={16} color={lightTokens.danger} />
              <Text style={[styles.actionBtnText, { color: lightTokens.danger }]}>
                {t("admin.users.delete")}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.confirmBlock}>
            <Text style={styles.confirmTitle}>
              {confirmType === "ban"
                ? t("admin.users.confirmBan")
                : confirmType === "unban"
                  ? t("admin.users.confirmUnban")
                  : t("admin.users.confirmDelete")}
            </Text>
            <Text style={styles.confirmDesc}>{user.username}</Text>
            {confirmType === "ban" ? (
              <View style={styles.block}>
                <Text style={styles.sectionTitle}>{t("admin.users.banReason")}</Text>
                <Text style={styles.confirmDesc}>{t("admin.users.banReasonHelp")}</Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t("admin.users.banReason")}
                  style={styles.roleGrid}
                >
                  {SUSPENSION_REASONS.map((code) => {
                    const checked = banReasonCode === code;
                    return (
                      <Pressable
                        key={code}
                        accessibilityRole="radio"
                        accessibilityLabel={t(`admin.users.banReasons.${code}`)}
                        accessibilityState={{ checked, disabled: busy }}
                        disabled={busy}
                        onPress={() => chooseBanReason(code)}
                        style={[styles.roleChip, checked && styles.roleChipSelected]}
                      >
                        <Text style={[styles.roleChipText, checked && styles.roleChipTextSelected]}>
                          {t(`admin.users.banReasons.${code}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {banReasonCode === "OTHER" && (
                  <TextField
                    label={t("admin.users.banReasonDetail")}
                    value={banNote}
                    multiline
                    maxLength={MAX_SUSPENSION_NOTE_LENGTH}
                    editable={!busy}
                    onChangeText={updateBanNote}
                  />
                )}
              </View>
            ) : (
              <Text style={styles.confirmDesc}>{t("admin.users.notifiedByEmail")}</Text>
            )}
            <View style={styles.confirmActions}>
              <Button
                variant="ghost"
                disabled={busy}
                onPress={() => chooseConfirmType(null)}
                style={styles.confirmAction}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                loading={ban.isPending || unban.isPending || remove.isPending}
                disabled={busy}
                onPress={handleAction}
                style={styles.confirmAction}
              >
                {t("common.confirm")}
              </Button>
            </View>
          </View>
        )}
      </View>
    </AdminDetailSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { backgroundColor: wine[50], borderWidth: 1, borderColor: wine[200] },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  username: { ...textStyles.titleMedium, color: lightTokens.textPrimary },
  email: { ...textStyles.caption, color: lightTokens.textTertiary },
  block: { gap: 12 },
  blockHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.bgSubtle,
  },
  roleChipSelected: { borderColor: wine[300], backgroundColor: wine[50] },
  roleChipText: { ...textStyles.labelMedium, color: lightTokens.textTertiary },
  roleChipTextSelected: { color: wine[800] },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  banBtn: { borderColor: "rgba(234,88,12,0.55)", backgroundColor: "rgba(234,88,12,0.12)" },
  unbanBtn: { borderColor: "rgba(34,197,94,0.5)", backgroundColor: "rgba(34,197,94,0.1)" },
  deleteBtn: { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.1)" },
  actionBtnText: { ...textStyles.labelMedium },
  confirmBlock: { gap: 12 },
  confirmTitle: { ...textStyles.titleMedium, color: lightTokens.textPrimary },
  confirmDesc: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  confirmActions: { flexDirection: "row", gap: 10 },
  confirmAction: { flex: 1 },
});
