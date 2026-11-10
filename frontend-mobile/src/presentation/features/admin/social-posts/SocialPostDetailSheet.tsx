/**
 * The selected post (#499, as on web): language (ES/EN) and format switches, the rendered slides of that language,
 * the caption with its legal line, hashtags, CTA and alt text, generation and fact-check details, the review
 * record (or its automatic approval, #510), its publications once publishing starts (#510), and the review actions
 * the post accepts, with a one-tap reject reason. A language without copy is shown as pending, with the regenerate
 * action when the post accepts it (approved posts included, #497 S14). Each network's publishing time, moving the
 * post to another date and time and publishing it now come from the backend's schedule and flags (#513).
 */
import { Text, View } from "react-native";
import { Badge } from "@/presentation/components/ui/Badge";
import { Button } from "@/presentation/components/ui/Button";
import { Spinner } from "@/presentation/components/ui/Feedback";
import { ReasonPicker } from "@/presentation/components/forms";
import {
  MAX_REJECT_NOTE_LENGTH,
  SOCIAL_POST_LANGUAGES,
  SOCIAL_POST_REJECT_REASONS,
  captionHasLegalLine,
  localizedName,
} from "@/domain/admin/socialPost";
import { AdminDetailSheet } from "../AdminDetailSheet";
import { AdminQueryError } from "../AdminQueryError";
import { NotificationSegmented } from "../notifications/NotificationSegmented";
import { SocialPostPublications } from "./SocialPostPublications";
import { SocialPostNetworkTimes, SocialPostPublishNowConfirm, SocialPostRescheduleForm } from "./SocialPostSchedule";
import { SocialPostSlides } from "./SocialPostSlides";
import { socialPostStyles as styles } from "./socialPostStyles";
import type { useAdminSocialPostsViewModel } from "./useAdminSocialPostsViewModel";

type ViewModel = ReturnType<typeof useAdminSocialPostsViewModel>;

const FACT_CHECK_VARIANT = { PASSED: "success", FLAGGED: "warning", SKIPPED: "default" } as const;

