/**
 * The publications of the open post (#510): the post-level publishing record and, per network, its status, the
 * date it was published, the attempts, the error, the metrics the network gave, a link to the published post and a
 * retry for a network where publishing failed. A TikTok draft waits in the owner's inbox and has no link.
 */
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Badge";
import { Button } from "@/presentation/components/ui/Button";
import {
  PUBLISHING_ERRORS,
  canRetryPublication,
  metricEntries,
  type PublicationStatus,
  type SocialNetwork,
  type SocialPostPublishing,
  type SocialPublication,
} from "@/domain/admin/socialPost";
import { socialPostStyles as styles } from "./socialPostStyles";

const STATUS_VARIANT = {
  QUEUED: "default",
  PUBLISHING: "info",
  PUBLISHED: "success",
  DRAFT_SENT: "warning",
  FAILED: "danger",
} as const satisfies Record<PublicationStatus, string>;

export interface SocialPostPublicationsProps {
  publications: SocialPublication[];
  publishing: SocialPostPublishing | null;
  working: boolean;
  formatDate: (iso: string) => string;
  formatNumber: (value: number) => string;
  onRetry: (network: SocialNetwork) => unknown;
  onOpen: (url: string) => unknown;
}

export function SocialPostPublications({
  publications,
  publishing,
  working,
  formatDate,
  formatNumber,
  onRetry,
  onOpen,
}: SocialPostPublicationsProps) {
  const { t } = useTranslation();
  const errorText = (code: string) =>
    PUBLISHING_ERRORS.some((known) => known === code)
      ? t(`admin.socialPosts.publications.errors.${code}`)
      : t("admin.socialPosts.publications.errors.OTHER", { code });
  return (
    <View style={styles.card} testID="social-post-publications">
      <Text style={styles.heading} accessibilityRole="header">
        {t("admin.socialPosts.publications.heading")}
      </Text>
      {publishing?.startedAt && (
        <Text style={styles.help}>
          {t("admin.socialPosts.publications.startedAt", { date: formatDate(publishing.startedAt) })}
        </Text>
      )}
      {publishing?.finishedAt && (
        <Text style={styles.help}>
          {t("admin.socialPosts.publications.finishedAt", { date: formatDate(publishing.finishedAt) })}
        </Text>
      )}
      {publishing?.error && (
        <View style={styles.alert} accessibilityRole="alert">
          <Text style={styles.alertText}>
            {t("admin.socialPosts.publications.postError", { error: errorText(publishing.error) })}
          </Text>
        </View>
      )}
      {publications.length === 0 ? (
        <Text style={styles.help}>{t("admin.socialPosts.publications.none")}</Text>
      ) : (
        publications.map((publication) => {
          const network = t(`admin.socialPosts.networks.${publication.network}`);
          const metrics = metricEntries(publication.metrics);
          return (
            <View key={publication.network} testID={`social-publication-${publication.network}`} style={styles.postRow}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{network}</Text>
                <Badge
                  label={t(`admin.socialPosts.publications.status.${publication.status}`)}
                  variant={STATUS_VARIANT[publication.status]}
                />
              </View>
              {publication.publishedAt && (
                <Text style={styles.help}>
                  {t("admin.socialPosts.publications.publishedAt", { date: formatDate(publication.publishedAt) })}
                </Text>
              )}
              <Text style={styles.help}>
                {t("admin.socialPosts.publications.attempts", { count: publication.attempts })}
              </Text>
              {publication.status === "DRAFT_SENT" && (
                <Text style={styles.help}>{t("admin.socialPosts.publications.draftHint")}</Text>
              )}
              {publication.error && (
                <Text style={styles.error}>
                  {t("admin.socialPosts.publications.error", { error: errorText(publication.error) })}
                </Text>
              )}
              {metrics.length > 0 && (
                <View style={styles.row}>
                  {metrics.map(({ metric, value }) => (
                    <View key={metric} style={styles.hashtag}>
                      <Text style={styles.hashtagText}>
                        {`${t(`admin.socialPosts.publications.metrics.${metric}`)} ${formatNumber(value)}`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {publication.permalink && (
                <Button
                  size="sm"
                  variant="outline"
                  accessibilityLabel={t("admin.socialPosts.publications.openLabel", { network })}
                  onPress={() => void onOpen(publication.permalink!)}
                >
                  {t("admin.socialPosts.publications.open")}
                </Button>
              )}
              {canRetryPublication(publication) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={working}
                  accessibilityLabel={t("admin.socialPosts.publications.retryLabel", { network })}
                  onPress={() => void onRetry(publication.network)}
                >
                  {t("admin.socialPosts.publications.retry")}
                </Button>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
