import { useOrganizerPayments, useRequestPaymentRefund } from '@/presentation/hooks/queries/event/useOrganizerPayments';
import { refundCanBeRetried, type OrganizerPayment } from '@/domain/event/organizerPayment';
import { allowedRegistrationActions as allowedActions } from '@domain/event/eventRegistrationActions';
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@/presentation/components/ui/BottomSheet";
import { ClipboardList, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { Button } from "@/presentation/components/ui/Button";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { TextField } from "@/presentation/components/ui/TextField";
import { ReasonPicker } from "@/presentation/components/forms";
import {
  MAX_ORGANIZER_NOTE_LENGTH,
  defaultRegistrationReason,
  registrationReasonsFor,
  resolveReasonText,
  type RegistrationReason,
} from "@/domain/admin/moderationReasons";
import {
  useEventRegistrations,
  useReviewEventRegistration,
} from "@/presentation/hooks/queries/event";
import { AdminPaginationBar } from "@/presentation/features/admin/AdminPaginationBar";
import { AdminQueryError } from "@/presentation/features/admin/AdminQueryError";
import { useToast } from "@/presentation/providers/ToastProvider";
import type {
  EventRegistration,
  EventRegistrationAction,
  EventRegistrationStatus,
} from "@/domain/event/event.types";
import { shadows } from "@/shared/theme/shadows";
import { radii, spacing } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { formatPrice } from "@/shared/i18n/format";
import { fontSizes } from "@/shared/theme/typography";

type Props = {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
};

const PAGE_SIZE = 50;
export function EventRegistrationsManagerSheet({ eventId, eventTitle, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["92%"], []);
  const { showSuccess, showError } = useToast();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<EventRegistrationStatus>();
  // Each decision asks for its own optional note, so a note never reaches another attendee.
  const [confirming, setConfirming] = useState<{ id: string; action: EventRegistrationAction } | null>(null);
  const [note, setNote] = useState("");
  // Rejections and waitlists take a preset reason; the free note lives under OTHER.
  const [reasonCode, setReasonCode] = useState<RegistrationReason>(defaultRegistrationReason);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const query = useEventRegistrations(eventId, status, page, PAGE_SIZE);
  const reviewMutation = useReviewEventRegistration();
  const registrations = query.data?.registrations ?? [];
  const payments = useOrganizerPayments(eventId, registrations.filter(r => r.externallyManagedPayment).map(r => r.id));
  const refundMutation = useRequestPaymentRefund(eventId);
  const refund = (registration: EventRegistration) => {
    const payment = payments.currentData?.find(p => p.registrationId === registration.id);
    if (!payment?.canRefund || refundMutation.isPending || payments.isError) return;
    const retry = refundCanBeRetried(payment.refundStatus);
    Alert.alert(t('events.refund.title'), t(retry ? 'events.refund.retryConfirm' : 'events.refund.confirm', {
      amount: formatPrice(payment.amount, payment.currency, i18n?.language),
      name: registration.contactName || registration.contactEmail,
    }), [
      { text: t('common.goBack'), style: 'cancel' },
      { text: t(retry ? 'events.refund.retry' : 'events.refund.action'), style: 'destructive', onPress: () => {
        void refundMutation.mutateAsync(payment.attemptId).then(async () => {
          showSuccess(t('events.refund.requested'));
          await query.refetch();
        }).catch(() => { showError(t('events.refund.error')); void payments.refetch(); });
      } },
    ]);
  };
  const statusOptions = useMemo<
    Array<{ value: EventRegistrationStatus | undefined; label: string }>
  >(
    () => [
      { value: undefined, label: t("events.registrationManager.all") },
      { value: "REQUESTED", label: t("events.registrationManager.statuses.REQUESTED") },
      {
        value: "AWAITING_PAYMENT",
        label: t("events.registrationManager.statuses.AWAITING_PAYMENT"),
      },
      {
        value: "AWAITING_ATTENDEE_CONFIRMATION",
        label: t("events.registrationManager.statuses.AWAITING_ATTENDEE_CONFIRMATION"),
      },
      { value: "CONFIRMED", label: t("events.registrationManager.statuses.CONFIRMED") },
      { value: "WAITLISTED", label: t("events.registrationManager.statuses.WAITLISTED") },
      { value: "REJECTED", label: t("events.registrationManager.statuses.REJECTED") },
      { value: "CANCELLED", label: t("events.registrationManager.statuses.CANCELLED") },
      { value: "EXPIRED", label: t("events.registrationManager.statuses.EXPIRED") },
    ],
    [t],
  );
  const confirmedPeople = registrations
    .filter((registration) => registration.status === "CONFIRMED")
    .reduce((total, registration) => total + registration.attendeeCount, 0);

  useEffect(() => {
    sheetRef.current?.present();
  }, []);

  const submitReview = async (registration: EventRegistration, action: EventRegistrationAction) => {
    if (pendingIds.includes(registration.id)) return;
    const organizerNote =
      (registrationReasonsFor(action)
        ? resolveReasonText(
            reasonCode,
            note,
            (code) => t(`events.registrationManager.reasons.${action}.${code}`),
            MAX_ORGANIZER_NOTE_LENGTH,
          )
        : note.trim()) || undefined;
    setPendingIds((current) => [...current, registration.id]);
    try {
      await reviewMutation.mutateAsync({ eventId, registrationId: registration.id, action, organizerNote });
      setConfirming((current) => (current?.id === registration.id ? null : current));
      setNote("");
      setReasonCode(defaultRegistrationReason);
      showSuccess(t("events.registrationManager.updateSuccess"));
      await query.refetch();
    } catch {
      // The confirmation and its note stay open so the organizer can retry.
      showError(t("events.registrationManager.updateError"));
    } finally {
      setPendingIds((current) => current.filter((id) => id !== registration.id));
    }
  };

  const askToConfirm = (registration: EventRegistration, action: EventRegistrationAction) => {
    setConfirming({ id: registration.id, action });
    setNote("");
    setReasonCode(defaultRegistrationReason);
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconBubble}>
            <ClipboardList size={20} color={vinnotColors.brand} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t("events.registrationManager.title")}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {eventTitle}
            </Text>
          </View>
          <View style={styles.confirmedMetric}>
            <Users size={14} color={vinnotColors.brand} />
            <Text style={styles.confirmedMetricText}>
              {t("events.registrationManager.confirmedOnPage", { count: confirmedPeople })}
            </Text>
          </View>
        </View>

        <ChipGroup
          options={statusOptions}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
        />


        {payments.isError && <Text accessibilityRole="alert" style={styles.detailText}>{t('events.refund.loadError')}</Text>}
        {registrations.some(r => r.externallyManagedPayment) && <Button size="sm" variant="outline" disabled={payments.isFetching} onPress={() => void payments.refetch()}>{t('events.refund.refresh')}</Button>}

        {query.isError ? (
          <AdminQueryError retry={query.refetch} />
        ) : query.isLoading ? (
          <View style={styles.list}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={190} radius={radii["2xl"]} />
            ))}
          </View>
        ) : registrations.length === 0 ? (
          <EmptyState
            title={t("events.registrationManager.emptyTitle")}
            description={t("events.registrationManager.emptyDescription")}
            icon={<ClipboardList size={32} color={vinnotColors.brand} />}
          />
        ) : (
          <View style={styles.list}>
            {registrations.map((registration) => (
              <RegistrationCard
                key={registration.id}
                registration={registration}
                payment={payments.isError ? undefined : payments.currentData?.find(p => p.registrationId === registration.id)}
                onRefund={() => refund(registration)}
                refundBusy={refundMutation.isPending}
                pending={pendingIds.includes(registration.id)}
                confirmingAction={confirming?.id === registration.id ? confirming.action : undefined}
                note={note}
                onNoteChange={setNote}
                reasonCode={reasonCode}
                onReasonChange={setReasonCode}
                onReview={(action) => askToConfirm(registration, action)}
                onConfirm={(action) => void submitReview(registration, action)}
                onCancelConfirm={() => {
                  setConfirming(null);
                  setNote("");
                }}
              />
            ))}
          </View>
        )}
        <AdminPaginationBar
          page={page}
          totalPages={query.data?.pagination.totalPages ?? 0}
          totalItems={query.data?.pagination.totalItems ?? 0}
          onPageChange={setPage}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const CONFIRM_KEYS: Partial<Record<EventRegistrationAction, string>> = {
  APPROVE: "events.registrationManager.approveConfirm",
  WAITLIST: "events.registrationManager.waitlistConfirm",
  REJECT: "events.registrationManager.rejectConfirm",
};

