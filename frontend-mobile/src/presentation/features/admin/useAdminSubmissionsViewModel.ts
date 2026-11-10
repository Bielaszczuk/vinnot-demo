import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useTranslation } from "react-i18next";
import { useTypedQuery } from "@/presentation/store/api";
import { submissionCatalogValues } from "@/domain/admin/adminSubmissionCatalog";
import type {
  AdminPaginatedResult,
  AdminWineSubmission,
  AdminWineSubmissionStatus,
} from "@/domain/admin/admin.types";
import { useSubmissionDecisionForm } from "./submissions/useSubmissionDecisionForm";

const PAGE_SIZE = 20;
export function useAdminSubmissionsViewModel() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<AdminWineSubmissionStatus>("NEEDS_REVIEW");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useTypedQuery<AdminPaginatedResult<AdminWineSubmission>>({
    key: "admin.submissions",
    params: { page, size: PAGE_SIZE, status, search: activeSearch },
  });
  const detail = useTypedQuery<AdminWineSubmission>(
    selectedId ? { key: "admin.submission.detail", params: { id: selectedId } } : skipToken,
  );
  const image = useTypedQuery<string>(
    selectedId && detail.currentData?.imageAvailable
      ? { key: "admin.submission.image", params: { id: selectedId } }
      : skipToken,
  );
  const decisionForm = useSubmissionDecisionForm({
    submissionId: selectedId,
    onDecided: () => {
      setSelectedId(null);
      if (page > 0 && list.currentData?.items.length === 1) setPage(page - 1);
    },
  });

  function select(id: string) {
    if (decisionForm.isInFlight()) return;
    setSelectedId(id);
    decisionForm.reset();
  }
  return {
    t,
    page,
    setPage,
    status,
    changeStatus: (value: AdminWineSubmissionStatus) => {
      setStatus(value);
      setPage(0);
    },
    search,
    setSearch,
    applySearch: () => {
      setPage(0);
      setActiveSearch(search.trim());
    },
    selectedId,
    close: () => {
      if (!decisionForm.isInFlight()) setSelectedId(null);
    },
    select,
    decisionForm,
    list,
    detail,
    catalogValues: detail.currentData ? submissionCatalogValues(detail.currentData) : [],
    image,
    working: decisionForm.saving,
    totalPages: Math.ceil((list.data?.totalItems ?? 0) / PAGE_SIZE),
  };
}
