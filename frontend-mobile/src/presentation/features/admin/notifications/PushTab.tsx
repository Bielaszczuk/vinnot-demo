import { StyleSheet, Text, View } from "react-native";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { radii } from "@/shared/theme/tokens";
import { AdminQueryError } from "../AdminQueryError";
import { NotificationConfirmDialog } from "./NotificationConfirmDialog";
import { PushTypeSwitches } from "./PushTypeSwitches";
import { notificationStyles } from "./notificationStyles";
import { usePushControlsViewModel } from "./usePushControlsViewModel";

/** "Ajustes de push": the server provider and one switch per push type. What was sent lives in the history tab. */
export function PushTab() {
  const vm = usePushControlsViewModel();
  const { t } = vm;
  return (
    <View style={styles.content}>
      <View style={notificationStyles.card}>
        <Text style={notificationStyles.heading}>{t("admin.notifications.push.heading")}</Text>
        <Text style={notificationStyles.help}>{t("admin.notifications.push.help")}</Text>
        {vm.settings.isError ? (
          <AdminQueryError retry={vm.settings.refetch} />
        ) : !vm.settings.data ? (
          <Skeleton height={180} radius={radii.lg} />
        ) : (
          <PushTypeSwitches
            settings={vm.settings.data}
            sending={vm.sending}
            switching={vm.switching}
            typeLabel={vm.typeLabel}
            onToggle={(setting) => void vm.toggle(setting)}
          />
        )}
      </View>

      <NotificationConfirmDialog
        visible={vm.pendingOff !== null}
        title={t("admin.notifications.push.confirmOffTitle", { type: vm.typeLabel(vm.pendingOff?.type ?? "") })}
        message={t("admin.notifications.push.confirmOffMessage")}
        confirmLabel={t("admin.notifications.push.confirmOff")}
        busy={vm.switching !== null}
        danger
        onConfirm={() => void vm.confirmOff()}
        onCancel={vm.cancelOff}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
});
