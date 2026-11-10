import { describe, expect, it } from "@jest/globals";
import reducer, {
  SESSION_CLEARED,
  clearCommentDraft,
  clearReviewDraft,
  reviewDraftKey,
  saveCommentDraft,
  saveReviewDraft,
} from "./draftsSlice";
import { clearSession } from "./authSlice";

const draft = { rating: 4, title: "Rico", comment: "Frutado", vintage: 2020 };

describe("drafts slice", () => {
  it("keys a new review per wine and an edit per review", () => {
    expect(reviewDraftKey("wine-1")).toBe("wine-1:new");
    expect(reviewDraftKey("wine-1", "review-9")).toBe("wine-1:review:review-9");
  });

  it("saves and clears a review draft", () => {
    const saved = reducer(undefined, saveReviewDraft({ key: "wine-1:new", draft }));
    expect(saved.reviews["wine-1:new"]).toEqual(draft);
    expect(reducer(saved, clearReviewDraft("wine-1:new")).reviews).toEqual({});
  });

  it("saves a comment draft and drops it once emptied or cleared", () => {
    const saved = reducer(undefined, saveCommentDraft({ reviewId: "r1", content: "Hola" }));
    expect(saved.comments).toEqual({ r1: "Hola" });
    expect(reducer(saved, saveCommentDraft({ reviewId: "r1", content: "" })).comments).toEqual({});
    expect(reducer(saved, clearCommentDraft("r1")).comments).toEqual({});
  });

  it("forgets every draft when the session is cleared", () => {
    expect(SESSION_CLEARED).toBe(clearSession.pending.type);
    const saved = reducer(
      reducer(undefined, saveReviewDraft({ key: "wine-1:new", draft })),
      saveCommentDraft({ reviewId: "r1", content: "Hola" }),
    );
    expect(reducer(saved, { type: SESSION_CLEARED })).toEqual({ reviews: {}, comments: {} });
  });
});
