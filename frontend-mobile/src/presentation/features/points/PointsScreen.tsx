/**
 * "Tus puntos" (S7): how to earn points, recent movements and the full ladder of seals.
 */
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BADGE_TIERS, type BadgeTierInfo } from "@/domain/points/badgeTiers";
import type { PointsMovement, PointsSummary } from "@/domain/points/points.types";
import { AppHeader } from "@/presentation/components/layout";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { useFreshPointsSummary } from "@/presentation/hooks/queries/user";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { goBackOr, PROFILE_ROUTE } from "@/presentation/navigation/discoveryNavigation";
import { AuthGuard } from "@/presentation/navigation/guards";
import { layout, lightTokens, radii, systemColors, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { PointsProgress } from "./PointsProgress";
import { POINTS_RULES } from "./pointsRules";
import { SEAL_ART } from "./sealArt";
import { UserBadge } from "./UserBadge";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

function HowToEarn({ dailyCap }: { dailyCap: number }) {
  const { t } = useTranslation();
  return (
    <Section title={t("points.howToEarn")}>
      <Text style={styles.footnote}>{t("points.howToEarnNote")}</Text>
      <View style={styles.card}>
        {POINTS_RULES.map((rule, index) => (
          <View key={rule.source} style={[styles.ruleRow, index > 0 && styles.divider]} testID={`points-rule-${rule.source}`}>
            <View style={styles.ruleText}>
              <Text style={styles.ruleLabel}>{t(`points.rules.${rule.label}`)}</Text>
              <Text style={styles.ruleLimit}>{t(`points.limits.${rule.limit.key}`, { count: rule.limit.count })}</Text>
            </View>
            <Text style={styles.rulePoints}>+{rule.points}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.footnote}>{t("points.dailyCapNote", { cap: dailyCap })}</Text>
    </Section>
  );
}

function Movement({ entry, first }: { entry: PointsMovement; first: boolean }) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const negative = entry.points < 0;
  return (
    <View style={[styles.ruleRow, !first && styles.divider]} testID={`points-movement-${entry.id}`}>
      <View style={styles.ruleText}>
        <Text style={styles.ruleLabel}>{t(`points.sources.${entry.source ?? "unknown"}`)}</Text>
        <Text style={styles.ruleLimit} numberOfLines={1}>
          {[entry.label, formatDate(entry.createdAt)].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Text style={[styles.rulePoints, negative && styles.negative]}>{negative ? entry.points : `+${entry.points}`}</Text>
    </View>
  );
}

function LadderStep({ tier, summary }: { tier: BadgeTierInfo; summary: PointsSummary }) {
  const { t } = useTranslation();
  const reached = summary.points >= tier.threshold;
  const current = summary.tier === tier.key;
  const state = current ? t("points.current") : reached ? t("points.reached") : t("points.locked");
  return (
    <View style={[styles.step, current && styles.stepCurrent]} testID={`points-tier-${tier.key}`}
      accessible accessibilityLabel={`${t(`points.tiers.${tier.key}`)}, ${t("points.threshold", { count: tier.threshold })}, ${state}`}>
      {reached ? (
        <UserBadge tier={tier.key} size="card" mode="list" />
      ) : (
        <Image source={SEAL_ART[tier.slug]} style={styles.lockedSeal} accessibilityIgnoresInvertColors testID="points-locked-seal" />
      )}
      <Text style={[styles.stepName, !reached && styles.locked]} numberOfLines={1}>{t(`points.tiers.${tier.key}`)}</Text>
      <Text style={styles.stepPoints}>{t("points.threshold", { count: tier.threshold })}</Text>
      <Text style={[styles.stepState, current && styles.stepStateCurrent]}>{state}</Text>
    </View>
  );
}

function PointsContent({ summary }: { summary: PointsSummary }) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.hero}>
        <UserBadge tier={summary.tier} size="profile" mode="loop" interactive
          accessibilityLabel={t("points.badgeLabel", { tier: t(`points.tiers.${summary.tier}`) })} />
        <View style={styles.heroText}>
          <PointsProgress summary={summary} />
          <Text style={styles.today}>{t("points.todayEarned", { earned: summary.todayEarned, cap: summary.dailyCap })}</Text>
        </View>
      </View>
      <HowToEarn dailyCap={summary.dailyCap} />
      <Section title={t("points.recent")}>
        {summary.recent.length ? (
          <View style={styles.card}>
            {summary.recent.map((entry, index) => <Movement key={entry.id} entry={entry} first={index === 0} />)}
          </View>
        ) : (
          <Text style={styles.note}>{t("points.recentEmpty")}</Text>
        )}
      </Section>
      <Section title={t("points.ladder")}>
        <View style={styles.ladder}>
          {BADGE_TIERS.map((tier) => <LadderStep key={tier.key} tier={tier} summary={summary} />)}
        </View>
      </Section>
    </>
  );
}

