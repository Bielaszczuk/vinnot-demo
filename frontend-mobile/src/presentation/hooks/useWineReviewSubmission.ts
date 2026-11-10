import { useTranslation } from "react-i18next";
import type { WineReview } from "@/domain/wine/wine.types";
import { vintageChange } from "@/domain/wine/vintage";
import { useCreateWineReview, useUpdateWineReview } from "./queries/wine/useWines";
import { useToast } from "@/presentation/providers/ToastProvider";

export interface ReviewSubmissionDraft {
  rating: number;
  title: string;
  comment: string;
  vintage: number | null;
}

export function useWineReviewSubmission(wineId: string, review?: WineReview | null, onSuccess?: () => void) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const create = useCreateWineReview();
  const update = useUpdateWineReview();
  return async (draft: ReviewSubmissionDraft): Promise<boolean> => {
    try {
      const values = { wineId, rating: draft.rating, title: draft.title || undefined, comment: draft.comment || undefined };
      if (review) {
        // Only a changed vintage is sent, so the API keeps the stored one otherwise.
        const vintage = vintageChange(review.vintage ?? null, draft.vintage);
        await update.mutateAsync({ ...values, reviewId: review.id, ...(vintage !== undefined ? { vintage } : {}) });
      } else {
        await create.mutateAsync({ ...values, ...(draft.vintage != null ? { vintage: draft.vintage } : {}) });
      }
      showSuccess(t("community.reviewPublished"));
      onSuccess?.();
      return true;
    } catch {
      showError(t(review ? "wines.reviewUpdateError" : "wines.reviewError"));
      return false;
    }
  };
}
