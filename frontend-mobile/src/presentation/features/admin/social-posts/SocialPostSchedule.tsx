/**
 * Schedule of the open post (#513): when each enabled network publishes it, in Argentina time; the form that moves
 * it to another date and time (with a warning when the copy names its wine day); and the confirmation before
 * publishing it now. The backend decides which of the two actions the post accepts.
 */
import { Text, View } from "react-native";
import { Button } from "@/presentation/components/ui/Button";
import type { SocialNetwork } from "@/domain/admin/socialPost";
import { SocialPostScheduleField } from "./SocialPostScheduleField";
import { socialPostStyles as styles } from "./socialPostStyles";
import type { useAdminSocialPostsViewModel } from "./useAdminSocialPostsViewModel";

type ViewModel = ReturnType<typeof useAdminSocialPostsViewModel>;

export interface SocialPostNetworkTimesProps {
  times: { network: SocialNetwork; time: string }[];
  t: ViewModel["t"];
}

export function SocialPostNetworkTimes({ times, t }: SocialPostNetworkTimesProps) {
  return (
    <View style={styles.card} testID="social-post-network-times">
      <Text style={styles.heading} accessibilityRole="header">
        {t("admin.socialPosts.schedule.networkTimes")}
      </Text>
      <View style={styles.row}>
        {times.map(({ network, time }) => (
          <View key={network} style={styles.hashtag}>
            <Text style={styles.hashtagText}>
              {t("admin.socialPosts.schedule.networkTime", {
                network: t(`admin.socialPosts.networks.${network}`),
                time,
              })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SocialPostRescheduleForm({ vm }: { vm: ViewModel }) {
  const { t } = vm;
  return (
    <View style={styles.scheduleBox} testID="social-post-reschedule">
      <Text style={styles.heading} accessibilityRole="header">
        {t("admin.socialPosts.schedule.heading")}
      </Text>
      <Text style={styles.help}>{t("admin.socialPosts.schedule.argentinaTime")}</Text>
      <SocialPostScheduleField
        value={vm.scheduleDraft}
        locale={vm.locale}
        dateLabel={t("admin.socialPosts.schedule.dateLabel", { date: vm.scheduleDraft.date })}
        timeLabel={t("admin.socialPosts.schedule.timeLabel", { time: vm.scheduleDraft.time })}
        formatDay={vm.formatDay}
        onDateChange={vm.setScheduleDate}
        onTimeChange={vm.setScheduleTime}
      />
      {vm.rescheduleWarning && (
        <View style={styles.warning} accessibilityRole="alert">
          <Text style={styles.warningText}>{vm.rescheduleWarning}</Text>
        </View>
      )}
      <Button variant="ghost" disabled={vm.working} onPress={vm.cancelReschedule}>
        {t("common.cancel")}
      </Button>
      <Button loading={vm.working} disabled={vm.working} onPress={() => void vm.confirmReschedule()}>
        {t("admin.socialPosts.schedule.confirm")}
      </Button>
    </View>
  );
}

export function SocialPostPublishNowConfirm({ vm }: { vm: ViewModel }) {
  const { t } = vm;
  return (
    <View style={styles.scheduleBox} testID="social-post-publish-now">
      <Text style={styles.heading} accessibilityRole="header">
        {t("admin.socialPosts.publishNow.heading")}
      </Text>
      <Text style={styles.body}>{t("admin.socialPosts.publishNow.confirmText")}</Text>
      <Button variant="ghost" disabled={vm.working} onPress={vm.cancelPublishNow}>
        {t("common.cancel")}
      </Button>
      <Button loading={vm.working} disabled={vm.working} onPress={() => void vm.confirmPublishNow()}>
        {t("admin.socialPosts.publishNow.confirm")}
      </Button>
    </View>
  );
}
