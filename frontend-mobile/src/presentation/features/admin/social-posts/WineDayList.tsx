/** The wine days of the current and the next month (#499, as on web): a read-only list the planner uses. */
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { localizedName, type SocialPostLanguage, type WineDay } from "@/domain/admin/socialPost";
import { AdminQueryError } from "../AdminQueryError";
import { socialPostStyles as styles } from "./socialPostStyles";

export function WineDayList({
  days,
  language,
  loading,
  failed,
  retry,
  formatDay,
}: {
  days: WineDay[];
  language: SocialPostLanguage;
  loading: boolean;
  failed: boolean;
  retry: () => unknown;
  formatDay: (isoDate: string) => string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        {t("admin.socialPosts.wineDays.heading")}
      </Text>
      <Text style={styles.help}>{t("admin.socialPosts.wineDays.help")}</Text>
      {failed ? (
        <AdminQueryError retry={retry} />
      ) : loading ? (
        <Skeleton height={96} />
      ) : days.length === 0 ? (
        <Text style={styles.help}>{t("admin.socialPosts.wineDays.empty")}</Text>
      ) : (
        days.map((day) => (
          <View key={`${day.code}-${day.date}`} style={styles.dayRow}>
            <Text style={styles.dayDate}>{formatDay(day.date)}</Text>
            <Text style={styles.dayName}>{localizedName(day, language)}</Text>
            <Text style={styles.help}>{t("admin.socialPosts.wineDays.priority", { priority: day.priority })}</Text>
          </View>
        ))
      )}
    </View>
  );
}
