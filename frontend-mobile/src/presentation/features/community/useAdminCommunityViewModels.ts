import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/presentation/providers/ToastProvider";
import {
  useCommunityModeration,
  useReviewPublications,
} from "@/presentation/hooks/queries/community/useCommunity";
import { DEFAULT_PUBLICATION_REJECTION_REASON } from "@/domain/community/community.types";
import {
  MAX_REPORT_DECISION_LENGTH,
  REPORT_OUTCOME_REASONS,
  resolveReasonText,
  type ReportOutcome,
  type ReportReasonCode,
} from "@/domain/admin/moderationReasons";
import type {
  ModerationReport,
  PublicationDecision,
  PublicationRejectionReason,
  ReportStatus,
  ReviewPublication,
} from "@/domain/community/community.types";

export function usePublicationQueueViewModel() {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReviewPublication | null>(null);
  const [reasonCode, setReasonCode] = useState<PublicationRejectionReason>(
    DEFAULT_PUBLICATION_REJECTION_REASON,
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  const { publications, decide } = useReviewPublications(page);
  // Free text only exists under OTHER; a hidden note is never sent.
  const showNote = reasonCode === "OTHER";
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const busy = working || decide.isPending;
  function select(item: ReviewPublication) {
    if (busy) return;
    setSelected(item);
    setReasonCode(DEFAULT_PUBLICATION_REJECTION_REASON);
    setReason("");
    setError(false);
  }
  function close() {
    if (!lock.current && !busy) setSelected(null);
  }
  function chooseReason(code: PublicationRejectionReason) {
    if (!busy) setReasonCode(code);
  }
  async function submit(status: PublicationDecision["status"]) {
    if (!selected || lock.current || busy) return;
    lock.current = true;
    setWorking(true);
    setError(false);
    try {
      await decide.mutateAsync({
        type: selected.type,
        id: selected.id,
        status,
        ...(status === "REJECTED" ? { reasonCode } : {}),
        reason: showNote ? reason.trim() : "",
        expectedRevision: selected.revision,
      });
      showSuccess(t("community.decisionSaved"));
      setSelected(null);
      if (page > 0 && publications.data?.items.length === 1) setPage(page - 1);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  function reload() {
    if (busy) return;
    // A conflict requires explicitly reopening the new snapshot; never reuse an old revision silently.
    setSelected(null);
    setError(false);
    void publications.refetch();
  }
  return {
    page,
    setPage,
    selected,
    select,
    close,
    reasonCode,
    chooseReason,
    showNote,
    reason,
    setReason,
    error,
    busy,
    submit,
    reload,
    publications,
  };
}

export function useModerationViewModel() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [selected, setSelected] = useState<ModerationReport | null>(null);
  // The outcome comes first; its preset reasons follow and free text exists only under OTHER.
  const [outcome, setOutcome] = useState<ReportOutcome>("RESOLVED");
  const [reasonCode, setReasonCode] = useState<ReportReasonCode>(REPORT_OUTCOME_REASONS.RESOLVED[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  const { reports, decide, remove, user } = useCommunityModeration(page, status);
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const busy = working || decide.isPending || remove.isPending;
  const final = selected?.status === "RESOLVED" || selected?.status === "DISMISSED";
  const locked = busy || !!final || (!!selected?.reviewerId && selected.reviewerId !== user?.id);
  const decision = resolveReasonText(
    reasonCode,
    note,
    (code) => t(`community.decisionReasons.${code}`),
    MAX_REPORT_DECISION_LENGTH,
  );
  function resetDecision(next: ReportOutcome = "RESOLVED") {
    setOutcome(next);
    setReasonCode(REPORT_OUTCOME_REASONS[next][0]);
    setNote("");
  }
  function select(item: ModerationReport) {
    if (busy) return;
    setSelected(item);
    resetDecision();
    setError(false);
  }
  function close() {
    if (!busy && !lock.current) setSelected(null);
  }
  function changeStatus(value: ReportStatus) {
    if (busy) return;
    setStatus(value);
    setPage(0);
    setSelected(null);
  }
  function chooseOutcome(next: ReportOutcome) {
    if (!locked) resetDecision(next);
  }
  function chooseReason(code: ReportReasonCode) {
    if (!locked) setReasonCode(code);
  }
  async function submit(next: ReportStatus | "REMOVE") {
    // Claiming is not a decision: it sends no text, as it always did.
    const text = next === "IN_REVIEW" ? "" : decision;
    if (!selected || locked || lock.current || (next !== "IN_REVIEW" && !text)) return;
    lock.current = true;
    setWorking(true);
    setError(false);
    try {
      if (next === "REMOVE") await remove.mutateAsync({ id: selected.id, decision: text });
      else await decide.mutateAsync({ id: selected.id, status: next, decision: text });
      showSuccess(t("community.decisionSaved"));
      setSelected(null);
      if (page > 0 && reports.data?.items.length === 1 && next !== status) setPage(page - 1);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  function reload() {
    if (busy) return;
    setSelected(null);
    setError(false);
    void reports.refetch();
  }
  return {
    page,
    setPage,
    status,
    changeStatus,
    selected,
    select,
    close,
    outcome,
    chooseOutcome,
    reasonCode,
    chooseReason,
    note,
    setNote,
    canDecide: !!decision,
    error,
    busy,
    locked,
    final,
    submit,
    reload,
    reports,
    user,
  };
}
