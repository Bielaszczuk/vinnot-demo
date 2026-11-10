import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/presentation/components/ui/Button";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { AnnouncementAudienceForm } from "./AnnouncementAudienceForm";
import { AnnouncementEditor } from "./AnnouncementEditor";
import { AnnouncementKindPicker } from "./AnnouncementKindPicker";
import { AnnouncementPreviewCard } from "./AnnouncementPreviewCard";
import { NotificationConfirmDialog } from "./NotificationConfirmDialog";
import { useAnnouncementComposerViewModel } from "./useAnnouncementComposerViewModel";

/** "Enviar anuncio": compose, preview, test and send an announcement. What was sent lives in the history tab. */
export function AnnouncementsTab() {
  const vm = useAnnouncementComposerViewModel();
  const { t } = vm;
  const reach = vm.reach.data;
  const { email, push } = vm.draft.audience;
  const split = reach
    ? [
        email && t("admin.notifications.audience.byEmail", { count: reach.email }),
        push && t("admin.notifications.audience.byPush", { count: reach.push }),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  return (
    <View style={styles.content}>
      <AnnouncementKindPicker value={vm.draft.kind} disabled={vm.working} onChange={vm.setKind} />
      <AnnouncementEditor
        language={vm.language}
        written={vm.languages}
        version={vm.version}
        disabled={vm.working}
        bodySelection={vm.bodySelection}
        onLanguageChange={vm.setLanguage}
        onTitleChange={vm.updateTitle}
        onBodyChange={(body) => vm.updateVersion({ body })}
        onBodySelectionChange={vm.onBodySelectionChange}
        onFormat={vm.applyFormat}
      />
      <AnnouncementAudienceForm
        kind={vm.draft.kind}
        audience={vm.draft.audience}
        destination={vm.draft.destination}
        countries={vm.countries}
        regions={vm.regions}
        reach={reach}
        reachLoading={vm.reach.isFetching}
        reachFailed={vm.reach.isError}
        onReachRetry={() => void vm.reach.refetch()}
        placesFailed={vm.placesFailed}
        disabled={vm.working}
        onAudienceChange={vm.updateAudience}
        onCountryChange={vm.selectCountry}
        onDestinationChange={vm.setDestination}
      />
      <AnnouncementPreviewCard
        kind={vm.draft.kind}
        language={vm.previewLanguage}
        body={vm.previewBody}
        preview={vm.preview.data}
        loading={vm.preview.isFetching}
        failed={vm.preview.isError}
        ready={vm.previewable}
      />

      <View style={styles.actions}>
        {!!vm.blockingMessage && (
          <Text accessibilityLiveRegion="polite" style={styles.blocked}>
            {vm.blockingMessage}
          </Text>
        )}
        <Button variant="outline" fullWidth loading={vm.testing} disabled={!vm.canTest} onPress={() => void vm.sendTest()}>
          {t("admin.notifications.composer.sendTest")}
        </Button>
        <Button fullWidth disabled={!vm.canSend} onPress={vm.openConfirm}>
          {t("admin.notifications.composer.send")}
        </Button>
      </View>

      <NotificationConfirmDialog
        visible={vm.confirming}
        title={t("admin.notifications.confirm.title")}
        message={t("admin.notifications.confirm.message", {
          count: reach?.accounts ?? 0,
          kind: t(`admin.notifications.kinds.${vm.draft.kind}.title`),
        })}
        details={[split, email && push ? t("admin.notifications.confirm.overlap") : ""].filter(Boolean)}
        help={t("admin.notifications.confirm.help")}
        confirmLabel={t("admin.notifications.confirm.send")}
        busy={vm.sending}
        disabled={!vm.reachSettled}
        onConfirm={() => void vm.send()}
        onCancel={vm.closeConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  actions: { gap: 10 },
  blocked: { ...textStyles.caption, color: lightTokens.textTertiary, textAlign: "center" },
});
