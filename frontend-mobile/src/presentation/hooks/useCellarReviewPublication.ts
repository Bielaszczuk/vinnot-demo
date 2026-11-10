import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { useCreateWineReview, useMyReviewStatus } from "./queries/wine/useWines";
import type { ReviewSubmissionDraft } from "./useWineReviewSubmission";
import { useToast } from "@/presentation/providers/ToastProvider";

/**
 * A personal note becomes public only after the author submits the review draft.
 * The draft starts from the note rating, text and tasted vintage.
 */
export function useCellarReviewPublication(entry: CellarEntry, onClose: () => void) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const status = useMyReviewStatus(entry.wine.id, true);
  const create = useCreateWineReview();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const canPublish = status.data?.hasReview === false && !status.isFetching && !status.isError;
  const close = () => { if (!submitting.current) onClose(); };

  const submit = async (draft: ReviewSubmissionDraft): Promise<boolean> => {
    if (!canPublish || submitting.current || draft.rating <= 0) return false;
    submitting.current = true;
    setBusy(true);
    try {
      await create.mutateAsync({ wineId: entry.wine.id, rating: draft.rating,
        title: draft.title || undefined, comment: draft.comment || undefined,
        ...(draft.vintage != null ? { vintage: draft.vintage } : {}) });
      showSuccess(t("community.reviewPublished"));
      onClose();
      return true;
    } catch {
      showError(t("wines.reviewError"));
      return false;
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return { status, canPublish, busy, close, submit };
}
