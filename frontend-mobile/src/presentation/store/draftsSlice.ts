import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Unsent review text, kept in memory for the app session only. */
export interface ReviewDraftValues {
  rating: number;
  title: string;
  comment: string;
  vintage: number | null;
}

export interface DraftsState {
  /** Keyed by `reviewDraftKey(wineId, reviewId)`. */
  reviews: Record<string, ReviewDraftValues>;
  /** Keyed by the review the comment answers. */
  comments: Record<string, string>;
}

const initialState: DraftsState = { reviews: {}, comments: {} };
/** `clearSession.pending` from the auth slice (sign-out or expired session). */
export const SESSION_CLEARED = "auth/clearSession/pending";

/** A new review is one per wine; an edit belongs to the review being edited. */
export function reviewDraftKey(wineId: string, reviewId?: string | null): string {
  return reviewId ? `${wineId}:review:${reviewId}` : `${wineId}:new`;
}

const draftsSlice = createSlice({
  name: "drafts",
  initialState,
  reducers: {
    saveReviewDraft: (state, action: PayloadAction<{ key: string; draft: ReviewDraftValues }>) => {
      state.reviews[action.payload.key] = action.payload.draft;
    },
    clearReviewDraft: (state, action: PayloadAction<string>) => {
      delete state.reviews[action.payload];
    },
    saveCommentDraft: (state, action: PayloadAction<{ reviewId: string; content: string }>) => {
      if (action.payload.content) state.comments[action.payload.reviewId] = action.payload.content;
      else delete state.comments[action.payload.reviewId];
    },
    clearCommentDraft: (state, action: PayloadAction<string>) => {
      delete state.comments[action.payload];
    },
  },
  extraReducers: (builder) => {
    // Drafts belong to the signed-in person; another account never sees them.
    // Matched by type so this slice does not load the auth services.
    builder.addMatcher((action) => action.type === SESSION_CLEARED, () => initialState);
  },
});

export const { saveReviewDraft, clearReviewDraft, saveCommentDraft, clearCommentDraft } =
  draftsSlice.actions;

export default draftsSlice.reducer;
