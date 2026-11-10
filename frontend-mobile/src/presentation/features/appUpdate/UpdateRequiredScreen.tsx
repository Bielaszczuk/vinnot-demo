import { useEffect } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { useExternalLink } from "@/presentation/hooks/useExternalLink";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

/** Full-screen block with no way back into the app: the only action opens the store. */
export function UpdateRequiredScreen({ storeUrl }: { storeUrl: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const openLink = useExternalLink();

  useEffect(() => {
    // Swallow the Android back button so it cannot reveal or navigate the app.
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("forceUpdate.title")}
        </Text>
        <Text style={styles.body}>{t("forceUpdate.body")}</Text>
        <Button
          fullWidth
          accessibilityLabel={t("forceUpdate.actionLabel")}
          onPress={() => void openLink(storeUrl)}
        >
          {t("forceUpdate.action")}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: { width: "100%", maxWidth: 520, alignSelf: "center", gap: 20 },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary, textAlign: "center" },
  body: { ...textStyles.bodyMedium, color: lightTokens.textSecondary, textAlign: "center" },
});
