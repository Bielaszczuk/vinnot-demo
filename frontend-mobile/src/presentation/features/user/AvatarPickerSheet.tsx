/**
 * AvatarPickerSheet — take or pick a profile photo, frame it in the round adjust step and
 * upload it. The adjust modal is a sibling of the sheet, so it does not depend on the sheet's
 * own presentation; the sheet stays open underneath until the upload succeeds.
 */
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { Camera, Image as ImageIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  avatarSelectionService,
  type AvatarSource,
} from "@/application/services/avatarSelection.service";
import { Avatar } from "@/presentation/components/ui/Atoms";
import { Button } from "@/presentation/components/ui/Button";
import { ImageCropModal } from "@/presentation/components/features/media/ImageCropModal";
import { useImageCropRequest } from "@/presentation/hooks/useImageCropRequest";
import { useUploadAvatar } from "@/presentation/hooks/queries/user";
import { useToast } from "@/presentation/providers/ToastProvider";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { User } from "@/domain/user/user.types";

interface AvatarPickerSheetProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onUploaded: (avatarUrl: string) => void;
}

export function AvatarPickerSheet({ visible, user, onClose, onUploaded }: AvatarPickerSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["54%"], []);
  const { showSuccess, showError } = useToast();
  const uploadAvatar = useUploadAvatar();
  const crop = useImageCropRequest();

  useEffect(() => {
    if (!visible) {
      sheetRef.current?.dismiss();
      return;
    }
    sheetRef.current?.present();
  }, [visible]);

  const pickAvatar = async (source: AvatarSource) => {
    const result = await avatarSelectionService.select(source, crop.adjust);
    if (result.status === "permission_denied") {
      showError(t("profile.avatarPermissionDenied"));
      return;
    }
    if (result.status !== "selected") return;

    uploadAvatar.mutate(result.upload, {
      onSuccess: (avatarUrl) => {
        showSuccess(t("profile.avatarSuccess"));
        onUploaded(avatarUrl);
        onClose();
      },
      onError: () => showError(t("profile.avatarError")),
    });
  };

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose={!uploadAvatar.isPending}
        onDismiss={onClose}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior={uploadAvatar.isPending ? "none" : "close"}
          />
        )}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Avatar uri={user?.avatarUrl} name={user?.name ?? "U"} size={78} />
            <Text style={styles.title}>{t("profile.changeAvatar")}</Text>
            <Text style={styles.subtitle}>{t("profile.changeAvatarDesc")}</Text>
          </View>
          <View style={styles.actions}>
            <Button
              fullWidth
              variant="outline"
              loading={uploadAvatar.isPending}
              leftIcon={<ImageIcon size={17} color={lightTokens.brandPrimary} />}
              onPress={() => void pickAvatar("library")}
            >
              {t("profile.chooseFromGallery")}
            </Button>
            <Button
              fullWidth
              variant="outline"
              loading={uploadAvatar.isPending}
              leftIcon={<Camera size={17} color={lightTokens.brandPrimary} />}
              onPress={() => void pickAvatar("camera")}
            >
              {t("profile.takePhoto")}
            </Button>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
      <ImageCropModal request={crop.request} onCancel={crop.cancel} onConfirm={crop.confirm} />
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { gap: 20, paddingHorizontal: 20, paddingBottom: 34 },
  header: { alignItems: "center", gap: 8 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary, marginTop: 4 },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary, textAlign: "center" },
  actions: { gap: 10 },
});
