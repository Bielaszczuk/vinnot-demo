import { Image, Pressable, SafeAreaView, StyleSheet, Text } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { useTranslation } from "react-i18next";
import { illustrations } from "@/shared/illustrations";
import { illustratedStateCopyKeys } from "@/presentation/feedback/illustratedState";
import { lightTokens, editorial, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

/** Minimal render-failure fallback: no app provider, navigation, or transport dependency. */
export function RenderFailureScreen({ retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  const copy = illustratedStateCopyKeys("server");
  return (
    <SafeAreaView style={styles.screen}>
      <Image
        source={illustrations.server}
        resizeMode="contain"
        style={styles.image}
        accessible={false}
      />
      <Text accessibilityRole="header" style={styles.title}>
        {t(copy.title)}
      </Text>
      <Text style={styles.body}>{t(copy.description)}</Text>
      <Pressable accessibilityRole="button" onPress={() => void retry()} style={styles.button}>
        <Text style={styles.buttonLabel}>{t("common.retry")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 20,
    backgroundColor: lightTokens.bgBase,
  },
  image: { width: "100%", height: 220 },
  title: { ...textStyles.headingSmall, textAlign: "center", color: lightTokens.textPrimary },
  body: { ...textStyles.bodyMedium, textAlign: "center", color: lightTokens.textSecondary },
  button: { backgroundColor: editorial.brand, borderRadius: radii["2xl"], padding: 18, marginHorizontal: 24 },
  buttonLabel: { ...textStyles.button, textAlign: "center", color: lightTokens.textInverted },
});
