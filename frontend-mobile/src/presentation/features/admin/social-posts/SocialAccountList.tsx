/**
 * The network connections (#510), read-only on mobile: each network's state, account, how it is connected, when the
 * connection expires and its last error. Connecting or reconnecting Threads and TikTok happens in the web admin,
 * where the OAuth callback returns, so this list only points there.
 */
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Badge";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { accountState, type SocialAccount, type SocialAccountState } from "@/domain/admin/socialAccount";
import { AdminQueryError } from "../AdminQueryError";
import { socialPostStyles as styles } from "./socialPostStyles";

const STATE_VARIANT = {
  CONNECTED: "success",
  NEEDS_RECONNECT: "warning",
  NOT_CONNECTED: "default",
  NOT_CONFIGURED: "default",
} as const satisfies Record<SocialAccountState, string>;

export interface SocialAccountListProps {
  accounts: SocialAccount[];
  loading: boolean;
  failed: boolean;
  retry: () => unknown;
  formatDate: (iso: string) => string;
}

export function SocialAccountList({ accounts, loading, failed, retry, formatDate }: SocialAccountListProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        {t("admin.socialPosts.accounts.heading")}
      </Text>
      <Text style={styles.help}>{t("admin.socialPosts.accounts.webHint")}</Text>
      {failed ? (
        <AdminQueryError retry={retry} />
      ) : loading ? (
        <Skeleton height={96} />
      ) : accounts.length === 0 ? (
        <Text style={styles.help}>{t("admin.socialPosts.accounts.empty")}</Text>
      ) : (
        accounts.map((account) => {
          const state = accountState(account);
          const name = account.displayName ?? account.accountId;
          return (
            <View key={account.network} testID={`social-account-${account.network}`} style={styles.postRow}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{t(`admin.socialPosts.networks.${account.network}`)}</Text>
                <Badge label={t(`admin.socialPosts.accounts.state.${state}`)} variant={STATE_VARIANT[state]} />
              </View>
              {name && <Text style={styles.help}>{t("admin.socialPosts.accounts.account", { name })}</Text>}
              <Text style={styles.help}>{t(`admin.socialPosts.accounts.mode.${account.mode}`)}</Text>
              {account.expiresAt && (
                <Text style={styles.help}>
                  {t("admin.socialPosts.accounts.expiresAt", { date: formatDate(account.expiresAt) })}
                </Text>
              )}
              {account.lastError && (
                <Text style={styles.error}>{t("admin.socialPosts.accounts.lastError", { error: account.lastError })}</Text>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