export function SocialPostDetailSheet({ vm }: { vm: ViewModel }) {
  const { t, post, copy, language } = vm;
  const can = (action: (typeof vm.actions)[number]) => vm.actions.includes(action);
  return (
    <AdminDetailSheet
      visible={vm.selectedId !== null && !vm.editing}
      title={copy?.hook ?? t("admin.socialPosts.detail.title")}
      subtitle={post ? t("admin.socialPosts.detail.scheduledFor", { date: vm.formatDate(post.scheduledFor) }) : undefined}
      busy={vm.working}
      onClose={vm.closePost}
    >
      {vm.isDetailError ? (
        <AdminQueryError retry={vm.refetchDetail} />
      ) : !post ? (
        <Spinner />
      ) : (
        <>
          <View style={styles.row}>
            <Badge label={t(`admin.socialPosts.status.${post.status}`)} variant="brand" />
            {post.pillar && <Badge label={localizedName(post.pillar, language)} />}
            {post.wineDay && <Badge label={localizedName(post.wineDay, language)} variant="info" />}
            {post.generation.mock && <Badge label={t("admin.socialPosts.detail.mock")} variant="warning" />}
          </View>
          <NotificationSegmented
            role="tab"
            fill
            accessibilityLabel={t("admin.socialPosts.language")}
            value={language}
            onChange={vm.setLanguage}
            options={SOCIAL_POST_LANGUAGES.map((candidate) => ({
              value: candidate,
              label: t(`admin.socialPosts.languages.${candidate}`),
            }))}
          />

          {!copy ? (
            <View testID="social-post-language-pending" style={styles.notice}>
              <Badge label={t("admin.socialPosts.languagePending")} variant="warning" />
              <Text style={styles.body}>{t("admin.socialPosts.languagePendingHelp")}</Text>
              {can("regenerate") && (
                <Button size="sm" variant="outline" disabled={vm.working} onPress={() => void vm.regenerate()}>
                  {t("admin.socialPosts.actions.regenerate")}
                </Button>
              )}
            </View>
          ) : (
            <>
              <SocialPostSlides
                copy={copy}
                media={post.media}
                format={vm.format}
                onFormatChange={vm.setFormat}
                slides={vm.slides}
                canRequestIllustration={vm.canRequestIllustration}
                working={vm.working}
                onNewIllustration={vm.newIllustration}
                onOpen={vm.openSlide}
                onShare={vm.shareSlide}
              />
              <View style={styles.card}>
                <Text style={styles.label}>{t("admin.socialPosts.detail.caption")}</Text>
                <Text selectable style={styles.caption}>
                  {copy.caption}
                </Text>
                {captionHasLegalLine(copy.caption, language) ? (
                  <Text style={styles.success}>{t("admin.socialPosts.detail.legalLine")}</Text>
                ) : (
                  <Text style={styles.error}>{t("admin.socialPosts.detail.legalMissing")}</Text>
                )}
                <Text style={styles.label}>{t("admin.socialPosts.detail.hashtags")}</Text>
                <View style={styles.row}>
                  {copy.hashtags.map((tag) => (
                    <View key={tag} style={styles.hashtag}>
                      <Text style={styles.hashtagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.label}>{t("admin.socialPosts.detail.cta")}</Text>
                <Text style={styles.body}>{copy.cta}</Text>
                <Text style={styles.label}>{t("admin.socialPosts.detail.altText")}</Text>
                <Text style={styles.body}>{copy.altText}</Text>
              </View>
            </>
          )}

          {vm.networkTimes.length > 0 && <SocialPostNetworkTimes times={vm.networkTimes} t={t} />}

          {(post.publishing || post.publications.length > 0) && (
            <SocialPostPublications
              publications={post.publications}
              publishing={post.publishing}
              working={vm.working}
              formatDate={vm.formatDate}
              formatNumber={vm.formatNumber}
              onRetry={vm.retryPublication}
              onOpen={vm.openPermalink}
            />
          )}

          <View style={styles.card}>
            <Text style={styles.heading} accessibilityRole="header">
              {t("admin.socialPosts.generation.heading")}
            </Text>
            <Text style={styles.help}>
              {t("admin.socialPosts.generation.summary", {
                model: post.generation.model ?? "—",
                provider: post.generation.provider ?? "—",
                attempts: post.generation.attempts,
              })}
            </Text>
            <Text style={styles.help}>
              {post.generation.generatedAt
                ? t("admin.socialPosts.generation.generatedAt", { date: vm.formatDate(post.generation.generatedAt) })
                : t("admin.socialPosts.generation.notGenerated")}
            </Text>
            {post.generation.factCheck && (
              <Badge
                label={t(`admin.socialPosts.generation.factCheck.${post.generation.factCheck}`)}
                variant={FACT_CHECK_VARIANT[post.generation.factCheck]}
              />
            )}
            {post.generation.issues.map((issue) => (
              <Text key={issue} style={styles.body}>
                {issue}
              </Text>
            ))}
            {post.generation.error && (
              <Text style={styles.error} accessibilityRole="alert">
                {t("admin.socialPosts.generation.error", { error: post.generation.error })}
              </Text>
            )}
          </View>

          {post.review &&
            (post.review.automatic || post.review.reviewedBy || post.review.editedBy || post.review.reason) && (
            <View style={styles.card}>
              <Text style={styles.heading} accessibilityRole="header">
                {t("admin.socialPosts.review.heading")}
              </Text>
              {post.review.automatic ? (
                <>
                  <Text style={styles.body}>{t("admin.socialPosts.review.automatic")}</Text>
                  {post.review.reviewedAt && (
                    <Text style={styles.help}>
                      {t("admin.socialPosts.review.automaticAt", { date: vm.formatDate(post.review.reviewedAt) })}
                    </Text>
                  )}
                </>
              ) : (
                post.review.reviewedBy && (
                  <Text style={styles.help}>
                    {t("admin.socialPosts.review.reviewedBy", {
                      by: post.review.reviewedBy,
                      date: post.review.reviewedAt ? vm.formatDate(post.review.reviewedAt) : "—",
                    })}
                  </Text>
                )
              )}
              {post.review.editedBy && (
                <Text style={styles.help}>{t("admin.socialPosts.review.editedBy", { by: post.review.editedBy })}</Text>
              )}
              {post.review.reason && !post.review.automatic && (
                <Text style={styles.help}>{t("admin.socialPosts.review.reason", { reason: post.review.reason })}</Text>
              )}
            </View>
          )}

          {(vm.actions.length > 0 || vm.canReschedule || vm.canPublishNow) && (
            <View style={styles.actions}>
              {vm.rejecting ? (
                <View style={styles.rejectBox}>
                  <ReasonPicker
                    label={t("admin.socialPosts.reject.label")}
                    hint={t("admin.socialPosts.reject.hint")}
                    reasons={SOCIAL_POST_REJECT_REASONS}
                    value={vm.rejectReason}
                    onChange={vm.setRejectReason}
                    labelFor={(reason) => t(`admin.socialPosts.rejectReasons.${reason}`)}
                    note={vm.rejectNote}
                    onNoteChange={vm.setRejectNote}
                    noteLabel={t("admin.socialPosts.reject.note")}
                    notePlaceholder={t("admin.socialPosts.reject.notePlaceholder")}
                    maxNoteLength={MAX_REJECT_NOTE_LENGTH}
                    noteError={vm.rejectNoteError}
                    disabled={vm.working}
                  />
                  <Button variant="ghost" disabled={vm.working} onPress={vm.cancelReject}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="danger" loading={vm.working} disabled={vm.working} onPress={() => void vm.confirmReject()}>
                    {t("admin.socialPosts.actions.confirmReject")}
                  </Button>
                </View>
              ) : vm.rescheduling ? (
                <SocialPostRescheduleForm vm={vm} />
              ) : vm.confirmingPublishNow ? (
                <SocialPostPublishNowConfirm vm={vm} />
              ) : (
                <>
                  {can("approve") && (
                    <Button disabled={vm.working} onPress={() => void vm.approve()}>
                      {t("admin.socialPosts.actions.approve")}
                    </Button>
                  )}
                  {vm.canPublishNow && (
                    <Button disabled={vm.working} onPress={vm.startPublishNow}>
                      {t("admin.socialPosts.publishNow.action")}
                    </Button>
                  )}
                  {can("edit") && (
                    <Button variant="outline" disabled={vm.working} onPress={vm.startEdit}>
                      {t("admin.socialPosts.actions.edit")}
                    </Button>
                  )}
                  {vm.canReschedule && (
                    <Button variant="outline" disabled={vm.working} onPress={vm.startReschedule}>
                      {t("admin.socialPosts.schedule.change")}
                    </Button>
                  )}
                  {can("regenerate") && copy && (
                    <Button variant="outline" disabled={vm.working} onPress={() => void vm.regenerate()}>
                      {t("admin.socialPosts.actions.regenerate")}
                    </Button>
                  )}
                  {can("regenerate") && post.status === "APPROVED" && (
                    <Text style={styles.help}>{t("admin.socialPosts.actions.regenerateApprovedHint")}</Text>
                  )}
                  {can("reject") && (
                    <Button variant="danger" disabled={vm.working} onPress={vm.startReject}>
                      {t("admin.socialPosts.actions.reject")}
                    </Button>
                  )}
                </>
              )}
            </View>
          )}
        </>
      )}
    </AdminDetailSheet>
  );
}
