/**
 * AdminPaginationBar — previous/next page controls.
 * Mirrors web AdminPagination component.
 */
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface AdminPaginationBarProps {
  page: number;
  totalPages: number;
  totalItems: number;
  /** Plural i18n key (`_one`/`_other`) that names what the list counts; defaults to results. */
  countKey?: string;
  onPageChange: (page: number) => void;
}

export function AdminPaginationBar({
  page,
  totalPages,
  totalItems,
  countKey = "common.resultCount",
  onPageChange,
}: AdminPaginationBarProps) {
  const { t } = useTranslation();
  const countLabel = t(countKey, { count: totalItems });

  if (totalPages <= 1) {
    return (
      <View style={styles.singleRow}>
        <Text style={styles.count}>
          {countLabel}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.count}>
        {countLabel}
      </Text>
      <View style={styles.controls}>
        <MotionPressable
          onPress={() => onPageChange(page - 1)}
          disabled={page === 0}
          style={[styles.btn, page === 0 && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t("common.previous")}
        >
          <ChevronLeft size={18} color={page === 0 ? lightTokens.textDisabled : wine[700]} />
        </MotionPressable>
        <View style={styles.pagePill}>
          <Text style={styles.pageLabel}>
            {page + 1} / {totalPages}
          </Text>
        </View>
        <MotionPressable
          onPress={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          style={[styles.btn, page >= totalPages - 1 && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t("common.next")}
        >
          <ChevronRight
            size={18}
            color={page >= totalPages - 1 ? lightTokens.textDisabled : wine[700]}
          />
        </MotionPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: lightTokens.borderDefault,
  },
  singleRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: lightTokens.borderDefault,
  },
  count: { ...textStyles.caption, color: lightTokens.textTertiary },
  controls: { flexDirection: "row", alignItems: "center", gap: 4 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.bgSubtle,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
  },
  btnDisabled: { opacity: 0.4 },
  pagePill: {
    minWidth: 58,
    height: 44,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
  pageLabel: { ...textStyles.labelMedium, color: wine[800] },
});
