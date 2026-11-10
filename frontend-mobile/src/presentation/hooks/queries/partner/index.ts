/**
 * Partner query hooks powered by Redux Toolkit Query.
 */
import type { PartnerEventPayload, PartnerPaginatedResult, PartnerEvent } from "@/domain/partner/partner.types";
import { skipToken } from "@reduxjs/toolkit/query";
import { useExecuteMutationMutation, useTypedQuery } from "@/presentation/store/api";
import { useMutationAdapter } from "@/presentation/store/mutationAdapter";
import type { EventCancellationRequest } from "@/domain/event/eventCancellation";

export function usePartnerEvents(page = 0, size = 20, search = "") {
  const term = search.trim();
  return useTypedQuery<PartnerPaginatedResult<PartnerEvent>>({
    key: "partner.events",
    params: term ? { page, size, search: term } : { page, size },
  });
}

/** How many events the signed-in organizer runs; undefined until known or when disabled. */
export function useOrganizedEventCount(enabled: boolean): number | undefined {
  const query = useTypedQuery<PartnerPaginatedResult<PartnerEvent>>(
    enabled ? { key: "partner.events", params: { page: 0, size: 1 } } : skipToken,
  );
  return query.data?.totalItems;
}

export function usePartnerEventDetail() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (id: string) => trigger({ key: "partner.event.detail", params: { id } }),
    state,
  );
}

export function usePartnerEventMutations() {
  const [triggerCreate, createState] = useExecuteMutationMutation();
  const [triggerUpdate, updateState] = useExecuteMutationMutation();
  const [triggerRemove, removeState] = useExecuteMutationMutation();

  const create = useMutationAdapter(
    (payload: PartnerEventPayload) =>
      triggerCreate({ key: "partner.event.create", params: { payload } }),
    createState,
  );
  const update = useMutationAdapter(
    ({ id, payload }: { id: string; payload: PartnerEventPayload }) =>
      triggerUpdate({ key: "partner.event.update", params: { id, payload } }),
    updateState,
  );
  const remove = useMutationAdapter(
    ({ id, cancellation }: { id: string; cancellation?: EventCancellationRequest }) =>
      triggerRemove({ key: "partner.event.delete", params: { id, cancellation } }),
    removeState,
  );

  return { create, update, remove };
}
