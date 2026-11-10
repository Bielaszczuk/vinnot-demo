import { useEventRegistrationForm } from "./useEventRegistrationForm";
import { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter, type Href } from "expo-router";
import { registrationSubmitKey } from "@/domain/event/eventRegistrationActions";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { Minus, Plus, TicketCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Event, RegisterForEventInput } from "@/domain/event/event.types";
import type { User } from "@/domain/user/user.types";
import { Button } from "@/presentation/components/ui/Button";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { PhoneNumberField } from "@/presentation/components/ui/PhoneNumberField";
import { shadows } from "@/shared/theme/shadows";
import { radii, spacing, systemColors } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontFamilies, fontSizes } from "@/shared/theme/typography";
import { ToggleRow } from "@/presentation/components/ui/Switch";

interface EventRegistrationSheetProps {
  event: Event;
  user: User | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: RegisterForEventInput) => void;
}

export function EventRegistrationSheet({
  event,
  user,
  submitting,
  onClose,
  onSubmit,
}: EventRegistrationSheetProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);
  const {
    attendeeCount,
    updateAttendeeCount,
    maxTickets,
    contactName,
    contactEmail,
    contactPhone,
    setContactPhone,
    saveContactPhone,
    setSaveContactPhone,
    phoneLocked,
    unlockPhone,
    error,
    buildInput,
    notice,
    showConditions,
  } = useEventRegistrationForm(event, {
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phoneNumber,
  });

  useEffect(() => {
    sheetRef.current?.present();
  }, []);

  const submit = () => {
    if (submitting) return;
    const input = buildInput();
    if (input) onSubmit(input);
  };

  const openProfile = () => {
    onClose();
    router.push("/(app)/(tabs)/profile" as Href);
  };

  const total = event.price ? event.price * attendeeCount : 0;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={!submitting}
      onDismiss={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={submitting ? "none" : "close"}
        />
      )}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.icon}>
            <TicketCheck size={21} color={vinnotColors.brand} />
          </View>
          <View style={styles.headerText}>
            <Text numberOfLines={3} style={styles.title}>
              {t("eventBooking.title", { title: event.title })}
            </Text>
          </View>
        </View>

        <Text style={styles.notice}>
          {t(`eventBooking.${notice}`, { minutes: event.registration.holdMinutes })}
        </Text>

        <View style={styles.counterBlock}>
          <View>
            <Text style={styles.fieldLabel}>
              {t("events.registration.attendeeCount", {
                defaultValue: "Cantidad de asistentes",
              })}
            </Text>
            <Text style={styles.hint}>
              {t("events.registration.maximum", {
                defaultValue: "Máximo {{count}} por inscripción",
                count: maxTickets,
              })}
            </Text>
          </View>
          <View style={styles.counter}>
            <MotionPressable
              onPress={() => updateAttendeeCount(attendeeCount - 1)}
              disabled={attendeeCount <= 1}
              style={[styles.counterButton, attendeeCount <= 1 && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={t("common.decrease", {
                defaultValue: "Disminuir",
              })}
            >
              <Minus size={17} color={vinnotColors.brand} />
            </MotionPressable>
            <Text style={styles.counterValue}>{attendeeCount}</Text>
            <MotionPressable
              onPress={() => updateAttendeeCount(attendeeCount + 1)}
              disabled={attendeeCount >= maxTickets}
              style={[styles.counterButton, attendeeCount >= maxTickets && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={t("common.increase", {
                defaultValue: "Aumentar",
              })}
            >
              <Plus size={17} color={vinnotColors.brand} />
            </MotionPressable>
          </View>
        </View>

        <View style={styles.accountContact}>
          <Text style={styles.fieldLabel}>{contactName}</Text>
          <Text style={styles.subtitle}>{contactEmail}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <PhoneNumberField value={contactPhone} onChange={setContactPhone} disabled={submitting || phoneLocked}
              error={error === "phone" ? t("contactPhone.invalid") : undefined} />
          </View>
          {phoneLocked ? (
            <Pressable
              onPress={unlockPhone}
              disabled={submitting}
              accessibilityRole="button"
              style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: vinnotColors.brand }}
            >
              <Text style={{ color: vinnotColors.brand, fontFamily: fontFamilies.semibold }}>{t("contactPhone.change")}</Text>
            </Pressable>
          ) : null}
        </View>
        <ToggleRow
          label={t("contactPhone.remember")}
          value={saveContactPhone}
          onValueChange={setSaveContactPhone}
        />
        <Text style={styles.hint}>{t("eventBooking.privacy")}</Text>
        {error && error !== "phone" && (
          <View style={styles.accountError}>
            <Text accessibilityRole="alert" style={{ color: systemColors.dangerText }}>
              {t("eventBooking.incompleteAccount")}
            </Text>
            <Button size="sm" variant="outline" disabled={submitting} onPress={openProfile}>
              {t("eventBooking.goToProfile")}
            </Button>
          </View>
        )}

        {event.price ? (
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>
              {t("events.registration.estimatedTotal", {
                defaultValue: "Total estimado",
              })}
            </Text>
            <Text style={styles.totalValue}>
              {event.registration.currency} {total.toLocaleString(i18n.language)}
            </Text>
            <Text style={styles.hint}>
              {t("events.registration.paymentNotice", {
                defaultValue: "Pagá de forma segura con Mercado Pago.",
              })}
            </Text>
          </View>
        ) : null}

        {showConditions && <Link href="/legal/payments" style={styles.hint} onPress={onClose}>
          {t(event.price ? "eventBooking.terms" : "eventBooking.conditions")}
        </Link>}
        <View style={styles.actions}>
          <Button variant="ghost" disabled={submitting} onPress={onClose} style={styles.action}>
            {t("common.cancel")}
          </Button>
          <Button loading={submitting} onPress={submit} style={styles.action}>
            {t(registrationSubmitKey(event))}
          </Button>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: vinnotColors.surface },
  accountError: { gap: spacing[2], alignItems: "flex-start" },
  handle: { backgroundColor: vinnotColors.borderStrong },
  content: {
    gap: 16,
    paddingHorizontal: spacing[5],
    paddingBottom: 44,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.xl,
    lineHeight: 26,
    color: vinnotColors.ink,
  },
  subtitle: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: vinnotColors.muted,
  },
  notice: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: vinnotColors.muted,
  },
  counterBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: radii.lg,
    padding: 14,
    backgroundColor: vinnotColors.surface,
    ...shadows.sm,
  },
  fieldLabel: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.ui,
    lineHeight: 20,
    color: vinnotColors.ink,
  },
  hint: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    color: vinnotColors.muted,
  },
  counter: { flexDirection: "row", alignItems: "center", gap: 12 },
  counterButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  counterValue: {
    minWidth: 24,
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.lg,
    lineHeight: 23,
    textAlign: "center",
    color: vinnotColors.ink,
  },
  disabled: { opacity: 0.35 },
  accountContact: { padding: 14, gap: 4, borderRadius: radii.lg, backgroundColor: vinnotColors.brandSoft },
  totalBox: {
    gap: 3,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: vinnotColors.brandSoftStrong,
    backgroundColor: vinnotColors.brandSoft,
  },
  totalLabel: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    color: vinnotColors.muted,
  },
  totalValue: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.xl,
    lineHeight: 26,
    color: vinnotColors.brand,
  },
  actions: { flexDirection: "row", gap: 10, paddingTop: 4 },
  action: { flex: 1 },
});
