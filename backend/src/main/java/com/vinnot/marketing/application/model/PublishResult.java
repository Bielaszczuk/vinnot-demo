package com.vinnot.marketing.application.model;

import java.util.Objects;

/**
 * What a network did with a publication (#510): published it, or (TikTok) sent it to the creator's inbox as a draft. The
 * permalink may be unknown, and drafts have none.
 */
public record PublishResult(Outcome outcome, String externalId, String permalink) {

    public enum Outcome { PUBLISHED, DRAFT_SENT }

    public PublishResult {
        Objects.requireNonNull(outcome, "outcome");
        Objects.requireNonNull(externalId, "externalId");
    }
}
