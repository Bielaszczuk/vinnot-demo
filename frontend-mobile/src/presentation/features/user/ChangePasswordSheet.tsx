/**
 * ChangePasswordSheet — bottom sheet for account password changes.
 */
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { localizeMessage } from "@/shared/i18n/localizeMessage";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import { useChangePassword } from "@/presentation/hooks/queries/user";
import { useToast } from "@/presentation/providers/ToastProvider";
import { changePasswordSchema, type ChangePasswordInput } from "@/domain/user/user.validators";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordSheet({ visible, onClose }: ChangePasswordSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["76%"], []);
  const changePassword = useChangePassword();
  const { showSuccess, showError } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    if (!visible) {
      sheetRef.current?.dismiss();
      return;
    }

    reset({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    sheetRef.current?.present();
  }, [reset, visible]);

  const onSubmit = (values: ChangePasswordInput) => {
    changePassword.mutate(
      { current: values.currentPassword, next: values.newPassword },
      {
        onSuccess: () => {
          showSuccess(t("profile.toastPasswordChanged"));
          onClose();
        },
        onError: () => showError(t("profile.toastPasswordError")),
      },
    );
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={!changePassword.isPending}
      onDismiss={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={changePassword.isPending ? "none" : "close"}
        />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("profile.changePassword")}</Text>
          <Text style={styles.subtitle}>{t("profile.passwordHint")}</Text>
        </View>

        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, value } }) => (
            <TextField
              label={t("profile.currentPassword")}
              value={value}
              onChangeText={onChange}
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              error={localizeMessage(t, errors.currentPassword?.message)}
              required
            />
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, value } }) => (
            <TextField
              label={t("profile.newPassword")}
              value={value}
              onChangeText={onChange}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
              hint={t("profile.minChars")}
              error={localizeMessage(t, errors.newPassword?.message)}
              required
            />
          )}
        />

        <Controller
          control={control}
          name="confirmNewPassword"
          render={({ field: { onChange, value } }) => (
            <TextField
              label={t("profile.confirmNewPassword")}
              value={value}
              onChangeText={onChange}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
              error={localizeMessage(t, errors.confirmNewPassword?.message)}
              required
            />
          )}
        />

        <View style={styles.actions}>
          <Button
            variant="ghost"
            disabled={changePassword.isPending}
            onPress={onClose}
            style={styles.action}
          >
            {t("common.cancel")}
          </Button>
          <Button
            loading={changePassword.isPending}
            onPress={handleSubmit(onSubmit)}
            style={styles.action}
          >
            {t("profile.changePassword")}
          </Button>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { gap: 18, paddingHorizontal: 20, paddingBottom: 34 },
  header: { gap: 4 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  actions: { flexDirection: "row", gap: 10, paddingTop: 4 },
  action: { flex: 1 },
});
