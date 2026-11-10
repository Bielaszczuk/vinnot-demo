/** Review workflow wrapper used by the wine detail's review sheet. */
import type { WineReview } from "@/domain/wine/wine.types";
import { useWineDetail } from "@/presentation/hooks/queries/wine/useWines";
import { reviewDraftKey, useReviewDraft } from "@/presentation/hooks/useReviewDrafts";
import { useWineReviewSubmission } from "@/presentation/hooks/useWineReviewSubmission";
import { ReviewFormFields, type ReviewDraft } from "./ReviewFormFields";

/** Whether a kept draft differs from what the form started from (the review, or an empty one). */
export function hasUnsavedReviewChanges(draft: ReviewDraft | undefined, review?: WineReview | null): boolean {
  if (!draft) return false;
  return draft.rating !== (review?.rating ?? 0)
    || draft.title !== (review?.title ?? "")
    || draft.comment !== (review?.comment ?? "")
    || draft.vintage !== (review?.vintage ?? null);
}

export function ReviewForm({ wineId, review, onCancel, onSuccess, onBusyChange, framed }: {
  wineId: string;
  review?: WineReview | null;
  /** Cancel was pressed. The draft is kept: the caller discards it (after asking) with `useReviewDraft`. */
  onCancel?: () => void;
  onSuccess?: () => void;
  /** True while a publication is in flight, so a sheet can refuse to close meanwhile. */
  onBusyChange?: (busy: boolean) => void;
  /** False inside a sheet, which is already the form's surface. */
  framed?: boolean;
}) {
  const submit = useWineReviewSubmission(wineId, review, onSuccess);
  // The wine detail already holds this query, so the catalog vintage comes from the cache.
  const { data: wine } = useWineDetail(wineId);
  // The whole draft (rating, vintage, title, comment) survives closing the sheet, tab switches
  // and leaving the wine; publishing clears it, and so does the caller's confirmed discard.
  const { draft, save, clear } = useReviewDraft(reviewDraftKey(wineId, review?.id));
  const publish = async (values: ReviewDraft) => {
    onBusyChange?.(true);
    try {
      const published = await submit(values);
      if (published) clear();
      return published;
    } finally {
      onBusyChange?.(false);
    }
  };
  return <ReviewFormFields key={review?.id ?? "new"} initialRating={draft?.rating ?? review?.rating ?? 0}
    initialTitle={draft?.title ?? review?.title ?? ""} initialComment={draft?.comment ?? review?.comment ?? ""}
    initialVintage={draft ? draft.vintage : review?.vintage ?? null} suggestedVintage={wine?.vintage} wineType={wine?.type}
    isEditing={!!review} onSubmit={publish} onCancel={onCancel} onDraftChange={save} framed={framed} />;
}
