/** Full-screen seal reveal when a tier is reached for the first time (S7). */
import { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn, useReducedMotion } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import type { BadgeTier } from "@/domain/points/badgeTiers";
import { Button } from "@/presentation/components/ui/Button";
import { useHaptics } from "@/presentation/hooks/ui";
import { lightTokens, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { UserBadge } from "./UserBadge";

interface TierCelebrationProps {
  tier: BadgeTier;
  onClose: () => void;
  onOpenPoints: () => void;
}

export function TierCelebration({ tier, onClose, onOpenPoints }: TierCelebrationProps) {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const reduceMotion = useReducedMotion();
  const name = t(`points.tiers.${tier}`);

  useEffect(() => {
    haptics.notification("success");
  }, [haptics, tier]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Animated.View entering={reduceMotion ? FadeIn : ZoomIn.springify().damping(14)} style={styles.seal}>
          <UserBadge tier={tier} size={200} mode="loop" interactive />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(reduceMotion ? 0 : 350)} style={styles.copy}>
          <Text style={styles.eyebrow}>{t("points.celebration.eyebrow")}</Text>
          <Text style={styles.title} accessibilityRole="header">{t("points.celebration.title", { tier: name })}</Text>
          <Text style={styles.body}>{t("points.celebration.body")}</Text>
          <Button onPress={onClose} style={styles.action}>{t("points.celebration.continue")}</Button>
          <Button variant="ghost" onPress={onOpenPoints} style={styles.action}>{t("points.celebration.seePoints")}</Button>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 36, backgroundColor: "rgba(36, 19, 24, 0.92)" },
  seal: { width: 200, height: 200 },
  copy: { alignItems: "center", gap: 8, alignSelf: "stretch" },
  eyebrow: { ...textStyles.overline, color: wine[300] },
  title: { ...textStyles.headingLarge, color: lightTokens.textInverted, textAlign: "center" },
  body: { ...textStyles.bodyMedium, color: wine[100], textAlign: "center", marginBottom: 12 },
  action: { alignSelf: "stretch" },
});
