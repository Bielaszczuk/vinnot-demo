import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAndroidKeyboardSpace, useFocusedFieldReveal } from "@/presentation/components/ui/useFocusedFieldReveal";
import { VinnotBrand } from "./VinnotBrand";
import { authColors, authFonts } from "./authTheme";
import { fontSizes } from "@/shared/theme/typography";

type AuthLayoutProps = {
  heroTitle: ReactNode;
  heroSubtitle: string;
  children: ReactNode;
};

export function AuthLayout({ heroTitle, heroSubtitle, children }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();
  // Edge-to-edge Android does not resize for the docked keyboard and does not
  // restore a KeyboardAvoidingView height: reserve keyboard room inside the scroll
  // instead and reveal the focused field with the shared sheet logic.
  const { scroll, reveal, trackScroll } = useFocusedFieldReveal<ScrollViewInstance>({
    enabled: Platform.OS === "android",
    followNativeFocus: true,
  });
  const keyboardSpace = useAndroidKeyboardSpace();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={insets.top}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          onLayout={reveal}
          onContentSizeChange={reveal}
          onScroll={trackScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 18,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Animated.View entering={FadeIn.duration(380)} style={styles.brand}>
              <VinnotBrand />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(480).delay(90)}
              style={styles.headingBlock}
            >
              <Text style={styles.heading}>{heroTitle}</Text>
              <Text style={styles.subtitle}>{heroSubtitle}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(520).delay(160)} style={styles.form}>
              {children}
            </Animated.View>
          </View>
          {keyboardSpace > 0 && <View testID="auth-keyboard-space" style={{ height: keyboardSpace }} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  container: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
  },
  brand: {
    alignItems: "center",
    marginBottom: 30,
  },
  headingBlock: {
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
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
    maxWidth: 350,
    color: authColors.muted,
    fontFamily: authFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    textAlign: "center",
    letterSpacing: 0,
    marginTop: 7,
  },
  form: {
    width: "100%",
  },
});
