/**
 * Welcome / Onboarding Screen.
 *
 * Presentation-only route. Navigation and persisted onboarding state remain
 * delegated to Expo Router and the UI store.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import VineyardWatercolor from "../../assets/images/onboarding/vineyard.webp";
import { useUiStore } from "@/presentation/store/ui.store";
import { AuthButton, VinnotBrand, authColors, authFonts } from "@/presentation/features/auth";
import { fontSizes } from "@/shared/theme/typography";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const setOnboardingDone = useUiStore((state) => state.setOnboardingDone);
  const navigateTo = (destination: "/(auth)/login" | "/(auth)/register") => {
    setOnboardingDone();
    router.push(destination);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 22,
            paddingBottom: insets.bottom + 22,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(450)}>
          <VinnotBrand />
        </Animated.View>

        <View style={styles.main}>
          <Animated.View
            entering={FadeInDown.duration(600).delay(120)}
            style={styles.illustrationFrame}
          >
            <Image
              source={VineyardWatercolor}
              contentFit="contain"
              allowDownscaling
              style={styles.illustration}
              accessibilityLabel={t("onboarding.illustrationLabel")}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(540).delay(240)} style={styles.copy}>
            <Text style={styles.heading}>{t("onboarding.choiceTitle")}</Text>
            <Text style={styles.subtitle}>{t("onboarding.choiceSubtitle")}</Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.duration(520).delay(360)} style={styles.actions}>
          <AuthButton onPress={() => navigateTo("/(auth)/login")}>{t("auth.signIn")}</AuthButton>
          <AuthButton variant="outline" onPress={() => navigateTo("/(auth)/register")}>
            {t("auth.createAccount")}
          </AuthButton>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  content: {
    // Fills the screen at default text sizes and scrolls at the largest Dynamic Type.
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  main: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 18,
  },
  illustrationFrame: {
    width: "100%",
    aspectRatio: 1.34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  copy: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  heading: {
    color: authColors.ink,
    fontFamily: authFonts.semibold,
    fontSize: fontSizes["2xl"],
    lineHeight: 34,
    textAlign: "center",
    letterSpacing: 0,
  },
  subtitle: {
    maxWidth: 340,
    color: authColors.muted,
    fontFamily: authFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 22,
    textAlign: "center",
    letterSpacing: 0,
    marginTop: 10,
  },
  actions: { gap: 12 },
});
