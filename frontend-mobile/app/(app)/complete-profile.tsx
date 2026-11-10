import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AtSign, CheckCircle2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { localizeMessage } from "@/shared/i18n/localizeMessage";
import {
  completeSocialOnboardingSchema,
  type CompleteSocialOnboardingInput,
} from "@/domain/user/user.validators";
import { Button } from "@/presentation/components/ui/Button";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { TextField } from "@/presentation/components/ui/TextField";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useCompleteOnboarding } from "@/presentation/hooks/queries/user";
import { editorial, lightTokens, radii, spacing, iconStrokes } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

export default function CompleteProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, syncUser, returnPath, clearReturnPath } = useAuth();
  const completeOnboarding = useCompleteOnboarding();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteSocialOnboardingInput>({
    resolver: zodResolver(completeSocialOnboardingSchema),
    defaultValues: {
      username: user?.username.startsWith("vinnoter-") ? "" : (user?.username ?? ""),
    },
  });

  const complete = (username?: string) => {
    setServerError(null);
    completeOnboarding.mutate(
      { username },
      {
        onSuccess: async (updatedUser) => {
          await syncUser(updatedUser);
          router.replace((returnPath ?? "/(app)/(tabs)/home") as Href);
          clearReturnPath?.();
        },
        onError: (error) => {
          setServerError(getErrorMessage(error, t("socialOnboarding.error")));
        },
      },
    );
  };

  const onSubmit = ({ username }: CompleteSocialOnboardingInput) => {
    complete(username);
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing[8],
            paddingBottom: insets.bottom + spacing[8],
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconBadge}>
          <AtSign size={30} color={editorial.brand} strokeWidth={iconStrokes.strong} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{t("socialOnboarding.eyebrow")}</Text>
          <Text style={styles.title}>{t("socialOnboarding.title")}</Text>
          <Text style={styles.description}>{t("socialOnboarding.description")}</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={t("auth.username")}
                placeholder={t("socialOnboarding.placeholder")}
                hint={t("profile.usernameHint")}
                error={localizeMessage(t, errors.username?.message)}
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => void handleSubmit(onSubmit)()}
              />
            )}
          />

          {serverError ? <Text style={styles.error}>{localizeMessage(t, serverError)}</Text> : null}

          <Button
            fullWidth
            loading={completeOnboarding.isPending}
            leftIcon={<CheckCircle2 size={18} color={lightTokens.textInverted} />}
            onPress={handleSubmit(onSubmit)}
          >
            {t("socialOnboarding.continue")}
          </Button>
          <Button
            fullWidth
            variant="ghost"
            disabled={completeOnboarding.isPending}
            onPress={() => complete()}
          >
            {t("socialOnboarding.skip")}
          </Button>
        </View>

        <Text style={styles.footer}>{t("socialOnboarding.footer")}</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: lightTokens.bgSubtle,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing[5],
    gap: spacing[6],
  },
  iconBadge: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.bgMuted,
    borderWidth: 1,
    borderColor: lightTokens.brandTint,
  },
  copy: {
    alignItems: "center",
    gap: spacing[2],
  },
  eyebrow: {
    ...textStyles.labelLarge,
    color: lightTokens.brandPrimary,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  title: {
    ...textStyles.headingLarge,
    color: lightTokens.textPrimary,
    textAlign: "center",
    letterSpacing: 0,
  },
  description: {
    ...textStyles.bodyMedium,
    color: lightTokens.textTertiary,
    textAlign: "center",
    maxWidth: 360,
  },
  form: {
    gap: spacing[4],
    padding: spacing[5],
    borderRadius: radii.md,
    backgroundColor: lightTokens.surfaceDefault,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
  },
  error: {
    ...textStyles.bodySmall,
    color: lightTokens.danger,
  },
  footer: {
    ...textStyles.bodySmall,
    color: lightTokens.textTertiary,
    textAlign: "center",
  },
});
