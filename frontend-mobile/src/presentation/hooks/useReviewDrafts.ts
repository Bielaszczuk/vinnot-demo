import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/presentation/store/hooks";
import {
  clearCommentDraft,
  clearReviewDraft,
  saveCommentDraft,
  saveReviewDraft,
  type ReviewDraftValues,
} from "@/presentation/store/draftsSlice";

export { reviewDraftKey, type ReviewDraftValues } from "@/presentation/store/draftsSlice";

/** Unsent review text that survives tab switches and leaving the wine in the same session. */
export function useReviewDraft(key: string) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((state) => state.drafts.reviews[key]);
  const save = useCallback(
    (next: ReviewDraftValues) => dispatch(saveReviewDraft({ key, draft: next })),
    [dispatch, key],
  );
  const clear = useCallback(() => dispatch(clearReviewDraft(key)), [dispatch, key]);
  return { draft, save, clear };
}

/** Unsent comment text for one review; survives collapsing the comments. */
export function useCommentDraft(reviewId: string) {
  const dispatch = useAppDispatch();
  const content = useAppSelector((state) => state.drafts.comments[reviewId] ?? "");
  const save = useCallback(
    (next: string) => dispatch(saveCommentDraft({ reviewId, content: next })),
    [dispatch, reviewId],
  );
  const clear = useCallback(() => dispatch(clearCommentDraft(reviewId)), [dispatch, reviewId]);
  return { content, save, clear };
}
