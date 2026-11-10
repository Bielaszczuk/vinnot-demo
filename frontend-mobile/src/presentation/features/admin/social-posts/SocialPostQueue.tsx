/**
 * The approval queue (#499): one-tap status filter, one row per post (date, status, pillar, wine day and the hook
 * in the selected language, or "pending" when that language has no copy yet) and the pagination bar.
 */
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { EmptyState, Spinner } from "@/presentation/components/ui/Feedback";
import {
  SOCIAL_POST_STATUSES,
  localizedName,
  type SocialPost,
  type SocialPostLanguage,
  type SocialPostStatus,
} from "@/domain/admin/socialPost";
import { AdminPaginationBar } from "../AdminPaginationBar";
import { AdminQueryError } from "../AdminQueryError";
import { socialPostStyles as styles } from "./socialPostStyles";

export interface SocialPostQueueProps {
  status: SocialPostStatus;
  onStatusChange: (status: SocialPostStatus) => void;
  language: SocialPostLanguage;
  posts: SocialPost[];
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
  retry: () => unknown;
  formatDate: (iso: string) => string;
  onOpen: (id: string) => void;
}

export function SocialPostQueue({
  status,
  onStatusChange,
  language,
  posts,
  page,
  totalPages,
  totalItems,
  onPageChange,
  isLoading,
  isError,
  retry,
  formatDate,
  onOpen,
}: SocialPostQueueProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        {t("admin.socialPosts.queue.heading")}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel={t("admin.socialPosts.queue.status")}
        contentContainerStyle={styles.chips}
      >
        {SOCIAL_POST_STATUSES.map((candidate) => (
          <Pressable
            key={candidate}
            accessibilityRole="radio"
            accessibilityLabel={t(`admin.socialPosts.status.${candidate}`)}
            accessibilityState={{ checked: status === candidate }}
            onPress={() => onStatusChange(candidate)}
            style={[styles.chip, status === candidate && styles.chipSelected]}
          >
            <Text style={styles.chipText}>{t(`admin.socialPosts.status.${candidate}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {isError ? (
        <AdminQueryError retry={retry} />
      ) : isLoading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <EmptyState title={t("admin.socialPosts.queue.empty")} description={t("admin.socialPosts.queue.emptyHelp")} />
      ) : (
        <>
          {posts.map((post) => {
            const copy = post.copies[language];
            const meta = [
              post.pillar && localizedName(post.pillar, language),
              post.wineDay && localizedName(post.wineDay, language),
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Pressable
                key={post.id}
                testID={`social-post-row-${post.id}`}
                accessibilityRole="button"
                onPress={() => onOpen(post.id)}
                style={styles.postRow}
              >
                <Text style={styles.help}>
                  {`${formatDate(post.scheduledFor)} · ${t(`admin.socialPosts.status.${post.status}`)}`}
                </Text>
                {copy ? (
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {copy.hook}
                  </Text>
                ) : (
                  <Text style={styles.pending}>{t("admin.socialPosts.queue.hookPending")}</Text>
                )}
                {!!meta && <Text style={styles.help}>{meta}</Text>}
              </Pressable>
            );
          })}
          <AdminPaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            countKey="admin.socialPosts.queue.count"
            onPageChange={onPageChange}
          />
        </>
      )}
    </View>
  );
}
