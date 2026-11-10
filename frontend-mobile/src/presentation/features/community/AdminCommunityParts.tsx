import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { ChevronRight, FileCheck2, Flag } from "lucide-react-native";
import { lightTokens, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { EmptyState } from "@/presentation/components/ui/Feedback";

export function ModerationTabs({ active }: { active: "reports" | "publications" }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={adminCommunityStyles.tabs}>
      {(["reports", "publications"] as const).map((key) => {
        const Icon = key === "reports" ? Flag : FileCheck2;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: key === active }}
            style={[adminCommunityStyles.tab, key === active && adminCommunityStyles.activeTab]}
            onPress={() => {
              if (key !== active)
                router.replace(
                  key === "reports" ? "/(app)/admin/community" : "/(app)/admin/publications",
                );
            }}
          >
            <Icon size={17} color={key === active ? wine[700] : lightTokens.textSecondary} />
            <Text
              style={[
                adminCommunityStyles.tabText,
                key === active && adminCommunityStyles.activeTabText,
              ]}
            >
              {t(key === "reports" ? "community.reportsTab" : "community.publicationsTab")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ModerationEmpty({ publications = false }: { publications?: boolean }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      illustration="community"
      title={t(publications ? "community.queueClear" : "community.noCases")}
      description={t(publications ? "community.queueClearHelp" : "community.noCasesHelp")}
      style={adminCommunityStyles.emptyState}
    />
  );
}

export function ModerationRow({
  title,
  subtitle,
  preview,
  badge,
  onPress,
}: {
  title: string;
  subtitle: string;
  preview: string;
  badge?: ReactNode;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${t("community.openCase")}: ${title}`}
      onPress={onPress}
      pressedScale={0.99}
      style={adminCommunityStyles.row}
    >
      <View style={adminCommunityStyles.rowContent}>
        <View style={adminCommunityStyles.rowHeading}>
          <Text style={adminCommunityStyles.rowTitle}>{title}</Text>
          {badge}
        </View>
        <Text style={adminCommunityStyles.help}>{subtitle}</Text>
        {!!preview && (
          <Text numberOfLines={2} style={adminCommunityStyles.preview}>
            {preview}
          </Text>
        )}
      </View>
      <ChevronRight size={19} color={wine[700]} />
    </MotionPressable>
  );
}

export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={adminCommunityStyles.field}>
      <Text style={adminCommunityStyles.label}>{label}</Text>
      {typeof children === "string" ? (
        <Text selectable style={adminCommunityStyles.preview}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export const adminCommunityStyles = StyleSheet.create({
  emptyState: { flex: 0, paddingVertical: 24, paddingHorizontal: 8 },
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  tabs: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: 16,
    backgroundColor: lightTokens.bgSubtle,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: lightTokens.surfaceDefault,
    borderWidth: 1,
    borderColor: wine[200],
  },
  tabText: { ...textStyles.labelMedium, color: lightTokens.textSecondary, flexShrink: 1 },
  activeTabText: { color: wine[700] },
  help: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  rowContent: { flex: 1, gap: 8 },
  rowHeading: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  rowTitle: { ...textStyles.titleSmall, color: lightTokens.textPrimary, flexShrink: 1 },
  preview: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  field: { gap: 6 },
  label: { ...textStyles.labelSmall, color: lightTokens.textSecondary },
  evidence: { padding: 16, borderRadius: 16, gap: 10, backgroundColor: wine[50] },
  input: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: lightTokens.borderStrong,
    borderRadius: 14,
    padding: 14,
    textAlignVertical: "top",
    ...textStyles.bodyMedium,
    color: lightTokens.textPrimary,
    backgroundColor: lightTokens.bgBase,
  },
  actionGroup: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: lightTokens.borderDefault,
    paddingTop: 16,
  },
  error: { ...textStyles.bodySmall, color: lightTokens.danger },
  statusFilters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  chipSelected: { borderColor: wine[700], backgroundColor: wine[50] },
  chipLabelSelected: { ...textStyles.labelMedium, color: wine[700] },
});
