package com.vinnot.marketing.domain.model;

/**
 * Where one network's publication of a post is (#510). A TikTok post sent to the creator's inbox ({@link #DRAFT_SENT})
 * counts as a success like a published one. It is terminal for publishing (no attempt is pending), yet not final: once
 * the creator posts the draft from the TikTok app, the draft sweep moves it to {@link #PUBLISHED} (#516).
 */
public enum PublicationStatus {
    QUEUED, PUBLISHING, PUBLISHED, DRAFT_SENT, FAILED;

    /** Published, or sent as a draft. */
    public boolean succeeded() {
        return this == PUBLISHED || this == DRAFT_SENT;
    }

    /**
     * Succeeded or failed for good: no publishing attempt is pending, so the post can be settled. Only the admin's retry of a
     * failure, or the draft sweep for a posted TikTok draft, changes it afterwards.
     */
    public boolean terminal() {
        return succeeded() || this == FAILED;
    }
}
