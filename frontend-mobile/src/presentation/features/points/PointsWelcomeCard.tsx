/** One-time card after the initial points load: "your seal is ready" (S4). */
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { BadgeTier } from "@/domain/points/badgeTiers";
import { Button } from "@/presentation/components/ui/Button";
import { useModalAnimation } from "@/presentation/components/ui/motion/reducedMotion";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { UserBadge } from "./UserBadge";

interface PointsWelcomeCardProps {
  points: number;
  tier: BadgeTier;
  onDismiss: () => void;
  onOpenPoints: () => void;
}

export function PointsWelcomeCard({ points, tier, onDismiss, onOpenPoints }: PointsWelcomeCardProps) {
  const { t } = useTranslation();
  const animationType = useModalAnimation("slide");
  return (
    <Modal visible transparent animationType={animationType} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityRole="button"
          accessibilityLabel={t("points.welcome.dismiss")} />
        <View style={styles.card} accessibilityViewIsModal>
          <UserBadge tier={tier} size={96} mode="loop" />
          <Text style={styles.title} accessibilityRole="header">{t("points.welcome.title")}</Text>
          <Text style={styles.body}>
            {t("points.welcome.body", { points: t("points.pointsCount", { count: points }), tier: t(`points.tiers.${tier}`) })}
          </Text>
          <Button onPress={onOpenPoints} style={styles.action}>{t("points.welcome.action")}</Button>
          <Button variant="ghost" onPress={onDismiss} style={styles.action}>{t("points.welcome.dismiss")}</Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", padding: 16, backgroundColor: lightTokens.surfaceOverlay },
  card: {
    alignItems: "center", gap: 10, padding: 24, paddingTop: 28, borderRadius: radii["2xl"],
    backgroundColor: lightTokens.surfacePaper, borderWidth: 1, borderColor: lightTokens.borderSoft,
  },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary, textAlign: "center", marginTop: 6 },
  body: { ...textStyles.bodyMedium, color: lightTokens.textSecondary, textAlign: "center", marginBottom: 8 },
  action: { alignSelf: "stretch" },
});
