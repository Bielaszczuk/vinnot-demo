/**
 * CancelEventSheet — one-tap cancellation reason with a preselected default.
 * Shared by the partner and admin event lists.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CalendarX } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { Chip } from "@/presentation/components/ui/Chip";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import {
  DEFAULT_CANCELLATION_REASON,
  EVENT_CANCELLATION_REASONS,
  MAX_CANCELLATION_NOTE_LENGTH,
  toCancellationRequest,
  type EventCancellationReason,
  type EventCancellationRequest,
} from "@/domain/event/eventCancellation";
import { lightTokens, radii, systemColors } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export interface CancelEventSheetProps {
  visible: boolean;
  eventTitle: string;
  busy?: boolean;
  onConfirm: (cancellation: EventCancellationRequest) => void;
  onClose: () => void;
}

export function CancelEventSheet({ visible, eventTitle, busy = false, onConfirm, onClose }: CancelEventSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["80%"], []);
  const [reason, setReason] = useState<EventCancellationReason>(DEFAULT_CANCELLATION_REASON);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  const close = () => {
    setReason(DEFAULT_CANCELLATION_REASON);
    setNote("");
    onClose();
  };

  const confirm = () => {
    if (busy) return;
    onConfirm(toCancellationRequest(reason, note));
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={!busy}
      onDismiss={close}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior={busy ? "none" : "close"} />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <CalendarX size={22} color={systemColors.danger} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t("events.cancellation.title")}</Text>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {eventTitle}
            </Text>
          </View>
        </View>

        <Text style={styles.consequence}>{t("events.cancellation.consequence")}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("events.cancellation.reasonLabel")}</Text>
          <Text style={styles.sectionHint}>{t("events.cancellation.reasonHint")}</Text>
          <View style={styles.chips}>
            {EVENT_CANCELLATION_REASONS.map((code) => (
              <Chip
                key={code}
                label={t(`events.cancellation.reasons.${code}`)}
                selected={reason === code}
                disabled={busy}
                onPress={() => setReason(code)}
              />
            ))}
          </View>
        </View>

        {reason === "OTHER" ? (
          <TextField
            label={t("events.cancellation.noteLabel")}
            placeholder={t("events.cancellation.notePlaceholder")}
            hint={t("events.cancellation.noteCounter", {
              count: note.length,
              max: MAX_CANCELLATION_NOTE_LENGTH,
            })}
            value={note}
            onChangeText={setNote}
            maxLength={MAX_CANCELLATION_NOTE_LENGTH}
            editable={!busy}
            multiline
            style={styles.note}
          />
        ) : null}

        <View style={styles.actions}>
          <Button
            variant="danger"
            fullWidth
            loading={busy}
            onPress={confirm}
            accessibilityLabel={t("events.cancellation.confirm")}
          >
            {t("events.cancellation.confirm")}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            disabled={busy}
            onPress={close}
            accessibilityLabel={t("events.cancellation.keep")}
          >
            {t("events.cancellation.keep")}
          </Button>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { gap: 18, paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: systemColors.dangerLight,
  },
  headerText: { flex: 1, gap: 3 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  eventTitle: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  consequence: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  section: { gap: 6 },
  sectionLabel: { ...textStyles.labelMedium, color: lightTokens.textPrimary },
  sectionHint: { ...textStyles.caption, color: lightTokens.textTertiary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  note: { minHeight: 88, textAlignVertical: "top" },
  actions: { gap: 10, marginTop: 4 },
});
