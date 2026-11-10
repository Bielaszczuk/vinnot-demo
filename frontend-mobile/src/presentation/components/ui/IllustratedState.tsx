import { illustrations } from "@/shared/illustrations";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { illustratedStateCopyKeys, type IllustratedStateKind } from "@/presentation/feedback/illustratedState";
import { ImageWithFallback } from "./ImageWithFallback";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

const images = {
  forbidden: illustrations.forbidden,
  notFound: illustrations.notFound,
  server: illustrations.server,
  unavailable: illustrations.unavailable,
  rateLimit: illustrations.rateLimit,
  offline: illustrations.offline,
  timeout: illustrations.timeout,
  emptyCellar: illustrations.emptyCellar,
};
export function IllustratedState({
  kind,
  children,
  compact = false,
}: {
  kind: IllustratedStateKind;
  children?: ReactNode;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const copy = illustratedStateCopyKeys(kind);
  return (
    <View style={styles.container}>
      {kind !== "session" && (
        <ImageWithFallback
          fallbackSource={images[kind]}
          style={{ width: "100%", height: compact ? 150 : 240 }}
        />
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {t(copy.title)}
      </Text>
      <Text style={styles.description}>{t(copy.description)}</Text>
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  title: { ...textStyles.headingSmall, textAlign: "center", color: lightTokens.textPrimary },
  description: { ...textStyles.bodyMedium, textAlign: "center", color: lightTokens.textSecondary },
  actions: { width: "100%", maxWidth: 360, gap: 12, marginTop: 8 },
});
