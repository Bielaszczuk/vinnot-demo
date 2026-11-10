import { eventBookingErrorKey } from "@/domain/event/eventBookingError";
import { getMutationErrorCode } from "@/presentation/store/mutationAdapter";
import { EventDraftNotice } from "./EventDraftNotice";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import type { ManagedEvent, EventEditorInput } from "@/domain/event/eventManagement.types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { Button } from "@/presentation/components/ui/Button";
import { useToast } from "@/presentation/providers/ToastProvider";
import { vinnotColors as colors, vinnotFonts as fonts } from "@/shared/theme/vinnotTheme";
import { EventEditorFields } from "./EventEditorFields";
import { toEventEditorPayload, useEventEditor } from "./useEventEditor";
import { fontSizes } from "@/shared/theme/typography";

export function EventEditorSheet({
  visible,
  event,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  event?: ManagedEvent | null;
  onClose: () => void;
  onSave: (payload: EventEditorInput) => Promise<unknown>;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const sheet = useRef<BottomSheetModal>(null);
  const scroll = useRef<BottomSheetScrollViewMethods>(null);
  const inFlight = useRef(false);
  const snapPoints = useMemo(() => ["92%"], []);
  const [imageUploading, setImageUploading] = useState(false);
  const editor = useEventEditor(visible, event);
  useEffect(() => {
    if (visible) sheet.current?.present();
    else sheet.current?.dismiss();
  }, [visible]);
  const submit = editor.form.handleSubmit(
    async (values) => {
      if (imageUploading || saving || inFlight.current || editor.draft.blocked) return;
      inFlight.current = true;
      try {
        await onSave(toEventEditorPayload(values, event?.status));
        try { await editor.draft.complete(); } catch { showError(t("eventDraft.cleanupError")); }
        showSuccess(t(event?.id ? "partner.updateSuccess" : "partner.createSuccess"));
        onClose();
      } catch (error) {
        showError(t(eventBookingErrorKey(getMutationErrorCode(error), "partner.saveError")));
      } finally {
        inFlight.current = false;
      }
    },
    () => {
      scroll.current?.scrollTo({ y: 0, animated: true });
    },
  );
  const busy = saving || imageUploading || editor.form.formState.isSubmitting || editor.draft.status === "loading";
  const close = async () => {
    if (busy || inFlight.current) return;
    if (await editor.draft.persist()) onClose();
    else sheet.current?.present();
  };
  return (
    <BottomSheetModal
      ref={sheet}
      accessible={false}
      snapPoints={snapPoints}
      onDismiss={() => { if (visible) void close(); }}
      enableContentPanningGesture={false}
      enablePanDownToClose={!busy}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={busy ? "none" : "close"}
        />
      )}
      backgroundStyle={styles.background}
    >
      <BottomSheetScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {t(event?.id ? "events.editEvent" : "eventEditor.newTitle")}
          </Text>
          <Text style={styles.subtitle}>{t("eventEditor.introduction")}</Text>
        </View>
        <EventDraftNotice {...editor.draft} disabled={busy} />
        {!editor.draft.blocked && <EventEditorFields
          key={`${event?.id ?? "new"}-${visible}`}
          form={editor.form}
          active={visible}
          imageUploading={imageUploading}
          onImageBusyChange={setImageUploading}
          searchAddress={editor.searchAddress}
          onSearchChange={editor.changeSearch}
          runGeocode={editor.runGeocode}
          isGeocoding={editor.isGeocoding}
          onLocationChange={editor.selectLocation}
        />}
        <View style={styles.actions}>
          <Button variant="ghost" disabled={busy} onPress={() => void close()} style={styles.action}>
            {t("eventDraft.close")}
          </Button>
          <Button
            disabled={busy || editor.draft.blocked}
            loading={saving || editor.form.formState.isSubmitting}
            onPress={() => void submit()}
            style={styles.action}
          >
            {t(event?.id ? "common.saveChanges" : "events.createEvent")}
          </Button>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
const styles = StyleSheet.create({
  background: { backgroundColor: colors.surface },
  content: { padding: 20, paddingBottom: 44, gap: 16 },
  header: { gap: 6 },
  title: { fontFamily: fonts.semibold, fontSize: fontSizes["2xl"], color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: fontSizes.ui, lineHeight: 22, color: colors.muted },
  actions: { flexDirection: "row", gap: 12 },
  action: { flex: 1 },
});
