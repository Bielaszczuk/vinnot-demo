import { getMutationErrorCode } from "@/presentation/store/mutationAdapter";
import { isInternationalPhoneInput } from "@/domain/user/contactPhone";
/**
 * EditProfileSheet — bottom sheet profile editor.
 */
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { localizeMessage } from "@/shared/i18n/localizeMessage";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import { useUpdateProfile } from "@/presentation/hooks/queries/user";
import { useToast } from "@/presentation/providers/ToastProvider";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { User } from "@/domain/user/user.types";
import {
  updateUserProfileSchema,
  type UpdateUserProfileInput,
} from "@/domain/user/user.validators";
import { useAuth } from "@/presentation/hooks/useAuth";

interface EditProfileSheetProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onUpdated: () => void;
}

type FormValues = Pick<
  UpdateUserProfileInput,
  "username" | "firstName" | "lastName" | "phoneNumber"
>;

export function EditProfileSheet({ visible, user, onClose, onUpdated }: EditProfileSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["88%"], []);
  const { showSuccess, showError } = useToast();
  const updateProfile = useUpdateProfile();
  const { syncUser } = useAuth();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: { username: "", firstName: "", lastName: "", phoneNumber: "" },
  });

  useEffect(() => {
    if (!visible) {
      sheetRef.current?.dismiss();
      return;
    }
    reset({
      username: user?.username ?? "",
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phoneNumber: user?.phoneNumber ?? "",
    });
    sheetRef.current?.present();
  }, [reset, user, visible]);

  const onSubmit = (values: FormValues) => {
    if (values.phoneNumber?.trim() && !isInternationalPhoneInput(values.phoneNumber)) {
      showError(t("contactPhone.invalid"));
      return;
    }
    updateProfile.mutate(
      {
        username: values.username?.trim().toLowerCase(),
        firstName: values.firstName.trim(),
        lastName: values.lastName?.trim() || undefined,
        phoneNumber: values.phoneNumber?.trim() ?? "",
      },
      {
        onSuccess: async (updatedUser) => {
          await syncUser(updatedUser);
          showSuccess(t("profile.updateSuccess"));
          onUpdated();
          onClose();
        },
        onError: (error) =>
          showError(
            t(
              getMutationErrorCode(error) === "INVALID_PHONE_NUMBER"
                ? "contactPhone.invalid"
                : "profile.updateError",
            ),
          ),
      },
    );
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={!updateProfile.isPending}
      onDismiss={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={updateProfile.isPending ? "none" : "close"}
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
          <Text style={styles.title}>{t("profile.editProfile")}</Text>
          <Text style={styles.subtitle}>{t("profile.editProfileDesc")}</Text>
        </View>

        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <TextField
              label={t("profile.username")}
              hint={t("profile.usernameHint")}
              error={localizeMessage(t, error?.message)}
              value={value ?? ""}
              onChangeText={onChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        />
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <TextField
              label={t("profile.firstName")}
              placeholder={t("profile.firstNamePlaceholder")}
              value={value}
              onChangeText={onChange}
              error={localizeMessage(t, error?.message)}
              autoCapitalize="words"
              required
            />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <TextField
              label={t("profile.lastName")}
              placeholder={t("profile.lastNamePlaceholder")}
              value={value ?? ""}
              onChangeText={onChange}
              error={localizeMessage(t, error?.message)}
              autoCapitalize="words"
            />
          )}
        />

        <Controller
          control={control}
          name="phoneNumber"
          render={({ field }) => (
            <TextField
              label={t("contactPhone.optionalLabel")}
              hint={t("contactPhone.privateHint")}
              value={field.value ?? ""}
              onChangeText={field.onChange}
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={50}
              placeholder="+54 9 11 2345 6789"
            />
          )}
        />
        <View style={styles.actions}>
          <Button
            variant="ghost"
            disabled={updateProfile.isPending}
            onPress={onClose}
            style={styles.action}
          >
            {t("common.cancel")}
          </Button>
          <Button
            loading={updateProfile.isPending}
            onPress={handleSubmit(onSubmit)}
            style={styles.action}
          >
            {t("common.save")}
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