export function PointsScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useFreshPointsSummary();
  // The spinner follows the person's pull only; visits refresh quietly in the background.
  const [pulling, setPulling] = useState(false);
  const pullToRefresh = () => {
    setPulling(true);
    void Promise.resolve(query.refetch()).catch(() => undefined).finally(() => setPulling(false));
  };
  return (
    <View style={styles.screen}>
      <AppHeader title={t("points.title")} showBack onBack={() => goBackOr(router, PROFILE_ROUTE as Href)} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<BrandRefreshControl refreshing={pulling} onRefresh={pullToRefresh} />}>
        {query.data ? (
          <PointsContent summary={query.data} />
        ) : query.isError ? (
          <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <View style={styles.loading}>
            <Skeleton height={120} radius={18} />
            <Skeleton height={260} radius={18} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function PointsScreen() {
  return (
    <AuthGuard>
      <PointsScreenContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgSubtle },
  content: { paddingHorizontal: layout.screenHorizontalPadding, paddingTop: 16, gap: 28 },
  loading: { gap: 16 },
  hero: {
    flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: radii.xl,
    backgroundColor: wine[50], borderWidth: 1, borderColor: wine[100],
  },
  heroText: { flex: 1, gap: 6 },
  today: { ...textStyles.caption, color: lightTokens.textSecondary },
  section: { gap: 10 },
  sectionTitle: { ...textStyles.titleMedium, color: lightTokens.textPrimary },
  note: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  /** How-to notes read as fine print, softer than the rules they explain. */
  footnote: { ...textStyles.caption, color: lightTokens.textTertiary },
  card: { borderRadius: radii.lg, borderWidth: 1, borderColor: lightTokens.borderDefault, backgroundColor: lightTokens.surfaceDefault, paddingHorizontal: 16 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: lightTokens.borderSoft },
  ruleText: { flex: 1, gap: 2 },
  ruleLabel: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  ruleLimit: { ...textStyles.caption, color: lightTokens.textTertiary },
  rulePoints: { ...textStyles.titleSmall, color: lightTokens.textBrand, fontVariant: ["tabular-nums"] },
  negative: { color: systemColors.danger },
  ladder: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  step: {
    width: "31%", flexGrow: 1, alignItems: "center", gap: 4, paddingVertical: 14, paddingHorizontal: 6,
    borderRadius: radii.lg, borderWidth: 1, borderColor: lightTokens.borderDefault, backgroundColor: lightTokens.surfaceDefault,
  },
  stepCurrent: { borderColor: wine[700], backgroundColor: wine[50] },
  lockedSeal: { width: 64, height: 64, opacity: 0.32 },
  stepName: { ...textStyles.labelMedium, color: lightTokens.textPrimary, marginTop: 4 },
  locked: { color: lightTokens.textTertiary },
  stepPoints: { ...textStyles.caption, color: lightTokens.textTertiary, fontVariant: ["tabular-nums"] },
  stepState: { ...textStyles.labelSmall, color: lightTokens.textTertiary },
  stepStateCurrent: { color: wine[700] },
});
