import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Bell, BellOff } from "lucide-react-native";
import { Button } from "@/presentation/components/ui/Button";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { availableChannels } from "@/domain/notification/notificationPreferences";
import { lightTokens, radii, wine, iconStrokes } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { EventAreaSection } from "./EventAreaSection";
import {
  useNotificationPreferencesSheet,
  type NotificationPreferenceRow,
} from "./useNotificationPreferencesSheet";
import { Switch, ToggleRow } from "@/presentation/components/ui/Switch";

interface NotificationPreferencesSheetProps {
  visible: boolean;
  onClose: () => void;
}


export function NotificationPreferencesSheet({ visible, onClose }: NotificationPreferencesSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["85%"], []);
  const vm = useNotificationPreferencesSheet(visible);
  const { t } = vm;

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  const close = () => {
    vm.reset();
    onClose();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={close}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Bell size={22} color={wine[700]} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t("notificationPreferences.title")}</Text>
            <Text style={styles.subtitle}>{t("notificationPreferences.description")}</Text>
          </View>
        </View>

        {vm.isLoading ? (
          <ActivityIndicator color={wine[700]} />
        ) : vm.error ? (
          <QueryErrorState error={vm.error} onRetry={() => void vm.retry()} />
        ) : (
          <>
            <View style={styles.group}>
              <ToggleRow
                label={t("notificationPreferences.consentTitle")}
                description={t("notificationPreferences.consentHint")}
                value={vm.consentGranted}
                disabled={vm.busy}
                onValueChange={vm.setMarketingConsent}
                style={styles.row}
              />
            </View>

            <DevicePushNotice vm={vm} />

            <View style={styles.group}>
              {vm.rows.map((row, index) => (
                <PreferenceRow
                  key={row.category}
                  row={row}
                  last={index === vm.rows.length - 1}
                  vm={vm}
                  visible={visible}
                />
              ))}
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

/** Push switches only work once the system lets this phone show pushes; says so and offers the fix. */
function DevicePushNotice({ vm }: { vm: ReturnType<typeof useNotificationPreferencesSheet> }) {
  const { t, devicePush } = vm;
  if (devicePush.status !== "undetermined" && devicePush.status !== "denied") return null;
  const denied = devicePush.status === "denied";
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <BellOff size={18} color={wine[700]} strokeWidth={iconStrokes.thin} />
      <View style={styles.noticeBody}>
        <Text style={styles.noticeText}>
          {t(denied ? "notificationPreferences.devicePush.denied" : "notificationPreferences.devicePush.undetermined")}
        </Text>
        <Button
          variant="outline"
          size="sm"
          loading={devicePush.busy}
          disabled={devicePush.busy}
          onPress={denied ? devicePush.openSettings : devicePush.enable}
        >
          {t(denied ? "notificationPreferences.devicePush.openSettings" : "notificationPreferences.devicePush.allow")}
        </Button>
      </View>
    </View>
  );
}

function PreferenceRow({
  row,
  last,
  vm,
  visible,
}: {
  row: NotificationPreferenceRow;
  last: boolean;
  vm: ReturnType<typeof useNotificationPreferencesSheet>;
  visible: boolean;
}) {
  const { t } = vm;
  const name = t(`notificationPreferences.categories.${row.category}.name`);
  const hint =
    row.kind === "TRANSACTIONAL"
      ? t("notificationPreferences.alwaysOn")
      : !row.changeable
        ? t("notificationPreferences.needsConsent")
        : t(`notificationPreferences.categories.${row.category}.description`);
  return (
    <View style={[styles.categoryRow, last && styles.lastRow]}>
      <Text style={styles.rowLabel}>{name}</Text>
      <Text style={styles.rowHint}>{hint}</Text>
      <View style={styles.channels}>
        {availableChannels(row).map((channel) => {
          const label = t(`notificationPreferences.channels.${channel}`);
          return (
            <View key={channel} style={styles.channel}>
              <Text style={styles.channelLabel}>{label}</Text>
              <Switch
                accessibilityLabel={`${name}: ${label}`}
                value={row[channel]}
                disabled={!row.changeable || vm.busy}
                onValueChange={(enabled) => vm.setChannel(row.category, channel, enabled)}
              />
            </View>
          );
        })}
      </View>
      {row.category === "EVENTS_NEARBY" && <EventAreaSection visible={visible} />}
    </View>
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
    borderWidth: 1,
    borderColor: wine[100],
    backgroundColor: wine[50],
  },
  headerText: { flex: 1, gap: 3 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  group: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  rowHint: { ...textStyles.caption, color: lightTokens.textTertiary },
  categoryRow: {
    gap: 4,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.borderDefault,
  },
  lastRow: { borderBottomWidth: 0 },
  channels: { flexDirection: "row", gap: 20, marginTop: 6 },
  channel: { flexDirection: "row", alignItems: "center", gap: 8 },
  channelLabel: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  notice: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: wine[100],
    borderRadius: radii.lg,
    backgroundColor: wine[50],
  },
  noticeBody: { flex: 1, gap: 10, alignItems: "flex-start" },
  noticeText: { ...textStyles.bodySmall, color: wine[800] },
});