function RegistrationCard({
  registration,
  pending,
  refundBusy,
  confirmingAction,
  note,
  onNoteChange,
  reasonCode,
  onReasonChange,
  onReview,
  onConfirm,
  onCancelConfirm,
  payment,
  onRefund,
}: {
  registration: EventRegistration;
  /** Only this attendee's decision is being saved. */
  pending: boolean;
  refundBusy: boolean;
  confirmingAction?: EventRegistrationAction;
  note: string;
  onNoteChange: (note: string) => void;
  reasonCode: RegistrationReason;
  onReasonChange: (reason: RegistrationReason) => void;
  onReview: (action: EventRegistrationAction) => void;
  onConfirm: (action: EventRegistrationAction) => void;
  onCancelConfirm: () => void;
  payment?: OrganizerPayment;
  onRefund: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const actions = allowedActions(registration);
  const reasons = confirmingAction ? registrationReasonsFor(confirmingAction) : null;
  const name =
    registration.contactName ||
    registration.contactEmail ||
    t("events.registrationManager.attendeeFallback");
  const amount = registration.totalAmount
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: registration.currency,
      }).format(registration.totalAmount)
    : t("events.registrationManager.free");

  return (
    <View style={styles.registrationCard}>
      <View style={styles.registrationTop}>
        <View style={styles.registrationIdentity}>
          <Text style={styles.registrationName}>{name}</Text>
          <Text style={styles.registrationContact}>
            {[registration.contactEmail, registration.contactPhone].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {t(`events.registrationManager.statuses.${registration.status}`)}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryStrong}>
          {t("events.registration.attendee", { count: registration.attendeeCount })}
        </Text>
        <Text style={styles.summaryStrong}>{amount}</Text>
      </View>
      <Text style={styles.detailText}>
        {t("events.registrationManager.paymentLabel", {
          status: t(`events.registrationManager.paymentStatuses.${registration.paymentStatus}`),
        })}
      </Text>
      {registration.expiresAt ? (
        <Text style={styles.detailText}>
          {t("events.registrationManager.reservationUntil", {
            date: registration.expiresAt.toLocaleString(locale, {
              dateStyle: "short",
              timeStyle: "short",
            }),
          })}
        </Text>
      ) : null}
      {registration.companionNames.length > 0 ? (
        <Text style={styles.detailText}>
          {t("events.registrationManager.companions", {
            names: registration.companionNames.join(", "),
          })}
        </Text>
      ) : null}
      {registration.note ? (
        <Text style={styles.detailText}>
          {t("events.registrationManager.message", { message: registration.note })}
        </Text>
      ) : null}
      {registration.organizerNote ? (
        <Text style={styles.organizerNote}>
          {t("events.registrationManager.previousNote", {
            note: registration.organizerNote,
          })}
        </Text>
      ) : null}

      {payment && payment.refundStatus !== 'NONE' && <Text style={styles.organizerNote}>{t(`events.refund.${payment.refundStatus}`)}</Text>}
      {payment?.canRefund && <Button size="sm" variant="outline" disabled={refundBusy || pending} onPress={onRefund}>{t(refundCanBeRetried(payment.refundStatus) ? 'events.refund.retry' : 'events.refund.action')}</Button>}
      {confirmingAction ? (
        <View style={styles.confirmPanel} testID={`registration-confirm-${registration.id}`}>
          <Text style={styles.confirmTitle} accessibilityRole="header">
            {t(CONFIRM_KEYS[confirmingAction] ?? "events.registrationManager.actionConfirm", {
              name,
              action: t(`events.registrationManager.actions.${confirmingAction}`),
            })}
          </Text>
          {reasons ? (
            <ReasonPicker<RegistrationReason>
              label={t("events.registrationManager.reasonLabel")}
              hint={t("events.registrationManager.reasonHint", { name })}
              reasons={reasons}
              value={reasonCode}
              onChange={onReasonChange}
              labelFor={(code) => t(`events.registrationManager.reasons.${confirmingAction}.${code}`)}
              note={note}
              onNoteChange={onNoteChange}
              noteLabel={t("events.registrationManager.noteForAttendee", { name })}
              notePlaceholder={t("events.registrationManager.organizerNotePlaceholder")}
              maxNoteLength={MAX_ORGANIZER_NOTE_LENGTH}
              disabled={pending}
            />
          ) : (
            <TextField
              label={t("events.registrationManager.noteForAttendee", { name })}
              value={note}
              onChangeText={onNoteChange}
              placeholder={t("events.registrationManager.organizerNotePlaceholder")}
              multiline
              maxLength={MAX_ORGANIZER_NOTE_LENGTH}
              editable={!pending}
              style={styles.noteInput}
            />
          )}
          <View style={styles.actionGrid}>
            <Button size="sm" variant="ghost" disabled={pending} onPress={onCancelConfirm} style={styles.action}>
              {t("common.goBack")}
            </Button>
            <Button
              size="sm"
              variant={confirmingAction === "REJECT" ? "danger" : "primary"}
              loading={pending}
              disabled={pending}
              onPress={() => onConfirm(confirmingAction)}
              style={styles.action}
            >
              {t(`events.registrationManager.actions.${confirmingAction}`)}
            </Button>
          </View>
        </View>
      ) : actions.length > 0 ? (
        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Button
              key={action}
              size="sm"
              variant={
                action === "REJECT" ? "danger" : action === "WAITLIST" ? "outline" : "primary"
              }
              disabled={pending}
              onPress={() => onReview(action)}
              style={styles.action}
            >
              {t(`events.registrationManager.actions.${action}`)}
            </Button>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ChipGroup<T extends string | undefined>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <MotionPressable
            key={option.value ?? "ALL"}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}



const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: vinnotColors.surface },
  handle: { backgroundColor: vinnotColors.borderStrong },
  content: {
    gap: spacing[4],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[12],
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[3],
    paddingBottom: spacing[1],
  },
  iconBubble: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  // A minimum width keeps the title on one line; the metric wraps below it instead.
  headerText: { flex: 1, minWidth: 180 },
  title: {
    color: vinnotColors.ink,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xl,
    lineHeight: 28,
    letterSpacing: 0,
  },
  subtitle: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    letterSpacing: 0,
  },
  confirmedMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: vinnotColors.brandSoft,
  },
  confirmedMetricText: {
    color: vinnotColors.brand,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.sm,
    letterSpacing: 0,
  },
  sectionLabel: {
    color: vinnotColors.ink,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.ui,
    letterSpacing: 0,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: {
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: vinnotColors.surface,
  },
  chipSelected: {
    borderColor: vinnotColors.brand,
    backgroundColor: vinnotColors.brandSoft,
  },
  chipText: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    letterSpacing: 0,
  },
  chipTextSelected: { color: vinnotColors.brand },
  noteInput: { minHeight: 72, textAlignVertical: "top" },
  list: { gap: spacing[3] },
  registrationCard: {
    gap: spacing[2],
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: radii.xl,
    padding: spacing[4],
    backgroundColor: vinnotColors.surface,
    ...shadows.sm,
  },
  registrationTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  registrationIdentity: { flex: 1, gap: 2 },
  registrationName: {
    color: vinnotColors.ink,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.base,
    lineHeight: 21,
    letterSpacing: 0,
  },
  registrationContact: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0,
  },
  statusBadge: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: vinnotColors.brandSoft,
  },
  statusText: {
    color: vinnotColors.brand,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 15,
    letterSpacing: 0,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryStrong: {
    color: vinnotColors.ink,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    letterSpacing: 0,
  },
  detailText: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    letterSpacing: 0,
  },
  organizerNote: {
    color: vinnotColors.brandDeep,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    letterSpacing: 0,
    backgroundColor: vinnotColors.brandSoft,
    borderRadius: radii.lg,
    padding: spacing[3],
  },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 },
  confirmPanel: {
    gap: spacing[3],
    borderRadius: radii.lg,
    padding: spacing[3],
    backgroundColor: vinnotColors.brandSoft,
  },
  confirmTitle: {
    color: vinnotColors.ink,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.ui,
    lineHeight: 20,
    letterSpacing: 0,
  },
  action: { flexGrow: 1 },
});
