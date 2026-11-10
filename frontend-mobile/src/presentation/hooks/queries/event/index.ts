import { useAuth } from "@/presentation/hooks/useAuth";
/**
 * Events query hooks powered by Redux Toolkit Query.
 */
import { skipToken } from "@reduxjs/toolkit/query";
import type {
  CreateEventInput,
  EventsResult,
  UpdateEventInput,
} from "@/application/services/events.service";
import type {
  Event,
  EventDiscoveryResult,
  EventFilter,
  EventPaymentMethod,
  EventRegistration,
  EventRegistrationAction,
  EventRegistrationStatus,
  RegisterForEventInput,
} from "@/domain/event/event.types";
import { useExecuteMutationMutation, useTypedQuery } from "@/presentation/store/api";
import { useMutationAdapter } from "@/presentation/store/mutationAdapter";

export function useEvents(filter?: EventFilter, page = 0, pageSize = 20) {
  return useTypedQuery<EventsResult>({
    key: "event.list",
    params: { filter, page, pageSize },
  });
}

export function useEvent(id: string | undefined) {
  return useTypedQuery<Event>(id ? { key: "event.detail", params: { id } } : skipToken);
}

export function useNearbyEvents(
  params: { latitude: number; longitude: number; radiusKm?: number },
  enabled = true,
) {
  return useTypedQuery<EventsResult>(
    enabled && Number.isFinite(params.latitude) && Number.isFinite(params.longitude)
      ? { key: "event.nearby", params }
      : skipToken,
  );
}

export function useDiscoverEvents(
  params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    page?: number;
    pageSize?: number;
  },
  enabled = true,
) {
  return useTypedQuery<EventDiscoveryResult>(
    enabled ? { key: "event.discovery", params } : skipToken,
  );
}

export function useMyEventRegistration(eventId: string | undefined, enabled = true) {
  return useTypedQuery<EventRegistration>(
    enabled && eventId ? { key: "event.myRegistration", params: { eventId } } : skipToken,
  );
}

export function useEventRegistrations(
  eventId: string | undefined,
  status?: EventRegistrationStatus,
  page = 0,
  pageSize = 20,
) {
  return useTypedQuery<{
    registrations: EventRegistration[];
    pagination: EventsResult["pagination"];
  }>(
    eventId
      ? {
          key: "event.registrations",
          params: { eventId, status, page, pageSize },
        }
      : skipToken,
  );
}

export function useRegisterForEvent() {
  const { refreshUser } = useAuth();
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    ({ eventId, input }: { eventId: string; input: RegisterForEventInput }) => {
      const request = trigger({ key: "event.register", params: { eventId, payload: input } });
      return {
        ...request,
        unwrap: async () => {
          const registration = await request.unwrap();
          // A failed cache refresh must never report an already committed reservation as failed.
          if (input.saveContactPhone) void refreshUser().catch(() => undefined);
          return registration;
        },
      };
    },
    state,
  );
}

export function useConfirmEventAttendance() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (registrationId: string) =>
      trigger({ key: "event.confirmAttendance", params: { registrationId } }),
    state,
  );
}

export function useReportEventPayment() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    ({
      registrationId,
      paymentMethod,
    }: {
      registrationId: string;
      paymentMethod: EventPaymentMethod;
    }) =>
      trigger({
        key: "event.reportPayment",
        params: { registrationId, paymentMethod },
      }),
    state,
  );
}

export function useReviewEventRegistration() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    ({
      eventId,
      registrationId,
      action,
      paymentMethod,
      organizerNote,
    }: {
      eventId: string;
      registrationId: string;
      action: EventRegistrationAction;
      paymentMethod?: EventPaymentMethod;
      organizerNote?: string;
    }) =>
      trigger({
        key: "event.reviewRegistration",
        params: {
          eventId,
          registrationId,
          action,
          paymentMethod,
          organizerNote,
        },
      }),
    state,
  );
}

export function useCancelRegistration() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (eventId: string) => trigger({ key: "event.cancelRegistration", params: { eventId } }),
    state,
  );
}

export function useCreateEvent() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (payload: CreateEventInput) => trigger({ key: "event.create", params: { payload } }),
    state,
  );
}

export function useUpdateEvent() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    ({ id, data }: { id: string; data: UpdateEventInput }) =>
      trigger({ key: "event.update", params: { id, payload: data } }),
    state,
  );
}
