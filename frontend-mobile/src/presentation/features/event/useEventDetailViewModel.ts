import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { eventBookingErrorKey } from "@/domain/event/eventBookingError";
import { registrationSuccessKey } from "@/domain/event/eventRegistrationActions";
import { hasCoordinates as validCoordinates } from "@/domain/location/coordinates";
import type { RegisterForEventInput } from "@/domain/event/event.types";
import {
  useCancelRegistration,
  useConfirmEventAttendance,
  useEvent,
  useMyEventRegistration,
  useRegisterForEvent,
} from "@/presentation/hooks/queries/event";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useCurrentTime } from "@/presentation/hooks/useCurrentTime";
import { useEventCheckout } from "@/presentation/hooks/useEventCheckout";
import { useExternalLink } from "@/presentation/hooks/useExternalLink";
import { useShareLink } from "@/presentation/hooks/useShareLink";
import { useDetailViewTracking } from "@/presentation/hooks/useDetailViewTracking";
import { usePushPermissionPrompt } from "@/presentation/features/notifications/usePushPermissionPrompt";
import { useToast } from "@/presentation/providers/ToastProvider";
import { getMutationErrorCode } from "@/presentation/store/mutationAdapter";
import { env } from "@/shared/config/env";
import { canShareEvent } from "@/domain/sharing/shareability";
import { retryableLoadError } from "@/presentation/feedback/illustratedState";

/** Orchestrates event detail registration, checkout, cancellation and sharing. */
export function useEventDetailViewModel(id: string | undefined) {
  useCurrentTime();
  const router = useRouter();
  const backToEvents = () => router.dismissTo("/(app)/(tabs)/events");
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const openExternalLink = useExternalLink();
  const shareLink = useShareLink();
  const eventQuery = useEvent(id);
  useDetailViewTracking("EVENT", id);
  const registrationQuery = useMyEventRegistration(id, isAuthenticated);
  const registerMutation = useRegisterForEvent();
  const pushPrompt = usePushPermissionPrompt();
  const confirmMutation = useConfirmEventAttendance();
  const checkout = useEventCheckout();
  const payRegistration = async (registrationId: string) => {
    if (!id) return;
    try { if (!await checkout.start(id, registrationId)) showError(t("eventBooking.checkoutPending")); }
    catch (error) { showError(t(eventBookingErrorKey(getMutationErrorCode(error), "eventBooking.checkoutError"))); }
  };
  const cancelMutation = useCancelRegistration();
  const [registrationSheetVisible, setRegistrationSheetVisible] = useState(false);
  const event = eventQuery.data;
  const registration = registrationQuery.data;
  const hasCoordinates = event ? validCoordinates(event.location) : false;

  const registrationStatus = registration?.status;
  const offerPush = pushPrompt.offer;
  useEffect(() => {
    // A confirmed ticket (also after returning from checkout) is a moment updates matter.
    if (registrationStatus === "CONFIRMED") offerPush();
  }, [registrationStatus, offerPush]);

  const handleReserve = () => {
    if (!id) return;
    if (!isAuthenticated) {
      router.push({ pathname: "/(auth)/login", params: { redirect: `/(app)/events/${id}` } });
      return;
    }
    setRegistrationSheetVisible(true);
  };

  const submitRegistration = (input: RegisterForEventInput) => {
    if (!id) return;
    registerMutation.mutate(
      { eventId: id, input },
      {
        onSuccess: (result) => {
          setRegistrationSheetVisible(false);
          const createdRegistration = result as typeof registration;
          const successKey = createdRegistration && registrationSuccessKey(createdRegistration.status);
          if (successKey) showSuccess(t(successKey));
          if (env.eventPaymentsEnabled && createdRegistration?.status === "AWAITING_PAYMENT") {
            // Checkout leaves the app; the explanation waits until the paid ticket is back (see below).
            void payRegistration(createdRegistration.id);
          } else if (!event?.price && createdRegistration?.contactActionUrl) {
            void openExternalLink(createdRegistration.contactActionUrl);
          } else {
            // The first registration is when updates about it matter: explain push notifications once.
            pushPrompt.offer();
          }
        },
        onError: (error) => showError(t(eventBookingErrorKey(getMutationErrorCode(error)))),
      },
    );
  };

  const confirmAttendance = () => {
    if (!registration) return;
    confirmMutation.mutate(registration.id, {
      onSuccess: () => showSuccess(t("events.registration.attendanceConfirmed")),
      onError: () => showError(t("events.registration.attendanceConfirmError")),
    });
  };

  const cancelRegistration = () => {
    if (!id) return;
    Alert.alert(
      t("events.registration.cancelRegistration"),
      t("events.registration.cancelPrompt"),
      [
        { text: t("common.back"), style: "cancel" },
        {
          text: t("events.registration.cancelRegistration"),
          style: "destructive",
          onPress: () =>
            cancelMutation.mutate(id, {
              onSuccess: () => showSuccess(t("events.registration.cancelled")),
              onError: (error) =>
                showError(t(eventBookingErrorKey(getMutationErrorCode(error), "events.registration.cancelError"))),
            }),
        },
      ],
    );
  };

  const canShare = event ? canShareEvent(event) : false;
  const handleShare = () => {
    if (!event || !canShare) return;
    void shareLink({ kind: "events", id: event.id, title: event.title });
  };

  const handleOpenMaps = () => {
    if (!event) return;
    const query = hasCoordinates
      ? `${event.location.latitude},${event.location.longitude}`
      : [event.location.name, event.location.address, event.location.city, event.location.region]
          .filter(Boolean)
          .join(" ");
    void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(query)}`);
  };

  const refresh = () => {
    void eventQuery.refetch();
    if (isAuthenticated) void registrationQuery.refetch();
  };

  const payNow = env.eventPaymentsEnabled
    ? () => registration && void payRegistration(registration.id)
    : undefined;

  const contactOrganizer = () => {
    if (registration?.contactActionUrl) {
      void openExternalLink(registration.contactActionUrl);
    }
  };

  return {
    event,
    registration,
    user,
    hasCoordinates,
    isLoading: eventQuery.isLoading,
    loadError: retryableLoadError(eventQuery.isError, eventQuery.error),
    isRefreshing: eventQuery.isFetching,
    registering: registerMutation.isPending,
    actionLoading: confirmMutation.isPending || cancelMutation.isPending || checkout.pending,
    submitting: registerMutation.isPending || checkout.pending,
    registrationSheetVisible,
    closeRegistrationSheet: () => setRegistrationSheetVisible(false),
    pushPrompt,
    backToEvents,
    refresh,
    handleReserve,
    submitRegistration,
    confirmAttendance,
    cancelRegistration,
    payNow,
    contactOrganizer,
    canShare,
    handleShare,
    handleOpenMaps,
  };
}
