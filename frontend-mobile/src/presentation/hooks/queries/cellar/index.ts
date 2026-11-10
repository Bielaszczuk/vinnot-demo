/**
 * Cellar query hooks powered by Redux Toolkit Query.
 */
import { skipToken } from "@reduxjs/toolkit/query";
import type { AddToCellarOptions, CellarEntry, UpdateCellarEntryOptions } from "@/domain/cellar/cellar.types";
import {
  useExecuteMutationMutation,
  useTypedQueryList,
} from "@/presentation/store/api";
import { useMutationAdapter } from "@/presentation/store/mutationAdapter";

export function useCellar(options?: { enabled?: boolean }) {
  return useTypedQueryList<CellarEntry>(
    options?.enabled === false ? skipToken : { key: "cellar.list" },
  );
}

export function useAddCellarEntry() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (options: AddToCellarOptions) => trigger({ key: "cellar.add", params: { ...options } }),
    state,
  );
}

export function useRemoveCellarEntry() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (entryId: string) => trigger({ key: "cellar.remove", params: { entryId } }),
    state,
  );
}

export function useUpdateCellarEntry() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    ({ id, updates }: { id: string; updates: UpdateCellarEntryOptions }) =>
      trigger({ key: "cellar.update", params: { id, updates } }),
    state,
  );
}
