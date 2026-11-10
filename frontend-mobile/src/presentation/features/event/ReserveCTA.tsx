import {
  canRegisterAgain,
  canStartOnlinePayment,
  registrationAvailability,
  registrationStatusTone,
  type RegistrationStatusTone,
} from '@/domain/event/eventRegistrationActions';
/**
 * ReserveCTA — event reservation summary and action.
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock3,
  ExternalLink,
  MapPin,
  Users,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { shadows } from "@/shared/theme/shadows";
import { radii, spacing } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import type { Event, EventRegistration } from "@/domain/event/event.types";
import { formatEventDate, formatEventPrice, formatEventTime } from "./eventPresentation";
import { fontSizes } from "@/shared/theme/typography";

interface ReserveCTAProps {
  event: Event;
  registration?: EventRegistration | null;
  loading?: boolean;
  actionLoading?: boolean;
  onReserve: () => void;
  onConfirmAttendance?: () => void;
  onPayNow?: () => void;
  onContactOrganizer?: () => void;
  onCancelRegistration?: () => void;
}

export function ReserveCTA({
  event,
  registration,
  loading = false,
  actionLoading = false,
  onReserve,
  onConfirmAttendance,
  onPayNow,
  onContactOrganizer,
  onCancelRegistration,
}: ReserveCTAProps) {
  const { t, i18n } = useTranslation();
  const availability = registrationAvailability(event);
  const isSoldOut = availability === "soldOut";
  const unavailable = availability !== "open";
  const capacityPercent = event.maxAttendees
    ? Math.min(100, (event.currentAttendees / event.maxAttendees) * 100)
    : 0;
  const location = [event.location.name, event.location.city].filter(Boolean).join(", ");

  return (
    <Card padding={0} radius={radii.xl} style={styles.card}>
      <View style={styles.priceBand}>
        <Text style={styles.priceLabel}>{t("events.price")}</Text>
        <Text style={styles.price}>{event.price ? formatEventPrice(event.price, event.registration?.currency ?? "ARS", i18n.resolvedLanguage ?? i18n.language) : t("events.free")}</Text>
      </View>

      <View style={styles.body}>
        {event.status === "CANCELLED" && (
          <Text accessibilityRole="alert" style={styles.cancelledNotice}>{t("events.cancelledNotice")}</Text>
        )}
        <Info
          icon={<CalendarDays size={17} color={vinnotColors.brand} />}
          value={`${formatEventDate(event.startDate, i18n.language)} · ${formatEventTime(event.startDate, i18n.language)}`}
        />
        <Info
          icon={<MapPin size={17} color={vinnotColors.brand} />}
          value={location || event.location.address}
        />
        <Info
          icon={<Users size={17} color={vinnotColors.brand} />}
          value={t("events.attendeeCount", {
            count: event.maxAttendees ?? event.currentAttendees,
            value: `${event.currentAttendees}${event.maxAttendees ? ` / ${event.maxAttendees}` : ""}`,
          })}
        />

        {!!event.maxAttendees && (
          <View style={styles.capacityBlock}>
            <View style={styles.capacityHeader}>
              <Text style={styles.capacityLabel}>{t("events.capacity")}</Text>
              <Text style={styles.capacityLabel}>{Math.round(capacityPercent)}%</Text>
            </View>
            <View style={styles.capacityTrack}>
              <View style={[styles.capacityFill, { width: `${capacityPercent}%` }]} />
            </View>
            {capacityPercent >= 85 && !isSoldOut && (
              <Text style={styles.warning}>{t("events.almostFull")}</Text>
            )}
          </View>
        )}

        {registration ? (
          <><RegistrationStatus
            registration={registration}
            loading={actionLoading}
            onConfirmAttendance={onConfirmAttendance}
            onPayNow={onPayNow}
            onContactOrganizer={onContactOrganizer}
            onCancelRegistration={onCancelRegistration}
          />{canRegisterAgain(registration) && availability !== "closed" && <Button fullWidth loading={loading}
            disabled={unavailable} onPress={onReserve}>{t("eventBooking.registerAgain")}</Button>}</>
        ) : (
          <Button
            fullWidth
            size="lg"
            loading={loading}
            disabled={unavailable}
            onPress={onReserve}
          >
            {t(RESERVE_LABEL_KEYS[availability])}
          </Button>
        )}
      </View>
    </Card>
  );
}

function RegistrationStatus({
  registration,
  loading,
  onConfirmAttendance,
  onPayNow,
  onContactOrganizer,
  onCancelRegistration,
}: {
  registration: EventRegistration;
  loading: boolean;
  onConfirmAttendance?: () => void;
  onPayNow?: () => void;
  onContactOrganizer?: () => void;
  onCancelRegistration?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const canCancel = !["CANCELLED", "REJECTED", "EXPIRED"].includes(registration.status);
  const canPay = canStartOnlinePayment(registration);

  return (
    <View style={styles.registrationBox}>
      <View style={styles.registrationHeader}>
        <StatusIcon tone={registrationStatusTone(registration.status)} />
        <Text style={styles.registrationEyebrow}>
          {t("events.registration.yours", { defaultValue: "Tu inscripción" })}
        </Text>
      </View>
      <Text style={styles.registrationTitle}>
        {t(`events.registration.statuses.${registration.status}`)} ·{" "}
        {t("events.registration.attendee", { count: registration.attendeeCount })}
      </Text>
      {registration.expiresAt ? (
        <View style={styles.expiryRow}>
          <Clock3 size={13} color={vinnotColors.warning} />
          <Text style={styles.expiryText}>
            {t("events.registration.reservationValidUntil")}{" "}
            {registration.expiresAt.toLocaleString(i18n.resolvedLanguage ?? i18n.language, {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </Text>
        </View>
      ) : null}
      {registration.organizerNote ? (
        <Text style={styles.organizerNote}>{registration.organizerNote}</Text>
      ) : null}
      {registration.status === "AWAITING_ATTENDEE_CONFIRMATION" ? (
        <Button fullWidth loading={loading} onPress={onConfirmAttendance}>
          {t("events.registration.confirmAttendance")}
        </Button>
      ) : null}
      {canPay ? (
        <Button fullWidth loading={loading} disabled={!onPayNow} onPress={onPayNow}>
          {t("eventBooking.payNow")}
        </Button>
      ) : null}
      {registration.contactActionUrl ? (
        <Button
          fullWidth
          variant="outline"
          leftIcon={<ExternalLink size={16} color={vinnotColors.brand} />}
          onPress={onContactOrganizer}
        >
          {t("events.registration.contactOrganizer")}
        </Button>
      ) : null}
      {canCancel ? (
        <Button fullWidth variant="ghost" disabled={loading} onPress={onCancelRegistration}>
          {t("events.registration.cancelRegistration")}
        </Button>
      ) : null}
    </View>
  );
}

const RESERVE_LABEL_KEYS = {
  open: "events.register",
  soldOut: "events.soldOut",
  closed: "events.registrationClosed",
} as const;

function StatusIcon({ tone }: { tone: RegistrationStatusTone }) {
  if (tone === "positive") return <CircleCheck size={17} color={vinnotColors.brand} />;
  if (tone === "negative") return <CircleX size={17} color={vinnotColors.danger} />;
  return <Clock3 size={17} color={vinnotColors.warning} />;
}

function Info({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text numberOfLines={2} style={styles.infoText}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vinnotColors.border,
    backgroundColor: vinnotColors.surface,
    ...shadows.sm,
  },
  priceBand: {
    paddingHorizontal: spacing[5],
    paddingVertical: 16,
    backgroundColor: vinnotColors.brandSoft,
  },
  priceLabel: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 14,
    textTransform: "uppercase",
    color: vinnotColors.brand,
  },
  price: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes.xl,
    lineHeight: 28,
    color: vinnotColors.ink,
  },
  body: { gap: 13, padding: spacing[5] },
  cancelledNotice: {
    borderRadius: radii.md,
    backgroundColor: vinnotColors.dangerSoft,
    color: vinnotColors.danger,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.ui,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    overflow: "hidden",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  infoText: {
    flex: 1,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.ui,
    lineHeight: 20,
    color: vinnotColors.ink,
  },
  capacityBlock: { gap: 7 },
  capacityHeader: { flexDirection: "row", justifyContent: "space-between" },
  capacityLabel: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    color: vinnotColors.muted,
  },
  capacityTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: radii.full,
    backgroundColor: vinnotColors.canvasMuted,
  },
  capacityFill: { height: "100%", borderRadius: radii.full, backgroundColor: vinnotColors.success },
  warning: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    color: vinnotColors.warning,
  },
  registrationBox: {
    gap: 10,
    borderWidth: 1,
    borderColor: vinnotColors.brandSoftStrong,
    borderRadius: radii.lg,
    padding: 14,
    backgroundColor: vinnotColors.brandSoft,
  },
  registrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  registrationEyebrow: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 14,
    textTransform: "uppercase",
    color: vinnotColors.brand,
  },
  registrationTitle: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.ui,
    lineHeight: 20,
    color: vinnotColors.ink,
  },
  expiryRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  expiryText: {
    flex: 1,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    color: vinnotColors.warning,
  },
  organizerNote: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: vinnotColors.muted,
  },
  paymentBox: {
    gap: 4,
    borderRadius: radii.lg,
    padding: 10,
    backgroundColor: vinnotColors.surface,
  },
  paymentText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: vinnotColors.ink,
  },
});
