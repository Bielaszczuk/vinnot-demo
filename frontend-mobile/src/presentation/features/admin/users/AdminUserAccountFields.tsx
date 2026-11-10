import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { IdCard } from "lucide-react-native";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import {
  ADMIN_USER_NAME_MAX_LENGTH,
  toAdminUserDraft,
  toAdminUserUpdate,
  validateAdminUserDraft,
  type AdminUserDraft,
  type AdminUserUpdate,
} from "@/domain/admin/adminUserDraft";
import type { AdminUser } from "@/domain/admin/admin.types";
import { editorial, lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface AdminUserAccountFieldsProps {
  user: AdminUser;
  busy: boolean;
  saving: boolean;
  onSave: (update: AdminUserUpdate) => void;
}

/** First and last name of an account; the parent remounts it per user (key) to reset the draft. */
export function AdminUserAccountFields({ user, busy, saving, onSave }: AdminUserAccountFieldsProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<AdminUserDraft>(() => toAdminUserDraft(user));
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validateAdminUserDraft(draft) : [];
  const errorFor = (field: keyof AdminUserDraft) =>
    errors.some((error) => error.field === field)
      ? t("admin.users.nameTooLong", { max: ADMIN_USER_NAME_MAX_LENGTH })
      : undefined;
  const update = toAdminUserUpdate(user, draft);
  const unchanged = Object.keys(update).length === 0;

  const save = () => {
    setSubmitted(true);
    if (busy || unchanged || validateAdminUserDraft(draft).length > 0) return;
    onSave(update);
  };

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <IdCard size={16} color={editorial.brand} />
        <Text style={styles.title}>{t("admin.users.account")}</Text>
      </View>
      <TextField
        label={t("admin.users.firstName")}
        value={draft.firstName}
        editable={!busy}
        autoCapitalize="words"
        error={errorFor("firstName")}
        onChangeText={(firstName) => setDraft((current) => ({ ...current, firstName }))}
      />
      <TextField
        label={t("admin.users.lastName")}
        value={draft.lastName}
        editable={!busy}
        autoCapitalize="words"
        error={errorFor("lastName")}
        onChangeText={(lastName) => setDraft((current) => ({ ...current, lastName }))}
      />
      <Button size="sm" onPress={save} loading={saving} disabled={busy || unchanged}>
        {t("admin.users.saveAccount")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
});
