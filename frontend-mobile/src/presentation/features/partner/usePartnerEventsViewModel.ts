import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { PartnerEvent } from "@/domain/partner/partner.types";
import { useEventCancellation } from "@/presentation/features/event/useEventCancellation";
import {
  usePartnerEventDetail,
  usePartnerEventMutations,
  usePartnerEvents,
} from "@/presentation/hooks/queries/partner";
import { useDebounce, useHaptics } from "@/presentation/hooks/ui";
import { goBackOr, PROFILE_ROUTE } from "@/presentation/navigation/discoveryNavigation";
import { useToast } from "@/presentation/providers/ToastProvider";
import { PAGE_SIZE } from "./partnerEventPresentation";

/** The organizer's own events: server-side search, paging, edit, cancel and refresh. */
export function usePartnerEventsViewModel() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const haptics = useHaptics();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PartnerEvent | null>(null);
  const [registrationsEvent, setRegistrationsEvent] = useState<PartnerEvent | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 250);
  // The server filters the whole list, so counts and pages match what is shown.
  const query = usePartnerEvents(page, PAGE_SIZE, debouncedSearch);
  const eventDetail = usePartnerEventDetail();
  const { remove } = usePartnerEventMutations();
  const cancellation = useEventCancellation({
    cancel: (input) => remove.mutateAsync(input),
    onSuccess: () => showSuccess(t("partner.deleteSuccess")),
    onError: () => showError(t("partner.deleteError")),
  });
  const totalItems = query.data?.totalItems ?? 0;

  const openCreate = () => {
    haptics.selection();
    setEditingEvent(null);
    setSheetVisible(true);
  };

  const openEdit = async (event: PartnerEvent) => {
    if (loadingEditId) return;
    haptics.selection();
    setLoadingEditId(event.id);
    try {
      const detail = (await eventDetail.mutateAsync(event.id)) as PartnerEvent;
      setEditingEvent(detail);
      setSheetVisible(true);
    } catch {
      showError(t("partner.loadError"));
    } finally {
      setLoadingEditId(null);
    }
  };

  const confirmDelete = (event: PartnerEvent) => {
    if (cancellation.pending || ["CANCELLED", "COMPLETED"].includes(event.status.toUpperCase())) return;
    haptics.selection();
    cancellation.request(event);
  };

  return {
    search,
    changeSearch: (value: string) => {
      // The API rejects terms over 512 characters; nobody types an event name that long.
      setSearch(value.slice(0, 200));
      setPage(0);
    },
    page,
    setPage,
    items: query.data?.items ?? [],
    totalItems,
    totalPages: Math.ceil(totalItems / PAGE_SIZE),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    retry: () => void query.refetch(),
    refreshing: query.isFetching && !query.isLoading,
    refresh: () => void query.refetch(),
    loadingEditId,
    openCreate,
    openEdit,
    confirmDelete,
    cancellation,
    sheetVisible,
    editingEvent,
    closeSheet: () => setSheetVisible(false),
    registrationsEvent,
    openRegistrations: setRegistrationsEvent,
    closeRegistrations: () => setRegistrationsEvent(null),
    goBack: () => goBackOr(router, PROFILE_ROUTE),
  };
}
